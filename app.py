"""TimeFlow — Streamlit entry point.

A Toggl-like time tracking application built with Streamlit and SQLite.
Routes between pages via sidebar navigation with icon + label nav items.
"""

import streamlit as st

from config import APP_NAME, APP_VERSION
from db.migrations import init_db
from ui.components import nav_item
from ui.styles import GLOBAL_STYLES
from views.clients import render as render_clients
from views.dashboard import render as render_dashboard
from views.projects import render as render_projects
from views.reports import render as render_reports
from views.settings import render as render_settings
from views.tags import render as render_tags
from views.timer import render as render_timer

# Navigation items: (icon, label) pairs
NAV_ITEMS: list[tuple[str, str]] = [
    ("\u229e", "Dashboard"),
    ("\u23f1", "Timer"),
    ("\u25d0", "Projects"),
    ("\u25d1", "Clients"),
    ("\u2298", "Tags"),
    ("\u25d4", "Reports"),
    ("\u2699", "Settings"),
]

# Map page names to render functions
PAGE_RENDERERS: dict[str, callable] = {
    "Dashboard": render_dashboard,
    "Timer": render_timer,
    "Projects": render_projects,
    "Clients": render_clients,
    "Tags": render_tags,
    "Reports": render_reports,
    "Settings": render_settings,
}


def main() -> None:
    """Application entry point. Initializes the database, renders sidebar navigation,
    and routes to the selected page."""
    st.set_page_config(
        page_title=APP_NAME,
        page_icon="\u23f1\ufe0f",
        layout="wide",
    )

    # Apply global CSS design system
    st.markdown(GLOBAL_STYLES, unsafe_allow_html=True)

    # Initialize database
    init_db()

    # Build radio options with icon + label
    radio_options = [nav_item(icon, label) for icon, label in NAV_ITEMS]

    # Sidebar branding
    st.sidebar.markdown(
        f'<div class="sidebar-brand">'
        f'<div class="brand-name">{APP_NAME}</div>'
        f'<div class="brand-version">v{APP_VERSION}</div>'
        f"</div>",
        unsafe_allow_html=True,
    )

    # Sidebar navigation using styled radio buttons
    selected = st.sidebar.radio(
        "Navigation",
        options=radio_options,
        index=0,
        key="nav_radio",
    )

    # Sidebar footer
    st.sidebar.markdown(
        '<div class="sidebar-footer">'
        '<div class="footer-text">Built with Streamlit</div>'
        "</div>",
        unsafe_allow_html=True,
    )

    # Extract page name from the selected radio label (strip icon prefix)
    page = _extract_page_name(selected)

    # Route to the selected page
    renderer = PAGE_RENDERERS.get(page)
    if renderer:
        renderer()


def _extract_page_name(selected_label: str) -> str:
    """Extract the page name from a nav item label like '⊞ Dashboard'.

    Args:
        selected_label: The full radio label with icon prefix.

    Returns:
        The page name without the icon prefix.
    """
    for icon, label in NAV_ITEMS:
        if nav_item(icon, label) == selected_label:
            return label
    return "Dashboard"


if __name__ == "__main__":
    main()
