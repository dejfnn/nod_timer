"""Comprehensive CSS design system for TimeFlow.

Defines CSS custom properties, component styles, animations, and utilities.
Each constant is a CSS string injected via
``st.markdown(STYLE_CONSTANT, unsafe_allow_html=True)``.

Color palette:
    - Deep navy background: #0a0e1a
    - Card surfaces: #131829
    - Elevated surfaces: #1a2035
    - Primary blue: #4A90D9
    - Accent teal: #00d4aa
    - Success green: #2ecc71
    - Danger red: #e74c3c
    - Warning amber: #f0a500

Timer-specific styles (Phase 2) are in ``TIMER_STYLES``.
Dashboard-specific styles (Phase 3) are in ``DASHBOARD_STYLES``.
Reports-specific styles (Phase 3) are in ``REPORTS_STYLES``.
Management page styles (Phase 4) are in ``MANAGEMENT_STYLES``.
"""

# ---------------------------------------------------------------------------
# Global application styles — design system foundation
# ---------------------------------------------------------------------------
GLOBAL_STYLES: str = """
<style>
/* ===================================================================
   CSS CUSTOM PROPERTIES (Design Tokens)
   =================================================================== */
:root {
    /* Brand / accent colors */
    --tf-primary: #4A90D9;
    --tf-primary-hover: #5a9fe8;
    --tf-accent: #00d4aa;
    --tf-accent-hover: #00e8bb;
    --tf-success: #2ecc71;
    --tf-danger: #e74c3c;
    --tf-danger-hover: #f05a4a;
    --tf-warning: #f0a500;

    /* Background surfaces */
    --tf-bg-deep: #0a0e1a;
    --tf-bg-card: #131829;
    --tf-bg-elevated: #1a2035;
    --tf-bg-hover: #1e2540;

    /* Borders */
    --tf-border: rgba(255, 255, 255, 0.06);
    --tf-border-strong: rgba(255, 255, 255, 0.12);

    /* Text hierarchy */
    --tf-text-primary: #e8eaed;
    --tf-text-secondary: #9aa0b0;
    --tf-text-muted: #5a6270;

    /* Border radii */
    --tf-radius-sm: 6px;
    --tf-radius-md: 10px;
    --tf-radius-lg: 16px;

    /* Shadows */
    --tf-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.25);
    --tf-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.35);
    --tf-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.45);

    /* Typography */
    --tf-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
    --tf-font-title: 2rem;
    --tf-font-section: 1.3rem;
    --tf-font-body: 1rem;
    --tf-font-caption: 0.85rem;
}

/* ===================================================================
   TYPOGRAPHY
   =================================================================== */
h1 {
    font-size: var(--tf-font-title) !important;
    font-weight: 700 !important;
    color: var(--tf-text-primary) !important;
    letter-spacing: -0.02em;
}

h2 {
    font-size: var(--tf-font-section) !important;
    font-weight: 600 !important;
    color: var(--tf-text-primary) !important;
}

h3 {
    font-size: 1.1rem !important;
    font-weight: 600 !important;
    color: var(--tf-text-secondary) !important;
}

/* ===================================================================
   CARD COMPONENTS
   =================================================================== */
.tf-card {
    background: var(--tf-bg-card);
    border: 1px solid var(--tf-border);
    border-radius: 12px;
    box-shadow: var(--tf-shadow-sm);
    padding: 20px;
    margin-bottom: 16px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tf-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--tf-shadow-md);
}

.tf-card-header {
    padding-bottom: 12px;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--tf-border);
    font-weight: 600;
    font-size: 1.05rem;
    color: var(--tf-text-primary);
}

.tf-card-body {
    color: var(--tf-text-secondary);
    line-height: 1.6;
}

.tf-card-footer {
    padding-top: 12px;
    margin-top: 12px;
    border-top: 1px solid var(--tf-border);
    font-size: var(--tf-font-caption);
    color: var(--tf-text-muted);
}

/* ===================================================================
   METRIC CARDS
   =================================================================== */
.tf-metric {
    background: var(--tf-bg-card);
    border: 1px solid var(--tf-border);
    border-radius: 12px;
    padding: 20px;
    position: relative;
    overflow: hidden;
}

.tf-metric::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--tf-primary), var(--tf-accent));
}

/* Streamlit metric override */
div[data-testid="stMetric"] {
    background-color: var(--tf-bg-card);
    border: 1px solid var(--tf-border);
    border-radius: 12px;
    padding: 16px 20px;
    box-shadow: var(--tf-shadow-sm);
}

div[data-testid="stMetric"] label {
    color: var(--tf-text-secondary) !important;
    font-size: var(--tf-font-caption) !important;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

div[data-testid="stMetric"] [data-testid="stMetricValue"] {
    color: var(--tf-text-primary) !important;
    font-weight: 700 !important;
    font-variant-numeric: tabular-nums;
}

/* ===================================================================
   BADGES
   =================================================================== */
.tf-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 500;
    line-height: 1.6;
    letter-spacing: 0.02em;
    background: var(--tf-bg-elevated);
    color: var(--tf-text-secondary);
    border: 1px solid var(--tf-border);
}

.tf-badge-billable {
    background: rgba(46, 204, 113, 0.12);
    color: var(--tf-success);
    border-color: rgba(46, 204, 113, 0.25);
}

.tf-badge-archived {
    background: rgba(90, 98, 112, 0.15);
    color: var(--tf-text-muted);
    border-color: rgba(90, 98, 112, 0.25);
}

/* ===================================================================
   BUTTON OVERRIDES
   =================================================================== */
.stButton > button {
    border-radius: var(--tf-radius-sm) !important;
    font-weight: 500 !important;
    padding: 0.4rem 1.2rem !important;
    transition: all 0.2s ease !important;
    border: 1px solid var(--tf-border-strong) !important;
}

.stButton > button:hover {
    transform: translateY(-1px);
    box-shadow: var(--tf-shadow-sm);
}

/* Primary button style */
.stButton > button[kind="primary"],
.stButton > button[data-testid="stFormSubmitButton"] {
    background: linear-gradient(135deg, var(--tf-primary), #3a7bc8) !important;
    border: none !important;
    color: white !important;
}

.stButton > button[kind="primary"]:hover {
    background: linear-gradient(135deg, var(--tf-primary-hover), #4a8bd8) !important;
}

/* ===================================================================
   FORM INPUT OVERRIDES
   =================================================================== */
.stTextInput > div > div > input,
.stTextArea > div > div > textarea,
.stSelectbox > div > div,
.stMultiSelect > div > div {
    border: 1px solid var(--tf-border-strong) !important;
    border-radius: var(--tf-radius-sm) !important;
    transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
}

.stTextInput > div > div > input:focus,
.stTextArea > div > div > textarea:focus {
    border-color: var(--tf-primary) !important;
    box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.15) !important;
}

/* ===================================================================
   TIMER DISPLAY
   =================================================================== */
.timer-display {
    text-align: center;
    padding: 20px;
    font-family: 'Courier New', monospace;
}

.timer-display .time {
    font-size: 4rem;
    font-weight: bold;
    font-variant-numeric: tabular-nums;
}

/* ===================================================================
   PROJECT COLOR DOT
   =================================================================== */
.project-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 6px;
    vertical-align: middle;
}

/* ===================================================================
   ENTRY CARD LAYOUT
   =================================================================== */
.entry-card {
    padding: 14px 18px;
    border-radius: var(--tf-radius-md);
    border: 1px solid var(--tf-border);
    margin-bottom: 8px;
    background: var(--tf-bg-card);
    transition: background-color 0.2s ease, transform 0.15s ease;
}

.entry-card:hover {
    background-color: var(--tf-bg-hover);
    transform: translateX(2px);
}

/* ===================================================================
   RUNNING TOTAL BAR
   =================================================================== */
.running-total {
    text-align: center;
    padding: 12px;
    background: rgba(46, 204, 113, 0.08);
    border: 1px solid rgba(46, 204, 113, 0.2);
    border-radius: var(--tf-radius-md);
    margin-top: 12px;
}

/* ===================================================================
   CAPACITY BAR
   =================================================================== */
.capacity-bar-container {
    margin-top: 8px;
    padding: 4px 0;
}

.capacity-bar {
    height: 8px;
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.06);
    overflow: hidden;
}

.capacity-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.4s ease;
}

/* ===================================================================
   EMPTY STATE
   =================================================================== */
.empty-state {
    text-align: center;
    padding: 48px 20px;
    color: var(--tf-text-muted);
}

.empty-state .icon {
    font-size: 3rem;
    margin-bottom: 14px;
}

.empty-state .message {
    font-size: 1.1rem;
    margin-bottom: 8px;
    color: var(--tf-text-secondary);
}

.empty-state .hint {
    font-size: 0.9rem;
    color: var(--tf-text-muted);
}

/* ===================================================================
   SIDEBAR NAVIGATION
   =================================================================== */
section[data-testid="stSidebar"] {
    background-color: var(--tf-bg-card) !important;
    border-right: 1px solid var(--tf-border) !important;
}

/* Style sidebar radio buttons to look like nav items */
section[data-testid="stSidebar"] [role="radiogroup"] {
    gap: 2px !important;
}

section[data-testid="stSidebar"] [role="radiogroup"] label {
    padding: 10px 16px !important;
    border-radius: var(--tf-radius-sm) !important;
    margin: 0 !important;
    transition: background-color 0.15s ease, border-left 0.15s ease !important;
    border-left: 3px solid transparent !important;
    cursor: pointer !important;
}

section[data-testid="stSidebar"] [role="radiogroup"] label:hover {
    background-color: var(--tf-bg-hover) !important;
}

/* Active / selected nav item */
section[data-testid="stSidebar"] [role="radiogroup"] label[data-checked="true"],
section[data-testid="stSidebar"] [role="radiogroup"] label:has(input:checked) {
    background-color: rgba(74, 144, 217, 0.12) !important;
    border-left: 3px solid var(--tf-primary) !important;
}

/* Hide the default radio button circle */
section[data-testid="stSidebar"] [role="radiogroup"] label > div:first-child {
    display: none !important;
}

/* Nav label text styling */
section[data-testid="stSidebar"] [role="radiogroup"] label p {
    font-size: 0.95rem !important;
    font-weight: 500 !important;
    color: var(--tf-text-secondary) !important;
    letter-spacing: 0.01em !important;
}

section[data-testid="stSidebar"] [role="radiogroup"] label[data-checked="true"] p,
section[data-testid="stSidebar"] [role="radiogroup"] label:has(input:checked) p {
    color: var(--tf-text-primary) !important;
    font-weight: 600 !important;
}

/* Hide the "Navigation" label above the radio group */
section[data-testid="stSidebar"] .stRadio > label {
    display: none !important;
}

/* Sidebar branding area */
.sidebar-brand {
    padding: 12px 16px 20px 16px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--tf-border);
}

.sidebar-brand .brand-name {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--tf-text-primary);
    letter-spacing: -0.02em;
}

.sidebar-brand .brand-version {
    font-size: 0.78rem;
    color: var(--tf-text-muted);
    margin-top: 2px;
}

.sidebar-footer {
    padding: 16px;
    margin-top: 24px;
    border-top: 1px solid var(--tf-border);
    text-align: center;
}

.sidebar-footer .footer-text {
    font-size: 0.75rem;
    color: var(--tf-text-muted);
    letter-spacing: 0.03em;
}

/* ===================================================================
   DATA TABLE
   =================================================================== */
.stDataFrame thead th {
    background-color: var(--tf-bg-elevated) !important;
    font-weight: 600;
    color: var(--tf-text-secondary) !important;
}

/* ===================================================================
   ANIMATION KEYFRAMES
   =================================================================== */
@keyframes pulse {
    0% {
        box-shadow: 0 0 0 0 rgba(74, 144, 217, 0.4);
    }
    50% {
        box-shadow: 0 0 0 12px rgba(74, 144, 217, 0);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(74, 144, 217, 0);
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(16px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Utility classes for animations */
.tf-pulse {
    animation: pulse 2s infinite;
}

.tf-fade-in {
    animation: fadeIn 0.3s ease-out;
}

.tf-slide-up {
    animation: slideUp 0.35s ease-out;
}

/* ===================================================================
   SCROLLBAR STYLING (Dark Theme)
   =================================================================== */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--tf-bg-deep);
}

::-webkit-scrollbar-thumb {
    background: var(--tf-bg-elevated);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.15);
}

/* Firefox scrollbar */
* {
    scrollbar-width: thin;
    scrollbar-color: var(--tf-bg-elevated) var(--tf-bg-deep);
}

/* ===================================================================
   SPACING UTILITIES
   =================================================================== */
.tf-mt-1 { margin-top: 0.5rem; }
.tf-mt-2 { margin-top: 1rem; }
.tf-mt-3 { margin-top: 1.5rem; }
.tf-mt-4 { margin-top: 2rem; }

.tf-mb-1 { margin-bottom: 0.5rem; }
.tf-mb-2 { margin-bottom: 1rem; }
.tf-mb-3 { margin-bottom: 1.5rem; }
.tf-mb-4 { margin-bottom: 2rem; }

.tf-p-1 { padding: 0.5rem; }
.tf-p-2 { padding: 1rem; }
.tf-p-3 { padding: 1.5rem; }
.tf-p-4 { padding: 2rem; }

/* ===================================================================
   HIDE STREAMLIT DEFAULTS
   =================================================================== */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}

/* ===================================================================
   EXPANDER STYLING
   =================================================================== */
details[data-testid="stExpander"] {
    border: 1px solid var(--tf-border) !important;
    border-radius: var(--tf-radius-md) !important;
    background: var(--tf-bg-card) !important;
}

details[data-testid="stExpander"] summary {
    color: var(--tf-text-secondary) !important;
}
</style>
"""

