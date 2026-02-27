"""Reusable UI components for TimeFlow.

Provides timer_display(), entry_card(), project_badge(), and other
shared Streamlit components.
"""

from datetime import datetime

import streamlit as st

from config import DATETIME_FORMAT
from models import project as project_model
from models import tag as tag_model
from models import time_entry as time_entry_model
from ui.state import format_duration


def timer_display(elapsed_seconds: int, is_running: bool) -> None:
    """Render the large timer display showing HH:MM:SS.

    Args:
        elapsed_seconds: Number of seconds to display.
        is_running: Whether the timer is currently running (affects styling).
    """
    formatted = format_duration(elapsed_seconds)
    color = "#E74C3C" if is_running else "#2ECC71"
    st.markdown(
        f"""
        <div style="text-align: center; padding: 20px;">
            <span style="font-size: 4rem; font-weight: bold; color: {color};
                         font-family: 'Courier New', monospace;">
                {formatted}
            </span>
        </div>
        """,
        unsafe_allow_html=True,
    )


def project_badge(project_id: int | None) -> str:
    """Return an HTML snippet showing a project color dot and name.

    Args:
        project_id: The project ID, or None for "No project".

    Returns:
        HTML string with colored dot and project name.
    """
    if project_id is None:
        return '<span style="color: #888;">No project</span>'

    proj = project_model.get_by_id(project_id)
    if proj is None:
        return '<span style="color: #888;">No project</span>'

    return (
        f'<span style="display: inline-flex; align-items: center; gap: 4px;">'
        f'<span style="width: 10px; height: 10px; border-radius: 50%; '
        f'background-color: {proj.color}; display: inline-block;"></span>'
        f'{proj.name}</span>'
    )


def project_badge_text(project_id: int | None) -> str:
    """Return plain text project name for display in tables.

    Args:
        project_id: The project ID, or None.

    Returns:
        Project name string or "No project".
    """
    if project_id is None:
        return "No project"
    proj = project_model.get_by_id(project_id)
    if proj is None:
        return "No project"
    return proj.name


def tag_labels(tag_ids: list[int]) -> str:
    """Return a comma-separated string of tag names.

    Args:
        tag_ids: List of tag IDs.

    Returns:
        Comma-separated tag names, or empty string if no tags.
    """
    if not tag_ids:
        return ""
    names = []
    for tid in tag_ids:
        t = tag_model.get_by_id(tid)
        if t:
            names.append(t.name)
    return ", ".join(names)


def entry_card(entry: time_entry_model.TimeEntry, index: int) -> None:
    """Render a single time entry as an expandable card with edit/delete.

    Args:
        entry: The TimeEntry to display.
        index: Unique index for keying Streamlit widgets.
    """
    # Format times for display
    start_display = _format_time_short(entry.start_time)
    stop_display = _format_time_short(entry.stop_time) if entry.stop_time else "running"

    # Duration
    if entry.duration_seconds is not None:
        dur_display = format_duration(entry.duration_seconds)
    elif entry.stop_time is None and entry.start_time:
        start_dt = datetime.strptime(entry.start_time, DATETIME_FORMAT)
        elapsed = int((datetime.now() - start_dt).total_seconds())
        dur_display = format_duration(max(0, elapsed))
    else:
        dur_display = "00:00:00"

    proj_name = project_badge_text(entry.project_id)
    tags_str = tag_labels(entry.tags)
    desc = entry.description or "(no description)"

    # Main entry row
    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
    with col1:
        st.markdown(f"**{desc}**")
        if tags_str:
            st.caption(f"Tags: {tags_str}")
    with col2:
        st.markdown(
            project_badge(entry.project_id),
            unsafe_allow_html=True,
        )
    with col3:
        st.text(f"{start_display} - {stop_display}")
    with col4:
        st.text(dur_display)

    # Edit/Delete in expander
    with st.expander("Edit / Delete", expanded=False):
        _render_edit_form(entry, index)


