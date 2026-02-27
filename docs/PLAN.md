# Implementation Plan: TimeFlow — Toggl Alternative

> Streamlit + Python 3.11+ + SQLite time tracking app.
> Each phase is implemented as a separate branch + PR by a Developer agent.

<!-- PHASE:1 -->
## Phase 1: Foundation — Database & Core Models

### Branch
`phase-1-foundation`

### Scope
Set up the project structure, SQLite database with all tables, and a data access layer. Create the application entry point (`app.py`) with a basic Streamlit page that confirms the DB is initialized.

**Project structure:**
```
timer/
├── app.py                  # Streamlit entry point
├── requirements.txt        # Dependencies
├── config.py               # App configuration (DB path, defaults)
├── db/
│   ├── __init__.py
│   ├── connection.py       # SQLite connection manager (singleton, WAL mode)
│   ├── schema.sql          # Full DDL script
│   └── migrations.py       # Schema init + migration runner
├── models/
│   ├── __init__.py
│   ├── project.py          # Project dataclass + CRUD
│   ├── client.py           # Client dataclass + CRUD
│   ├── tag.py              # Tag dataclass + CRUD
│   └── time_entry.py       # TimeEntry dataclass + CRUD
└── tests/
    └── test_models.py
```

**Database tables:**
- `clients` (id INTEGER PK, name TEXT UNIQUE NOT NULL, archived BOOLEAN DEFAULT 0, created_at, updated_at)
- `projects` (id INTEGER PK, name TEXT NOT NULL, color TEXT DEFAULT '#4A90D9', client_id FK NULLABLE, billable BOOLEAN DEFAULT 0, hourly_rate REAL DEFAULT 0, archived BOOLEAN DEFAULT 0, created_at, updated_at)
- `tags` (id INTEGER PK, name TEXT UNIQUE NOT NULL, created_at)
- `time_entries` (id INTEGER PK, description TEXT, project_id FK NULLABLE, start_time TEXT NOT NULL (ISO 8601), stop_time TEXT NULLABLE, duration_seconds INTEGER NULLABLE, billable BOOLEAN DEFAULT 0, created_at, updated_at)
- `time_entry_tags` (time_entry_id FK, tag_id FK, PRIMARY KEY (time_entry_id, tag_id))

Each model module must contain a `@dataclass` and full CRUD functions: `create()`, `get_by_id()`, `get_all()`, `update()`, `delete()`, plus model-specific queries (e.g., `get_active_entry()` for time_entries).

### Files to Create/Modify
- `requirements.txt` — streamlit, pandas, plotly, pytest
- `config.py` — DB_PATH, APP_NAME, DEFAULT_PROJECT_COLOR, TIMEZONE settings
- `db/connection.py` — get_connection() singleton with WAL mode, row_factory=sqlite3.Row
- `db/schema.sql` — full DDL with all 5 tables, indexes on time_entries(start_time), time_entries(project_id)
- `db/migrations.py` — init_db() reads and executes schema.sql if tables don't exist
- `models/project.py` — Project dataclass and CRUD
- `models/client.py` — Client dataclass and CRUD
- `models/tag.py` — Tag dataclass and CRUD
- `models/time_entry.py` — TimeEntry dataclass and CRUD, get_active_entry(), stop_entry()
- `app.py` — Streamlit entry point, calls init_db(), shows "TimeFlow" title and DB status
- `tests/test_models.py` — tests for all CRUD operations on all models

### Acceptance Criteria
- [ ] `python -m pytest tests/` passes with all tests green
- [ ] `streamlit run app.py` starts without errors and shows the app title
- [ ] All 5 database tables are created on first run
- [ ] Each model has create, read, update, delete operations that work correctly
- [ ] get_active_entry() returns a time entry with stop_time=NULL or None if none exists
- [ ] Foreign keys are enforced (PRAGMA foreign_keys = ON)
- [ ] Connection uses WAL mode for concurrent reads

