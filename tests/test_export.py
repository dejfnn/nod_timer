"""Tests for Phase 5: export, settings, and polish functionality.

Each test uses an in-memory SQLite database with a fresh connection,
ensuring full isolation. Tests cover:
- CSV export content matching report data
- PDF export generating valid files
- Settings get/set persistence
- JSON backup/restore round-trip
- Working hours capacity calculation
"""

import json
import sqlite3
from datetime import datetime, timedelta

import pandas as pd
import pytest

from db.connection import _create_connection
from db.migrations import init_db
from models import client as client_model
from models import project as project_model
from models import settings as settings_model
from models import tag as tag_model
from models import time_entry as time_entry_model
from services import export as export_svc
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
# Settings get/set tests
# ============================================================

class TestSettingsGetSet:
    """Tests for settings model get/set operations."""

    def test_get_default_when_not_set(self, conn: sqlite3.Connection) -> None:
        """Getting a known key that isn't set should return the default."""
        value = settings_model.get_setting("timezone", conn=conn)
        assert value == "Europe/Prague"

    def test_get_unknown_key_returns_none(self, conn: sqlite3.Connection) -> None:
        """Getting an unknown key should return None."""
        value = settings_model.get_setting("nonexistent_key", conn=conn)
        assert value is None

    def test_set_and_get(self, conn: sqlite3.Connection) -> None:
        """Setting a value should persist and be retrievable."""
        settings_model.set_setting("timezone", "America/New_York", conn=conn)
        value = settings_model.get_setting("timezone", conn=conn)
        assert value == "America/New_York"

    def test_set_overrides_previous(self, conn: sqlite3.Connection) -> None:
        """Setting the same key again should update the value."""
        settings_model.set_setting("timezone", "UTC", conn=conn)
        settings_model.set_setting("timezone", "Asia/Tokyo", conn=conn)
        value = settings_model.get_setting("timezone", conn=conn)
        assert value == "Asia/Tokyo"

    def test_get_all_settings_includes_defaults(self, conn: sqlite3.Connection) -> None:
        """get_all_settings should include default values for unset keys."""
        all_settings = settings_model.get_all_settings(conn=conn)
        assert "timezone" in all_settings
        assert "working_hours_per_day" in all_settings
        assert "default_billable" in all_settings
        assert "default_project_id" in all_settings

    def test_get_all_settings_overrides_defaults(self, conn: sqlite3.Connection) -> None:
        """Stored values should override defaults in get_all_settings."""
        settings_model.set_setting("timezone", "UTC", conn=conn)
        all_settings = settings_model.get_all_settings(conn=conn)
        assert all_settings["timezone"] == "UTC"

    def test_delete_setting(self, conn: sqlite3.Connection) -> None:
        """Deleting a setting should revert to default."""
        settings_model.set_setting("timezone", "UTC", conn=conn)
        deleted = settings_model.delete_setting("timezone", conn=conn)
        assert deleted is True
        # Should fall back to default
        value = settings_model.get_setting("timezone", conn=conn)
        assert value == "Europe/Prague"

    def test_delete_nonexistent(self, conn: sqlite3.Connection) -> None:
        """Deleting a nonexistent setting should return False."""
        deleted = settings_model.delete_setting("nonexistent", conn=conn)
        assert deleted is False

    def test_set_default_project_id(self, conn: sqlite3.Connection) -> None:
        """Should persist default project ID as string."""
        proj = project_model.create("Test Project", conn=conn)
        settings_model.set_setting("default_project_id", str(proj.id), conn=conn)
        value = settings_model.get_setting("default_project_id", conn=conn)
        assert value == str(proj.id)

    def test_set_default_billable(self, conn: sqlite3.Connection) -> None:
        """Should persist billable preference."""
        settings_model.set_setting("default_billable", "true", conn=conn)
        value = settings_model.get_setting("default_billable", conn=conn)
        assert value == "true"


# ============================================================
# Working hours / capacity tests
# ============================================================

