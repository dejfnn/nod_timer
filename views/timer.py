"""Timer page — start/stop timer, manual entry, and today's entries list.

This module provides the render() function called from app.py to display
the main timer UI page.  Phase 2 redesign: premium timer display, gradient
buttons, hero input, styled entry cards, and running-total bar.
"""

from datetime import datetime, timedelta

import streamlit as st

from config import DATETIME_FORMAT
from models import project as project_model
from models import tag as tag_model
from models import time_entry as time_entry_model
from ui.components import (
    delete_confirmation,
    empty_state,
    entry_card,
    running_total_display,
    timer_display,
)
from ui.state import (
    format_duration,
    get_elapsed_seconds,
    get_today_entries,
    get_today_total_seconds,
    init_timer_state,
    start_timer,
    stop_timer,
    sync_timer_state,
    update_running_entry,
    validate_manual_entry,
)
from ui.styles import TIMER_STYLES


def render() -> None:
    """Render the complete timer page: timer control, manual entry, today's entries."""
    # Inject timer-specific CSS
    st.markdown(TIMER_STYLES, unsafe_allow_html=True)

    init_timer_state()
    sync_timer_state()

    _render_timer_section()
    st.divider()
    _render_manual_entry()
    st.divider()
    _render_today_entries()


def _render_timer_section() -> None:
    """Render the premium timer control section at the top of the page."""
    st.subheader("Timer")

    is_running = st.session_state.timer_running

    # Auto-refresh while running (every 1 second)
    if is_running:
        try:
            from streamlit_autorefresh import st_autorefresh
            st_autorefresh(interval=1000, limit=None, key="timer_autorefresh")
        except ImportError:
            pass

    # Timer display — premium card with gradient border + glow
    elapsed = get_elapsed_seconds() if is_running else 0
    timer_display(elapsed, is_running)

    # --- Running info bar (visible only when timer is running) ---
    if is_running:
        _render_running_info_bar()

    # --- Description, project, tags — editable while running ---
    projects = project_model.get_all()
    project_options = {p.name: p.id for p in projects}
    project_names = ["(No project)"] + list(project_options.keys())

    # Current project index
    current_proj_id = st.session_state.timer_project_id
    current_proj_idx = 0
    if current_proj_id is not None:
        for i, name in enumerate(project_names):
            if name != "(No project)" and project_options.get(name) == current_proj_id:
                current_proj_idx = i
                break

    all_tags = tag_model.get_all()
    tag_options = {t.name: t.id for t in all_tags}
    tag_names = list(tag_options.keys())

    current_tag_ids = st.session_state.timer_tag_ids
    current_tag_names = []
    for tid in current_tag_ids:
        t = tag_model.get_by_id(tid)
        if t:
            current_tag_names.append(t.name)

    # Hero input for description (larger, bottom-border style via CSS wrapper)
    st.markdown('<div class="tf-hero-input">', unsafe_allow_html=True)
    description = st.text_input(
        "Description",
        value=st.session_state.timer_description,
        key="timer_desc_input",
        placeholder="What are you working on?",
        label_visibility="collapsed",
    )
    st.markdown("</div>", unsafe_allow_html=True)

    # Project + Tags row
    col_proj, col_tags = st.columns([2, 3])
    with col_proj:
        selected_project = st.selectbox(
            "Project",
            project_names,
            index=current_proj_idx,
            key="timer_proj_select",
        )
    with col_tags:
        selected_tags = st.multiselect(
            "Tags",
            tag_names,
            default=current_tag_names,
            key="timer_tags_select",
        )

    selected_proj_id = (
        project_options[selected_project]
        if selected_project != "(No project)"
        else None
    )
    selected_tag_ids = [tag_options[name] for name in selected_tags if name in tag_options]

    # Update running entry if description/project/tags changed
    if is_running:
        if description != st.session_state.timer_description:
            update_running_entry(description=description)
        if selected_proj_id != st.session_state.timer_project_id:
            update_running_entry(project_id=selected_proj_id)
        if selected_tag_ids != st.session_state.timer_tag_ids:
            update_running_entry(tag_ids=selected_tag_ids)

    # Start/Stop button — gradient styled via CSS class wrappers
    if is_running:
        st.markdown('<div class="tf-btn-stop">', unsafe_allow_html=True)
        if st.button(
            "\u25a0 Stop",
            key="stop_btn",
            type="primary",
            use_container_width=True,
        ):
            stop_timer()
            st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)
    else:
        st.markdown('<div class="tf-btn-start">', unsafe_allow_html=True)
        if st.button(
            "\u25b6 Start",
            key="start_btn",
            type="primary",
            use_container_width=True,
        ):
            start_timer(
                description=description,
                project_id=selected_proj_id,
                tag_ids=selected_tag_ids if selected_tag_ids else None,
            )
            st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)


