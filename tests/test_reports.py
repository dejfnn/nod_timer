"""Tests for dashboard and report aggregation logic.

Each test uses an in-memory SQLite database with a fresh connection,
ensuring full isolation.  The tests exercise the *service* functions
(pure Python / pandas), not the Streamlit UI layer.
"""

import sqlite3
from datetime import datetime, timedelta

import pandas as pd
import pytest

from db.connection import _create_connection
from db.migrations import init_db
from models import client as client_model
from models import project as project_model
from models import tag as tag_model
from models import time_entry as time_entry_model
from services import dashboard as dashboard_svc
from services import reports as report_svc


# ============================================================
# Fixtures
# ============================================================

@pytest.fixture
def conn() -> sqlite3.Connection:
    """Create a fresh in-memory database connection for each test."""
    connection = _create_connection(":memory:")
    init_db(connection)
    return connection


def _fmt(dt: datetime) -> str:
    """Format a datetime for the DB."""
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def _create_entry(
    conn: sqlite3.Connection,
    description: str = "Work",
    project_id: int | None = None,
    start: datetime | None = None,
    duration: int = 3600,
    billable: bool = False,
    tag_ids: list[int] | None = None,
) -> time_entry_model.TimeEntry:
    """Helper to create a completed time entry."""
    if start is None:
        start = datetime.now()
    stop = start + timedelta(seconds=duration)
    return time_entry_model.create(
        start_time=_fmt(start),
        stop_time=_fmt(stop),
        duration_seconds=duration,
        description=description,
        project_id=project_id,
        billable=billable,
        tag_ids=tag_ids,
        conn=conn,
    )


# ============================================================
# Dashboard tests
# ============================================================

class TestDashboardTotals:
    """Tests for dashboard total calculations."""

    def test_today_total_with_entries(self, conn: sqlite3.Connection) -> None:
        """Today's total should sum today's completed entries."""
        now = datetime.now()
        _create_entry(conn, start=now.replace(hour=9, minute=0, second=0), duration=3600)
        _create_entry(conn, start=now.replace(hour=10, minute=0, second=0), duration=1800)

        total = dashboard_svc.get_today_total(conn)
        assert total == 5400  # 1h + 30min

    def test_today_total_empty(self, conn: sqlite3.Connection) -> None:
        """Today's total should be 0 with no entries."""
        total = dashboard_svc.get_today_total(conn)
        assert total == 0

    def test_today_total_excludes_yesterday(self, conn: sqlite3.Connection) -> None:
        """Today's total should exclude entries from yesterday."""
        yesterday = datetime.now() - timedelta(days=1)
        _create_entry(conn, start=yesterday, duration=7200)

        # Add one today
        now = datetime.now()
        _create_entry(conn, start=now.replace(hour=9, minute=0, second=0), duration=1000)

        total = dashboard_svc.get_today_total(conn)
        assert total == 1000

    def test_week_total(self, conn: sqlite3.Connection) -> None:
        """Week total should sum all entries in the current Mon-Sun week."""
        today = datetime.now()
        monday = today - timedelta(days=today.weekday())
        # Entry on Monday
        _create_entry(conn, start=monday.replace(hour=9, minute=0, second=0), duration=3600)
        # Entry on Tuesday
        tuesday = monday + timedelta(days=1)
        _create_entry(conn, start=tuesday.replace(hour=9, minute=0, second=0), duration=1800)

        total = dashboard_svc.get_week_total(conn)
        assert total == 5400

    def test_week_total_excludes_last_week(self, conn: sqlite3.Connection) -> None:
        """Week total should exclude entries from last week."""
        today = datetime.now()
        last_monday = today - timedelta(days=today.weekday() + 7)
        _create_entry(conn, start=last_monday.replace(hour=9, minute=0, second=0), duration=9999)

        total = dashboard_svc.get_week_total(conn)
        assert total == 0

    def test_month_total(self, conn: sqlite3.Connection) -> None:
        """Month total should sum entries in the current month."""
        today = datetime.now()
        first_day = today.replace(day=1, hour=9, minute=0, second=0)
        _create_entry(conn, start=first_day, duration=3600)
        _create_entry(conn, start=first_day + timedelta(days=1), duration=2400)

        total = dashboard_svc.get_month_total(conn)
        assert total == 6000

    def test_month_total_excludes_previous_month(self, conn: sqlite3.Connection) -> None:
        """Month total should exclude entries from previous months."""
        today = datetime.now()
        first_day = today.replace(day=1)
        prev_month = first_day - timedelta(days=1)
        _create_entry(conn, start=prev_month.replace(hour=9, minute=0, second=0), duration=9999)

        total = dashboard_svc.get_month_total(conn)
        assert total == 0

    def test_period_total(self, conn: sqlite3.Connection) -> None:
        """get_period_total should sum entries in an arbitrary date range."""
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, start=base, duration=3600)
        _create_entry(conn, start=base + timedelta(days=1), duration=1800)
        # Outside range
        _create_entry(conn, start=base + timedelta(days=10), duration=9999)

        total = dashboard_svc.get_period_total(conn, "2025-06-15", "2025-06-16")
        assert total == 5400