### Tests Required
- CRUD for Client (create, get_by_id, get_all, update, delete) — `tests/test_models.py`
- CRUD for Project (create with/without client, color) — `tests/test_models.py`
- CRUD for Tag — `tests/test_models.py`
- CRUD for TimeEntry (create, start/stop, duration calc) — `tests/test_models.py`
- Tag assignment to time entries — `tests/test_models.py`
- get_active_entry returns running entry — `tests/test_models.py`
- Foreign key enforcement (deleting project with entries) — `tests/test_models.py`
<!-- /PHASE:1 -->

<!-- PHASE:2 -->
## Phase 2: Timer & Time Entry UI

### Branch
`phase-2-timer-ui`

### Scope
Implement the core timer functionality in Streamlit: a start/stop timer with live display, manual time entry form, and a list of today's entries with inline editing and deletion.

**Timer component (top of page):**
- Large display showing current running time (HH:MM:SS) using st.empty() with auto-refresh (streamlit-autorefresh or st.rerun with sleep)
- Description input field (editable while running)
- Project selector dropdown
- Tag multi-select
- Start/Stop button (green when stopped, red when running)
- When stopped: calculates duration, saves to DB

**Manual entry form:**
- Date picker, start time, end time (or duration), description, project, tags
- Validation: end > start, reasonable duration

**Today's entries list:**
- Table/list showing today's time entries sorted by start_time DESC
- Each entry shows: description, project (with color dot), tags, start-stop times, duration
- Edit button per entry → opens edit form in expander
- Delete button with confirmation
- Running total at bottom

**UI layout:**
- Use st.sidebar for navigation (Timer, Entries, Projects, Reports — placeholders for future phases)
- Main area: timer on top, today's entries below

### Files to Create/Modify
- `app.py` — add sidebar navigation, route to pages
- `pages/__init__.py` — package init
- `pages/timer.py` — timer page with start/stop, manual entry, today's entries list
- `ui/__init__.py` — package init
- `ui/components.py` — reusable UI components: timer_display(), entry_card(), project_badge()
- `ui/state.py` — Streamlit session state helpers for timer state management
- `tests/test_timer.py` — tests for timer logic (duration calculation, state transitions)

### Acceptance Criteria
- [ ] Clicking Start creates a time entry with start_time=now and stop_time=NULL in DB
- [ ] Clicking Stop sets stop_time=now and calculates duration_seconds correctly
- [ ] Timer display shows elapsed time while running (auto-refreshes)
- [ ] Manual entry form creates a valid time entry with correct duration
- [ ] Today's entries list shows all entries from today, sorted by most recent first
- [ ] Entries can be edited (description, project, tags, times) inline
- [ ] Entries can be deleted with a confirmation step
- [ ] Running total of today's hours is displayed
- [ ] Sidebar navigation has links for Timer, Projects, Reports (only Timer functional)
- [ ] Description and project can be changed while timer is running

### Tests Required
- Timer start creates entry with NULL stop_time — `tests/test_timer.py`
- Timer stop calculates duration correctly — `tests/test_timer.py`
- Manual entry validation rejects end < start — `tests/test_timer.py`
- Duration calculation helper (seconds → HH:MM:SS) — `tests/test_timer.py`
- Today's entries filtering — `tests/test_timer.py`
<!-- /PHASE:2 -->

<!-- PHASE:3 -->
## Phase 3: Projects, Clients & Tags Management

### Branch
`phase-3-organization`

### Scope
Implement full management UI pages for Projects, Clients, and Tags. Each entity gets a dedicated page accessible from the sidebar.

**Projects page (`pages/projects.py`):**
- List all projects as cards/rows with color indicator, client name, billable status, hourly rate
- "New Project" form: name, color picker (from preset palette), client dropdown, billable toggle, hourly rate
- Edit project inline (expander)
- Archive/unarchive project (soft delete — set archived=1)
- Filter: show/hide archived
- Total tracked time per project shown next to each project

