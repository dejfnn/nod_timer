"""TimeFlow — Streamlit entry point.

A Toggl-like time tracking application built with Streamlit and SQLite.
Routes between pages via sidebar navigation.
"""

import streamlit as st

from config import APP_NAME, APP_VERSION
from db.migrations import init_db
from pages.clients import render as render_clients
from pages.dashboard import render as render_dashboard
from pages.projects import render as render_projects
from pages.reports import render as render_reports
from pages.settings import render as render_settings
from pages.tags import render as render_tags
from pages.timer import render as render_timer
from ui.styles import GLOBAL_STYLES


def main() -> None:
    """Application entry point. Initializes the database, renders sidebar navigation,
    and routes to the selected page."""
    st.set_page_config(
        page_title=APP_NAME,
        page_icon="⏱️",
        layout="wide",
    )

    # Apply global CSS styles
    st.markdown(GLOBAL_STYLES, unsafe_allow_html=True)

    # Initialize database
    init_db()

    # Sidebar navigation
    st.sidebar.title(APP_NAME)
    st.sidebar.caption(f"v{APP_VERSION}")

    page = st.sidebar.radio(
        "Navigation",
        options=["Dashboard", "Timer", "Projects", "Clients", "Tags", "Reports", "Settings"],
        index=0,
        key="nav_radio",
    )

    # Page routing
    if page == "Dashboard":
        render_dashboard()
    elif page == "Timer":
        render_timer()
    elif page == "Projects":
        render_projects()
    elif page == "Clients":
        render_clients()
    elif page == "Tags":
        render_tags()
    elif page == "Reports":
        render_reports()
    elif page == "Settings":
        render_settings()


if __name__ == "__main__":
    main()