class TestDashboardLast7Days:
    """Tests for last 7 days chart data."""

    def test_returns_7_rows(self, conn: sqlite3.Connection) -> None:
        """Should always return exactly 7 rows."""
        df = dashboard_svc.get_last_7_days(conn)
        assert len(df) == 7

    def test_columns(self, conn: sqlite3.Connection) -> None:
        """Should have date and hours columns."""
        df = dashboard_svc.get_last_7_days(conn)
        assert "date" in df.columns
        assert "hours" in df.columns

    def test_hours_with_entries(self, conn: sqlite3.Connection) -> None:
        """Hours should reflect actual tracked time."""
        today = datetime.now()
        _create_entry(conn, start=today.replace(hour=8, minute=0, second=0), duration=7200)

        df = dashboard_svc.get_last_7_days(conn)
        today_str = today.strftime("%Y-%m-%d")
        today_row = df[df["date"] == today_str]
        assert len(today_row) == 1
        assert abs(today_row.iloc[0]["hours"] - 2.0) < 0.01

    def test_zero_for_days_without_entries(self, conn: sqlite3.Connection) -> None:
        """Days without entries should show 0 hours."""
        df = dashboard_svc.get_last_7_days(conn)
        assert (df["hours"] == 0.0).all()


class TestDashboardProjectDistribution:
    """Tests for project distribution donut chart data."""

    def test_empty_when_no_entries(self, conn: sqlite3.Connection) -> None:
        """Should return empty DataFrame when no entries."""
        df = dashboard_svc.get_project_distribution(conn)
        assert df.empty

    def test_distribution_with_entries(self, conn: sqlite3.Connection) -> None:
        """Should return project names and hours."""
        proj_a = project_model.create("Project A", conn=conn)
        proj_b = project_model.create("Project B", conn=conn)

        today = datetime.now()
        monday = today - timedelta(days=today.weekday())
        _create_entry(conn, project_id=proj_a.id,
                       start=monday.replace(hour=9, minute=0, second=0), duration=3600)
        _create_entry(conn, project_id=proj_b.id,
                       start=monday.replace(hour=11, minute=0, second=0), duration=7200)

        df = dashboard_svc.get_project_distribution(conn)
        assert len(df) == 2
        assert "project_name" in df.columns
        assert "hours" in df.columns
        assert "color" in df.columns


class TestDashboardRecentEntries:
    """Tests for recent entries query."""

    def test_empty_when_no_entries(self, conn: sqlite3.Connection) -> None:
        """Should return empty list when no entries."""
        result = dashboard_svc.get_recent_entries(conn)
        assert result == []

    def test_returns_limited_entries(self, conn: sqlite3.Connection) -> None:
        """Should respect the limit parameter."""
        now = datetime.now()
        for i in range(10):
            _create_entry(conn, description=f"Entry {i}",
                         start=now - timedelta(hours=i), duration=1800)

        result = dashboard_svc.get_recent_entries(conn, limit=5)
        assert len(result) == 5

    def test_entry_fields(self, conn: sqlite3.Connection) -> None:
        """Each entry should have the expected keys."""
        proj = project_model.create("Test Project", conn=conn)
        _create_entry(conn, description="Test work", project_id=proj.id,
                       start=datetime.now(), duration=3600)

        result = dashboard_svc.get_recent_entries(conn, limit=1)
        assert len(result) == 1
        entry = result[0]
        assert entry["description"] == "Test work"
        assert entry["project_name"] == "Test Project"
        assert entry["duration_seconds"] == 3600


