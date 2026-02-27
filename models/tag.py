"""Tag model with dataclass and CRUD operations."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime

from config import DATETIME_FORMAT
from db.connection import get_connection


@dataclass
class Tag:
    """Represents a tag in the system."""

    id: int | None = None
    name: str = ""
    created_at: str = ""


def _row_to_tag(row: sqlite3.Row) -> Tag:
    """Convert a database row to a Tag dataclass instance."""
    return Tag(
        id=row["id"],
        name=row["name"],
        created_at=row["created_at"],
    )


def create(name: str, conn: sqlite3.Connection | None = None) -> Tag:
    """Create a new tag.

    Args:
        name: The tag name (must be unique).
        conn: Optional database connection.

    Returns:
        The created Tag with its assigned ID.
    """
    if conn is None:
        conn = get_connection()

    now = datetime.now().strftime(DATETIME_FORMAT)
    cursor = conn.execute(
        "INSERT INTO tags (name, created_at) VALUES (?, ?)",
        (name, now),
    )
    conn.commit()

    return Tag(id=cursor.lastrowid, name=name, created_at=now)


def get_by_id(tag_id: int, conn: sqlite3.Connection | None = None) -> Tag | None:
    """Get a tag by its ID.

    Args:
        tag_id: The tag ID to look up.
        conn: Optional database connection.

    Returns:
        The Tag if found, None otherwise.
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute("SELECT * FROM tags WHERE id = ?", (tag_id,))
    row = cursor.fetchone()

    if row is None:
        return None

    return _row_to_tag(row)


def get_all(conn: sqlite3.Connection | None = None) -> list[Tag]:
    """Get all tags.

    Args:
        conn: Optional database connection.

    Returns:
        List of Tag instances.
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute("SELECT * FROM tags ORDER BY name")
    return [_row_to_tag(row) for row in cursor.fetchall()]


def update(
    tag_id: int,
    name: str | None = None,
    conn: sqlite3.Connection | None = None,
) -> Tag | None:
    """Update an existing tag.

    Args:
        tag_id: The ID of the tag to update.
        name: New name (optional).
        conn: Optional database connection.

    Returns:
        The updated Tag, or None if not found.
    """
    if conn is None:
        conn = get_connection()

    existing = get_by_id(tag_id, conn)
    if existing is None:
        return None

    new_name = name if name is not None else existing.name

    conn.execute(
        "UPDATE tags SET name = ? WHERE id = ?",
        (new_name, tag_id),
    )
    conn.commit()

    return Tag(id=tag_id, name=new_name, created_at=existing.created_at)


def delete(tag_id: int, conn: sqlite3.Connection | None = None) -> bool:
    """Delete a tag by ID.

    This also removes all associations in time_entry_tags (via CASCADE).

    Args:
        tag_id: The ID of the tag to delete.
        conn: Optional database connection.

    Returns:
        True if the tag was deleted, False if not found.
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
    conn.commit()

    return cursor.rowcount > 0