# ---------------------------------------------------------------------------
# Page-specific styles for the settings page
# ---------------------------------------------------------------------------
SETTINGS_STYLES: str = """
<style>
.settings-section {
    padding: 20px;
    border: 1px solid var(--tf-border);
    border-radius: 12px;
    margin-bottom: 16px;
    background: var(--tf-bg-card);
}

.settings-section h3 {
    margin-top: 0;
    color: var(--tf-text-primary);
}

.about-section {
    text-align: center;
    padding: 24px;
    border: 1px solid var(--tf-border);
    border-radius: 12px;
    background: var(--tf-bg-card);
}
</style>
"""

# ---------------------------------------------------------------------------
# Export button styling
# ---------------------------------------------------------------------------
EXPORT_STYLES: str = """
<style>
.export-buttons {
    display: flex;
    gap: 8px;
    margin-top: 8px;
}
</style>
"""

# ---------------------------------------------------------------------------
# Timer page styles (Phase 2 — premium timer redesign)
# ---------------------------------------------------------------------------
TIMER_STYLES: str = """
<style>
/* ===================================================================
   PREMIUM TIMER DISPLAY
   =================================================================== */

/* Timer card — centred container with gradient border */
.tf-timer-card {
    background: var(--tf-bg-card);
    border-radius: 16px;
    padding: 32px 24px 28px;
    margin: 0 auto 20px;
    max-width: 480px;
    text-align: center;
    position: relative;
    border: 2px solid var(--tf-border);
    transition: border-color 0.4s ease, box-shadow 0.4s ease;
}

/* Gradient border when timer is running (teal glow) */
.tf-timer-card.running {
    border-color: var(--tf-accent);
    box-shadow: 0 0 24px rgba(0, 212, 170, 0.18),
                0 0 48px rgba(0, 212, 170, 0.06);
    animation: timerPulse 2s infinite;
}

/* Muted border when timer is stopped */
.tf-timer-card.stopped {
    border-color: var(--tf-border-strong);
}

@keyframes timerPulse {
    0% {
        box-shadow: 0 0 24px rgba(0, 212, 170, 0.18),
                    0 0 48px rgba(0, 212, 170, 0.06);
    }
    50% {
        box-shadow: 0 0 32px rgba(0, 212, 170, 0.30),
                    0 0 64px rgba(0, 212, 170, 0.10);
    }
    100% {
        box-shadow: 0 0 24px rgba(0, 212, 170, 0.18),
                    0 0 48px rgba(0, 212, 170, 0.06);
    }
}

/* Status label above timer — "TRACKING" / "READY" */
.tf-timer-status {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.tf-timer-status.tracking {
    color: var(--tf-success);
}

.tf-timer-status.ready {
    color: var(--tf-text-muted);
}

/* Green pulsing dot next to "TRACKING" */
.tf-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
}

.tf-status-dot.active {
    background-color: var(--tf-success);
    animation: dotPulse 1.5s infinite;
}

.tf-status-dot.inactive {
    background-color: var(--tf-text-muted);
}

@keyframes dotPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
}

/* Time digits — large monospace */
.tf-timer-digits {
    font-size: 5rem;
    font-weight: 700;
    font-family: 'Courier New', ui-monospace, SFMono-Regular, monospace;
    font-variant-numeric: tabular-nums;
    letter-spacing: 4px;
    color: var(--tf-text-primary);
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Blinking colon separator when running */
.tf-timer-colon {
    display: inline-block;
    min-width: 0.4em;
    text-align: center;
}

.tf-timer-colon.blink {
    animation: colonBlink 1s steps(1) infinite;
}

@keyframes colonBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.2; }
}

/* ===================================================================
   HERO INPUT (description field)
   =================================================================== */
.tf-hero-input {
    margin-bottom: 12px;
}

/* Override Streamlit input inside hero-input wrapper */
.tf-hero-input .stTextInput > div > div > input {
    font-size: 1.15rem !important;
    background: transparent !important;
    border: none !important;
    border-bottom: 2px solid var(--tf-border-strong) !important;
    border-radius: 0 !important;
    padding: 8px 4px !important;
    color: var(--tf-text-primary) !important;
    transition: border-color 0.2s ease !important;
}

.tf-hero-input .stTextInput > div > div > input:focus {
    border-bottom-color: var(--tf-accent) !important;
    box-shadow: none !important;
}

.tf-hero-input .stTextInput > div > div > input::placeholder {
    color: var(--tf-text-muted) !important;
    font-style: italic;
}

/* ===================================================================
   GRADIENT ACTION BUTTONS (Start / Stop)
   =================================================================== */

/* Start button — green gradient */
.tf-btn-start .stButton > button {
    background: linear-gradient(135deg, var(--tf-success), #27ae60) !important;
    color: white !important;
    border: none !important;
    font-size: 1.1rem !important;
    font-weight: 600 !important;
    padding: 0.65rem 1.5rem !important;
    border-radius: var(--tf-radius-md) !important;
    letter-spacing: 0.03em !important;
    transition: transform 0.15s ease, box-shadow 0.15s ease !important;
}

.tf-btn-start .stButton > button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 4px 16px rgba(46, 204, 113, 0.35) !important;
}

/* Stop button — red gradient */
.tf-btn-stop .stButton > button {
    background: linear-gradient(135deg, var(--tf-danger), #c0392b) !important;
    color: white !important;
    border: none !important;
    font-size: 1.1rem !important;
    font-weight: 600 !important;
    padding: 0.65rem 1.5rem !important;
    border-radius: var(--tf-radius-md) !important;
    letter-spacing: 0.03em !important;
    transition: transform 0.15s ease, box-shadow 0.15s ease !important;
}

.tf-btn-stop .stButton > button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 4px 16px rgba(231, 76, 60, 0.35) !important;
}

/* ===================================================================
   RUNNING INFO BAR (compact bar below timer when running)
   =================================================================== */
.tf-running-bar {
    background: var(--tf-bg-elevated);
    border: 1px solid var(--tf-border);
    border-radius: var(--tf-radius-md);
    padding: 10px 16px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.tf-running-bar .desc {
    font-weight: 500;
    color: var(--tf-text-primary);
    flex: 1;
    min-width: 100px;
}

/* Project pill / chip — colored background */
.tf-project-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 12px;
    border-radius: 20px;
    font-size: 0.82rem;
    font-weight: 500;
    line-height: 1.6;
    white-space: nowrap;
}

.tf-project-pill .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
}

/* ===================================================================
   ENTRY CARDS (redesigned with project color border)
   =================================================================== */
.tf-entry-card {
    background: var(--tf-bg-card);
    border: 1px solid var(--tf-border);
    border-radius: var(--tf-radius-md);
    padding: 16px 18px;
    margin-bottom: 10px;
    border-left: 4px solid var(--tf-border-strong);
    transition: background-color 0.2s ease, transform 0.15s ease;
    animation: slideUp 0.35s ease-out;
}

.tf-entry-card:hover {
    background-color: var(--tf-bg-hover);
    transform: translateX(2px);
}

.tf-entry-desc {
    font-weight: 600;
    font-size: 1rem;
    color: var(--tf-text-primary);
    margin-bottom: 4px;
}

.tf-entry-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
}

.tf-tag-pill {
    display: inline-flex;
    align-items: center;
    padding: 1px 8px;
    border-radius: 12px;
    font-size: 0.72rem;
    font-weight: 500;
    background: var(--tf-bg-elevated);
    color: var(--tf-text-secondary);
    border: 1px solid var(--tf-border);
}

.tf-entry-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.tf-entry-time-range {
    font-size: 0.85rem;
    color: var(--tf-text-secondary);
}

.tf-entry-duration {
    font-family: 'Courier New', ui-monospace, SFMono-Regular, monospace;
    font-variant-numeric: tabular-nums;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--tf-text-primary);
}

/* Delete button styling */
.tf-btn-delete .stButton > button {
    color: var(--tf-danger) !important;
    background: transparent !important;
    border: 1px solid rgba(231, 76, 60, 0.3) !important;
    font-size: 0.85rem !important;
}

.tf-btn-delete .stButton > button:hover {
    background: rgba(231, 76, 60, 0.1) !important;
    border-color: var(--tf-danger) !important;
}

/* ===================================================================
   MANUAL ENTRY CARD
   =================================================================== */
.tf-manual-card {
    background: var(--tf-bg-card);
    border: 1px solid var(--tf-border);
    border-radius: 12px;
    margin-bottom: 16px;
    overflow: hidden;
}

.tf-manual-header {
    padding: 14px 18px;
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--tf-text-secondary);
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.tf-manual-header .icon {
    font-size: 1.1rem;
    color: var(--tf-accent);
}

/* ===================================================================
   RUNNING TOTAL BAR (gradient background)
   =================================================================== */
.tf-running-total {
    text-align: center;
    padding: 16px 20px;
    background: linear-gradient(135deg,
        rgba(0, 212, 170, 0.08),
        rgba(74, 144, 217, 0.08));
    border: 1px solid rgba(0, 212, 170, 0.18);
    border-radius: var(--tf-radius-md);
    margin-top: 16px;
}

.tf-running-total .label {
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--tf-text-muted);
    margin-bottom: 4px;
}

.tf-running-total .total-duration {
    font-size: 1.8rem;
    font-weight: 700;
    font-family: 'Courier New', ui-monospace, SFMono-Regular, monospace;
    font-variant-numeric: tabular-nums;
    color: var(--tf-accent);
}

.tf-running-total .total-hours {
    font-size: 0.95rem;
    color: var(--tf-text-secondary);
    margin-top: 2px;
}

.tf-running-total .progress-bar {
    margin-top: 10px;
    height: 4px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 2px;
    overflow: hidden;
}

.tf-running-total .progress-fill {
    height: 100%;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--tf-accent), var(--tf-primary));
    transition: width 0.4s ease;
}
</style>
"""

