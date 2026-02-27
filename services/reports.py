"""Report data aggregation functions for TimeFlow.

Pure functions (no Streamlit dependency) that build report DataFrames
from the database. All functions take a ``conn`` parameter for testability
and use pandas for aggregation.
"""

import sqlite3
from datetime import datetime, timedelta

import pandas as pd

from config import DATETIME_FORMAT


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fetch_entries_df(
    conn: sqlite3.Connection,
    start_date: str,
    end_date: str,
    project_ids: list[int] | None = None,
    client_ids: list[int] | None = None,
    tag_ids: list[int] | None = None,
    billable: bool | None = None,
) -> pd.DataFrame:
    """Fetch time entries in a date range with optional filters, returning a DataFrame.

    The returned DataFrame has columns:
    id, description, project_id, project_name, project_color, client_id, client_name,
    start_time, stop_time, duration_seconds, billable, hourly_rate, date.

    Only completed entries (duration_seconds IS NOT NULL) are included.

    Args:
        conn: SQLite connection.
        start_date: Start date as "YYYY-MM-DD".
        end_date: End date as "YYYY-MM-DD".
        project_ids: Optional list of project IDs to filter by.
        client_ids: Optional list of client IDs to filter by.
        tag_ids: Optional list of tag IDs to filter by (entry must have at least one).
        billable: Optional billable status filter.

    Returns:
        DataFrame of matching entries.
    """
    start = f"{start_date}T00:00:00"
    end = f"{end_date}T23:59:59"

    query = """
        SELECT
            te.id,
            te.description,
            te.project_id,
            COALESCE(p.name, 'No project') AS project_name,
            COALESCE(p.color, '#888888') AS project_color,
            p.client_id AS client_id,
            COALESCE(c.name, 'No client') AS client_name,
            te.start_time,
            te.stop_time,
            te.duration_seconds,
            te.billable,
            COALESCE(p.hourly_rate, 0) AS hourly_rate
        FROM time_entries te
        LEFT JOIN projects p ON te.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE te.start_time >= ? AND te.start_time <= ?
          AND te.duration_seconds IS NOT NULL
    """
    params: list = [start, end]

    if project_ids:
        placeholders = ",".join("?" for _ in project_ids)
        query += f" AND te.project_id IN ({placeholders})"
        params.extend(project_ids)

    if client_ids:
        placeholders = ",".join("?" for _ in client_ids)
        query += f" AND p.client_id IN ({placeholders})"
        params.extend(client_ids)

    if billable is not None:
        query += " AND te.billable = ?"
        params.append(int(billable))

    if tag_ids:
        placeholders = ",".join("?" for _ in tag_ids)
        query += f"""
            AND te.id IN (
                SELECT time_entry_id FROM time_entry_tags
                WHERE tag_id IN ({placeholders})
            )
        """
        params.extend(tag_ids)

    query += " ORDER BY te.start_time DESC"

    cursor = conn.execute(query, params)
    rows = cursor.fetchall()

    if not rows:
        return pd.DataFrame(columns=[
            "id", "description", "project_id", "project_name", "project_color",
            "client_id", "client_name", "start_time", "stop_time",
            "duration_seconds", "billable", "hourly_rate", "date",
        ])

    data = []
    for r in rows:
        data.append({
            "id": r["id"],
            "description": r["description"] or "(no description)",
            "project_id": r["project_id"],
            "project_name": r["project_name"],
            "project_color": r["project_color"],
            "client_id": r["client_id"],
            "client_name": r["client_name"],
            "start_time": r["start_time"],
            "stop_time": r["stop_time"],
            "duration_seconds": r["duration_seconds"],
            "billable": bool(r["billable"]),
            "hourly_rate": r["hourly_rate"],
        })

    df = pd.DataFrame(data)
    # Add date column (YYYY-MM-DD)
    df["date"] = df["start_time"].str[:10]
    return df


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_entries_in_range(
    conn: sqlite3.Connection,
    start_date: str,
    end_date: str,
    project_ids: list[int] | None = None,
    client_ids: list[int] | None = None,
    tag_ids: list[int] | None = None,
    billable: bool | None = None,
) -> pd.DataFrame:
    """Fetch filtered entries for the given date range.

    Thin wrapper around ``_fetch_entries_df`` exposed for direct use.

    Returns:
        DataFrame of matching entries.
    """
    return _fetch_entries_df(
        conn, start_date, end_date,
        project_ids=project_ids,
        client_ids=client_ids,
        tag_ids=tag_ids,
        billable=billable,
    )


