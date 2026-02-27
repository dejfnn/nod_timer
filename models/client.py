"""Client model with dataclass and CRUD operations."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime

from config import DATETIME_FORMAT
from db.connection import get_connection


@dataclass
class Client:
    """Represents a client in the system."""

    id: int | None = None
    name: str = ""
    archived: bool = False
    created_at: str = ""
    updated_at: str = ""


def _row_to_client(row: sqlite3.Row) -> Client:
    """Convert a database row to a Client dataclass instance."""
    return Client(
        id=row["id"],
        name=row["name"],
        archived=bool(row["archived"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def create(name: str, conn: sqlite3.Connection | None = None) -> Client:
    """Create a new client.

    Args:
        name: The client name (must be unique).
        conn: Optional database connection.

    Returns:
        The created Client with its assigned ID.
    """
    if conn is None:
        conn = get_connection()

    now = datetime.now().strftime(DATETIME_FORMAT)
    cursor = conn.execute(
        "INSERT INTO clients (name, created_at, updated_at) VALUES (?, ?, ?)",
        (name, now, now),
    )
    conn.commit()

    return Client(
        id=cursor.lastrowid,
        name=name,
        archived=False,
        created_at=now,
        updated_at=now,
    )


def get_by_id(client_id: int, conn: sqlite3.Connection | None = None) -> Client | None:
    """Get a client by its ID.

    Args:
        client_id: The client ID to look up.
        conn: Optional database connection.

    Returns:
        The Client if found, None otherwise.
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute("SELECT * FROM clients WHERE id = ?", (client_id,))
    row = cursor.fetchone()

    if row is None:
        return None

    return _row_to_client(row)


def get_all(
    include_archived: bool = False, conn: sqlite3.Connection | None = None
) -> list[Client]:
    """Get all clients.

    Args:
        include_archived: If True, include archived clients.
        conn: Optional database connection.

    Returns:
        List of Client instances.
    """
    if conn is None:
        conn = get_connection()

    if include_archived:
        cursor = conn.execute("SELECT * FROM clients ORDER BY name")
    else:
        cursor = conn.execute(
            "SELECT * FROM clients WHERE archived = 0 ORDER BY name"
        )

    return [_row_to_client(row) for row in cursor.fetchall()]


def update(
    client_id: int,
    name: str | None = None,
    archived: bool | None = None,
    conn: sqlite3.Connection | None = None,
) -> Client | None:
    """Update an existing client.

    Args:
        client_id: The ID of the client to update.
        name: New name (optional).
        archived: New archived status (optional).
        conn: Optional database connection.

    Returns:
        The updated Client, or None if not found.
    """
    if conn is None:
        conn = get_connection()

    existing = get_by_id(client_id, conn)
    if existing is None:
        return None

    new_name = name if name is not None else existing.name
    new_archived = archived if archived is not None else existing.archived
    now = datetime.now().strftime(DATETIME_FORMAT)

    conn.execute(
        "UPDATE clients SET name = ?, archived = ?, updated_at = ? WHERE id = ?",
        (new_name, int(new_archived), now, client_id),
    )
    conn.commit()

    return Client(
        id=client_id,
        name=new_name,
        archived=new_archived,
        created_at=existing.created_at,
        updated_at=now,
    )


def delete(client_id: int, conn: sqlite3.Connection | None = None) -> bool:
    """Delete a client by ID.

    Args:
        client_id: The ID of the client to delete.
        conn: Optional database connection.

    Returns:
        True if the client was deleted, False if not found.
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute("DELETE FROM clients WHERE id = ?", (client_id,))
    conn.commit()

    return cursor.rowcount > 0