class TestWorkingHoursCapacity:
    """Tests for working hours and capacity calculation."""

    def test_default_working_hours(self, conn: sqlite3.Connection) -> None:
        """Default working hours should be 8.0."""
        hours = settings_model.get_working_hours(conn=conn)
        assert hours == 8.0

    def test_custom_working_hours(self, conn: sqlite3.Connection) -> None:
        """Custom working hours should be returned after setting."""
        settings_model.set_setting("working_hours_per_day", "6.5", conn=conn)
        hours = settings_model.get_working_hours(conn=conn)
        assert hours == 6.5

    def test_invalid_working_hours_returns_default(self, conn: sqlite3.Connection) -> None:
        """Invalid working hours value should fall back to 8.0."""
        settings_model.set_setting("working_hours_per_day", "not_a_number", conn=conn)
        hours = settings_model.get_working_hours(conn=conn)
        assert hours == 8.0

    def test_capacity_100_percent(self) -> None:
        """8 hours tracked with 8h working day should be 100%."""
        pct = settings_model.calculate_capacity_percent(28800, 8.0)  # 8h in seconds
        assert abs(pct - 100.0) < 0.01

    def test_capacity_50_percent(self) -> None:
        """4 hours tracked with 8h working day should be 50%."""
        pct = settings_model.calculate_capacity_percent(14400, 8.0)  # 4h in seconds
        assert abs(pct - 50.0) < 0.01

    def test_capacity_zero_working_hours(self) -> None:
        """Zero working hours should return 0%."""
        pct = settings_model.calculate_capacity_percent(3600, 0.0)
        assert pct == 0.0

    def test_capacity_over_100(self) -> None:
        """Overtime should exceed 100%."""
        pct = settings_model.calculate_capacity_percent(36000, 8.0)  # 10h
        assert pct > 100.0
        assert abs(pct - 125.0) < 0.01

    def test_capacity_no_tracked_time(self) -> None:
        """Zero tracked time should be 0%."""
        pct = settings_model.calculate_capacity_percent(0, 8.0)
        assert pct == 0.0

    def test_capacity_with_custom_hours(self) -> None:
        """6 hours tracked with 6h day should be 100%."""
        pct = settings_model.calculate_capacity_percent(21600, 6.0)  # 6h
        assert abs(pct - 100.0) < 0.01


# ============================================================
# CSV export tests
# ============================================================