class TestDashboardMostTracked:
    """Tests for most tracked project."""

    def test_none_when_no_entries(self, conn: sqlite3.Connection) -> None:
        """Should return None when no entries."""
        result = dashboard_svc.get_most_tracked_project(conn)
        assert result is None

    def test_returns_top_project(self, conn: sqlite3.Connection) -> None:
        """Should return the project with most hours this week."""
        proj_a = project_model.create("Short Project", conn=conn)
        proj_b = project_model.create("Long Project", conn=conn)

        today = datetime.now()
        monday = today - timedelta(days=today.weekday())
        _create_entry(conn, project_id=proj_a.id,
                       start=monday.replace(hour=9, minute=0, second=0), duration=1800)
        _create_entry(conn, project_id=proj_b.id,
                       start=monday.replace(hour=11, minute=0, second=0), duration=7200)

        result = dashboard_svc.get_most_tracked_project(conn)
        assert result is not None
        assert result["project_name"] == "Long Project"
        assert abs(result["hours"] - 2.0) < 0.01


# ============================================================
# Reports — Summary by project
# ============================================================

class TestSummaryByProject:
    """Tests for summary report grouped by project."""

    def test_empty_range(self, conn: sqlite3.Connection) -> None:
        """Empty date range should return empty DataFrame."""
        df = report_svc.summary_by_project(conn, "2025-01-01", "2025-01-01")
        assert isinstance(df, pd.DataFrame)
        assert df.empty

    def test_groups_by_project(self, conn: sqlite3.Connection) -> None:
        """Should group entries by project with correct totals."""
        proj_a = project_model.create("Alpha", conn=conn)
        proj_b = project_model.create("Beta", conn=conn)

        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj_a.id, start=base, duration=3600)
        _create_entry(conn, project_id=proj_a.id,
                       start=base + timedelta(hours=2), duration=1800)
        _create_entry(conn, project_id=proj_b.id,
                       start=base + timedelta(hours=4), duration=7200)

        df = report_svc.summary_by_project(conn, "2025-06-15", "2025-06-15")
        assert len(df) == 2

        alpha_row = df[df["project_name"] == "Alpha"].iloc[0]
        assert alpha_row["entries_count"] == 2
        assert alpha_row["total_seconds"] == 5400
        assert abs(alpha_row["total_hours"] - 1.5) < 0.01

        beta_row = df[df["project_name"] == "Beta"].iloc[0]
        assert beta_row["entries_count"] == 1
        assert beta_row["total_seconds"] == 7200

    def test_no_project_grouped_as_no_project(self, conn: sqlite3.Connection) -> None:
        """Entries without a project should appear as 'No project'."""
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=None, start=base, duration=3600)

        df = report_svc.summary_by_project(conn, "2025-06-15", "2025-06-15")
        assert len(df) == 1
        assert df.iloc[0]["project_name"] == "No project"

    def test_billable_amount(self, conn: sqlite3.Connection) -> None:
        """Billable amount should be hours x hourly_rate for billable entries."""
        proj = project_model.create("Billable Proj", billable=True, hourly_rate=100.0, conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=3600, billable=True)

        df = report_svc.summary_by_project(conn, "2025-06-15", "2025-06-15")
        assert len(df) == 1
        assert abs(df.iloc[0]["billable_amount"] - 100.0) < 0.01

    def test_non_billable_amount_is_zero(self, conn: sqlite3.Connection) -> None:
        """Non-billable entries should have 0 billable amount."""
        proj = project_model.create("Free Proj", hourly_rate=50.0, conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=3600, billable=False)

        df = report_svc.summary_by_project(conn, "2025-06-15", "2025-06-15")
        assert df.iloc[0]["billable_amount"] == 0.0


# ============================================================
# Reports — Summary by client
# ============================================================

