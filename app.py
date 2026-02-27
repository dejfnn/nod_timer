"""TimeFlow — Streamlit entry point.

A Toggl-like time tracking application built with Streamlit and SQLite.
Routes between pages via sidebar navigation.
"""

import streamlit as st

from config import APP_NAME, APP_VERSION
from db.migrations import init_db
from pages.clients import render as render_clients
from pages.projects import render as render_projects
from pages.tags import render as render_tags
from pages.timer import render as render_timer


def main() -> None:
    """Application entry point. Initializes the database, renders sidebar navigation,
    and routes to the selected page."""
    st.set_page_config(
        page_title=APP_NAME,
        page_icon="⏱️",
        layout="wide",
    )

    # Initialize database
    init_db()

    # Sidebar navigation
    st.sidebar.title(APP_NAME)
    st.sidebar.caption(f"v{APP_VERSION}")

    page = st.sidebar.radio(
        "Navigation",
        options=["Timer", "Projects", "Clients", "Tags", "Reports"],
        index=0,
        key="nav_radio",
    )

    # Page routing
    if page == "Timer":
        render_timer()
    elif page == "Projects":
        render_projects()
    elif page == "Clients":
        render_clients()
    elif page == "Tags":
        render_tags()
    elif page == "Reports":
        st.title("Reports")
        st.info("Reports will be available in a future update.")


if __name__ == "__main__":
    main()