class TestCSVExport:
    """Tests for CSV export functionality."""

    def test_csv_from_summary_by_project(self, conn: sqlite3.Connection) -> None:
        """CSV export should contain correct project summary data."""
        proj = project_model.create("Export Test", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=3600,
                       description="Task 1")
        _create_entry(conn, project_id=proj.id, start=base + timedelta(hours=2),
                       duration=1800, description="Task 2")

        df = report_svc.summary_by_project(conn, "2025-06-15", "2025-06-15")
        csv_str = export_svc.dataframe_to_csv(df)

        assert "Export Test" in csv_str
        assert "5400" in csv_str  # total_seconds
        assert "2" in csv_str  # entries_count

    def test_csv_with_column_selection(self, conn: sqlite3.Connection) -> None:
        """CSV export with column selection should only include specified columns."""
        proj = project_model.create("Col Test", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=3600)

        df = report_svc.summary_by_project(conn, "2025-06-15", "2025-06-15")
        csv_str = export_svc.dataframe_to_csv(
            df, columns=["project_name", "entries_count"]
        )

        assert "project_name" in csv_str
        assert "entries_count" in csv_str
        # total_seconds column header should not be present
        assert "total_seconds" not in csv_str

    def test_csv_with_rename(self, conn: sqlite3.Connection) -> None:
        """CSV export with rename_map should use display names."""
        proj = project_model.create("Rename Test", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=3600)

        df = report_svc.summary_by_project(conn, "2025-06-15", "2025-06-15")
        csv_str = export_svc.dataframe_to_csv(
            df,
            columns=["project_name", "entries_count"],
            rename_map={"project_name": "Project", "entries_count": "Entries"},
        )

        assert "Project" in csv_str
        assert "Entries" in csv_str
        # Original names should not appear as headers
        lines = csv_str.strip().split("\n")
        header = lines[0]
        assert "project_name" not in header
        assert "entries_count" not in header

    def test_csv_empty_dataframe(self) -> None:
        """CSV from empty DataFrame should just have headers."""
        df = pd.DataFrame(columns=["a", "b", "c"])
        csv_str = export_svc.dataframe_to_csv(df)
        lines = csv_str.strip().split("\n")
        assert len(lines) == 1  # Only header row
        assert "a,b,c" in lines[0]

    def test_csv_detailed_report(self, conn: sqlite3.Connection) -> None:
        """CSV export of detailed report should include all entry rows."""
        proj = project_model.create("Detail CSV", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=3600,
                       description="First task")
        _create_entry(conn, project_id=proj.id, start=base + timedelta(hours=2),
                       duration=1800, description="Second task")

        df = report_svc.detailed_report(conn, "2025-06-15", "2025-06-15")
        csv_str = export_svc.dataframe_to_csv(df)

        assert "First task" in csv_str
        assert "Second task" in csv_str

    def test_csv_weekly_report(self, conn: sqlite3.Connection) -> None:
        """CSV export of weekly report should include day columns."""
        proj = project_model.create("Weekly CSV", conn=conn)
        mon = datetime(2025, 6, 16, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=mon, duration=3600)

        df = report_svc.weekly_report(conn, "2025-06-16", "2025-06-22")
        csv_str = export_svc.weekly_report_to_csv(df)

        assert "Mon" in csv_str
        assert "Tue" in csv_str
        assert "Total" in csv_str
        assert "Weekly CSV" in csv_str


# ============================================================
# PDF export tests
# ============================================================

class TestPDFExport:
    """Tests for PDF export functionality."""

    def test_summary_pdf_generates_bytes(self, conn: sqlite3.Connection) -> None:
        """Summary PDF export should return non-empty bytes."""
        proj = project_model.create("PDF Test", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=3600)

        df = report_svc.summary_by_project(conn, "2025-06-15", "2025-06-15")
        pdf_bytes = export_svc.summary_report_to_pdf(
            df,
            group_col="project_name",
            title="Test Report",
            date_range="2025-06-15 to 2025-06-15",
        )

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0

    def test_summary_pdf_starts_with_pdf_header(self, conn: sqlite3.Connection) -> None:
        """PDF should start with the %PDF magic bytes."""
        proj = project_model.create("Header Test", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=3600)

        df = report_svc.summary_by_project(conn, "2025-06-15", "2025-06-15")
        pdf_bytes = export_svc.summary_report_to_pdf(df, group_col="project_name")

        assert pdf_bytes[:4] == b"%PDF"

    def test_summary_pdf_empty_data(self) -> None:
        """PDF with empty data should still be valid."""
        df = pd.DataFrame(columns=[
            "project_name", "project_color", "entries_count",
            "total_seconds", "total_hours", "billable_amount",
        ])
        pdf_bytes = export_svc.summary_report_to_pdf(df, group_col="project_name")

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes[:4] == b"%PDF"

    def test_summary_pdf_with_filters(self, conn: sqlite3.Connection) -> None:
        """PDF should include filter text."""
        proj = project_model.create("Filter PDF", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=3600, billable=True)

        df = report_svc.summary_by_project(conn, "2025-06-15", "2025-06-15")
        pdf_bytes = export_svc.summary_report_to_pdf(
            df,
            group_col="project_name",
            title="Summary by Project",
            date_range="2025-06-15 to 2025-06-15",
            filters_text="Billable only",
        )

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 100

    def test_detailed_pdf_generates_bytes(self, conn: sqlite3.Connection) -> None:
        """Detailed PDF export should return non-empty bytes."""
        proj = project_model.create("Detail PDF", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=3600,
                       description="PDF task")

        df = report_svc.detailed_report(conn, "2025-06-15", "2025-06-15")
        pdf_bytes = export_svc.detailed_report_to_pdf(
            df,
            title="Detailed Report",
            date_range="2025-06-15 to 2025-06-15",
        )

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes[:4] == b"%PDF"

    def test_detailed_pdf_empty_data(self) -> None:
        """Detailed PDF with empty data should still be valid."""
        df = pd.DataFrame(columns=[
            "date", "description", "project_name", "client_name", "tags",
            "start_time", "stop_time", "start_time_display", "stop_time_display",
            "duration_seconds", "duration_display", "billable", "billable_amount",
        ])
        pdf_bytes = export_svc.detailed_report_to_pdf(df)

        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes[:4] == b"%PDF"

    def test_summary_pdf_multiple_projects(self, conn: sqlite3.Connection) -> None:
        """PDF with multiple projects should be generated correctly."""
        proj_a = project_model.create("Alpha PDF", conn=conn)
        proj_b = project_model.create("Beta PDF", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj_a.id, start=base, duration=3600)
        _create_entry(conn, project_id=proj_b.id,
                       start=base + timedelta(hours=2), duration=7200)

        df = report_svc.summary_by_project(conn, "2025-06-15", "2025-06-15")
        pdf_bytes = export_svc.summary_report_to_pdf(df, group_col="project_name")

        assert len(pdf_bytes) > 200
        assert pdf_bytes[:4] == b"%PDF"