class TestSummaryByClient:
    """Tests for summary report grouped by client."""

    def test_empty_range(self, conn: sqlite3.Connection) -> None:
        """Empty date range should return empty DataFrame."""
        df = report_svc.summary_by_client(conn, "2025-01-01", "2025-01-01")
        assert df.empty

    def test_groups_by_client(self, conn: sqlite3.Connection) -> None:
        """Should group entries by client correctly."""
        client_a = client_model.create("Client A", conn=conn)
        client_b = client_model.create("Client B", conn=conn)
        proj_a = project_model.create("Proj A", client_id=client_a.id, conn=conn)
        proj_b = project_model.create("Proj B", client_id=client_b.id, conn=conn)

        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj_a.id, start=base, duration=3600)
        _create_entry(conn, project_id=proj_b.id,
                       start=base + timedelta(hours=2), duration=1800)

        df = report_svc.summary_by_client(conn, "2025-06-15", "2025-06-15")
        assert len(df) == 2

        a_row = df[df["client_name"] == "Client A"].iloc[0]
        assert a_row["total_seconds"] == 3600

        b_row = df[df["client_name"] == "Client B"].iloc[0]
        assert b_row["total_seconds"] == 1800

    def test_no_client_grouped_as_no_client(self, conn: sqlite3.Connection) -> None:
        """Entries without a client should appear as 'No client'."""
        proj = project_model.create("Solo Proj", conn=conn)  # No client
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=3600)

        df = report_svc.summary_by_client(conn, "2025-06-15", "2025-06-15")
        assert len(df) == 1
        assert df.iloc[0]["client_name"] == "No client"


# ============================================================
# Reports — Summary by day
# ============================================================

class TestSummaryByDay:
    """Tests for summary report grouped by day."""

    def test_empty_range(self, conn: sqlite3.Connection) -> None:
        """Empty date range should return empty DataFrame."""
        df = report_svc.summary_by_day(conn, "2025-01-01", "2025-01-01")
        assert df.empty

    def test_groups_by_day(self, conn: sqlite3.Connection) -> None:
        """Should group entries by date."""
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, start=base, duration=3600)
        _create_entry(conn, start=base + timedelta(hours=2), duration=1800)
        _create_entry(conn, start=base + timedelta(days=1), duration=7200)

        df = report_svc.summary_by_day(conn, "2025-06-15", "2025-06-16")
        assert len(df) == 2

        day1 = df[df["date"] == "2025-06-15"].iloc[0]
        assert day1["entries_count"] == 2
        assert day1["total_seconds"] == 5400

        day2 = df[df["date"] == "2025-06-16"].iloc[0]
        assert day2["entries_count"] == 1
        assert day2["total_seconds"] == 7200


# ============================================================
# Reports — Detailed report
# ============================================================