def summary_by_project(
    conn: sqlite3.Connection,
    start_date: str,
    end_date: str,
    project_ids: list[int] | None = None,
    client_ids: list[int] | None = None,
    tag_ids: list[int] | None = None,
    billable: bool | None = None,
) -> pd.DataFrame:
    """Summary report grouped by project.

    Returns DataFrame with columns:
    project_name, project_color, entries_count, total_seconds, total_hours,
    billable_amount.

    Args:
        conn: SQLite connection.
        start_date: Start date as "YYYY-MM-DD".
        end_date: End date as "YYYY-MM-DD".
        project_ids: Optional project filter.
        client_ids: Optional client filter.
        tag_ids: Optional tag filter.
        billable: Optional billable filter.

    Returns:
        Aggregated DataFrame.
    """
    df = _fetch_entries_df(
        conn, start_date, end_date,
        project_ids=project_ids,
        client_ids=client_ids,
        tag_ids=tag_ids,
        billable=billable,
    )

    if df.empty:
        return pd.DataFrame(columns=[
            "project_name", "project_color", "entries_count",
            "total_seconds", "total_hours", "billable_amount",
        ])

    # Calculate billable amount per entry
    df["billable_amount"] = df.apply(
        lambda row: (row["duration_seconds"] / 3600.0) * row["hourly_rate"]
        if row["billable"] else 0.0,
        axis=1,
    )

    grouped = df.groupby(["project_name", "project_color"], as_index=False).agg(
        entries_count=("id", "count"),
        total_seconds=("duration_seconds", "sum"),
        billable_amount=("billable_amount", "sum"),
    )
    grouped["total_hours"] = grouped["total_seconds"] / 3600.0
    grouped = grouped.sort_values("total_seconds", ascending=False).reset_index(drop=True)

    return grouped[["project_name", "project_color", "entries_count",
                     "total_seconds", "total_hours", "billable_amount"]]


def summary_by_client(
    conn: sqlite3.Connection,
    start_date: str,
    end_date: str,
    project_ids: list[int] | None = None,
    client_ids: list[int] | None = None,
    tag_ids: list[int] | None = None,
    billable: bool | None = None,
) -> pd.DataFrame:
    """Summary report grouped by client.

    Returns DataFrame with columns:
    client_name, entries_count, total_seconds, total_hours, billable_amount.

    Args:
        conn: SQLite connection.
        start_date: Start date as "YYYY-MM-DD".
        end_date: End date as "YYYY-MM-DD".
        project_ids: Optional project filter.
        client_ids: Optional client filter.
        tag_ids: Optional tag filter.
        billable: Optional billable filter.

    Returns:
        Aggregated DataFrame.
    """
    df = _fetch_entries_df(
        conn, start_date, end_date,
        project_ids=project_ids,
        client_ids=client_ids,
        tag_ids=tag_ids,
        billable=billable,
    )

    if df.empty:
        return pd.DataFrame(columns=[
            "client_name", "entries_count", "total_seconds",
            "total_hours", "billable_amount",
        ])

    df["billable_amount"] = df.apply(
        lambda row: (row["duration_seconds"] / 3600.0) * row["hourly_rate"]
        if row["billable"] else 0.0,
        axis=1,
    )

    grouped = df.groupby("client_name", as_index=False).agg(
        entries_count=("id", "count"),
        total_seconds=("duration_seconds", "sum"),
        billable_amount=("billable_amount", "sum"),
    )
    grouped["total_hours"] = grouped["total_seconds"] / 3600.0
    grouped = grouped.sort_values("total_seconds", ascending=False).reset_index(drop=True)

    return grouped[["client_name", "entries_count", "total_seconds",
                     "total_hours", "billable_amount"]]