**Clients page (`pages/clients.py`):**
- List all clients with number of associated projects
- "New Client" form: name
- Edit/archive client
- Cannot archive client with active (non-archived) projects — show warning

**Tags page (`pages/tags.py`):**
- List all tags with usage count
- "New Tag" form: name
- Edit/delete tag
- Deleting a tag removes it from all time entries (cascade via junction table)

**Color palette for projects:**
Define 12-16 preset colors in config.py (similar to Toggl palette).

### Files to Create/Modify
- `pages/projects.py` — Projects management page
- `pages/clients.py` — Clients management page
- `pages/tags.py` — Tags management page
- `config.py` — add PROJECT_COLORS palette list
- `models/project.py` — add get_total_tracked_time(project_id) query
- `models/client.py` — add has_active_projects(client_id) query
- `models/tag.py` — add get_usage_count(tag_id) query
- `app.py` — wire all pages into sidebar navigation
- `tests/test_organization.py` — tests for new model queries and business logic

### Acceptance Criteria
- [ ] Projects can be created with name, color, client, billable flag, and hourly rate
- [ ] Projects display their total tracked time from time_entries
- [ ] Projects can be archived and filtered (show/hide archived)
- [ ] Clients can be created and linked to projects
- [ ] Client cannot be archived if it has non-archived projects (validation enforced)
- [ ] Tags can be created, edited, and deleted
- [ ] Deleting a tag properly removes all associations from time_entry_tags
- [ ] All three pages are accessible from the sidebar
- [ ] Color picker shows preset palette for project color selection
- [ ] Timer page project dropdown reflects newly created projects

### Tests Required
- get_total_tracked_time returns correct sum — `tests/test_organization.py`
- has_active_projects returns True/False correctly — `tests/test_organization.py`
- get_usage_count returns correct tag count — `tests/test_organization.py`
- Tag deletion cascades to junction table — `tests/test_organization.py`
- Archive/unarchive project toggling — `tests/test_organization.py`
<!-- /PHASE:3 -->

<!-- PHASE:4 -->
## Phase 4: Dashboard & Reports

### Branch
`phase-4-reports`

### Scope
Implement a Dashboard (overview) and Reports page with Summary, Detailed, and Weekly views. Use plotly for interactive charts and pandas for data aggregation.

**Dashboard (`pages/dashboard.py`):**
- Top row: today's total, this week's total, this month's total (as metric cards with st.metric)
- Bar chart: hours per day for the last 7 days (plotly)
- Donut chart: time distribution by project for this week (plotly)
- List of 5 most recent time entries
- "Most tracked project" this week highlight

**Reports page (`pages/reports.py`):**
- Date range picker (preset: Today, This Week, This Month, Last Month, Custom)
- Filter by: project(s), client(s), tag(s), billable status
- Three report tabs:

**Summary tab:**
- Grouped by project (default), client, or day — user selects
- Horizontal bar chart showing hours per group
- Table with columns: Group, Entries Count, Total Duration, Billable Amount
- Grand total row

**Detailed tab:**
- Full list of individual time entries in date range
- Columns: Date, Description, Project, Client, Tags, Start, Stop, Duration, Billable
- Sortable by any column using pandas
- Subtotals per day

**Weekly tab:**
- 7-column grid showing hours per project per day of week
- Row per project, column per day (Mon-Sun)
- Color intensity based on hours (heatmap style)
- Row and column totals

### Files to Create/Modify
- `pages/dashboard.py` — dashboard with metrics and charts
- `pages/reports.py` — reports page with 3 tabs (summary, detailed, weekly)
- `services/__init__.py` — package init
- `services/reports.py` — report data aggregation functions using pandas
- `services/dashboard.py` — dashboard data queries
- `ui/charts.py` — plotly chart builder functions (bar, donut, heatmap)
- `app.py` — add Dashboard and Reports to sidebar, make Dashboard the default page
- `tests/test_reports.py` — tests for report aggregation logic