class TestDetailedReport:
    """Tests for the detailed report."""

    def test_empty_range(self, conn: sqlite3.Connection) -> None:
        """Empty date range should return empty DataFrame."""
        df = report_svc.detailed_report(conn, "2025-01-01", "2025-01-01")
        assert isinstance(df, pd.DataFrame)
        assert df.empty

    def test_returns_all_entries(self, conn: sqlite3.Connection) -> None:
        """Should return all entries in the range."""
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, description="Task 1", start=base, duration=3600)
        _create_entry(conn, description="Task 2",
                       start=base + timedelta(hours=2), duration=1800)

        df = report_svc.detailed_report(conn, "2025-06-15", "2025-06-15")
        assert len(df) == 2

    def test_includes_tag_names(self, conn: sqlite3.Connection) -> None:
        """Should include tag names as comma-separated string."""
        tag1 = tag_model.create("urgent", conn=conn)
        tag2 = tag_model.create("review", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, description="Tagged entry", start=base,
                       duration=3600, tag_ids=[tag1.id, tag2.id])

        df = report_svc.detailed_report(conn, "2025-06-15", "2025-06-15")
        assert len(df) == 1
        tags_str = df.iloc[0]["tags"]
        assert "urgent" in tags_str
        assert "review" in tags_str

    def test_date_range_filtering(self, conn: sqlite3.Connection) -> None:
        """Should only include entries within the date range."""
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, description="In range", start=base, duration=3600)
        _create_entry(conn, description="Out of range",
                       start=base + timedelta(days=5), duration=3600)

        df = report_svc.detailed_report(conn, "2025-06-15", "2025-06-16")
        assert len(df) == 1
        assert df.iloc[0]["description"] == "In range"

    def test_duration_display(self, conn: sqlite3.Connection) -> None:
        """Should format duration correctly."""
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, start=base, duration=5400)  # 1h 30m

        df = report_svc.detailed_report(conn, "2025-06-15", "2025-06-15")
        assert df.iloc[0]["duration_display"] == "01:30:00"

    def test_day_subtotals(self, conn: sqlite3.Connection) -> None:
        """detailed_day_subtotals should compute per-day totals."""
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, start=base, duration=3600)
        _create_entry(conn, start=base + timedelta(hours=2), duration=1800)
        _create_entry(conn, start=base + timedelta(days=1), duration=7200)

        detail = report_svc.detailed_report(conn, "2025-06-15", "2025-06-16")
        subtotals = report_svc.detailed_day_subtotals(detail)

        assert len(subtotals) == 2
        day1 = subtotals[subtotals["date"] == "2025-06-15"].iloc[0]
        assert day1["total_seconds"] == 5400
        assert day1["entries_count"] == 2


# ============================================================
# Reports — Filtering
# ============================================================

class TestReportFiltering:
    """Tests for report filters (project, client, tag, billable)."""

    def test_filter_by_project(self, conn: sqlite3.Connection) -> None:
        """Should filter entries by project ID."""
        proj_a = project_model.create("A", conn=conn)
        proj_b = project_model.create("B", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj_a.id, start=base, duration=3600)
        _create_entry(conn, project_id=proj_b.id,
                       start=base + timedelta(hours=2), duration=1800)

        df = report_svc.get_entries_in_range(
            conn, "2025-06-15", "2025-06-15", project_ids=[proj_a.id]
        )
        assert len(df) == 1
        assert df.iloc[0]["project_name"] == "A"

    def test_filter_by_client(self, conn: sqlite3.Connection) -> None:
        """Should filter entries by client ID."""
        client = client_model.create("Target Client", conn=conn)
        proj_with_client = project_model.create("Proj C", client_id=client.id, conn=conn)
        proj_no_client = project_model.create("Proj D", conn=conn)

        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj_with_client.id, start=base, duration=3600)
        _create_entry(conn, project_id=proj_no_client.id,
                       start=base + timedelta(hours=2), duration=1800)

        df = report_svc.get_entries_in_range(
            conn, "2025-06-15", "2025-06-15", client_ids=[client.id]
        )
        assert len(df) == 1

    def test_filter_by_tag(self, conn: sqlite3.Connection) -> None:
        """Should filter entries by tag ID."""
        tag = tag_model.create("important", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, description="Tagged", start=base,
                       duration=3600, tag_ids=[tag.id])
        _create_entry(conn, description="Untagged",
                       start=base + timedelta(hours=2), duration=1800)

        df = report_svc.get_entries_in_range(
            conn, "2025-06-15", "2025-06-15", tag_ids=[tag.id]
        )
        assert len(df) == 1
        assert df.iloc[0]["description"] == "Tagged"

    def test_filter_by_billable(self, conn: sqlite3.Connection) -> None:
        """Should filter by billable status."""
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, description="Billable", start=base,
                       duration=3600, billable=True)
        _create_entry(conn, description="Non-billable",
                       start=base + timedelta(hours=2), duration=1800, billable=False)

        df_billable = report_svc.get_entries_in_range(
            conn, "2025-06-15", "2025-06-15", billable=True
        )
        assert len(df_billable) == 1
        assert df_billable.iloc[0]["description"] == "Billable"

        df_non = report_svc.get_entries_in_range(
            conn, "2025-06-15", "2025-06-15", billable=False
        )
        assert len(df_non) == 1
        assert df_non.iloc[0]["description"] == "Non-billable"

    def test_combined_filters(self, conn: sqlite3.Connection) -> None:
        """Should apply multiple filters simultaneously."""
        proj = project_model.create("Proj E", conn=conn)
        tag = tag_model.create("focus", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)

        # Matches all filters
        _create_entry(conn, description="Match", project_id=proj.id,
                       start=base, duration=3600, billable=True,
                       tag_ids=[tag.id])
        # Missing tag
        _create_entry(conn, description="No tag", project_id=proj.id,
                       start=base + timedelta(hours=2), duration=1800, billable=True)
        # Wrong billable
        _create_entry(conn, description="Not billable", project_id=proj.id,
                       start=base + timedelta(hours=4), duration=1800, billable=False,
                       tag_ids=[tag.id])

        df = report_svc.get_entries_in_range(
            conn, "2025-06-15", "2025-06-15",
            project_ids=[proj.id], tag_ids=[tag.id], billable=True,
        )
        assert len(df) == 1
        assert df.iloc[0]["description"] == "Match"


