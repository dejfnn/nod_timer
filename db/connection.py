"""SQLite connection manager for TimeFlow.

Provides a singleton connection with WAL mode and foreign key enforcement.
"""

import sqlite3
import threading
from pathlib import Path

from config import DB_PATH

_connection: sqlite3.Connection | None = None
_lock = threading.Lock()


def get_connection(db_path: Path | str | None = None) -> sqlite3.Connection:
    """Get or create a singleton SQLite connection.

    The connection is configured with:
    - WAL journal mode for concurrent reads
    - Foreign keys enforcement (PRAGMA foreign_keys = ON)
    - Row factory set to sqlite3.Row for dict-like access

    Args:
        db_path: Optional path to the database file. Defaults to config.DB_PATH.
                 When provided (e.g., for testing), creates a new connection
                 without caching it in the singleton.

    Returns:
        A configured sqlite3.Connection instance.
    """
    global _connection

    if db_path is not None:
        conn = _create_connection(db_path)
        return conn

    with _lock:
        if _connection is None:
            _connection = _create_connection(DB_PATH)
        return _connection


def _create_connection(db_path: Path | str) -> sqlite3.Connection:
    """Create and configure a new SQLite connection.

    Args:
        db_path: Path to the database file.

    Returns:
        A configured sqlite3.Connection instance.
    """
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def close_connection() -> None:
    """Close the singleton connection if it exists."""
    global _connection
    with _lock:
        if _connection is not None:
            _connection.close()
            _connection = None
