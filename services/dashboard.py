"""Dashboard data queries for TimeFlow.

Pure functions (no Streamlit dependency) that compute dashboard metrics
from the database. All functions take a ``conn`` parameter for testability.
"""

import sqlite3
from datetime import datetime, timedelta

import pandas as pd

from config import DATETIME_FORMAT


def get_today_total(conn: sqlite3.Connection) -> int:
    """Return total tracked seconds for today (completed entries only).

    Args:
        conn: SQLite connection.

    Returns:
        Total seconds tracked today.
    """
    today_str = datetime.now().strftime("%Y-%m-%d")
    start = f"{today_str}T00:00:00"
    end = f"{today_str}T23:59:59"

    cursor = conn.execute(
        """SELECT COALESCE(SUM(duration_seconds), 0) AS total
        FROM time_entries
        WHERE start_time >= ? AND start_time <= ?
          AND duration_seconds IS NOT NULL""",
        (start, end),
    )
    return int(cursor.fetchone()["total"])


def get_week_total(conn: sqlite3.Connection) -> int:
    """Return total tracked seconds for the current week (Mon-Sun).

    Args:
        conn: SQLite connection.

    Returns:
        Total seconds tracked this week.
    """
    today = datetime.now().date()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    start = f"{monday.isoformat()}T00:00:00"
    end = f"{sunday.isoformat()}T23:59:59"

    cursor = conn.execute(
        """SELECT COALESCE(SUM(duration_seconds), 0) AS total
        FROM time_entries
        WHERE start_time >= ? AND start_time <= ?
          AND duration_seconds IS NOT NULL""",
        (start, end),
    )
    return int(cursor.fetchone()["total"])


def get_month_total(conn: sqlite3.Connection) -> int:
    """Return total tracked seconds for the current month.

    Args:
        conn: SQLite connection.

    Returns:
        Total seconds tracked this month.
    """
    today = datetime.now().date()
    first_day = today.replace(day=1)
    # Last day of month
    if today.month == 12:
        last_day = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        last_day = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

    start = f"{first_day.isoformat()}T00:00:00"
    end = f"{last_day.isoformat()}T23:59:59"

    cursor = conn.execute(
        """SELECT COALESCE(SUM(duration_seconds), 0) AS total
        FROM time_entries
        WHERE start_time >= ? AND start_time <= ?
          AND duration_seconds IS NOT NULL""",
        (start, end),
    )
    return int(cursor.fetchone()["total"])


def get_period_total(
    conn: sqlite3.Connection,
    start_date: str,
    end_date: str,
) -> int:
    """Return total tracked seconds for an arbitrary date range.

    Args:
        conn: SQLite connection.
        start_date: Start date as "YYYY-MM-DD".
        end_date: End date as "YYYY-MM-DD".

    Returns:
        Total seconds in the range.
    """
    start = f"{start_date}T00:00:00"
    end = f"{end_date}T23:59:59"

    cursor = conn.execute(
        """SELECT COALESCE(SUM(duration_seconds), 0) AS total
        FROM time_entries
        WHERE start_time >= ? AND start_time <= ?
          AND duration_seconds IS NOT NULL""",
        (start, end),
    )
    return int(cursor.fetchone()["total"])


def get_last_7_days(conn: sqlite3.Connection) -> pd.DataFrame:
    """Return a DataFrame with hours per day for the last 7 days.

    The DataFrame has columns: ``date`` (str "YYYY-MM-DD"), ``hours`` (float).
    Always returns exactly 7 rows (one per day), with 0.0 for days without entries.

    Args:
        conn: SQLite connection.

    Returns:
        DataFrame with 7 rows.
    """
    today = datetime.now().date()
    dates = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
    start = f"{dates[0].isoformat()}T00:00:00"
    end = f"{dates[-1].isoformat()}T23:59:59"

    cursor = conn.execute(
        """SELECT start_time, duration_seconds
        FROM time_entries
        WHERE start_time >= ? AND start_time <= ?
          AND duration_seconds IS NOT NULL""",
        (start, end),
    )

    rows = cursor.fetchall()

    # Aggregate per day
    day_totals: dict[str, float] = {d.isoformat(): 0.0 for d in dates}
    for row in rows:
        day_key = row["start_time"][:10]  # "YYYY-MM-DD"
        if day_key in day_totals:
            day_totals[day_key] += row["duration_seconds"] / 3600.0

    df = pd.DataFrame(
        [{"date": d, "hours": h} for d, h in day_totals.items()]
    )
    return df


def get_project_distribution(conn: sqlite3.Connection) -> pd.DataFrame:
    """Return project time distribution for the current week.

    The DataFrame has columns: ``project_name`` (str), ``hours`` (float),
    ``color`` (str hex).  Projects with 0 hours are excluded.

    Args:
        conn: SQLite connection.

    Returns:
        DataFrame with one row per project that has time this week.
    """
    today = datetime.now().date()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    start = f"{monday.isoformat()}T00:00:00"
    end = f"{sunday.isoformat()}T23:59:59"

    cursor = conn.execute(
        """SELECT
            COALESCE(p.name, 'No project') AS project_name,
            COALESCE(p.color, '#888888') AS color,
            COALESCE(SUM(te.duration_seconds), 0) AS total_seconds
        FROM time_entries te
        LEFT JOIN projects p ON te.project_id = p.id
        WHERE te.start_time >= ? AND te.start_time <= ?
          AND te.duration_seconds IS NOT NULL
        GROUP BY COALESCE(p.name, 'No project'), COALESCE(p.color, '#888888')
        HAVING total_seconds > 0
        ORDER BY total_seconds DESC""",
        (start, end),
    )

    rows = cursor.fetchall()
    if not rows:
        return pd.DataFrame(columns=["project_name", "hours", "color"])

    data = [
        {
            "project_name": r["project_name"],
            "hours": r["total_seconds"] / 3600.0,
            "color": r["color"],
        }
        for r in rows
    ]
    return pd.DataFrame(data)


def get_recent_entries(
    conn: sqlite3.Connection, limit: int = 5
) -> list[dict]:
    """Return the most recent completed time entries.

    Each dict has keys: id, description, project_name, project_color,
    start_time, stop_time, duration_seconds.

    Args:
        conn: SQLite connection.
        limit: Maximum number of entries to return.

    Returns:
        List of dicts.
    """
    cursor = conn.execute(
        """SELECT
            te.id,
            te.description,
            te.start_time,
            te.stop_time,
            te.duration_seconds,
            COALESCE(p.name, 'No project') AS project_name,
            COALESCE(p.color, '#888888') AS project_color
        FROM time_entries te
        LEFT JOIN projects p ON te.project_id = p.id
        WHERE te.duration_seconds IS NOT NULL
        ORDER BY te.start_time DESC
        LIMIT ?""",
        (limit,),
    )

    return [
        {
            "id": r["id"],
            "description": r["description"] or "(no description)",
            "project_name": r["project_name"],
            "project_color": r["project_color"],
            "start_time": r["start_time"],
            "stop_time": r["stop_time"],
            "duration_seconds": r["duration_seconds"],
        }
        for r in cursor.fetchall()
    ]


def get_most_tracked_project(conn: sqlite3.Connection) -> dict | None:
    """Return the most tracked project this week.

    Returns a dict with keys: project_name, hours, color.
    Returns None if there are no entries this week.

    Args:
        conn: SQLite connection.

    Returns:
        Dict or None.
    """
    df = get_project_distribution(conn)
    if df.empty:
        return None

    top = df.iloc[0]
    return {
        "project_name": top["project_name"],
        "hours": top["hours"],
        "color": top["color"],
    }