# ============================================================
# Reports — Weekly report
# ============================================================

class TestWeeklyReport:
    """Tests for the weekly pivot table report."""

    def test_empty_range(self, conn: sqlite3.Connection) -> None:
        """Should return empty DataFrame for empty range."""
        df = report_svc.weekly_report(conn, "2025-01-01", "2025-01-01")
        assert df.empty

    def test_pivot_structure(self, conn: sqlite3.Connection) -> None:
        """Should have project_name, day columns, and Total."""
        proj = project_model.create("Weekly Proj", conn=conn)
        # Monday 2025-06-16
        base = datetime(2025, 6, 16, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=3600)
        # Wednesday 2025-06-18
        _create_entry(conn, project_id=proj.id,
                       start=base + timedelta(days=2), duration=7200)

        df = report_svc.weekly_report(conn, "2025-06-16", "2025-06-22")

        assert "project_name" in df.columns
        for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]:
            assert day in df.columns
        assert "Total" in df.columns

    def test_totals_row(self, conn: sqlite3.Connection) -> None:
        """Should include a 'Total' row at the bottom."""
        proj = project_model.create("Totals Proj", conn=conn)
        base = datetime(2025, 6, 16, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=3600)

        df = report_svc.weekly_report(conn, "2025-06-16", "2025-06-22")
        last_row = df.iloc[-1]
        assert last_row["project_name"] == "Total"

    def test_correct_day_columns(self, conn: sqlite3.Connection) -> None:
        """Hours should appear in the correct day column."""
        proj = project_model.create("Day Check", conn=conn)
        # 2025-06-16 is a Monday
        mon = datetime(2025, 6, 16, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=mon, duration=3600)

        df = report_svc.weekly_report(conn, "2025-06-16", "2025-06-22")
        proj_row = df[df["project_name"] == "Day Check"].iloc[0]
        assert abs(proj_row["Mon"] - 1.0) < 0.01
        assert proj_row["Tue"] == 0.0

    def test_multiple_projects(self, conn: sqlite3.Connection) -> None:
        """Should have one row per project plus a Total row."""
        proj_a = project_model.create("Proj X", conn=conn)
        proj_b = project_model.create("Proj Y", conn=conn)
        mon = datetime(2025, 6, 16, 10, 0, 0)
        _create_entry(conn, project_id=proj_a.id, start=mon, duration=3600)
        _create_entry(conn, project_id=proj_b.id,
                       start=mon + timedelta(hours=3), duration=1800)

        df = report_svc.weekly_report(conn, "2025-06-16", "2025-06-22")
        # 2 project rows + 1 total row
        assert len(df) == 3
        assert df.iloc[-1]["project_name"] == "Total"


# ============================================================
# Reports — Billable amount calculation
# ============================================================

