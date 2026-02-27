"""TimeEntry model with dataclass and CRUD operations."""

import sqlite3
from dataclasses import dataclass, field
from datetime import datetime

from config import DATETIME_FORMAT
from db.connection import get_connection


@dataclass
class TimeEntry:
    """Represents a time entry in the system."""

    id: int | None = None
    description: str = ""
    project_id: int | None = None
    start_time: str = ""
    stop_time: str | None = None
    duration_seconds: int | None = None
    billable: bool = False
    created_at: str = ""
    updated_at: str = ""
    tags: list[int] = field(default_factory=list)


def _row_to_time_entry(
    row: sqlite3.Row, conn: sqlite3.Connection | None = None
) -> TimeEntry:
    """Convert a database row to a TimeEntry dataclass instance."""
    entry = TimeEntry(
        id=row["id"],
        description=row["description"] or "",
        project_id=row["project_id"],
        start_time=row["start_time"],
        stop_time=row["stop_time"],
        duration_seconds=row["duration_seconds"],
        billable=bool(row["billable"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )

    if conn is not None and entry.id is not None:
        cursor = conn.execute(
            "SELECT tag_id FROM time_entry_tags WHERE time_entry_id = ?",
            (entry.id,),
        )
        entry.tags = [r["tag_id"] for r in cursor.fetchall()]

    return entry


def create(
    start_time: str,
    description: str = "",
    project_id: int | None = None,
    stop_time: str | None = None,
    duration_seconds: int | None = None,
    billable: bool = False,
    tag_ids: list[int] | None = None,
    conn: sqlite3.Connection | None = None,
) -> TimeEntry:
    """Create a new time entry.

    Args:
        start_time: ISO 8601 formatted start time.
        description: Entry description.
        project_id: Optional project ID to link to.
        stop_time: Optional ISO 8601 formatted stop time.
        duration_seconds: Optional duration in seconds.
        billable: Whether this entry is billable.
        tag_ids: Optional list of tag IDs to associate.
        conn: Optional database connection.

    Returns:
        The created TimeEntry with its assigned ID.
    """
    if conn is None:
        conn = get_connection()

    now = datetime.now().strftime(DATETIME_FORMAT)

    # Calculate duration if stop_time is provided but duration is not
    if stop_time is not None and duration_seconds is None:
        start_dt = datetime.strptime(start_time, DATETIME_FORMAT)
        stop_dt = datetime.strptime(stop_time, DATETIME_FORMAT)
        duration_seconds = int((stop_dt - start_dt).total_seconds())

    cursor = conn.execute(
        """INSERT INTO time_entries
        (description, project_id, start_time, stop_time, duration_seconds, billable, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            description,
            project_id,
            start_time,
            stop_time,
            duration_seconds,
            int(billable),
            now,
            now,
        ),
    )
    entry_id = cursor.lastrowid

    # Associate tags
    assigned_tags: list[int] = []
    if tag_ids:
        for tag_id in tag_ids:
            conn.execute(
                "INSERT INTO time_entry_tags (time_entry_id, tag_id) VALUES (?, ?)",
                (entry_id, tag_id),
            )
            assigned_tags.append(tag_id)

    conn.commit()

    return TimeEntry(
        id=entry_id,
        description=description,
        project_id=project_id,
        start_time=start_time,
        stop_time=stop_time,
        duration_seconds=duration_seconds,
        billable=billable,
        created_at=now,
        updated_at=now,
        tags=assigned_tags,
    )


def get_by_id(
    entry_id: int, conn: sqlite3.Connection | None = None
) -> TimeEntry | None:
    """Get a time entry by its ID.

    Args:
        entry_id: The time entry ID to look up.
        conn: Optional database connection.

    Returns:
        The TimeEntry if found, None otherwise.
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute("SELECT * FROM time_entries WHERE id = ?", (entry_id,))
    row = cursor.fetchone()

    if row is None:
        return None

    return _row_to_time_entry(row, conn)


def get_all(conn: sqlite3.Connection | None = None) -> list[TimeEntry]:
    """Get all time entries.

    Args:
        conn: Optional database connection.

    Returns:
        List of TimeEntry instances ordered by start_time descending.
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute(
        "SELECT * FROM time_entries ORDER BY start_time DESC"
    )
    return [_row_to_time_entry(row, conn) for row in cursor.fetchall()]


def update(
    entry_id: int,
    description: str | None = None,
    project_id: int | None = ...,  # type: ignore[assignment]
    start_time: str | None = None,
    stop_time: str | None = ...,  # type: ignore[assignment]
    duration_seconds: int | None = ...,  # type: ignore[assignment]
    billable: bool | None = None,
    tag_ids: list[int] | None = None,
    conn: sqlite3.Connection | None = None,
) -> TimeEntry | None:
    """Update an existing time entry.

    Args:
        entry_id: The ID of the time entry to update.
        description: New description (optional).
        project_id: New project ID (optional, pass None to unlink).
        start_time: New start time (optional).
        stop_time: New stop time (optional, pass None to clear).
        duration_seconds: New duration (optional, pass None to clear).
        billable: New billable status (optional).
        tag_ids: New list of tag IDs (optional, replaces existing).
        conn: Optional database connection.

    Returns:
        The updated TimeEntry, or None if not found.
    """
    if conn is None:
        conn = get_connection()

    existing = get_by_id(entry_id, conn)
    if existing is None:
        return None

    new_description = description if description is not None else existing.description
    new_project_id = project_id if project_id is not ... else existing.project_id
    new_start_time = start_time if start_time is not None else existing.start_time
    new_stop_time = stop_time if stop_time is not ... else existing.stop_time
    new_duration = duration_seconds if duration_seconds is not ... else existing.duration_seconds
    new_billable = billable if billable is not None else existing.billable
    now = datetime.now().strftime(DATETIME_FORMAT)

    conn.execute(
        """UPDATE time_entries
        SET description = ?, project_id = ?, start_time = ?,
            stop_time = ?, duration_seconds = ?, billable = ?, updated_at = ?
        WHERE id = ?""",
        (
            new_description,
            new_project_id,
            new_start_time,
            new_stop_time,
            new_duration,
            int(new_billable),
            now,
            entry_id,
        ),
    )

    # Update tags if provided
    if tag_ids is not None:
        conn.execute(
            "DELETE FROM time_entry_tags WHERE time_entry_id = ?", (entry_id,)
        )
        for tag_id in tag_ids:
            conn.execute(
                "INSERT INTO time_entry_tags (time_entry_id, tag_id) VALUES (?, ?)",
                (entry_id, tag_id),
            )

    conn.commit()

    new_tags = tag_ids if tag_ids is not None else existing.tags

    return TimeEntry(
        id=entry_id,
        description=new_description,
        project_id=new_project_id,
        start_time=new_start_time,
        stop_time=new_stop_time,
        duration_seconds=new_duration,
        billable=new_billable,
        created_at=existing.created_at,
        updated_at=now,
        tags=new_tags,
    )


def delete(entry_id: int, conn: sqlite3.Connection | None = None) -> bool:
    """Delete a time entry by ID.

    This also removes all tag associations (via CASCADE).

    Args:
        entry_id: The ID of the time entry to delete.
        conn: Optional database connection.

    Returns:
        True if the entry was deleted, False if not found.
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute("DELETE FROM time_entries WHERE id = ?", (entry_id,))
    conn.commit()

    return cursor.rowcount > 0


def get_active_entry(conn: sqlite3.Connection | None = None) -> TimeEntry | None:
    """Get the currently running time entry (stop_time is NULL).

    Args:
        conn: Optional database connection.

    Returns:
        The active TimeEntry if one exists, None otherwise.
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute(
        "SELECT * FROM time_entries WHERE stop_time IS NULL ORDER BY start_time DESC LIMIT 1"
    )
    row = cursor.fetchone()

    if row is None:
        return None

    return _row_to_time_entry(row, conn)


def stop_entry(
    entry_id: int, stop_time: str | None = None, conn: sqlite3.Connection | None = None
) -> TimeEntry | None:
    """Stop a running time entry by setting stop_time and calculating duration.

    Args:
        entry_id: The ID of the time entry to stop.
        stop_time: Optional stop time in ISO 8601 format. Defaults to now.
        conn: Optional database connection.

    Returns:
        The stopped TimeEntry, or None if not found.
    """
    if conn is None:
        conn = get_connection()

    existing = get_by_id(entry_id, conn)
    if existing is None:
        return None

    if stop_time is None:
        stop_time = datetime.now().strftime(DATETIME_FORMAT)

    start_dt = datetime.strptime(existing.start_time, DATETIME_FORMAT)
    stop_dt = datetime.strptime(stop_time, DATETIME_FORMAT)
    duration = int((stop_dt - start_dt).total_seconds())

    now = datetime.now().strftime(DATETIME_FORMAT)

    conn.execute(
        """UPDATE time_entries
        SET stop_time = ?, duration_seconds = ?, updated_at = ?
        WHERE id = ?""",
        (stop_time, duration, now, entry_id),
    )
    conn.commit()

    return TimeEntry(
        id=entry_id,
        description=existing.description,
        project_id=existing.project_id,
        start_time=existing.start_time,
        stop_time=stop_time,
        duration_seconds=duration,
        billable=existing.billable,
        created_at=existing.created_at,
        updated_at=now,
        tags=existing.tags,
    )


def add_tags(
    entry_id: int,
    tag_ids: list[int],
    conn: sqlite3.Connection | None = None,
) -> bool:
    """Add tags to a time entry.

    Args:
        entry_id: The ID of the time entry.
        tag_ids: List of tag IDs to add.
        conn: Optional database connection.

    Returns:
        True if tags were added successfully.
    """
    if conn is None:
        conn = get_connection()

    for tag_id in tag_ids:
        conn.execute(
            "INSERT OR IGNORE INTO time_entry_tags (time_entry_id, tag_id) VALUES (?, ?)",
            (entry_id, tag_id),
        )
    conn.commit()
    return True


def remove_tags(
    entry_id: int,
    tag_ids: list[int],
    conn: sqlite3.Connection | None = None,
) -> bool:
    """Remove tags from a time entry.

    Args:
        entry_id: The ID of the time entry.
        tag_ids: List of tag IDs to remove.
        conn: Optional database connection.

    Returns:
        True if tags were removed successfully.
    """
    if conn is None:
        conn = get_connection()

    for tag_id in tag_ids:
        conn.execute(
            "DELETE FROM time_entry_tags WHERE time_entry_id = ? AND tag_id = ?",
            (entry_id, tag_id),
        )
    conn.commit()
    return True


def get_tags_for_entry(
    entry_id: int, conn: sqlite3.Connection | None = None
) -> list[int]:
    """Get all tag IDs for a time entry.

    Args:
        entry_id: The time entry ID.
        conn: Optional database connection.

    Returns:
        List of tag IDs associated with the entry.
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute(
        "SELECT tag_id FROM time_entry_tags WHERE time_entry_id = ?",
        (entry_id,),
    )
    return [row["tag_id"] for row in cursor.fetchall()]