### Acceptance Criteria
- [ ] Dashboard shows today/week/month totals as metric cards
- [ ] Dashboard bar chart shows last 7 days of tracked time
- [ ] Dashboard donut chart shows project distribution for current week
- [ ] Reports date range picker works with presets and custom range
- [ ] Reports can be filtered by project, client, tag, and billable status
- [ ] Summary report groups by project, client, or day with correct totals
- [ ] Detailed report shows all entries with day subtotals
- [ ] Weekly report shows project × day grid with totals
- [ ] All charts are interactive (plotly hover, zoom)
- [ ] Empty states handled gracefully (no data messages, not errors)

### Tests Required
- Dashboard totals calculation (today, week, month) — `tests/test_reports.py`
- Summary aggregation by project — `tests/test_reports.py`
- Summary aggregation by client — `tests/test_reports.py`
- Summary aggregation by day — `tests/test_reports.py`
- Detailed report date range filtering — `tests/test_reports.py`
- Weekly report pivot table generation — `tests/test_reports.py`
- Billable amount calculation (hours × hourly_rate) — `tests/test_reports.py`
- Empty date range returns empty DataFrame — `tests/test_reports.py`
<!-- /PHASE:4 -->

<!-- PHASE:5 -->
## Phase 5: Export, Settings & Polish

### Branch
`phase-5-export-polish`

### Scope
Add CSV/PDF export for reports, a Settings page, keyboard-like UX shortcuts, and overall UI polish with consistent styling.

**Export (`services/export.py`):**
- CSV export: any report tab → downloadable CSV via st.download_button
- PDF export: summary report → PDF using reportlab or fpdf2
- Include: header with date range and filters, data table, totals

**Settings page (`pages/settings.py`):**
- Default project for new entries
- Default billable status
- Timezone selection (from pytz/zoneinfo)
- Working hours per day (for % capacity display on dashboard)
- Data management: export all data as JSON backup, import from JSON
- "About" section with app version

**UI Polish:**
- Consistent color theme via `.streamlit/config.toml` (dark/light theme support)
- Custom CSS via st.markdown for: project color dots, timer display font size, card-like entry layout
- Favicon and page title
- Empty states with helpful messages and icons
- Loading spinners for report generation
- Success/error toast messages for CRUD operations

**Keyboard UX:**
- Streamlit has limited keyboard support, but implement:
  - Enter to submit forms
  - Auto-focus on description field when timer page loads

### Files to Create/Modify
- `services/export.py` — CSV and PDF export functions
- `pages/settings.py` — settings page with all configuration options
- `pages/reports.py` — add export buttons to each report tab
- `pages/dashboard.py` — add working hours capacity percentage
- `.streamlit/config.toml` — Streamlit theme configuration
- `ui/styles.py` — custom CSS strings for consistent styling
- `ui/components.py` — add toast, empty_state, loading components
- `config.py` — add user settings persistence (store in SQLite `settings` table)
- `db/schema.sql` — add `settings` table (key TEXT PK, value TEXT)
- `models/settings.py` — Settings model with get/set operations
- `app.py` — apply global styles, set page config (title, favicon, layout)
- `tests/test_export.py` — tests for export functionality

### Acceptance Criteria
- [ ] CSV export downloads correct data for any report view
- [ ] PDF export generates a valid, readable PDF with report data
- [ ] Settings page allows changing default project, billable status, timezone
- [ ] Working hours setting reflects on dashboard as capacity %
- [ ] Full data backup exports all tables as JSON
- [ ] JSON import correctly restores data
- [ ] Custom Streamlit theme is applied (colors, fonts)
- [ ] All pages show appropriate empty states (no raw errors)
- [ ] Success toasts appear after create/update/delete operations
- [ ] App has proper page title and favicon

### Tests Required
- CSV export content matches report data — `tests/test_export.py`
- PDF export generates valid file — `tests/test_export.py`
- Settings get/set persistence — `tests/test_export.py`
- JSON backup/restore round-trip — `tests/test_export.py`
- Working hours capacity calculation — `tests/test_export.py`
<!-- /PHASE:5 -->