# ---------------------------------------------------------------------------
# Dashboard page styles (Phase 3 — dashboard visual upgrade)
# ---------------------------------------------------------------------------
DASHBOARD_STYLES: str = """
<style>
/* ===================================================================
   DASHBOARD METRIC CARDS
   =================================================================== */

/* Base metric card styling */
.tf-metric-card {
    background: var(--tf-bg-card);
    border: 1px solid var(--tf-border);
    border-radius: 12px;
    padding: 24px 20px;
    position: relative;
    overflow: hidden;
    box-shadow: var(--tf-shadow-sm);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tf-metric-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--tf-shadow-md);
}

/* Gradient top border — 3px for prominence */
.tf-metric-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
}

/* Blue gradient for "Today" */
.tf-metric-card.blue::before {
    background: linear-gradient(90deg, #4A90D9, #5ab0f0);
}

/* Teal gradient for "This Week" */
.tf-metric-card.teal::before {
    background: linear-gradient(90deg, #00d4aa, #00e8bb);
}

/* Purple gradient for "This Month" */
.tf-metric-card.purple::before {
    background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

/* Icon + label row */
.tf-metric-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tf-text-secondary);
    margin-bottom: 10px;
}

.tf-metric-label .icon {
    font-size: 1.1rem;
}

/* Large metric value */
.tf-metric-value {
    font-size: 2rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--tf-text-primary);
    letter-spacing: 0.02em;
    margin-bottom: 4px;
}

/* Subtle help text below value */
.tf-metric-help {
    font-size: 0.8rem;
    color: var(--tf-text-muted);
}

/* ===================================================================
   DASHBOARD CAPACITY BAR (upgraded — thicker, gradient, inline text)
   =================================================================== */
.tf-capacity-container {
    margin-top: 8px;
    padding: 4px 0;
}

.tf-capacity-label {
    font-size: 0.82rem;
    color: var(--tf-text-secondary);
    margin-bottom: 6px;
    font-weight: 500;
}

.tf-capacity-bar {
    height: 12px;
    border-radius: 6px;
    background-color: rgba(255, 255, 255, 0.06);
    overflow: hidden;
    position: relative;
}

.tf-capacity-fill {
    height: 100%;
    border-radius: 6px;
    transition: width 0.4s ease;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 6px;
}

.tf-capacity-text {
    font-size: 0.65rem;
    font-weight: 700;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    line-height: 1;
}

/* ===================================================================
   MOST TRACKED THIS WEEK CARD
   =================================================================== */
.tf-most-tracked {
    background: var(--tf-bg-card);
    border: 1px solid var(--tf-border);
    border-radius: 12px;
    padding: 20px;
    box-shadow: var(--tf-shadow-sm);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tf-most-tracked:hover {
    transform: translateY(-2px);
    box-shadow: var(--tf-shadow-md);
}

.tf-most-tracked .project-name {
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--tf-text-primary);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.tf-most-tracked .project-name .accent-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
}

.tf-most-tracked .hours-display {
    font-size: 2.2rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    font-family: 'Courier New', ui-monospace, SFMono-Regular, monospace;
    color: var(--tf-accent);
    line-height: 1.1;
}

.tf-most-tracked .hours-label {
    font-size: 0.8rem;
    color: var(--tf-text-muted);
    margin-top: 2px;
}

/* ===================================================================
   RECENT ENTRIES (mini cards)
   =================================================================== */
.tf-recent-entry {
    background: var(--tf-bg-card);
    border: 1px solid var(--tf-border);
    border-radius: var(--tf-radius-sm);
    padding: 10px 14px;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: background-color 0.15s ease;
}

.tf-recent-entry:hover {
    background-color: var(--tf-bg-hover);
}

.tf-recent-entry .project-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.tf-recent-entry .entry-desc {
    flex: 1;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--tf-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tf-recent-entry .entry-time {
    font-size: 0.85rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    font-family: 'Courier New', ui-monospace, SFMono-Regular, monospace;
    color: var(--tf-text-secondary);
    flex-shrink: 0;
}

/* ===================================================================
   DASHBOARD SECTION HEADERS
   =================================================================== */
.tf-section-header {
    font-size: 1rem;
    font-weight: 600;
    color: var(--tf-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--tf-border);
}
</style>
"""

