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