def summary_by_day(
    conn: sqlite3.Connection,
    start_date: str,
    end_date: str,
    project_ids: list[int] | None = None,
    client_ids: list[int] | None = None,
    tag_ids: list[int] | None = None,
    billable: bool | None = None,
) -> pd.DataFrame:
    """Summary report grouped by day.

    Returns DataFrame with columns:
    date, entries_count, total_seconds, total_hours, billable_amount.

    Args:
        conn: SQLite connection.
        start_date: Start date as "YYYY-MM-DD".
        end_date: End date as "YYYY-MM-DD".
        project_ids: Optional project filter.
        client_ids: Optional client filter.
        tag_ids: Optional tag filter.
        billable: Optional billable filter.

    Returns:
        Aggregated DataFrame sorted by date descending.
    """
    df = _fetch_entries_df(
        conn, start_date, end_date,
        project_ids=project_ids,
        client_ids=client_ids,
        tag_ids=tag_ids,
        billable=billable,
    )

    if df.empty:
        return pd.DataFrame(columns=[
            "date", "entries_count", "total_seconds",
            "total_hours", "billable_amount",
        ])

    df["billable_amount"] = df.apply(
        lambda row: (row["duration_seconds"] / 3600.0) * row["hourly_rate"]
        if row["billable"] else 0.0,
        axis=1,
    )

    grouped = df.groupby("date", as_index=False).agg(
        entries_count=("id", "count"),
        total_seconds=("duration_seconds", "sum"),
        billable_amount=("billable_amount", "sum"),
    )
    grouped["total_hours"] = grouped["total_seconds"] / 3600.0
    grouped = grouped.sort_values("date", ascending=False).reset_index(drop=True)

    return grouped[["date", "entries_count", "total_seconds",
                     "total_hours", "billable_amount"]]


def detailed_report(
    conn: sqlite3.Connection,
    start_date: str,
    end_date: str,
    project_ids: list[int] | None = None,
    client_ids: list[int] | None = None,
    tag_ids: list[int] | None = None,
    billable: bool | None = None,
) -> pd.DataFrame:
    """Detailed report: all entries with enriched data.

    Returns DataFrame with columns:
    date, description, project_name, client_name, tags, start_time, stop_time,
    duration_seconds, duration_display, billable, billable_amount.

    Tags are fetched per entry from the junction table.

    Args:
        conn: SQLite connection.
        start_date: Start date as "YYYY-MM-DD".
        end_date: End date as "YYYY-MM-DD".
        project_ids: Optional project filter.
        client_ids: Optional client filter.
        tag_ids: Optional tag filter.
        billable: Optional billable filter.

    Returns:
        DataFrame sorted by start_time descending.
    """
    df = _fetch_entries_df(
        conn, start_date, end_date,
        project_ids=project_ids,
        client_ids=client_ids,
        tag_ids=tag_ids,
        billable=billable,
    )

    if df.empty:
        return pd.DataFrame(columns=[
            "date", "description", "project_name", "client_name", "tags",
            "start_time", "stop_time", "duration_seconds", "duration_display",
            "billable", "billable_amount",
        ])

    # Fetch tags per entry
    entry_ids = df["id"].tolist()
    if entry_ids:
        placeholders = ",".join("?" for _ in entry_ids)
        tag_cursor = conn.execute(
            f"""SELECT tet.time_entry_id, t.name
            FROM time_entry_tags tet
            JOIN tags t ON tet.tag_id = t.id
            WHERE tet.time_entry_id IN ({placeholders})""",
            entry_ids,
        )
        tag_map: dict[int, list[str]] = {}
        for row in tag_cursor.fetchall():
            eid = row["time_entry_id"]
            tag_map.setdefault(eid, []).append(row["name"])
    else:
        tag_map = {}

    df["tags"] = df["id"].apply(lambda eid: ", ".join(tag_map.get(eid, [])))

    # Duration display
    def _fmt_dur(secs: int) -> str:
        h = secs // 3600
        m = (secs % 3600) // 60
        s = secs % 60
        return f"{h:02d}:{m:02d}:{s:02d}"

    df["duration_display"] = df["duration_seconds"].apply(_fmt_dur)

    # Billable amount
    df["billable_amount"] = df.apply(
        lambda row: (row["duration_seconds"] / 3600.0) * row["hourly_rate"]
        if row["billable"] else 0.0,
        axis=1,
    )

    # Format start/stop as short time
    df["start_time_display"] = df["start_time"].str[11:16]
    df["stop_time_display"] = df["stop_time"].apply(
        lambda s: s[11:16] if s else ""
    )

    return df[[
        "date", "description", "project_name", "client_name", "tags",
        "start_time", "stop_time", "start_time_display", "stop_time_display",
        "duration_seconds", "duration_display", "billable", "billable_amount",
    ]]