# ---------------------------------------------------------------------------
# Reports page styles (Phase 3 — reports visual upgrade)
# ---------------------------------------------------------------------------
REPORTS_STYLES: str = """
<style>
/* ===================================================================
   FILTER BAR — horizontal pill layout
   =================================================================== */
.tf-filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-end;
    padding: 16px 20px;
    background: var(--tf-bg-card);
    border: 1px solid var(--tf-border);
    border-radius: 12px;
    margin-bottom: 16px;
}

.tf-filter-bar .filter-group {
    flex: 1;
    min-width: 140px;
}

.tf-filter-bar .filter-label {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--tf-text-muted);
    margin-bottom: 4px;
}

/* ===================================================================
   DATE RANGE PRESET PILLS
   =================================================================== */
.tf-date-presets {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-bottom: 12px;
}

.tf-date-pill {
    display: inline-flex;
    align-items: center;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--tf-border-strong);
    background: var(--tf-bg-card);
    color: var(--tf-text-secondary);
    transition: all 0.15s ease;
}

.tf-date-pill:hover {
    background: var(--tf-bg-hover);
    color: var(--tf-text-primary);
}

.tf-date-pill.active {
    background: linear-gradient(135deg, var(--tf-primary), #3a7bc8);
    color: white;
    border-color: transparent;
}

/* ===================================================================
   TAB STYLING
   =================================================================== */
/* Override Streamlit tab styling for a more polished look */
div[data-testid="stTabs"] button[role="tab"] {
    font-weight: 600 !important;
    font-size: 0.95rem !important;
    color: var(--tf-text-secondary) !important;
    border-bottom: 2px solid transparent !important;
    padding: 10px 20px !important;
    transition: all 0.15s ease !important;
}

div[data-testid="stTabs"] button[role="tab"]:hover {
    color: var(--tf-text-primary) !important;
    background: rgba(74, 144, 217, 0.06) !important;
}

div[data-testid="stTabs"] button[role="tab"][aria-selected="true"] {
    color: var(--tf-primary) !important;
    border-bottom: 2px solid var(--tf-primary) !important;
}

/* ===================================================================
   SUMMARY TABLE — alternating rows, project color dots
   =================================================================== */
.tf-report-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border-radius: var(--tf-radius-md);
    overflow: hidden;
    border: 1px solid var(--tf-border);
    margin-bottom: 16px;
}

.tf-report-table thead th {
    background: var(--tf-bg-elevated);
    color: var(--tf-text-secondary);
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid var(--tf-border);
}

.tf-report-table tbody tr {
    transition: background-color 0.15s ease;
}

.tf-report-table tbody tr:nth-child(odd) {
    background: var(--tf-bg-card);
}

.tf-report-table tbody tr:nth-child(even) {
    background: var(--tf-bg-elevated);
}

.tf-report-table tbody tr:hover {
    background: var(--tf-bg-hover);
}

.tf-report-table tbody td {
    padding: 10px 14px;
    font-size: 0.9rem;
    color: var(--tf-text-primary);
    border-bottom: 1px solid var(--tf-border);
}

.tf-report-table tbody td .project-indicator {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.tf-report-table tbody td .project-indicator .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
}

.tf-report-table .td-number {
    font-variant-numeric: tabular-nums;
    font-family: 'Courier New', ui-monospace, SFMono-Regular, monospace;
    font-weight: 600;
    text-align: right;
}

/* ===================================================================
   DETAILED TABLE — day headers
   =================================================================== */
.tf-day-header {
    background: linear-gradient(90deg,
        rgba(74, 144, 217, 0.10),
        rgba(0, 212, 170, 0.05));
    border: 1px solid var(--tf-border);
    border-radius: var(--tf-radius-sm);
    padding: 10px 16px;
    margin-top: 16px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.tf-day-header .day-date {
    font-weight: 700;
    font-size: 1rem;
    color: var(--tf-text-primary);
}

.tf-day-header .day-name {
    font-size: 0.85rem;
    color: var(--tf-text-secondary);
    font-weight: 500;
    margin-left: 8px;
}

.tf-day-header .day-total {
    font-size: 0.9rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    font-family: 'Courier New', ui-monospace, SFMono-Regular, monospace;
    color: var(--tf-accent);
}

/* ===================================================================
   GRAND TOTAL BAR
   =================================================================== */
.tf-grand-total {
    background: linear-gradient(135deg,
        rgba(0, 212, 170, 0.08),
        rgba(74, 144, 217, 0.08));
    border: 1px solid rgba(0, 212, 170, 0.18);
    border-radius: var(--tf-radius-md);
    padding: 12px 20px;
    margin-top: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}

.tf-grand-total .total-label {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--tf-text-primary);
}

.tf-grand-total .total-stats {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
}

.tf-grand-total .stat-item {
    text-align: center;
}

.tf-grand-total .stat-value {
    font-weight: 700;
    font-size: 1.1rem;
    font-variant-numeric: tabular-nums;
    color: var(--tf-accent);
}

.tf-grand-total .stat-label {
    font-size: 0.72rem;
    color: var(--tf-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

/* ===================================================================
   EXPORT BUTTONS — icon-style
   =================================================================== */
.tf-export-bar {
    display: flex;
    gap: 10px;
    margin-top: 12px;
    flex-wrap: wrap;
}

.tf-export-btn .stDownloadButton > button {
    border-radius: var(--tf-radius-sm) !important;
    font-weight: 600 !important;
    font-size: 0.85rem !important;
    padding: 8px 20px !important;
    border: 1px solid var(--tf-border-strong) !important;
    background: var(--tf-bg-elevated) !important;
    color: var(--tf-text-secondary) !important;
    transition: all 0.15s ease !important;
}

.tf-export-btn .stDownloadButton > button:hover {
    background: var(--tf-bg-hover) !important;
    color: var(--tf-text-primary) !important;
    transform: translateY(-1px) !important;
    box-shadow: var(--tf-shadow-sm) !important;
}

/* ===================================================================
   DATE RANGE DISPLAY
   =================================================================== */
.tf-date-range-info {
    font-size: 0.85rem;
    color: var(--tf-text-secondary);
    padding: 8px 14px;
    background: var(--tf-bg-elevated);
    border-radius: var(--tf-radius-sm);
    border: 1px solid var(--tf-border);
    display: inline-block;
    margin-bottom: 12px;
}
</style>
"""

