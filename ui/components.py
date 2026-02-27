"""Reusable UI components for TimeFlow.

Provides timer_display(), entry_card(), project_badge(), empty_state(),
show_toast(), nav_item(), and other shared Streamlit components.
"""

from datetime import datetime

import streamlit as st

from config import DATETIME_FORMAT
from models import project as project_model
from models import tag as tag_model
from models import time_entry as time_entry_model
from ui.state import format_duration


def nav_item(icon: str, label: str) -> str:
    """Build a navigation item string with icon and label for sidebar radio options.

    Combines a Unicode icon character with a page label to create a formatted
    navigation entry used in the sidebar radio group.

    Args:
        icon: A Unicode/emoji character to display as the nav icon.
        label: The page name displayed next to the icon.

    Returns:
        Formatted string like "⊞ Dashboard" for use as a radio option label.
    """
    return f"{icon}  {label}"


def timer_display(elapsed_seconds: int, is_running: bool) -> None:
    """Render the premium timer display inside a styled card.

    Shows a large HH:MM:SS timer with:
    - Gradient border (teal glow when running, muted when stopped)
    - 5rem font-size digits with tabular-nums
    - Pulsing glow animation when running
    - Status label: "TRACKING" (green dot) or "READY"
    - Blinking colon separator when running

    Args:
        elapsed_seconds: Number of seconds to display.
        is_running: Whether the timer is currently running (affects styling).
    """
    formatted = format_duration(elapsed_seconds)
    # Split into HH, MM, SS for individual colon styling
    parts = formatted.split(":")
    hours, minutes, seconds = parts[0], parts[1], parts[2]

    card_class = "running" if is_running else "stopped"
    colon_class = "tf-timer-colon blink" if is_running else "tf-timer-colon"

    if is_running:
        status_html = (
            '<div class="tf-timer-status tracking">'
            '<span class="tf-status-dot active"></span> TRACKING'
            '</div>'
        )
    else:
        status_html = (
            '<div class="tf-timer-status ready">'
            '<span class="tf-status-dot inactive"></span> READY'
            '</div>'
        )

    st.markdown(
        f"""
        <div class="tf-timer-card {card_class}">
            {status_html}
            <div class="tf-timer-digits">
                <span>{hours}</span>
                <span class="{colon_class}">:</span>
                <span>{minutes}</span>
                <span class="{colon_class}">:</span>
                <span>{seconds}</span>
            </div>
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
    """Render a single time entry as a styled card with edit/delete.

    Each card features:
    - Left color border matching project color
    - Bold description with tag pill badges below
    - Project shown as a colored pill badge
    - Duration in monospace, right-aligned, prominent
    - Edit form inside an expander

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

    desc = entry.description or "(no description)"

    # Resolve project for color and name
    proj_color = "var(--tf-border-strong)"
    proj_pill_html = ""
    if entry.project_id is not None:
        proj = project_model.get_by_id(entry.project_id)
        if proj is not None:
            proj_color = proj.color
            proj_pill_html = (
                f'<span class="tf-project-pill" '
                f'style="background: {proj.color}22; color: {proj.color}; '
                f'border: 1px solid {proj.color}44;">'
                f'<span class="dot" style="background: {proj.color};"></span>'
                f'{proj.name}</span>'
            )

    # Build tag pills HTML
    tag_pills_html = ""
    if entry.tags:
        pills = []
        for tid in entry.tags:
            t = tag_model.get_by_id(tid)
            if t:
                pills.append(f'<span class="tf-tag-pill">{t.name}</span>')
        if pills:
            tag_pills_html = (
                '<div class="tf-entry-tags">' + "".join(pills) + "</div>"
            )

    # Render the styled entry card as HTML
    st.markdown(
        f"""
        <div class="tf-entry-card" style="border-left-color: {proj_color};">
            <div style="display: flex; justify-content: space-between;
                        align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 140px;">
                    <div class="tf-entry-desc">{desc}</div>
                    {proj_pill_html}
                    {tag_pills_html}
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                    <div class="tf-entry-duration">{dur_display}</div>
                    <div class="tf-entry-time-range">
                        {start_display} &ndash; {stop_display}
                    </div>
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

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
        st.toast("Entry updated.", icon="✅")
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
            st.toast("Entry deleted.", icon="🗑️")
            st.rerun()
    with col_no:
        if st.button("Cancel", key=f"cancel_del_{entry_id}"):
            st.session_state.confirm_delete_id = None
            st.rerun()


def running_total_display(total_seconds: int) -> None:
    """Display the running total of today's tracked time as a gradient bar.

    Shows a styled bar with:
    - Gradient background (teal to blue tints)
    - Large centered duration in monospace
    - Decimal hours
    - Progress indicator (percentage of 8-hour day)

    Args:
        total_seconds: Total seconds tracked today.
    """
    formatted = format_duration(total_seconds)
    hours_decimal = total_seconds / 3600
    # Progress as percentage of an 8-hour workday, capped at 100
    progress_pct = min(100.0, (total_seconds / (8 * 3600)) * 100)

    st.markdown(
        f"""
        <div class="tf-running-total">
            <div class="label">Today's Total</div>
            <div class="total-duration">{formatted}</div>
            <div class="total-hours">{hours_decimal:.2f} hours</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {progress_pct:.1f}%;"></div>
            </div>
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


def empty_state(message: str, icon: str = "📭", hint: str = "") -> None:
    """Display an empty state placeholder with an icon and message.

    Args:
        message: Main message to display.
        icon: Emoji icon to show above the message.
        hint: Optional smaller hint text below the message.
    """
    hint_html = f'<div class="hint">{hint}</div>' if hint else ""
    st.markdown(
        f"""
        <div class="empty-state">
            <div class="icon">{icon}</div>
            <div class="message">{message}</div>
            {hint_html}
        </div>
        """,
        unsafe_allow_html=True,
    )


def show_toast(message: str, icon: str = "✅") -> None:
    """Show a Streamlit toast notification.

    Args:
        message: Toast message text.
        icon: Emoji icon for the toast.
    """
    st.toast(message, icon=icon)


def capacity_bar(percent: float) -> None:
    """Render a capacity percentage bar with gradient fill and inline text.

    Features:
    - 12px thick bar (upgraded from 8px)
    - Gradient fill (color transitions based on percentage)
    - Inline percentage text displayed inside the bar when >30%

    Args:
        percent: Capacity percentage (0-100+).
    """
    # Clamp display width to 100%
    bar_width = min(percent, 100.0)

    # Gradient based on capacity level
    if percent >= 100:
        gradient = "linear-gradient(90deg, #2ecc71, #27ae60)"
    elif percent >= 75:
        gradient = "linear-gradient(90deg, #4A90D9, #00d4aa)"
    elif percent >= 50:
        gradient = "linear-gradient(90deg, #F39C12, #f0c040)"
    else:
        gradient = "linear-gradient(90deg, #E74C3C, #e67e22)"

    # Show percentage text inside bar only when wide enough (>30%)
    pct_text = (
        f'<span class="tf-capacity-text">{percent:.0f}%</span>'
        if percent > 30 else ""
    )

    st.markdown(
        f"""
        <div class="tf-capacity-container">
            <div class="tf-capacity-bar">
                <div class="tf-capacity-fill"
                     style="width: {bar_width}%; background: {gradient};">
                    {pct_text}
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
