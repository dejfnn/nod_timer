"""Streamlit session state helpers for timer state management."""

from datetime import datetime

import streamlit as st

from config import DATETIME_FORMAT
from models import time_entry as time_entry_model


def init_timer_state() -> None:
    """Initialize session state keys for the timer if they don't exist."""
    if "timer_running" not in st.session_state:
        st.session_state.timer_running = False
    if "active_entry_id" not in st.session_state:
        st.session_state.active_entry_id = None
    if "timer_description" not in st.session_state:
        st.session_state.timer_description = ""
    if "timer_project_id" not in st.session_state:
        st.session_state.timer_project_id = None
    if "timer_tag_ids" not in st.session_state:
        st.session_state.timer_tag_ids = []
    if "confirm_delete_id" not in st.session_state:
        st.session_state.confirm_delete_id = None


def sync_timer_state() -> None:
    """Synchronize session state with the database.

    Checks if there is an active (running) entry in the DB and updates
    session state accordingly. This handles cases where the app is reloaded
    while a timer is running.
    """
    active = time_entry_model.get_active_entry()
    if active is not None:
        st.session_state.timer_running = True
        st.session_state.active_entry_id = active.id
        st.session_state.timer_description = active.description
        st.session_state.timer_project_id = active.project_id
        st.session_state.timer_tag_ids = active.tags
    elif st.session_state.timer_running:
        # DB says no active entry, but state says running — reset
        st.session_state.timer_running = False
        st.session_state.active_entry_id = None


def start_timer(
    description: str = "",
    project_id: int | None = None,
    tag_ids: list[int] | None = None,
) -> int | None:
    """Start a new timer by creating a time entry with start_time=now and stop_time=NULL.

    Args:
        description: Optional description for the entry.
        project_id: Optional project ID.
        tag_ids: Optional list of tag IDs.

    Returns:
        The ID of the created time entry, or None on failure.
    """
    now = datetime.now().strftime(DATETIME_FORMAT)
    entry = time_entry_model.create(
        start_time=now,
        description=description,
        project_id=project_id,
        tag_ids=tag_ids,
    )
    if entry and entry.id is not None:
        st.session_state.timer_running = True
        st.session_state.active_entry_id = entry.id
        st.session_state.timer_description = description
        st.session_state.timer_project_id = project_id
        st.session_state.timer_tag_ids = tag_ids or []
        return entry.id
    return None


def stop_timer() -> time_entry_model.TimeEntry | None:
    """Stop the currently running timer.

    Sets stop_time=now and calculates duration_seconds.

    Returns:
        The stopped TimeEntry, or None if no timer was running.
    """
    entry_id = st.session_state.get("active_entry_id")
    if entry_id is None:
        return None

    now = datetime.now().strftime(DATETIME_FORMAT)
    stopped = time_entry_model.stop_entry(entry_id, stop_time=now)

    st.session_state.timer_running = False
    st.session_state.active_entry_id = None
    st.session_state.timer_description = ""
    st.session_state.timer_project_id = None
    st.session_state.timer_tag_ids = []

    return stopped


def update_running_entry(
    description: str | None = None,
    project_id: int | None = ...,  # type: ignore[assignment]
    tag_ids: list[int] | None = None,
) -> None:
    """Update the description/project/tags of a running entry.

    Args:
        description: New description (None = no change).
        project_id: New project ID (... = no change, None = unlink).
        tag_ids: New tag IDs (None = no change).
    """
    entry_id = st.session_state.get("active_entry_id")
    if entry_id is None:
        return

    kwargs: dict = {}
    if description is not None:
        kwargs["description"] = description
        st.session_state.timer_description = description
    if project_id is not ...:
        kwargs["project_id"] = project_id
        st.session_state.timer_project_id = project_id
    if tag_ids is not None:
        kwargs["tag_ids"] = tag_ids
        st.session_state.timer_tag_ids = tag_ids

    if kwargs:
        time_entry_model.update(entry_id, **kwargs)


def format_duration(seconds: int | None) -> str:
    """Format a duration in seconds as HH:MM:SS.

    Args:
        seconds: Duration in seconds. None or negative treated as 0.

    Returns:
        Formatted string like "01:23:45".
    """
    if seconds is None or seconds < 0:
        seconds = 0
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def get_elapsed_seconds() -> int:
    """Get the number of seconds elapsed since the running timer started.

    Returns:
        Elapsed seconds, or 0 if no timer is running.
    """
    entry_id = st.session_state.get("active_entry_id")
    if entry_id is None:
        return 0

    entry = time_entry_model.get_by_id(entry_id)
    if entry is None or entry.start_time == "":
        return 0

    start_dt = datetime.strptime(entry.start_time, DATETIME_FORMAT)
    now = datetime.now()
    elapsed = int((now - start_dt).total_seconds())
    return max(0, elapsed)


def get_today_entries() -> list[time_entry_model.TimeEntry]:
    """Get all time entries from today, sorted by start_time descending.

    Returns:
        List of today's TimeEntry objects, most recent first.
    """
    today_str = datetime.now().strftime("%Y-%m-%d")
    all_entries = time_entry_model.get_all()
    today_entries = [
        e for e in all_entries
        if e.start_time.startswith(today_str)
    ]
    return today_entries


def get_today_total_seconds() -> int:
    """Calculate the total tracked seconds for today.

    Includes both completed entries and the currently running entry's elapsed time.

    Returns:
        Total seconds tracked today.
    """
    entries = get_today_entries()
    total = 0
    for entry in entries:
        if entry.duration_seconds is not None:
            total += entry.duration_seconds
        elif entry.stop_time is None and entry.start_time:
            # Running entry — calculate elapsed
            start_dt = datetime.strptime(entry.start_time, DATETIME_FORMAT)
            elapsed = int((datetime.now() - start_dt).total_seconds())
            total += max(0, elapsed)
    return total


def validate_manual_entry(
    start_time: str,
    end_time: str,
) -> tuple[bool, str]:
    """Validate a manual time entry.

    Args:
        start_time: ISO 8601 start time string.
        end_time: ISO 8601 end time string.

    Returns:
        Tuple of (is_valid, error_message). error_message is empty if valid.
    """
    try:
        start_dt = datetime.strptime(start_time, DATETIME_FORMAT)
    except ValueError:
        return False, "Invalid start time format."

    try:
        end_dt = datetime.strptime(end_time, DATETIME_FORMAT)
    except ValueError:
        return False, "Invalid end time format."

    if end_dt <= start_dt:
        return False, "End time must be after start time."

    duration = (end_dt - start_dt).total_seconds()
    if duration > 86400:  # 24 hours
        return False, "Duration cannot exceed 24 hours."

    return True, ""
