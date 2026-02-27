"""Project model with dataclass and CRUD operations."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime

from config import DATETIME_FORMAT, DEFAULT_PROJECT_COLOR
from db.connection import get_connection


@dataclass
class Project:
    """Represents a project in the system."""

    id: int | None = None
    name: str = ""
    color: str = DEFAULT_PROJECT_COLOR
    client_id: int | None = None
    billable: bool = False
    hourly_rate: float = 0.0
    archived: bool = False
    created_at: str = ""
    updated_at: str = ""


def _row_to_project(row: sqlite3.Row) -> Project:
    """Convert a database row to a Project dataclass instance."""
    return Project(
        id=row["id"],
        name=row["name"],
        color=row["color"],
        client_id=row["client_id"],
        billable=bool(row["billable"]),
        hourly_rate=row["hourly_rate"],
        archived=bool(row["archived"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def create(
    name: str,
    color: str = DEFAULT_PROJECT_COLOR,
    client_id: int | None = None,
    billable: bool = False,
    hourly_rate: float = 0.0,
    conn: sqlite3.Connection | None = None,
) -> Project:
    """Create a new project.

    Args:
        name: The project name.
        color: Hex color code for the project.
        client_id: Optional client ID to link to.
        billable: Whether this project is billable.
        hourly_rate: Hourly rate for the project.
        conn: Optional database connection.

    Returns:
        The created Project with its assigned ID.
    """
    if conn is None:
        conn = get_connection()

    now = datetime.now().strftime(DATETIME_FORMAT)
    cursor = conn.execute(
        """INSERT INTO projects (name, color, client_id, billable, hourly_rate, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (name, color, client_id, int(billable), hourly_rate, now, now),
    )
    conn.commit()

    return Project(
        id=cursor.lastrowid,
        name=name,
        color=color,
        client_id=client_id,
        billable=billable,
        hourly_rate=hourly_rate,
        archived=False,
        created_at=now,
        updated_at=now,
    )


def get_by_id(
    project_id: int, conn: sqlite3.Connection | None = None
) -> Project | None:
    """Get a project by its ID.

    Args:
        project_id: The project ID to look up.
        conn: Optional database connection.

    Returns:
        The Project if found, None otherwise.
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    row = cursor.fetchone()

    if row is None:
        return None

    return _row_to_project(row)


def get_all(
    include_archived: bool = False, conn: sqlite3.Connection | None = None
) -> list[Project]:
    """Get all projects.

    Args:
        include_archived: If True, include archived projects.
        conn: Optional database connection.

    Returns:
        List of Project instances.
    """
    if conn is None:
        conn = get_connection()

    if include_archived:
        cursor = conn.execute("SELECT * FROM projects ORDER BY name")
    else:
        cursor = conn.execute(
            "SELECT * FROM projects WHERE archived = 0 ORDER BY name"
        )

    return [_row_to_project(row) for row in cursor.fetchall()]


def update(
    project_id: int,
    name: str | None = None,
    color: str | None = None,
    client_id: int | None = ...,  # type: ignore[assignment]
    billable: bool | None = None,
    hourly_rate: float | None = None,
    archived: bool | None = None,
    conn: sqlite3.Connection | None = None,
) -> Project | None:
    """Update an existing project.

    Args:
        project_id: The ID of the project to update.
        name: New name (optional).
        color: New color (optional).
        client_id: New client ID (optional, pass None to unlink).
        billable: New billable status (optional).
        hourly_rate: New hourly rate (optional).
        archived: New archived status (optional).
        conn: Optional database connection.

    Returns:
        The updated Project, or None if not found.
    """
    if conn is None:
        conn = get_connection()

    existing = get_by_id(project_id, conn)
    if existing is None:
        return None

    new_name = name if name is not None else existing.name
    new_color = color if color is not None else existing.color
    new_client_id = client_id if client_id is not ... else existing.client_id
    new_billable = billable if billable is not None else existing.billable
    new_hourly_rate = hourly_rate if hourly_rate is not None else existing.hourly_rate
    new_archived = archived if archived is not None else existing.archived
    now = datetime.now().strftime(DATETIME_FORMAT)

    conn.execute(
        """UPDATE projects
        SET name = ?, color = ?, client_id = ?, billable = ?,
            hourly_rate = ?, archived = ?, updated_at = ?
        WHERE id = ?""",
        (
            new_name,
            new_color,
            new_client_id,
            int(new_billable),
            new_hourly_rate,
            int(new_archived),
            now,
            project_id,
        ),
    )
    conn.commit()

    return Project(
        id=project_id,
        name=new_name,
        color=new_color,
        client_id=new_client_id,
        billable=new_billable,
        hourly_rate=new_hourly_rate,
        archived=new_archived,
        created_at=existing.created_at,
        updated_at=now,
    )


def get_total_tracked_time(
    project_id: int, conn: sqlite3.Connection | None = None
) -> int:
    """Get the total tracked time in seconds for a project.

    Sums duration_seconds from all completed time entries linked to this project.
    Running entries (stop_time IS NULL) are excluded from the sum.

    Args:
        project_id: The project ID to query.
        conn: Optional database connection.

    Returns:
        Total tracked seconds for the project (0 if no entries).
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute(
        """SELECT COALESCE(SUM(duration_seconds), 0) AS total
        FROM time_entries
        WHERE project_id = ? AND duration_seconds IS NOT NULL""",
        (project_id,),
    )
    row = cursor.fetchone()
    return int(row["total"])


def delete(project_id: int, conn: sqlite3.Connection | None = None) -> bool:
    """Delete a project by ID.

    Args:
        project_id: The ID of the project to delete.
        conn: Optional database connection.

    Returns:
        True if the project was deleted, False if not found.
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()

    return cursor.rowcount > 0