def _render_edit_form(entry: time_entry_model.TimeEntry, index: int) -> None:
    """Render the inline edit form for a time entry.

    Args:
        entry: The TimeEntry being edited.
        index: Unique index for widget keys.
    """
    projects = project_model.get_all()
    project_options = {p.name: p.id for p in projects}
    project_names = ["(No project)"] + list(project_options.keys())

    current_project_idx = 0
    if entry.project_id is not None:
        for i, name in enumerate(project_names):
            if name != "(No project)" and project_options.get(name) == entry.project_id:
                current_project_idx = i
                break

    all_tags = tag_model.get_all()
    tag_options = {t.name: t.id for t in all_tags}
    tag_names = list(tag_options.keys())
    current_tag_names = []
    for tid in entry.tags:
        t = tag_model.get_by_id(tid)
        if t:
            current_tag_names.append(t.name)

    with st.form(key=f"edit_entry_{entry.id}_{index}"):
        new_desc = st.text_input(
            "Description",
            value=entry.description or "",
            key=f"edit_desc_{entry.id}_{index}",
        )
        new_project_name = st.selectbox(
            "Project",
            project_names,
            index=current_project_idx,
            key=f"edit_proj_{entry.id}_{index}",
        )

        new_tag_names = st.multiselect(
            "Tags",
            tag_names,
            default=current_tag_names,
            key=f"edit_tags_{entry.id}_{index}",
        )

        # Time editing
        col_start, col_end = st.columns(2)
        with col_start:
            if entry.start_time:
                start_dt = datetime.strptime(entry.start_time, DATETIME_FORMAT)
            else:
                start_dt = datetime.now()
            new_start_date = st.date_input(
                "Start date",
                value=start_dt.date(),
                key=f"edit_sdate_{entry.id}_{index}",
            )
            new_start_time = st.time_input(
                "Start time",
                value=start_dt.time(),
                key=f"edit_stime_{entry.id}_{index}",
            )

        with col_end:
            if entry.stop_time:
                stop_dt = datetime.strptime(entry.stop_time, DATETIME_FORMAT)
                new_end_date = st.date_input(
                    "End date",
                    value=stop_dt.date(),
                    key=f"edit_edate_{entry.id}_{index}",
                )
                new_end_time = st.time_input(
                    "End time",
                    value=stop_dt.time(),
                    key=f"edit_etime_{entry.id}_{index}",
                )
            else:
                new_end_date = st.date_input(
                    "End date",
                    value=start_dt.date(),
                    key=f"edit_edate_{entry.id}_{index}",
                    disabled=True,
                )
                new_end_time = st.time_input(
                    "End time",
                    value=start_dt.time(),
                    key=f"edit_etime_{entry.id}_{index}",
                    disabled=True,
                )

        col_save, col_delete = st.columns(2)
        with col_save:
            save_clicked = st.form_submit_button("Save changes")
        with col_delete:
            delete_clicked = st.form_submit_button("Delete entry")

    if save_clicked:
        new_proj_id = (
            project_options[new_project_name]
            if new_project_name != "(No project)"
            else None
        )
        new_tag_id_list = [tag_options[name] for name in new_tag_names if name in tag_options]

        new_start_str = datetime.combine(new_start_date, new_start_time).strftime(
            DATETIME_FORMAT
        )
        update_kwargs: dict = {
            "description": new_desc,
            "project_id": new_proj_id,
            "tag_ids": new_tag_id_list,
            "start_time": new_start_str,
        }

        if entry.stop_time:
            new_end_str = datetime.combine(new_end_date, new_end_time).strftime(
                DATETIME_FORMAT
            )
            new_start_dt = datetime.strptime(new_start_str, DATETIME_FORMAT)
            new_end_dt = datetime.strptime(new_end_str, DATETIME_FORMAT)
            if new_end_dt > new_start_dt:
                duration = int((new_end_dt - new_start_dt).total_seconds())
                update_kwargs["stop_time"] = new_end_str
                update_kwargs["duration_seconds"] = duration
            else:
                st.error("End time must be after start time.")
                return

        time_entry_model.update(entry.id, **update_kwargs)
        st.success("Entry updated.")
        st.rerun()

    if delete_clicked:
        st.session_state.confirm_delete_id = entry.id
        st.rerun()


def delete_confirmation(entry_id: int) -> None:
    """Show a confirmation dialog for deleting an entry.

    Args:
        entry_id: ID of the entry to potentially delete.
    """
    st.warning(f"Are you sure you want to delete entry #{entry_id}?")
    col_yes, col_no = st.columns(2)
    with col_yes:
        if st.button("Yes, delete", key=f"confirm_del_{entry_id}"):
            time_entry_model.delete(entry_id)
            st.session_state.confirm_delete_id = None
            st.success("Entry deleted.")
            st.rerun()
    with col_no:
        if st.button("Cancel", key=f"cancel_del_{entry_id}"):
            st.session_state.confirm_delete_id = None
            st.rerun()


def running_total_display(total_seconds: int) -> None:
    """Display the running total of today's tracked time.

    Args:
        total_seconds: Total seconds tracked today.
    """
    formatted = format_duration(total_seconds)
    hours_decimal = total_seconds / 3600
    st.markdown(
        f"""
        <div style="text-align: center; padding: 10px; background: #1a1a2e;
                    border-radius: 8px; margin-top: 10px;">
            <span style="font-size: 1.2rem; color: #aaa;">Today's total: </span>
            <span style="font-size: 1.5rem; font-weight: bold; color: #2ECC71;">
                {formatted}
            </span>
            <span style="font-size: 1rem; color: #888;"> ({hours_decimal:.2f}h)</span>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _format_time_short(time_str: str | None) -> str:
    """Format an ISO datetime string to a short HH:MM display.

    Args:
        time_str: ISO 8601 datetime string, or None.

    Returns:
        "HH:MM" string, or empty string if None.
    """
    if not time_str:
        return ""
    try:
        dt = datetime.strptime(time_str, DATETIME_FORMAT)
        return dt.strftime("%H:%M")
    except ValueError:
        return time_str