def _render_running_info_bar() -> None:
    """Show a compact info bar below the timer when it is running.

    Displays the current description, project pill, and elapsed time.
    """
    desc = st.session_state.timer_description or "(no description)"
    elapsed = get_elapsed_seconds()
    elapsed_str = format_duration(elapsed)

    # Build project pill HTML
    proj_pill = ""
    proj_id = st.session_state.timer_project_id
    if proj_id is not None:
        proj = project_model.get_by_id(proj_id)
        if proj is not None:
            proj_pill = (
                f'<span class="tf-project-pill" '
                f'style="background: {proj.color}22; color: {proj.color}; '
                f'border: 1px solid {proj.color}44;">'
                f'<span class="dot" style="background: {proj.color};"></span>'
                f'{proj.name}</span>'
            )

    st.markdown(
        f"""
        <div class="tf-running-bar">
            <span class="desc">{desc}</span>
            {proj_pill}
            <span class="tf-entry-duration" style="margin-left: auto;">
                {elapsed_str}
            </span>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _render_manual_entry() -> None:
    """Render the manual time entry form inside a styled collapsible card."""
    # Styled card header for manual entry
    st.markdown(
        """
        <div class="tf-manual-card" style="padding: 0; border: none;
             background: transparent; margin-bottom: 4px;">
            <div class="tf-manual-header" style="padding: 0;">
                <span class="icon">+</span> Manual Entry
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    with st.expander("Add manual entry", expanded=False):
        with st.form(key="manual_entry_form"):
            desc = st.text_input("Description", key="manual_desc")

            projects = project_model.get_all()
            project_options = {p.name: p.id for p in projects}
            project_names = ["(No project)"] + list(project_options.keys())
            proj_name = st.selectbox("Project", project_names, key="manual_proj")

            all_tags = tag_model.get_all()
            tag_options = {t.name: t.id for t in all_tags}
            tag_names = list(tag_options.keys())
            selected_tags = st.multiselect("Tags", tag_names, key="manual_tags")

            col_date, col_start, col_end = st.columns(3)
            with col_date:
                entry_date = st.date_input(
                    "Date", value=datetime.now().date(), key="manual_date"
                )
            with col_start:
                start_time = st.time_input(
                    "Start time",
                    value=datetime.now().replace(minute=0, second=0).time(),
                    key="manual_start",
                )
            with col_end:
                end_time = st.time_input(
                    "End time",
                    value=(
                        datetime.now().replace(minute=0, second=0) + timedelta(hours=1)
                    ).time(),
                    key="manual_end",
                )

            submitted = st.form_submit_button("Add entry", use_container_width=True)

        if submitted:
            start_dt = datetime.combine(entry_date, start_time)
            end_dt = datetime.combine(entry_date, end_time)

            start_str = start_dt.strftime(DATETIME_FORMAT)
            end_str = end_dt.strftime(DATETIME_FORMAT)

            is_valid, error_msg = validate_manual_entry(start_str, end_str)
            if not is_valid:
                st.error(error_msg)
            else:
                proj_id = (
                    project_options[proj_name]
                    if proj_name != "(No project)"
                    else None
                )
                tag_id_list = [
                    tag_options[name] for name in selected_tags if name in tag_options
                ]

                time_entry_model.create(
                    start_time=start_str,
                    stop_time=end_str,
                    description=desc,
                    project_id=proj_id,
                    tag_ids=tag_id_list if tag_id_list else None,
                )
                st.toast("Manual entry added.", icon="✅")
                st.rerun()


def _render_today_entries() -> None:
    """Render the list of today's time entries with edit/delete and running total."""
    st.subheader("Today's Entries")

    # Handle pending delete confirmation
    confirm_id = st.session_state.get("confirm_delete_id")
    if confirm_id is not None:
        delete_confirmation(confirm_id)

    entries = get_today_entries()

    if not entries:
        empty_state(
            "No entries for today.",
            icon="⏱️",
            hint="Start tracking your time or add a manual entry above!",
        )
        return

    for i, entry in enumerate(entries):
        entry_card(entry, i)

    # Running total
    total_seconds = get_today_total_seconds()
    running_total_display(total_seconds)
