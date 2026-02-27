"""Settings model with get/set operations.

Stores application settings as key-value pairs in the ``settings`` table.
Follows the same pattern as other model modules (conn parameter, CRUD).
"""

import json
import sqlite3

from db.connection import get_connection


# Default values for all supported settings
DEFAULTS: dict[str, str] = {
    "default_project_id": "",
    "default_billable": "false",
    "timezone": "Europe/Prague",
    "working_hours_per_day": "8.0",
}


def get_setting(
    key: str, conn: sqlite3.Connection | None = None
) -> str | None:
    """Get a setting value by key.

    Returns the stored value, or the default value from ``DEFAULTS``
    if the key is not yet persisted, or ``None`` if the key has no default.

    Args:
        key: The setting key.
        conn: Optional database connection.

    Returns:
        The setting value as a string, or None.
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    if row is not None:
        return row["value"]
    return DEFAULTS.get(key)


def set_setting(
    key: str, value: str, conn: sqlite3.Connection | None = None
) -> None:
    """Set a setting value (insert or update).

    Args:
        key: The setting key.
        value: The setting value as a string.
        conn: Optional database connection.
    """
    if conn is None:
        conn = get_connection()

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        (key, value),
    )
    conn.commit()


def get_all_settings(
    conn: sqlite3.Connection | None = None,
) -> dict[str, str]:
    """Get all settings as a dictionary.

    Merges defaults with stored values (stored values take precedence).

    Args:
        conn: Optional database connection.

    Returns:
        Dictionary of all settings.
    """
    if conn is None:
        conn = get_connection()

    result = dict(DEFAULTS)
    cursor = conn.execute("SELECT key, value FROM settings")
    for row in cursor.fetchall():
        result[row["key"]] = row["value"]
    return result


def delete_setting(
    key: str, conn: sqlite3.Connection | None = None
) -> bool:
    """Delete a setting by key, reverting to default.

    Args:
        key: The setting key.
        conn: Optional database connection.

    Returns:
        True if the setting was deleted, False if not found.
    """
    if conn is None:
        conn = get_connection()

    cursor = conn.execute("DELETE FROM settings WHERE key = ?", (key,))
    conn.commit()
    return cursor.rowcount > 0


def export_all_data(conn: sqlite3.Connection | None = None) -> str:
    """Export all database tables as a JSON string for backup.

    Exports: clients, projects, tags, time_entries, time_entry_tags, settings.

    Args:
        conn: Optional database connection.

    Returns:
        JSON string with all data.
    """
    if conn is None:
        conn = get_connection()

    tables = ["clients", "projects", "tags", "time_entries", "time_entry_tags", "settings"]
    data: dict[str, list[dict]] = {}

    for table in tables:
        cursor = conn.execute(f"SELECT * FROM {table}")  # noqa: S608
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        data[table] = [dict(zip(columns, row)) for row in rows]

    return json.dumps(data, indent=2, ensure_ascii=False)


def import_all_data(
    json_str: str, conn: sqlite3.Connection | None = None
) -> dict[str, int]:
    """Import data from a JSON backup string, replacing all existing data.

    Args:
        json_str: JSON string from ``export_all_data()``.
        conn: Optional database connection.

    Returns:
        Dictionary mapping table name to number of rows imported.

    Raises:
        ValueError: If the JSON is invalid or missing expected tables.
    """
    if conn is None:
        conn = get_connection()

    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON: {exc}") from exc

    if not isinstance(data, dict):
        raise ValueError("Expected a JSON object at the top level.")

    # Order matters for foreign keys: delete in reverse dependency order
    delete_order = ["time_entry_tags", "time_entries", "tags", "projects", "clients", "settings"]
    insert_order = ["clients", "projects", "tags", "time_entries", "time_entry_tags", "settings"]

    counts: dict[str, int] = {}

    # Delete existing data
    for table in delete_order:
        conn.execute(f"DELETE FROM {table}")  # noqa: S608

    # Insert new data
    for table in insert_order:
        rows = data.get(table, [])
        if not rows:
            counts[table] = 0
            continue

        columns = list(rows[0].keys())
        placeholders = ", ".join("?" for _ in columns)
        col_names = ", ".join(columns)
        sql = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders})"  # noqa: S608

        for row in rows:
            values = [row.get(col) for col in columns]
            conn.execute(sql, values)

        counts[table] = len(rows)

    conn.commit()
    return counts


def get_working_hours(conn: sqlite3.Connection | None = None) -> float:
    """Get the configured working hours per day.

    Args:
        conn: Optional database connection.

    Returns:
        Working hours per day as a float (default: 8.0).
    """
    val = get_setting("working_hours_per_day", conn=conn)
    try:
        return float(val) if val else 8.0
    except ValueError:
        return 8.0


def calculate_capacity_percent(
    tracked_seconds: int,
    working_hours: float,
) -> float:
    """Calculate the capacity percentage: tracked hours / working hours * 100.

    Args:
        tracked_seconds: Total tracked seconds.
        working_hours: Configured working hours per day.

    Returns:
        Percentage as a float (e.g. 75.0 for 75%). Returns 0.0 if working_hours <= 0.
    """
    if working_hours <= 0:
        return 0.0
    tracked_hours = tracked_seconds / 3600.0
    return (tracked_hours / working_hours) * 100.0
