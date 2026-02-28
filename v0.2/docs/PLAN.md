# Implementation Plan: TimeFlow v0.2 — Expo (React Native)

> Cross-platform time tracker (iOS, Android, Web) built with Expo SDK, TypeScript,
> expo-sqlite + Drizzle ORM, Zustand, NativeWind, and Victory Native.
> Replaces the Streamlit prototype with a production-grade mobile-first app.

<!-- PHASE:1 -->
## Phase 1: Project Scaffold & Database Layer

### Branch
`phase-1-scaffold-database`

### Scope
Bootstrap the Expo project with all tooling, define the database schema with Drizzle ORM,
and implement the full data access layer. This is the foundation everything else builds on.

**Project initialization:**
- `npx create-expo-app@latest timeflow --template blank-typescript`
- Install and configure: expo-router, expo-sqlite, drizzle-orm, drizzle-kit, zustand, nativewind, tailwindcss, react-native-safe-area-context, expo-status-bar
- Configure `app.json`: name "TimeFlow", slug "timeflow", scheme "timeflow", icon placeholder, splash screen with dark navy (#0a0e1a) background
- Configure `metro.config.js` for NativeWind and SQL file support
- Configure `tailwind.config.js` with the TimeFlow color palette as custom theme:
  - `tf-deep: '#0a0e1a'`, `tf-card: '#131829'`, `tf-elevated: '#1a2035'`
  - `tf-primary: '#4A90D9'`, `tf-accent: '#00d4aa'`, `tf-success: '#2ecc71'`
  - `tf-danger: '#e74c3c'`, `tf-warning: '#f0a500'`
  - `tf-text: '#e8eaed'`, `tf-text-secondary: '#9aa0b0'`, `tf-text-muted: '#5a6270'`
  - `tf-border: 'rgba(255,255,255,0.06)'`
- Configure `tsconfig.json` with path aliases (`@/` → `src/`)
- Configure `babel.config.js` with nativewind/babel preset
- Set up `nativewind-env.d.ts` for className types
- Create `global.css` with Tailwind directives (`@tailwind base/components/utilities`)

**Directory structure:**
```
src/
├── app/                    # Expo Router pages
│   ├── _layout.tsx         # Root layout (providers, fonts, splash)
│   ├── (tabs)/
│   │   ├── _layout.tsx     # Tab navigation layout
│   │   ├── index.tsx       # Dashboard (default tab)
│   │   ├── timer.tsx       # Timer page
│   │   ├── projects.tsx    # Projects management
│   │   ├── reports.tsx     # Reports
│   │   └── settings.tsx    # Settings
│   └── +not-found.tsx      # 404 page
├── components/             # Reusable UI components
│   └── ui/                 # Base UI primitives
├── db/
│   ├── client.ts           # Drizzle DB client (singleton)
│   ├── schema.ts           # Drizzle table definitions
│   └── migrations/         # SQL migration files
├── models/                 # Data access functions per entity
├── stores/                 # Zustand stores
├── hooks/                  # Custom React hooks
├── services/               # Business logic (reports, export)
├── constants/              # Colors, config, types
│   ├── colors.ts
│   └── config.ts
├── types/                  # Shared TypeScript types
│   └── index.ts
└── utils/                  # Pure utility functions
    └── time.ts             # Duration formatting, date helpers
```

**Database schema (`src/db/schema.ts` using Drizzle):**
- `clients` table: id (integer PK autoincrement), name (text unique not null), archived (integer default 0), createdAt (text default CURRENT_TIMESTAMP), updatedAt (text)
- `projects` table: id, name (text not null), color (text not null default '#4A90D9'), clientId (integer references clients, SET NULL), billable (integer default 0), hourlyRate (real default 0), archived (integer default 0), createdAt, updatedAt
- `tags` table: id, name (text unique not null), createdAt
- `timeEntries` table: id, description (text default ''), projectId (integer references projects, SET NULL), startTime (text not null), stopTime (text), durationSeconds (integer), billable (integer default 0), createdAt, updatedAt
- `timeEntryTags` junction: timeEntryId (integer references timeEntries CASCADE), tagId (integer references tags CASCADE), composite PK
- `settings` table: key (text PK), value (text)
- Create indexes on timeEntries(startTime) and timeEntries(projectId)

**Database client (`src/db/client.ts`):**
- Open database using `openDatabaseSync('timeflow.db')` from expo-sqlite
- Create Drizzle instance with `drizzle(db)`
- `initDatabase()` function that runs migrations (push schema)
- Enable WAL mode and foreign keys via PRAGMA

**Data models (`src/models/`):**
- `src/models/client.ts`: create, getAll (with includeArchived filter), getById, update, delete, getProjectCount, hasActiveProjects
- `src/models/project.ts`: create, getAll (with includeArchived), getById, update, delete, getTotalTrackedTime
- `src/models/tag.ts`: create, getAll, getById, update, delete, getUsageCount
- `src/models/timeEntry.ts`: create, getAll, getById, update, delete, getActiveEntry, stopEntry, addTags, removeTags, getTagsForEntry
- `src/models/settings.ts`: getSetting, setSetting, getWorkingHours, calculateCapacityPercent, exportAllData, importAllData
- All functions take the drizzle DB instance as first parameter
- All use proper TypeScript types with Drizzle's `InferSelectModel` / `InferInsertModel`

**Utility functions (`src/utils/time.ts`):**
- `formatDuration(seconds: number): string` → "HH:MM:SS"
- `formatTimeShort(isoString: string): string` → "HH:MM"
- `formatDate(isoString: string): string` → "YYYY-MM-DD"
- `getTodayRange(): { start: string; end: string }` → ISO strings for today start/end
- `getWeekRange(): { start: string; end: string }` → Monday to Sunday
- `getMonthRange(): { start: string; end: string }` → first to last day
- `nowISO(): string` → current time in YYYY-MM-DDTHH:MM:SS format
- `diffSeconds(start: string, end: string): number`

**Constants (`src/constants/`):**
- `config.ts`: APP_NAME, APP_VERSION, DATETIME_FORMAT, DEFAULT_PROJECT_COLOR, PROJECT_COLORS (16 colors), DEFAULT_WORKING_HOURS
- `colors.ts`: full design token object matching tailwind config (for programmatic access)

### Files to Create/Modify
- `v0.2/package.json` (via create-expo-app + npm install)
- `v0.2/app.json` — Expo configuration
- `v0.2/tsconfig.json` — TypeScript config with path aliases
- `v0.2/tailwind.config.js` — NativeWind theme with TimeFlow colors
- `v0.2/metro.config.js` — Metro bundler config for NativeWind
- `v0.2/babel.config.js` — Babel with NativeWind preset
- `v0.2/nativewind-env.d.ts` — Type declarations
- `v0.2/global.css` — Tailwind directives
- `v0.2/src/app/_layout.tsx` — Root layout (placeholder, loads DB)
- `v0.2/src/app/(tabs)/_layout.tsx` — Tab layout (placeholder)
- `v0.2/src/app/(tabs)/index.tsx` — Dashboard placeholder
- `v0.2/src/app/+not-found.tsx` — 404 page
- `v0.2/src/db/schema.ts` — Full Drizzle schema (6 tables + indexes)
- `v0.2/src/db/client.ts` — Database initialization
- `v0.2/src/models/client.ts` — Client CRUD
- `v0.2/src/models/project.ts` — Project CRUD
- `v0.2/src/models/tag.ts` — Tag CRUD
- `v0.2/src/models/timeEntry.ts` — Time entry CRUD + active entry logic
- `v0.2/src/models/settings.ts` — Settings key-value + export/import
- `v0.2/src/utils/time.ts` — Time formatting utilities
- `v0.2/src/constants/config.ts` — App constants
- `v0.2/src/constants/colors.ts` — Design tokens
- `v0.2/src/types/index.ts` — Shared TypeScript types

### Acceptance Criteria
- [ ] `npx expo start` launches without errors
- [ ] NativeWind configured — a component with `className="bg-tf-deep"` renders dark navy background
- [ ] Database initializes on app start (WAL mode, foreign keys enabled)
- [ ] All 6 tables created with correct columns, types, foreign keys, and indexes
- [ ] Client CRUD: create, read (with archived filter), update, delete all work
- [ ] Project CRUD: create with color/client/billable, read, update, delete, getTotalTrackedTime
- [ ] Tag CRUD: create (unique name), read, update, delete, getUsageCount
- [ ] TimeEntry CRUD: create, getActiveEntry (stop_time IS NULL), stopEntry, tag management
- [ ] Settings: get/set work, getWorkingHours returns 8.0 default, exportAllData returns JSON
- [ ] formatDuration(3661) returns "01:01:01"
- [ ] All utility functions have correct output for edge cases (0, negative, large values)

### Tests Required
- `src/__tests__/models/client.test.ts` — Client CRUD (create, getAll, getById, update, delete, getProjectCount)
- `src/__tests__/models/project.test.ts` — Project CRUD (create with all fields, archived filter, getTotalTrackedTime)
- `src/__tests__/models/tag.test.ts` — Tag CRUD (create unique, getUsageCount, delete cascade)
- `src/__tests__/models/timeEntry.test.ts` — TimeEntry CRUD (create, getActiveEntry, stopEntry, tag management, duration calc)
- `src/__tests__/models/settings.test.ts` — Settings (get/set, getWorkingHours default, calculateCapacityPercent, export/import)
- `src/__tests__/utils/time.test.ts` — All time utility functions
- Run with: `npx jest --verbose`
<!-- /PHASE:1 -->

<!-- PHASE:2 -->
## Phase 2: Navigation, Timer & Zustand Stores

### Branch
`phase-2-navigation-timer`

### Scope
Build the complete tab navigation, implement the timer with Zustand state management,
and create the timer screen with start/stop, manual entry, and today's entries list.

**Zustand stores (`src/stores/`):**
- `timerStore.ts`:
  - State: `isRunning`, `activeEntryId`, `description`, `projectId`, `tagIds`, `elapsedSeconds`
  - Actions: `startTimer(desc, projectId, tagIds)`, `stopTimer()`, `tick()` (increment elapsed), `syncFromDB()` (check for active entry on app start), `updateRunning(fields)`, `reset()`
  - On `startTimer`: create entry in DB, set isRunning=true, start interval
  - On `stopTimer`: stop entry in DB, set isRunning=false, clear interval
  - On `tick`: increment elapsedSeconds (called every 1s by useEffect interval)
  - On `syncFromDB`: check getActiveEntry(), if found restore state

- `navigationStore.ts` (optional, Expo Router handles most routing)

**Root layout (`src/app/_layout.tsx`):**
- Wrap app in SafeAreaProvider
- Initialize database on mount (`useEffect` → `initDatabase()`)
- Show splash screen until DB ready
- Import and apply `global.css`
- Set StatusBar style to light (dark background)

**Tab layout (`src/app/(tabs)/_layout.tsx`):**
- 5 tabs: Dashboard, Timer, Projects, Reports, Settings
- Use `@expo/vector-icons` (Ionicons) for tab icons
- Tab bar styled with dark background (`tf-card` color), active tint (`tf-accent`), inactive tint (`tf-text-muted`)
- Tab labels: "Dashboard", "Timer", "Projects", "Reports", "Settings"
- Note: Clients and Tags accessible from Settings or as sub-pages, not separate tabs (mobile-optimized — 5 tabs max)

**Timer screen (`src/app/(tabs)/timer.tsx`):**
- Timer display component:
  - Large HH:MM:SS (text-5xl, font-mono, tabular-nums)
  - Card container with border (teal border when running, muted when stopped)
  - Status label: "TRACKING" with green dot (animated pulse) / "READY" with grey dot
  - Animated border glow when running (react-native-reanimated or simple opacity animation)
- Description input: large text input with bottom-border style, placeholder "What are you working on?"
- Project picker: modal or bottom sheet with project list (color dots + names)
- Tag picker: multi-select modal with tag pills
- Start button: green gradient, full width, "▶ Start"
- Stop button: red gradient, full width, "■ Stop"
- Running info bar (when running): description + project pill + elapsed time
- Manual entry section: collapsible card with "+" header
  - Form: description, project picker, tag picker, date picker, start time, end time
  - Validation: end > start, duration <= 24h
  - Submit button
- Today's entries list (FlatList):
  - Each entry card: left color border (project), description bold, project pill, tag pills, time range, duration (monospace, right-aligned)
  - Swipe to delete (or delete button)
  - Tap to expand edit form
- Running total bar at bottom:
  - Gradient background, large duration, decimal hours, progress bar (8h workday)

**Timer hook (`src/hooks/useTimer.ts`):**
- Uses timerStore
- Sets up 1-second interval when running (useEffect with cleanup)
- Calls `tick()` every second
- On mount: calls `syncFromDB()` to resume running timer

**Shared components (create as needed):**
- `src/components/ui/Card.tsx` — styled card wrapper (bg-tf-card, rounded-xl, border)
- `src/components/ui/Badge.tsx` — pill badge (project pill, tag pill, billable badge)
- `src/components/ui/GradientButton.tsx` — start/stop buttons with gradient background
- `src/components/ui/TimerDisplay.tsx` — the large timer digits component
- `src/components/ui/EntryCard.tsx` — time entry card component
- `src/components/ui/EmptyState.tsx` — empty state with icon + message + hint
- `src/components/ProjectPicker.tsx` — modal/bottom-sheet project selector
- `src/components/TagPicker.tsx` — modal/bottom-sheet multi-select tag selector
- `src/components/ManualEntryForm.tsx` — manual time entry form
- `src/components/RunningTotal.tsx` — running total bar

### Files to Create/Modify
- `src/stores/timerStore.ts` — Zustand timer store with full logic
- `src/app/_layout.tsx` — Root layout with DB init, SafeArea, StatusBar
- `src/app/(tabs)/_layout.tsx` — Tab navigation with 5 tabs
- `src/app/(tabs)/timer.tsx` — Complete timer screen
- `src/app/(tabs)/index.tsx` — Dashboard placeholder (with "Dashboard coming in Phase 3" text)
- `src/app/(tabs)/projects.tsx` — Projects placeholder
- `src/app/(tabs)/reports.tsx` — Reports placeholder
- `src/app/(tabs)/settings.tsx` — Settings placeholder
- `src/hooks/useTimer.ts` — Timer interval hook
- `src/components/ui/Card.tsx` — Card component
- `src/components/ui/Badge.tsx` — Badge/pill component
- `src/components/ui/GradientButton.tsx` — Gradient button
- `src/components/ui/TimerDisplay.tsx` — Timer display
- `src/components/ui/EntryCard.tsx` — Entry card
- `src/components/ui/EmptyState.tsx` — Empty state
- `src/components/ProjectPicker.tsx` — Project selector
- `src/components/TagPicker.tsx` — Tag selector
- `src/components/ManualEntryForm.tsx` — Manual entry form
- `src/components/RunningTotal.tsx` — Running total bar

### Acceptance Criteria
- [ ] App opens with tab navigation showing 5 tabs with icons
- [ ] Tab bar styled with dark background and accent-colored active tab
- [ ] Timer screen shows large HH:MM:SS digits in a styled card
- [ ] Timer shows "TRACKING" / "READY" status with colored dot
- [ ] Start button creates a time entry in DB and starts counting
- [ ] Stop button stops the timer, calculates duration, saves to DB
- [ ] Timer resumes correctly if app is restarted while timer is running
- [ ] Description, project, and tags can be changed while timer is running
- [ ] Manual entry form validates and creates entries correctly
- [ ] Today's entries list shows all entries for today with project colors and durations
- [ ] Entry cards show tags as pill badges
- [ ] Running total shows today's total with progress bar
- [ ] Zustand store persists timer state across component re-renders

### Tests Required
- `src/__tests__/stores/timerStore.test.ts` — Store actions (start, stop, tick, sync, reset)
- `src/__tests__/hooks/useTimer.test.ts` — Interval setup/cleanup
- `src/__tests__/components/TimerDisplay.test.tsx` — Renders correct time, status labels
- `src/__tests__/components/EntryCard.test.tsx` — Renders entry data correctly
- Run with: `npx jest --verbose`
<!-- /PHASE:2 -->

<!-- PHASE:3 -->
## Phase 3: Dashboard & Projects Management

### Branch
`phase-3-dashboard-projects`

### Scope
Build the analytics dashboard with metric cards, charts, and recent activity.
Implement full projects management (CRUD, color picker, tracked time).

**Dashboard services (`src/services/dashboard.ts`):**
- `getTodayTotal(db): number` — sum of today's completed entry durations
- `getWeekTotal(db): number` — sum for current Mon-Sun
- `getMonthTotal(db): number` — sum for current month
- `getLast7Days(db): Array<{date: string, hours: number}>` — daily hours for bar chart
- `getProjectDistribution(db): Array<{name: string, hours: number, color: string}>` — for donut
- `getRecentEntries(db, limit): Array<{...}>` — last N completed entries
- `getMostTrackedProject(db): {name: string, hours: number, color: string} | null`

**Dashboard screen (`src/app/(tabs)/index.tsx`):**
- Three metric cards in a horizontal ScrollView:
  - Today (blue gradient top border), This Week (teal), This Month (purple)
  - Each: icon + label, large formatted value, decimal hours subtitle
- Capacity bar below metrics:
  - 12px thick, gradient fill, inline percentage text
  - Uses getWorkingHours() for baseline
- Charts section (Victory Native):
  - Bar chart: last 7 days, gradient colors (blue → teal), rounded corners
  - Donut chart: project distribution with center total, project colors, labels on segments
- Most tracked project card: project name + color dot + hours
- Recent entries: compact list (project dot + description + duration)

**Projects screen (`src/app/(tabs)/projects.tsx`):**
- New project form at top (collapsible):
  - Name input, color swatch grid (4x4), client picker, billable toggle, hourly rate
- Project list (FlatList):
  - Each project as a card with 8px left color border
  - Top row: name (large) + client badge + billable badge (rate) + archived badge
  - Bottom row: mini progress bar (relative to max tracked) + hours
  - Archive button (box icon)
  - Tap to expand edit form
- Color swatch picker component:
  - 4x4 grid of 16 preset colors
  - Selected swatch has checkmark overlay
  - Returns selected color hex

**Client management (accessible from projects or settings):**
- `src/app/clients.tsx` (stack route, not tab):
  - Create client form (name input)
  - Client list as cards with project count + project pills
  - Edit/archive/delete in expandable section
- Navigate to clients from projects screen or settings

**Tag management (accessible from settings):**
- `src/app/tags.tsx` (stack route, not tab):
  - Inline "New Tag" input with "+" button
  - Tags as grid of pill badges with usage counts
  - Expandable edit/delete per tag
  - Delete confirmation with cascade warning

**Shared components:**
- `src/components/MetricCard.tsx` — metric card with gradient border
- `src/components/CapacityBar.tsx` — capacity bar with inline percentage
- `src/components/charts/BarChart.tsx` — Victory Native bar chart (dark themed)
- `src/components/charts/DonutChart.tsx` — Victory Native donut chart
- `src/components/ColorSwatchPicker.tsx` — 4x4 color grid
- `src/components/ProjectCard.tsx` — project card with tracked time bar
- `src/components/ClientCard.tsx` — client card with project pills

### Files to Create/Modify
- `src/services/dashboard.ts` — Dashboard data aggregation functions
- `src/app/(tabs)/index.tsx` — Full dashboard screen
- `src/app/(tabs)/projects.tsx` — Full projects management screen
- `src/app/clients.tsx` — Client management screen (stack route)
- `src/app/tags.tsx` — Tag management screen (stack route)
- `src/components/MetricCard.tsx`
- `src/components/CapacityBar.tsx`
- `src/components/charts/BarChart.tsx`
- `src/components/charts/DonutChart.tsx`
- `src/components/ColorSwatchPicker.tsx`
- `src/components/ProjectCard.tsx`
- `src/components/ClientCard.tsx`

### Acceptance Criteria
- [ ] Dashboard shows 3 metric cards with today/week/month totals
- [ ] Capacity bar shows correct percentage with gradient fill
- [ ] Bar chart displays last 7 days with gradient blue-to-teal bars
- [ ] Donut chart shows project distribution with center total hours
- [ ] Most tracked project card shows correct data with color accent
- [ ] Recent entries shows last 5 completed entries
- [ ] Projects page shows project cards with left color border and tracked time bar
- [ ] Color swatch picker shows 4x4 grid with checkmark on selected
- [ ] New project form creates project with all fields (name, color, client, billable, rate)
- [ ] Archive/unarchive projects works correctly
- [ ] Clients page: create, list with project pills, edit, archive
- [ ] Tags page: create inline, grid display with usage counts, edit, delete with confirmation
- [ ] All existing tests still pass

### Tests Required
- `src/__tests__/services/dashboard.test.ts` — All dashboard aggregation functions
- `src/__tests__/components/MetricCard.test.tsx` — Renders value and label
- `src/__tests__/components/ColorSwatchPicker.test.tsx` — Selection and checkmark
- `src/__tests__/components/ProjectCard.test.tsx` — Renders project data
- Run with: `npx jest --verbose`
<!-- /PHASE:3 -->

<!-- PHASE:4 -->
## Phase 4: Reports & Export

### Branch
`phase-4-reports-export`

### Scope
Build the complete reports system with date range filters, summary/detailed/weekly views,
charts, and CSV export functionality.

**Report services (`src/services/reports.ts`):**
- `getEntriesInRange(db, startDate, endDate, filters?)`: get all completed entries in range with optional project/client/tag/billable filters
- `summaryByProject(db, startDate, endDate, filters?)`: group by project → entries_count, total_seconds, total_hours, billable_amount
- `summaryByClient(db, startDate, endDate, filters?)`: group by client
- `summaryByDay(db, startDate, endDate, filters?)`: group by date
- `detailedReport(db, startDate, endDate, filters?)`: all entries with enriched project/client/tag info
- `weeklyReport(db, startDate, endDate, filters?)`: pivot — project × day-of-week → hours
- `calculateBillableAmount(durationSeconds, hourlyRate, isBillable)`: amount calculation

**Export services (`src/services/export.ts`):**
- `entriesToCSV(entries, columns, renameMap)`: generate CSV string from array of objects
- `summaryToCSV(summaryData, groupCol)`: summary report CSV
- `weeklyToCSV(weeklyData)`: weekly pivot CSV
- Note: PDF export deferred (complex on mobile) — CSV is primary export format
- Use `expo-sharing` + `expo-file-system` to share/save CSV files

**Reports screen (`src/app/(tabs)/reports.tsx`):**
- Date range section:
  - Preset buttons row: Today, This Week, This Month, Last Month, Custom
  - Active preset highlighted with accent color
  - Custom shows date pickers
  - Date range info badge showing selected range
- Filters section (collapsible):
  - Horizontal row: project multiselect, client multiselect, tag multiselect, billable toggle
- Tab view with 3 tabs (use a simple tab component or segment control):
  - **Summary tab:**
    - Group by selector: Project / Client / Day (horizontal radio)
    - Victory Native horizontal bar chart
    - Styled table: group name (with project color dot if by project), entries count, duration, billable amount
    - Grand total bar: entries count + total duration + total billable
  - **Detailed tab:**
    - SectionList grouped by day
    - Day headers: date + day name + subtotal
    - Entry rows: description, project (with color dot), time range, duration, billable indicator
    - Grand total bar
  - **Weekly tab:**
    - Victory Native heatmap or styled grid
    - Project × day-of-week with hours values
    - Total row and column
- Export buttons: "📥 Export CSV" button per tab
  - Generates CSV, writes to temp file, opens share dialog

**Shared components:**
- `src/components/DatePresetBar.tsx` — row of date preset buttons
- `src/components/ReportFilters.tsx` — collapsible filter section
- `src/components/ReportTable.tsx` — styled table with alternating rows
- `src/components/DayHeader.tsx` — day group header for detailed report
- `src/components/GrandTotalBar.tsx` — grand total summary bar
- `src/components/charts/HorizontalBarChart.tsx` — Victory Native horizontal bars
- `src/components/charts/HeatmapGrid.tsx` — Weekly heatmap grid

### Files to Create/Modify
- `src/services/reports.ts` — Report aggregation functions
- `src/services/export.ts` — CSV export functions
- `src/app/(tabs)/reports.tsx` — Full reports screen with 3 tabs
- `src/components/DatePresetBar.tsx`
- `src/components/ReportFilters.tsx`
- `src/components/ReportTable.tsx`
- `src/components/DayHeader.tsx`
- `src/components/GrandTotalBar.tsx`
- `src/components/charts/HorizontalBarChart.tsx`
- `src/components/charts/HeatmapGrid.tsx`

### Acceptance Criteria
- [ ] Date preset buttons work: Today, This Week, This Month, Last Month, Custom
- [ ] Active preset is visually highlighted
- [ ] Filters: project, client, tag, billable — all correctly filter report data
- [ ] Summary tab: horizontal bar chart + styled table with project color dots
- [ ] Summary groups by Project/Client/Day correctly
- [ ] Detailed tab: entries grouped by day with day headers showing subtotals
- [ ] Weekly tab: project × day grid with hours values
- [ ] Grand total bar shows correct totals for all tabs
- [ ] CSV export generates valid CSV files
- [ ] Share dialog opens with generated CSV file
- [ ] Billable amounts calculated correctly (duration × rate when billable=true)
- [ ] All existing tests still pass

### Tests Required
- `src/__tests__/services/reports.test.ts` — All report aggregation functions (summary by project/client/day, detailed, weekly, billable calc)
- `src/__tests__/services/export.test.ts` — CSV generation (correct headers, values, escaping)
- `src/__tests__/components/DatePresetBar.test.tsx` — Preset selection
- `src/__tests__/components/ReportTable.test.tsx` — Renders table data
- Run with: `npx jest --verbose`
<!-- /PHASE:4 -->

<!-- PHASE:5 -->
## Phase 5: Settings, Notifications & Polish

### Branch
`phase-5-settings-polish`

### Scope
Build the settings screen, add local notifications for long-running timers,
implement data backup/restore, and apply final polish across the app.

**Settings screen (`src/app/(tabs)/settings.tsx`):**
- **Defaults section** (card):
  - Default project picker
  - Default billable toggle
  - Timezone picker (using Intl.supportedValuesOf('timeZone') or curated list)
  - Save button
- **Working hours section** (card):
  - Number input (0.5-24.0, step 0.5)
  - Used for dashboard capacity calculation
  - Save button
- **Data management section** (card):
  - Export: "Generate backup" → JSON file via expo-sharing
  - Import: file picker → parse JSON → importAllData()
  - Warning about data replacement on import
- **Management links section** (card):
  - "Manage Clients" → navigates to `/clients`
  - "Manage Tags" → navigates to `/tags`
- **About section** (card):
  - App name, version, tech stack

**Local notifications (`src/services/notifications.ts`):**
- Request notification permissions on first launch
- Schedule notification when timer has been running for 2 hours: "Timer running for 2 hours"
- Schedule notification at 4 hours: "Timer running for 4 hours — forgot to stop?"
- Cancel scheduled notifications when timer is stopped
- Uses `expo-notifications` for local notifications

**Final polish across all screens:**
- Loading states: skeleton placeholders while DB queries run
- Error handling: try-catch around all DB operations with user-friendly alerts
- Haptic feedback on timer start/stop (`expo-haptics`)
- Pull-to-refresh on entry lists and dashboard
- Keyboard avoidance on forms (KeyboardAvoidingView)
- Dark status bar on all screens
- Smooth transitions between tabs
- Empty states with icons and hints on all list screens
- Toast notifications for success/error (use a lightweight toast library or custom component)
- App icon and splash screen with TimeFlow branding

**Performance:**
- Use `useMemo` for expensive calculations (report aggregations)
- Use `useCallback` for handler functions passed to lists
- FlatList optimizations: `getItemLayout`, `removeClippedSubviews`, `windowSize`
- Lazy load charts (only render when visible)

### Files to Create/Modify
- `src/app/(tabs)/settings.tsx` — Full settings screen
- `src/services/notifications.ts` — Local notification scheduling
- `src/components/ui/Toast.tsx` — Toast notification component
- `src/components/ui/Skeleton.tsx` — Loading skeleton component
- Update `src/stores/timerStore.ts` — Add notification scheduling on start/stop
- Update `src/app/_layout.tsx` — Request notification permissions
- Update all screens — Add loading states, error handling, haptic feedback
- `assets/icon.png` — App icon (placeholder or generated)
- `assets/splash.png` — Splash screen
- Update `app.json` — Final configuration (icon, splash, permissions)

### Acceptance Criteria
- [ ] Settings page shows all 5 sections as styled cards
- [ ] Default project/billable/timezone settings persist correctly
- [ ] Working hours setting affects dashboard capacity calculation
- [ ] JSON export generates valid backup file and opens share dialog
- [ ] JSON import restores all data correctly (with confirmation warning)
- [ ] Manage Clients / Tags links navigate to correct screens
- [ ] Local notification fires after 2 hours of running timer
- [ ] Notifications are cancelled when timer is stopped
- [ ] All screens show loading states while data loads
- [ ] All forms have keyboard avoidance
- [ ] Haptic feedback on timer start/stop
- [ ] Empty states shown on all empty lists
- [ ] Toast notifications for all create/update/delete actions
- [ ] App icon and splash screen configured
- [ ] All existing tests still pass

### Tests Required
- `src/__tests__/services/notifications.test.ts` — Notification scheduling/cancellation
- `src/__tests__/components/settings.test.tsx` — Settings form rendering and persistence
- Full regression: `npx jest --verbose` — all tests pass
<!-- /PHASE:5 -->