def detailed_day_subtotals(df: pd.DataFrame) -> pd.DataFrame:
    """Compute per-day subtotals from a detailed report DataFrame.

    Args:
        df: DataFrame returned by ``detailed_report``.

    Returns:
        DataFrame with columns: date, entries_count, total_seconds, total_hours.
    """
    if df.empty:
        return pd.DataFrame(columns=["date", "entries_count", "total_seconds", "total_hours"])

    grouped = df.groupby("date", as_index=False).agg(
        entries_count=("description", "count"),
        total_seconds=("duration_seconds", "sum"),
    )
    grouped["total_hours"] = grouped["total_seconds"] / 3600.0
    grouped = grouped.sort_values("date", ascending=False).reset_index(drop=True)
    return grouped


def weekly_report(
    conn: sqlite3.Connection,
    start_date: str,
    end_date: str,
    project_ids: list[int] | None = None,
    client_ids: list[int] | None = None,
    tag_ids: list[int] | None = None,
    billable: bool | None = None,
) -> pd.DataFrame:
    """Weekly report: project x day-of-week pivot table.

    Returns a DataFrame with columns:
    project_name, Mon, Tue, Wed, Thu, Fri, Sat, Sun, Total.
    Values are hours (float). A "Total" row is appended at the bottom.

    Args:
        conn: SQLite connection.
        start_date: Start date as "YYYY-MM-DD".
        end_date: End date as "YYYY-MM-DD".
        project_ids: Optional project filter.
        client_ids: Optional client filter.
        tag_ids: Optional tag filter.
        billable: Optional billable filter.

    Returns:
        Pivot DataFrame.
    """
    df = _fetch_entries_df(
        conn, start_date, end_date,
        project_ids=project_ids,
        client_ids=client_ids,
        tag_ids=tag_ids,
        billable=billable,
    )

    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    if df.empty:
        empty = pd.DataFrame(columns=["project_name"] + day_names + ["Total"])
        return empty

    # Add day-of-week column
    df["day_of_week"] = pd.to_datetime(df["date"]).dt.dayofweek  # 0=Mon

    # Convert seconds to hours
    df["hours"] = df["duration_seconds"] / 3600.0

    # Pivot
    pivot = df.pivot_table(
        index="project_name",
        columns="day_of_week",
        values="hours",
        aggfunc="sum",
        fill_value=0.0,
    )

    # Ensure all 7 day columns exist
    for i in range(7):
        if i not in pivot.columns:
            pivot[i] = 0.0
    pivot = pivot[[0, 1, 2, 3, 4, 5, 6]]
    pivot.columns = day_names

    # Row totals
    pivot["Total"] = pivot[day_names].sum(axis=1)

    # Sort by total descending
    pivot = pivot.sort_values("Total", ascending=False)

    # Column totals row
    totals = pivot[day_names + ["Total"]].sum()
    totals_row = pd.DataFrame([totals], columns=day_names + ["Total"])
    totals_row.insert(0, "project_name", "Total")

    pivot = pivot.reset_index()
    pivot = pd.concat([pivot, totals_row], ignore_index=True)

    return pivot


def calculate_billable_amount(
    duration_seconds: int,
    hourly_rate: float,
    is_billable: bool,
) -> float:
    """Calculate the billable amount for a single entry.

    Args:
        duration_seconds: Duration in seconds.
        hourly_rate: Rate per hour.
        is_billable: Whether the entry is billable.

    Returns:
        Billable amount in currency units.
    """
    if not is_billable or hourly_rate <= 0:
        return 0.0
    return (duration_seconds / 3600.0) * hourly_rate
