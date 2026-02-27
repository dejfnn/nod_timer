"""Settings page for TimeFlow.

Allows configuring default project, billable status, timezone,
working hours per day, and provides JSON backup/restore functionality.
"""

import zoneinfo

import streamlit as st

from config import APP_NAME, APP_VERSION
from db.connection import get_connection
from models import project as project_model
from models import settings as settings_model
from ui.styles import SETTINGS_STYLES


def render() -> None:
    """Render the Settings page."""
    st.title("Settings")
    st.markdown(SETTINGS_STYLES, unsafe_allow_html=True)

    conn = get_connection()

    _render_defaults_section(conn)
    st.divider()
    _render_working_hours_section(conn)
    st.divider()
    _render_data_management_section(conn)
    st.divider()
    _render_about_section()


def _render_defaults_section(conn) -> None:
    """Render the default values settings section."""
    st.subheader("Defaults")

    # Default project
    projects = project_model.get_all(conn=conn)
    project_options: dict[str, str] = {"(None)": ""}
    for p in projects:
        project_options[p.name] = str(p.id)

    current_default_project = settings_model.get_setting("default_project_id", conn=conn) or ""
    current_idx = 0
    project_names = list(project_options.keys())
    project_values = list(project_options.values())
    if current_default_project in project_values:
        current_idx = project_values.index(current_default_project)

    selected_project_name = st.selectbox(
        "Default project for new entries",
        options=project_names,
        index=current_idx,
        key="settings_default_project",
    )

    # Default billable
    current_billable = settings_model.get_setting("default_billable", conn=conn)
    billable_value = current_billable == "true" if current_billable else False
    default_billable = st.checkbox(
        "New entries are billable by default",
        value=billable_value,
        key="settings_default_billable",
    )

    # Timezone
    available_timezones = sorted(zoneinfo.available_timezones())
    current_tz = settings_model.get_setting("timezone", conn=conn) or "Europe/Prague"
    tz_idx = 0
    if current_tz in available_timezones:
        tz_idx = available_timezones.index(current_tz)

    selected_tz = st.selectbox(
        "Timezone",
        options=available_timezones,
        index=tz_idx,
        key="settings_timezone",
    )

    if st.button("Save defaults", key="save_defaults_btn"):
        settings_model.set_setting(
            "default_project_id",
            project_options[selected_project_name],
            conn=conn,
        )
        settings_model.set_setting(
            "default_billable",
            "true" if default_billable else "false",
            conn=conn,
        )
        settings_model.set_setting("timezone", selected_tz, conn=conn)
        st.toast("Default settings saved.", icon="✅")


def _render_working_hours_section(conn) -> None:
    """Render the working hours configuration section."""
    st.subheader("Working Hours")

    current_hours = settings_model.get_working_hours(conn=conn)
    working_hours = st.number_input(
        "Working hours per day",
        min_value=0.5,
        max_value=24.0,
        value=current_hours,
        step=0.5,
        key="settings_working_hours",
        help="Used to calculate capacity percentage on the dashboard.",
    )

    if st.button("Save working hours", key="save_hours_btn"):
        settings_model.set_setting(
            "working_hours_per_day",
            str(working_hours),
            conn=conn,
        )
        st.toast("Working hours updated.", icon="✅")


def _render_data_management_section(conn) -> None:
    """Render the data management (backup/restore) section."""
    st.subheader("Data Management")

    col_export, col_import = st.columns(2)

    with col_export:
        st.markdown("**Export (Backup)**")
        st.caption("Download all your data as a JSON file.")
        if st.button("Generate backup", key="generate_backup_btn"):
            json_data = settings_model.export_all_data(conn=conn)
            st.session_state["backup_json"] = json_data
            st.toast("Backup generated.", icon="📦")

        if "backup_json" in st.session_state:
            st.download_button(
                label="Download JSON backup",
                data=st.session_state["backup_json"],
                file_name="timeflow_backup.json",
                mime="application/json",
                key="download_backup_btn",
            )

    with col_import:
        st.markdown("**Import (Restore)**")
        st.caption("Restore data from a JSON backup. This will replace ALL existing data.")

        uploaded = st.file_uploader(
            "Upload JSON backup",
            type=["json"],
            key="import_file_uploader",
        )

        if uploaded is not None:
            if st.button("Restore from backup", key="restore_btn", type="primary"):
                try:
                    json_str = uploaded.read().decode("utf-8")
                    counts = settings_model.import_all_data(json_str, conn=conn)
                    total_rows = sum(counts.values())
                    st.toast(
                        f"Data restored: {total_rows} total rows across {len(counts)} tables.",
                        icon="✅",
                    )
                    st.rerun()
                except ValueError as e:
                    st.error(f"Import failed: {e}")
                except Exception as e:
                    st.error(f"Import failed: {e}")


def _render_about_section() -> None:
    """Render the About section."""
    st.subheader("About")
    st.markdown(
        f"""
        <div class="about-section">
            <h2>{APP_NAME}</h2>
            <p>Version <strong>{APP_VERSION}</strong></p>
            <p>A Toggl-like time tracking application built with Streamlit and SQLite.</p>
            <p style="color: #888; font-size: 0.85rem;">
                Python 3.11+ | Streamlit | SQLite | Plotly | pandas
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )
