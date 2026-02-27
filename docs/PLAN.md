# Implementation Plan: TimeFlow UI/UX Overhaul

> Transform the functional but plain Streamlit app into a polished, visually distinctive time tracker.
> Directory structure uses `views/` (not `pages/` — Streamlit auto-discovers `pages/`).

<!-- PHASE:1 -->
## Phase 1: Design System & Sidebar Redesign

### Branch
`phase-1-design-system`

### Scope
Create a comprehensive CSS design system and completely redesign the sidebar navigation. This phase establishes the visual foundation that all other phases build upon.

**Design system (`ui/styles.py` — full rewrite):**
- CSS custom properties (variables) for consistent theming: `--tf-primary`, `--tf-accent`, `--tf-success`, `--tf-danger`, `--tf-bg-card`, `--tf-bg-elevated`, `--tf-border`, `--tf-text-primary`, `--tf-text-secondary`, `--tf-text-muted`, `--tf-radius-sm/md/lg`, `--tf-shadow-sm/md/lg`
- Color palette: deep navy background (#0a0e1a), card surfaces (#131829), elevated surfaces (#1a2035), primary blue (#4A90D9), accent teal (#00d4aa), success green (#2ecc71), danger red (#e74c3c), warning amber (#f0a500)
- Typography: system font stack with clear hierarchy (page title 2rem bold, section header 1.3rem semibold, body 1rem, caption 0.85rem)
- Card component CSS: `.tf-card` with background, border, border-radius 12px, subtle shadow, hover lift effect (transform + shadow transition)
- `.tf-card-header`, `.tf-card-body`, `.tf-card-footer` for structured card layouts
- Metric card CSS: `.tf-metric` with gradient top border (2px) using project or category color
- Badge CSS: `.tf-badge` (small rounded pill for tags), `.tf-badge-billable`, `.tf-badge-archived`
- Button overrides: rounded corners, better padding, primary buttons with gradient background
- Form input overrides: subtle border, focus ring with primary color glow
- Animation keyframes: `@keyframes pulse` (for running timer), `@keyframes fadeIn` (for page transitions), `@keyframes slideUp` (for cards appearing)
- Scrollbar styling for dark theme
- Responsive spacing utilities: `.tf-mt-1` through `.tf-mt-4`, `.tf-p-1` through `.tf-p-4`

**Sidebar redesign (`app.py`):**
- Replace plain `st.sidebar.radio()` with custom HTML/CSS navigation
- Each nav item: icon (emoji or Unicode symbol) + label, with active state highlight (left border accent + background highlight)
- Navigation items: ⊞ Dashboard, ⏱ Timer, ◐ Projects, ◑ Clients, ⊘ Tags, ◔ Reports, ⚙ Settings
- Use `st.sidebar.markdown()` with custom HTML buttons that set `st.session_state.current_page`
- Sidebar footer: version info + "TimeFlow" branding with subtle styling
- Collapse the label-less radio and use custom clickable elements via `st.sidebar.button()` with unique keys
- Active page indicator: highlighted background + left accent border on the selected item

**Theme update (`.streamlit/config.toml`):**
- backgroundColor: `#0a0e1a` (deep navy)
- secondaryBackgroundColor: `#131829` (card surface)
- primaryColor: `#4A90D9`
- textColor: `#e8eaed`
- font: `sans serif`

### Files to Create/Modify
- `ui/styles.py` — full rewrite with CSS design system (variables, cards, badges, animations, utilities)
- `.streamlit/config.toml` — updated dark theme colors
- `app.py` — sidebar redesign with icon navigation, apply design system CSS
- `ui/components.py` — add `nav_item()` helper if needed for sidebar buttons

### Acceptance Criteria
- [ ] CSS variables defined and used consistently across all style definitions
- [ ] `.tf-card` class creates visible card with background, border, radius, shadow, hover effect
- [ ] Sidebar shows icon + label for each page with visual active state
- [ ] Clicking sidebar items navigates between pages correctly
- [ ] Dark theme colors are cohesive (navy backgrounds, not pure black)
- [ ] Animations defined: pulse, fadeIn, slideUp
- [ ] All existing pages still render correctly after changes
- [ ] All 229 existing tests still pass

### Tests Required
- All 229 existing tests pass — `python -m pytest tests/ -v`
- Visual verification: app starts and sidebar navigation works for all 7 pages
<!-- /PHASE:1 -->

<!-- PHASE:2 -->
## Phase 2: Timer Page Premium Redesign

### Branch
`phase-2-timer-redesign`

### Scope
Transform the timer page into a visually striking, app-like experience. The timer is the most-used page and needs to feel premium.

**Timer component redesign (`ui/components.py` — update `timer_display()`):**
- Large timer in a centered card with gradient border (teal when running, muted when stopped)
- Time digits: 5rem font size, tabular-nums font-feature, letter-spacing 4px
- Pulsing glow animation when running (CSS `animation: pulse 2s infinite`)
- Subtle label above timer: "TRACKING" (with green dot) when running, "READY" when stopped
- Colon separator blinks when running (CSS animation)

**Timer controls redesign (`views/timer.py`):**
- Description input: larger, styled as a hero input (bigger font, transparent background, bottom-border-only style via CSS)
- Project + Tags row: project as a colored chip/pill (not a dropdown label), tags as small badges
- Start button: large, green gradient, full width, with play icon "▶ Start"
- Stop button: large, red gradient, full width, with stop icon "■ Stop"
- When running: show a compact bar below timer with description + project pill + elapsed

**Entry cards redesign (`ui/components.py` — update `entry_card()`):**
- Each entry wrapped in `.tf-card` with left color border matching project color
- Layout: left section (description bold + tags as badges below), right section (time range + duration large)
- Project shown as colored pill badge
- Duration in monospace, right-aligned, prominent
- Edit form: opens inside the card (smoother than expander), or keep expander but style it
- Delete: red text button, not a separate form submit

**Manual entry section (`views/timer.py`):**
- Styled as a collapsed `.tf-card` with "+" icon header
- Form inside with better spacing and visual grouping

**Running total (`ui/components.py` — update `running_total_display()`):**
- Styled as a sticky-looking bar at bottom with gradient background
- Large centered duration + decimal hours + progress indicator

### Files to Create/Modify
- `ui/components.py` — redesign timer_display(), entry_card(), running_total_display()
- `views/timer.py` — redesign timer controls, manual entry section, entry list layout
- `ui/styles.py` — add timer-specific CSS (pulse animation, hero input, gradient buttons, entry card with project border)

### Acceptance Criteria
- [ ] Timer display has large digits with pulsing glow animation when running
- [ ] Timer shows "TRACKING" / "READY" status label
- [ ] Start button is green gradient with "▶ Start" label
- [ ] Stop button is red gradient with "■ Stop" label
- [ ] Entry cards have left border matching project color
- [ ] Entry cards show tags as pill badges
- [ ] Entry duration is prominent and monospace
- [ ] Manual entry is in a styled collapsible card
- [ ] Running total bar has gradient background
- [ ] All 229 tests still pass

### Tests Required
- All 229 existing tests pass — `python -m pytest tests/ -v`
<!-- /PHASE:2 -->

<!-- PHASE:3 -->
## Phase 3: Dashboard & Reports Visual Upgrade

### Branch
`phase-3-dashboard-reports`

### Scope
Upgrade the dashboard to feel like a real analytics dashboard. Style the reports page for professional output.

**Dashboard metrics (`views/dashboard.py`):**
- Three metric cards as `.tf-card` with gradient top border (blue/teal/purple)
- Each card: emoji icon + label on top, large value in center, subtle help text below
- Metric values with tabular-nums for aligned digits

**Dashboard charts (`ui/charts.py` — restyle all charts):**
- Plotly layout template matching the dark theme: transparent bg, navy grid lines, light text
- Bar chart: gradient fill bars (blue to teal), rounded corners, hover with value labels
- Donut chart: project colors, center text showing total hours, no legend (labels on segments)
- Consistent chart height and margins

**Dashboard layout (`views/dashboard.py`):**
- Capacity bar: thicker (12px), with percentage text inside the bar (if >30%), gradient fill
- "Most Tracked This Week" as a `.tf-card` with project color accent and large hours display
- "Recent Entries" as mini entry cards with project dot + description + time

**Reports page (`views/reports.py`):**
- Filter bar: horizontal row of filter pills/chips instead of vertically stacked selectboxes
- Date range presets as styled button group (pills) instead of selectbox
- Tab styling: custom-styled tabs with active indicator
- Summary table: alternating row backgrounds, project color dots inline
- Detailed table: grouped by day with styled day headers (date + day-of-week + subtotal)
- Weekly heatmap: styled with project colors, cell values formatted
- Export buttons: styled as icon buttons (📥 CSV, 📄 PDF) in a row

### Files to Create/Modify
- `views/dashboard.py` — redesign with card-based metrics, styled capacity bar
- `views/reports.py` — redesign filters, tabs, tables
- `ui/charts.py` — create dark-themed plotly layout template, apply to all charts
- `ui/styles.py` — add dashboard/report-specific CSS (metric cards, filter bar, table styling)
- `ui/components.py` — update capacity_bar() with gradient and inline percentage

### Acceptance Criteria
- [ ] Dashboard metrics are in styled cards with gradient top borders
- [ ] Plotly charts have dark theme matching the app (transparent bg, themed colors)
- [ ] Bar chart has gradient fill, donut chart has center total
- [ ] Capacity bar is thicker with inline percentage text
- [ ] Reports filter section is more compact (horizontal layout where possible)
- [ ] Summary/Detailed tables have styled rows with project color indicators
- [ ] Export buttons are visually distinct icons
- [ ] All 229 tests still pass

### Tests Required
- All 229 existing tests pass — `python -m pytest tests/ -v`
<!-- /PHASE:3 -->

<!-- PHASE:4 -->
## Phase 4: Management Pages & Final Polish

### Branch
`phase-4-management-polish`

### Scope
Redesign Projects, Clients, Tags pages with card-based layouts. Add final polish and micro-interactions.

**Projects page (`views/projects.py`):**
- Each project as a `.tf-card` with large left color stripe (8px solid border-left)
- Card layout: top row (name large + client badge + billable badge), bottom row (tracked time bar + hours)
- Tracked time shown as a mini progress bar (relative to project with most time)
- Color picker: visual grid of color swatches (4x4 grid) instead of dropdown, selected one has checkmark overlay
- Archive button as a subtle icon button (📦), not a full button
- "New Project" form in a prominent card at top with accent border

**Clients page (`views/clients.py`):**
- Each client as a `.tf-card` with project count badge and list of linked project names (as colored pills)
- Simple, clean layout with name large and metadata small

**Tags page (`views/tags.py`):**
- Tags displayed as a grid of pill badges (not a list)
- Each tag pill shows usage count as a small number badge
- Clicking a tag pill expands inline edit
- "New Tag" as a simple inline input with "+" button

**Final polish across all pages:**
- Page titles with subtle underline decoration
- Consistent spacing: 1.5rem between sections
- Form labels: smaller, muted color, uppercase letter-spacing
- Success/error states: styled inline messages, not default Streamlit boxes
- Loading states: subtle spinner when data loads
- Smooth page transitions via fadeIn animation on main content

### Files to Create/Modify
- `views/projects.py` — card-based layout, visual color picker grid
- `views/clients.py` — card-based layout with project pills
- `views/tags.py` — grid layout with pill badges
- `views/settings.py` — styled sections with cards
- `ui/styles.py` — add management page CSS (color picker grid, tag grid, form label styling)
- `ui/components.py` — add color_swatch_picker(), tag_pill() helpers

### Acceptance Criteria
- [ ] Projects shown as cards with large color stripe on left
- [ ] Color picker is a visual 4x4 swatch grid with selection indicator
- [ ] Clients shown as cards with project pills
- [ ] Tags displayed as a grid of pill badges with usage counts
- [ ] All form labels have consistent muted styling
- [ ] Page content fades in with animation
- [ ] Settings page uses card sections
- [ ] All 229 tests still pass

### Tests Required
- All 229 existing tests pass — `python -m pytest tests/ -v`
<!-- /PHASE:4 -->
