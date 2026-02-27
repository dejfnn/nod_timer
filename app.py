"""TimeFlow — Streamlit entry point.

A Toggl-like time tracking application built with Streamlit and SQLite.
"""

import streamlit as st

from config import APP_NAME, APP_VERSION, DB_PATH
from db.migrations import init_db, tables_exist
from db.connection import get_connection


def main() -> None:
    """Application entry point. Initializes the database and renders the main page."""
    st.set_page_config(
        page_title=APP_NAME,
        page_icon="⏱️",
        layout="wide",
    )

    # Initialize database
    init_db()

    # Sidebar
    st.sidebar.title(APP_NAME)
    st.sidebar.caption(f"v{APP_VERSION}")

    # Main content
    st.title(APP_NAME)
    st.subheader("Time Tracking Made Simple")

    # Database status
    conn = get_connection()
    db_ready = tables_exist(conn)

    if db_ready:
        st.success(f"Database initialized successfully at `{DB_PATH}`")

        # Show table info
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        tables = [row["name"] for row in cursor.fetchall()]
        st.info(f"Tables: {', '.join(tables)}")

        # Show WAL mode status
        wal_cursor = conn.execute("PRAGMA journal_mode")
        journal_mode = wal_cursor.fetchone()[0]
        st.info(f"Journal mode: {journal_mode}")

        # Show FK status
        fk_cursor = conn.execute("PRAGMA foreign_keys")
        fk_enabled = fk_cursor.fetchone()[0]
        st.info(f"Foreign keys: {'enabled' if fk_enabled else 'disabled'}")
    else:
        st.error("Database initialization failed. Please check the logs.")


if __name__ == "__main__":
    main()