# ---------------------------------------------------------------------------
# Management pages styles (Phase 4 — projects, clients, tags, final polish)
# ---------------------------------------------------------------------------
MANAGEMENT_STYLES: str = """
<style>
/* ===================================================================
   PAGE TITLE UNDERLINE DECORATION
   =================================================================== */
.tf-page-title {
    font-size: var(--tf-font-title);
    font-weight: 700;
    color: var(--tf-text-primary);
    letter-spacing: -0.02em;
    padding-bottom: 8px;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid var(--tf-border-strong);
    display: inline-block;
}

/* ===================================================================
   FADE-IN PAGE TRANSITION
   =================================================================== */
.tf-page-content {
    animation: fadeIn 0.35s ease-out;
}

/* ===================================================================
   FORM LABEL STYLING — smaller, muted, uppercase
   =================================================================== */
.tf-form-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--tf-text-muted);
    margin-bottom: 4px;
}

/* ===================================================================
   SECTION SPACING
   =================================================================== */
.tf-section {
    margin-bottom: 1.5rem;
}

/* ===================================================================
   PROJECT CARD — with large left color stripe (8px)
   =================================================================== */
.tf-project-card {
    background: var(--tf-bg-card);
    border: 1px solid var(--tf-border);
    border-radius: 12px;
    padding: 20px 20px 20px 24px;
    margin-bottom: 12px;
    border-left: 8px solid var(--tf-border-strong);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    animation: slideUp 0.35s ease-out;
}

.tf-project-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--tf-shadow-md);
}

.tf-project-card .project-top-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
}

.tf-project-card .project-name {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--tf-text-primary);
}

.tf-project-card .client-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 500;
    background: var(--tf-bg-elevated);
    color: var(--tf-text-secondary);
    border: 1px solid var(--tf-border);
}

.tf-project-card .billable-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 500;
    background: rgba(46, 204, 113, 0.12);
    color: var(--tf-success);
    border: 1px solid rgba(46, 204, 113, 0.25);
}

.tf-project-card .archived-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 500;
    background: rgba(90, 98, 112, 0.15);
    color: var(--tf-text-muted);
    border: 1px solid rgba(90, 98, 112, 0.25);
}

.tf-project-card .project-bottom-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

/* Mini progress bar for tracked time */
.tf-mini-progress {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 3px;
    overflow: hidden;
    max-width: 200px;
}

.tf-mini-progress .fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
}

.tf-project-card .tracked-hours {
    font-size: 0.85rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    font-family: 'Courier New', ui-monospace, SFMono-Regular, monospace;
    color: var(--tf-text-secondary);
}

/* ===================================================================
   NEW PROJECT / NEW FORM — prominent card with accent border
   =================================================================== */
.tf-new-form-card {
    background: var(--tf-bg-card);
    border: 1px solid var(--tf-accent);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 1.5rem;
    box-shadow: 0 0 12px rgba(0, 212, 170, 0.08);
}

.tf-new-form-card .form-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--tf-text-primary);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* ===================================================================
   COLOR SWATCH PICKER — 4x4 grid
   =================================================================== */
.tf-color-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    max-width: 220px;
    margin: 8px 0;
}

.tf-color-swatch {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 8px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: transform 0.15s ease, border-color 0.15s ease;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
}

.tf-color-swatch:hover {
    transform: scale(1.12);
    border-color: rgba(255, 255, 255, 0.3);
}

.tf-color-swatch.selected {
    border-color: white;
    transform: scale(1.08);
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.25);
}

.tf-color-swatch .checkmark {
    color: white;
    font-size: 1rem;
    font-weight: 700;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    display: none;
}

.tf-color-swatch.selected .checkmark {
    display: block;
}

/* ===================================================================
   ARCHIVE ICON BUTTON — subtle
   =================================================================== */
.tf-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 8px;
    border-radius: var(--tf-radius-sm);
    font-size: 0.85rem;
    cursor: pointer;
    border: 1px solid var(--tf-border);
    background: transparent;
    color: var(--tf-text-muted);
    transition: all 0.15s ease;
}

.tf-icon-btn:hover {
    background: var(--tf-bg-hover);
    color: var(--tf-text-primary);
    border-color: var(--tf-border-strong);
}

/* ===================================================================
   CLIENT CARD
   =================================================================== */
.tf-client-card {
    background: var(--tf-bg-card);
    border: 1px solid var(--tf-border);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 12px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    animation: slideUp 0.35s ease-out;
}

.tf-client-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--tf-shadow-md);
}

.tf-client-card .client-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
}

.tf-client-card .client-name {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--tf-text-primary);
}

.tf-client-card .project-count-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 600;
    background: rgba(74, 144, 217, 0.12);
    color: var(--tf-primary);
    border: 1px solid rgba(74, 144, 217, 0.25);
}

/* Project pills within client card */
.tf-client-projects {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
}

.tf-client-project-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
    white-space: nowrap;
}

.tf-client-project-pill .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
}

/* ===================================================================
   TAG GRID — pill badges layout
   =================================================================== */
.tf-tag-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
}

.tf-tag-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.88rem;
    font-weight: 500;
    background: var(--tf-bg-elevated);
    color: var(--tf-text-secondary);
    border: 1px solid var(--tf-border-strong);
    cursor: pointer;
    transition: all 0.15s ease;
    animation: slideUp 0.3s ease-out;
}

.tf-tag-badge:hover {
    background: var(--tf-bg-hover);
    color: var(--tf-text-primary);
    transform: translateY(-1px);
    box-shadow: var(--tf-shadow-sm);
}

.tf-tag-badge .tag-name {
    font-weight: 600;
}

.tf-tag-badge .usage-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 700;
    background: rgba(74, 144, 217, 0.15);
    color: var(--tf-primary);
    padding: 0 5px;
}

/* ===================================================================
   NEW TAG INLINE INPUT
   =================================================================== */
.tf-new-tag-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 1.5rem;
}

/* ===================================================================
   SETTINGS CARD SECTIONS
   =================================================================== */
.tf-settings-card {
    background: var(--tf-bg-card);
    border: 1px solid var(--tf-border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 1.5rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tf-settings-card:hover {
    transform: translateY(-1px);
    box-shadow: var(--tf-shadow-sm);
}

.tf-settings-card .card-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--tf-text-primary);
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--tf-border);
    display: flex;
    align-items: center;
    gap: 8px;
}

.tf-settings-card .card-title .icon {
    font-size: 1.2rem;
}
</style>
"""