class TestBillableAmount:
    """Tests for billable amount calculation."""

    def test_billable_calculation(self, conn: sqlite3.Connection) -> None:
        """Billable amount = hours x hourly_rate for billable entries."""
        amount = report_svc.calculate_billable_amount(
            duration_seconds=7200,
            hourly_rate=150.0,
            is_billable=True,
        )
        assert abs(amount - 300.0) < 0.01

    def test_non_billable_returns_zero(self, conn: sqlite3.Connection) -> None:
        """Non-billable entries should return 0."""
        amount = report_svc.calculate_billable_amount(
            duration_seconds=7200,
            hourly_rate=150.0,
            is_billable=False,
        )
        assert amount == 0.0

    def test_zero_rate_returns_zero(self, conn: sqlite3.Connection) -> None:
        """Zero hourly rate should return 0 even if billable."""
        amount = report_svc.calculate_billable_amount(
            duration_seconds=7200,
            hourly_rate=0.0,
            is_billable=True,
        )
        assert amount == 0.0

    def test_partial_hour(self, conn: sqlite3.Connection) -> None:
        """Should correctly calculate for partial hours."""
        # 1.5 hours at $100/h = $150
        amount = report_svc.calculate_billable_amount(
            duration_seconds=5400,
            hourly_rate=100.0,
            is_billable=True,
        )
        assert abs(amount - 150.0) < 0.01

    def test_billable_amount_in_summary(self, conn: sqlite3.Connection) -> None:
        """Summary report should correctly compute billable amounts."""
        proj = project_model.create(
            "Consulting", billable=True, hourly_rate=200.0, conn=conn
        )
        base = datetime(2025, 6, 15, 10, 0, 0)
        # 2 hours billable at $200/h = $400
        _create_entry(conn, project_id=proj.id, start=base,
                       duration=7200, billable=True)
        # 1 hour non-billable (should not contribute to billable amount)
        _create_entry(conn, project_id=proj.id,
                       start=base + timedelta(hours=3),
                       duration=3600, billable=False)

        df = report_svc.summary_by_project(conn, "2025-06-15", "2025-06-15")
        assert len(df) == 1
        assert abs(df.iloc[0]["billable_amount"] - 400.0) < 0.01
        assert df.iloc[0]["total_seconds"] == 10800  # 3 hours total


# ============================================================
# Reports — Empty states
# ============================================================

class TestEmptyStates:
    """Tests that empty date ranges return proper empty DataFrames."""

    def test_summary_by_project_empty(self, conn: sqlite3.Connection) -> None:
        """summary_by_project returns empty DataFrame with correct columns."""
        df = report_svc.summary_by_project(conn, "2099-01-01", "2099-01-31")
        assert df.empty
        assert "project_name" in df.columns
        assert "total_seconds" in df.columns

    def test_summary_by_client_empty(self, conn: sqlite3.Connection) -> None:
        """summary_by_client returns empty DataFrame with correct columns."""
        df = report_svc.summary_by_client(conn, "2099-01-01", "2099-01-31")
        assert df.empty
        assert "client_name" in df.columns

    def test_summary_by_day_empty(self, conn: sqlite3.Connection) -> None:
        """summary_by_day returns empty DataFrame with correct columns."""
        df = report_svc.summary_by_day(conn, "2099-01-01", "2099-01-31")
        assert df.empty
        assert "date" in df.columns

    def test_detailed_empty(self, conn: sqlite3.Connection) -> None:
        """detailed_report returns empty DataFrame with correct columns."""
        df = report_svc.detailed_report(conn, "2099-01-01", "2099-01-31")
        assert df.empty
        assert "description" in df.columns

    def test_weekly_empty(self, conn: sqlite3.Connection) -> None:
        """weekly_report returns empty DataFrame with correct columns."""
        df = report_svc.weekly_report(conn, "2099-01-01", "2099-01-07")
        assert df.empty

    def test_day_subtotals_empty(self, conn: sqlite3.Connection) -> None:
        """detailed_day_subtotals with empty DataFrame returns empty."""
        empty = pd.DataFrame(columns=[
            "date", "description", "project_name", "client_name", "tags",
            "start_time", "stop_time", "duration_seconds", "duration_display",
            "billable", "billable_amount",
        ])
        subtotals = report_svc.detailed_day_subtotals(empty)
        assert subtotals.empty

    def test_get_entries_in_range_empty(self, conn: sqlite3.Connection) -> None:
        """get_entries_in_range returns empty DataFrame for empty range."""
        df = report_svc.get_entries_in_range(conn, "2099-01-01", "2099-01-31")
        assert df.empty