# ============================================================
# JSON backup/restore tests
# ============================================================

class TestJSONBackupRestore:
    """Tests for JSON backup and restore functionality."""

    def test_export_empty_database(self, conn: sqlite3.Connection) -> None:
        """Exporting an empty database should return valid JSON."""
        json_str = settings_model.export_all_data(conn=conn)
        data = json.loads(json_str)

        assert isinstance(data, dict)
        assert "clients" in data
        assert "projects" in data
        assert "tags" in data
        assert "time_entries" in data
        assert "time_entry_tags" in data
        assert "settings" in data

    def test_export_with_data(self, conn: sqlite3.Connection) -> None:
        """Export should include all created records."""
        client = client_model.create("Test Client", conn=conn)
        proj = project_model.create("Test Project", client_id=client.id, conn=conn)
        tag = tag_model.create("test-tag", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=3600,
                       description="Test entry", tag_ids=[tag.id])
        settings_model.set_setting("timezone", "UTC", conn=conn)

        json_str = settings_model.export_all_data(conn=conn)
        data = json.loads(json_str)

        assert len(data["clients"]) == 1
        assert data["clients"][0]["name"] == "Test Client"
        assert len(data["projects"]) == 1
        assert data["projects"][0]["name"] == "Test Project"
        assert len(data["tags"]) == 1
        assert data["tags"][0]["name"] == "test-tag"
        assert len(data["time_entries"]) == 1
        assert data["time_entries"][0]["description"] == "Test entry"
        assert len(data["time_entry_tags"]) == 1
        assert len(data["settings"]) == 1
        assert data["settings"][0]["key"] == "timezone"
        assert data["settings"][0]["value"] == "UTC"

    def test_import_restores_data(self, conn: sqlite3.Connection) -> None:
        """Import should restore data from exported JSON."""
        # Create data
        client = client_model.create("Backup Client", conn=conn)
        proj = project_model.create("Backup Project", client_id=client.id, conn=conn)
        tag = tag_model.create("backup-tag", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=7200,
                       description="Backup entry", tag_ids=[tag.id])
        settings_model.set_setting("working_hours_per_day", "7.5", conn=conn)

        # Export
        json_str = settings_model.export_all_data(conn=conn)

        # Clear all data manually
        conn.execute("DELETE FROM time_entry_tags")
        conn.execute("DELETE FROM time_entries")
        conn.execute("DELETE FROM tags")
        conn.execute("DELETE FROM projects")
        conn.execute("DELETE FROM clients")
        conn.execute("DELETE FROM settings")
        conn.commit()

        # Verify empty
        assert len(client_model.get_all(include_archived=True, conn=conn)) == 0

        # Import
        counts = settings_model.import_all_data(json_str, conn=conn)

        # Verify restored
        assert counts["clients"] == 1
        assert counts["projects"] == 1
        assert counts["tags"] == 1
        assert counts["time_entries"] == 1
        assert counts["time_entry_tags"] == 1
        assert counts["settings"] == 1

        clients = client_model.get_all(include_archived=True, conn=conn)
        assert len(clients) == 1
        assert clients[0].name == "Backup Client"

        projects = project_model.get_all(include_archived=True, conn=conn)
        assert len(projects) == 1
        assert projects[0].name == "Backup Project"

        tags = tag_model.get_all(conn=conn)
        assert len(tags) == 1
        assert tags[0].name == "backup-tag"

        value = settings_model.get_setting("working_hours_per_day", conn=conn)
        assert value == "7.5"

    def test_round_trip(self, conn: sqlite3.Connection) -> None:
        """Export and re-import should produce identical data."""
        client = client_model.create("RT Client", conn=conn)
        proj = project_model.create(
            "RT Project", client_id=client.id,
            billable=True, hourly_rate=100.0, conn=conn,
        )
        tag = tag_model.create("rt-tag", conn=conn)
        base = datetime(2025, 6, 15, 10, 0, 0)
        _create_entry(conn, project_id=proj.id, start=base, duration=5400,
                       description="Round-trip entry", billable=True, tag_ids=[tag.id])

        # Export first time
        json1 = settings_model.export_all_data(conn=conn)

        # Import (replaces data)
        settings_model.import_all_data(json1, conn=conn)

        # Export second time
        json2 = settings_model.export_all_data(conn=conn)

        # Parse and compare
        data1 = json.loads(json1)
        data2 = json.loads(json2)

        assert data1["clients"] == data2["clients"]
        assert data1["projects"] == data2["projects"]
        assert data1["tags"] == data2["tags"]
        assert data1["time_entries"] == data2["time_entries"]
        assert data1["time_entry_tags"] == data2["time_entry_tags"]

    def test_import_invalid_json(self, conn: sqlite3.Connection) -> None:
        """Import with invalid JSON should raise ValueError."""
        with pytest.raises(ValueError, match="Invalid JSON"):
            settings_model.import_all_data("not valid json {{{", conn=conn)

    def test_import_non_object_json(self, conn: sqlite3.Connection) -> None:
        """Import with non-object JSON should raise ValueError."""
        with pytest.raises(ValueError, match="Expected a JSON object"):
            settings_model.import_all_data("[1, 2, 3]", conn=conn)

    def test_import_replaces_existing_data(self, conn: sqlite3.Connection) -> None:
        """Import should replace existing data, not append."""
        # Create initial data
        client_model.create("Original Client", conn=conn)
        tag_model.create("original-tag", conn=conn)

        # Import empty-ish backup
        empty_backup = json.dumps({
            "clients": [],
            "projects": [],
            "tags": [],
            "time_entries": [],
            "time_entry_tags": [],
            "settings": [],
        })
        settings_model.import_all_data(empty_backup, conn=conn)

        # Original data should be gone
        assert len(client_model.get_all(include_archived=True, conn=conn)) == 0
        assert len(tag_model.get_all(conn=conn)) == 0

    def test_import_with_missing_tables(self, conn: sqlite3.Connection) -> None:
        """Import should handle missing table keys gracefully."""
        partial_backup = json.dumps({
            "clients": [{"id": 1, "name": "Partial", "archived": 0,
                          "created_at": "2025-01-01T00:00:00",
                          "updated_at": "2025-01-01T00:00:00"}],
        })
        counts = settings_model.import_all_data(partial_backup, conn=conn)
        assert counts["clients"] == 1
        assert counts.get("projects", 0) == 0
