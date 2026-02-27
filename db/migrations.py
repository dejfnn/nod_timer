"""Schema initialization and migration runner for TimeFlow."""

import sqlite3
from pathlib import Path

from db.connection import get_connection

SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def init_db(conn: sqlite3.Connection | None = None) -> None:
    """Initialize the database by executing the schema SQL.

    Reads schema.sql and executes it. The DDL uses IF NOT EXISTS,
    so it is safe to call multiple times.

    Args:
        conn: Optional connection to use. Defaults to the singleton connection.
    """
    if conn is None:
        conn = get_connection()

    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    conn.executescript(schema_sql)


def tables_exist(conn: sqlite3.Connection | None = None) -> bool:
    """Check whether all required tables exist in the database.

    Args:
        conn: Optional connection to use. Defaults to the singleton connection.

    Returns:
        True if all 5 required tables exist, False otherwise.
    """
    if conn is None:
        conn = get_connection()

    required_tables = {"clients", "projects", "tags", "time_entries", "time_entry_tags"}

    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    )
    existing_tables = {row["name"] for row in cursor.fetchall()}

    return required_tables.issubset(existing_tables)
