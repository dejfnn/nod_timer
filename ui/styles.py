"""Custom CSS strings for consistent TimeFlow styling.

Each constant is a CSS string that can be injected via
``st.markdown(STYLE_CONSTANT, unsafe_allow_html=True)``.
"""

# Global application styles: timer display, project dots, card-like layouts
GLOBAL_STYLES: str = """
<style>
/* Timer display */
.timer-display {
    text-align: center;
    padding: 20px;
    font-family: 'Courier New', monospace;
}

.timer-display .time {
    font-size: 4rem;
    font-weight: bold;
}

/* Project color dot */
.project-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 6px;
    vertical-align: middle;
}

/* Entry card layout */
.entry-card {
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid rgba(128, 128, 128, 0.2);
    margin-bottom: 8px;
    transition: background-color 0.2s;
}

.entry-card:hover {
    background-color: rgba(128, 128, 128, 0.05);
}

/* Metric cards */
div[data-testid="stMetric"] {
    background-color: rgba(28, 131, 225, 0.05);
    border: 1px solid rgba(28, 131, 225, 0.1);
    border-radius: 8px;
    padding: 12px 16px;
}

/* Sidebar styling */
section[data-testid="stSidebar"] {
    background-color: rgba(0, 0, 0, 0.04);
}

/* Button tweaks */
.stButton > button {
    border-radius: 6px;
    font-weight: 500;
}

/* Data table header */
.stDataFrame thead th {
    background-color: rgba(28, 131, 225, 0.1);
    font-weight: 600;
}

/* Hide Streamlit default menu and footer for cleaner look */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}

/* Running total bar */
.running-total {
    text-align: center;
    padding: 10px;
    background: rgba(46, 204, 113, 0.1);
    border: 1px solid rgba(46, 204, 113, 0.3);
    border-radius: 8px;
    margin-top: 10px;
}

/* Capacity bar */
.capacity-bar-container {
    margin-top: 8px;
    padding: 4px 0;
}

.capacity-bar {
    height: 8px;
    border-radius: 4px;
    background-color: rgba(128, 128, 128, 0.2);
    overflow: hidden;
}

.capacity-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
}

/* Empty state styling */
.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #888;
}

.empty-state .icon {
    font-size: 3rem;
    margin-bottom: 12px;
}

.empty-state .message {
    font-size: 1.1rem;
    margin-bottom: 8px;
}

.empty-state .hint {
    font-size: 0.9rem;
    color: #aaa;
}
</style>
"""

# Page-specific styles for the settings page
SETTINGS_STYLES: str = """
<style>
.settings-section {
    padding: 16px;
    border: 1px solid rgba(128, 128, 128, 0.2);
    border-radius: 8px;
    margin-bottom: 16px;
}

.settings-section h3 {
    margin-top: 0;
}

.about-section {
    text-align: center;
    padding: 20px;
    border: 1px solid rgba(128, 128, 128, 0.15);
    border-radius: 8px;
    background: rgba(28, 131, 225, 0.03);
}
</style>
"""

# Export button styling
EXPORT_STYLES: str = """
<style>
.export-buttons {
    display: flex;
    gap: 8px;
    margin-top: 8px;
}
</style>
"""
