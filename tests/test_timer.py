"""Tests for timer logic — duration calculation, state transitions,
manual entry validation, and today's entries filtering.

Each test uses an in-memory SQLite database via a fresh connection,
ensuring isolation between tests.
"""

import sqlite3
from datetime import datetime, timedelta

import pytest

from config import DATETIME_FORMAT
from db.connection import _create_connection
from db.migrations import init_db
from models import project as project_model
from models import tag as tag_model
from models import time_entry as time_entry_model
from ui.state import format_duration, validate_manual_entry


@pytest.fixture
def conn() -> sqlite3.Connection:
    """Create a fresh in-memory database connection for each test."""
    connection = _create_connection(":memory:")
    init_db(connection)
    return connection


# ============================================================
# Timer Start Tests
# ============================================================


class TestTimerStart:
    """Tests for timer start — creating entries with NULL stop_time."""

    def test_start_creates_entry_with_null_stop_time(
        self, conn: sqlite3.Connection
    ) -> None:
        """Timer start creates entry with start_time=now and stop_time=NULL."""
        now = datetime.now().strftime(DATETIME_FORMAT)
        entry = time_entry_model.create(
            start_time=now,
            description="Working on feature",
            conn=conn,
        )

        assert entry.id is not None
        assert entry.start_time == now
        assert entry.stop_time is None
        assert entry.duration_seconds is None

    def test_start_creates_active_entry(
        self, conn: sqlite3.Connection
    ) -> None:
        """A started entry is found by get_active_entry."""
        now = datetime.now().strftime(DATETIME_FORMAT)
        time_entry_model.create(
            start_time=now,
            description="Active task",
            conn=conn,
        )

        active = time_entry_model.get_active_entry(conn=conn)
        assert active is not None
        assert active.description == "Active task"
        assert active.stop_time is None

    def test_start_with_project_and_tags(
        self, conn: sqlite3.Connection
    ) -> None:
        """Timer start can include project and tags."""
        project = project_model.create("Web App", conn=conn)
        tag1 = tag_model.create("dev", conn=conn)
        tag2 = tag_model.create("urgent", conn=conn)

        now = datetime.now().strftime(DATETIME_FORMAT)
        entry = time_entry_model.create(
            start_time=now,
            description="Feature work",
            project_id=project.id,
            tag_ids=[tag1.id, tag2.id],
            conn=conn,
        )

        assert entry.project_id == project.id
        assert len(entry.tags) == 2
        assert tag1.id in entry.tags
        assert tag2.id in entry.tags


# ============================================================
# Timer Stop Tests
# ============================================================


class TestTimerStop:
    """Tests for timer stop — duration calculation."""

    def test_stop_calculates_duration_correctly(
        self, conn: sqlite3.Connection
    ) -> None:
        """Stopping a timer calculates duration_seconds = stop - start."""
        entry = time_entry_model.create(
            start_time="2024-06-15T09:00:00",
            description="Timed task",
            conn=conn,
        )

        stopped = time_entry_model.stop_entry(
            entry.id,
            stop_time="2024-06-15T10:30:00",
            conn=conn,
        )

        assert stopped is not None
        assert stopped.stop_time == "2024-06-15T10:30:00"
        assert stopped.duration_seconds == 5400  # 1.5 hours = 5400 seconds

    def test_stop_exactly_one_hour(self, conn: sqlite3.Connection) -> None:
        """Duration calculation for exactly one hour."""
        entry = time_entry_model.create(
            start_time="2024-06-15T14:00:00",
            conn=conn,
        )

        stopped = time_entry_model.stop_entry(
            entry.id,
            stop_time="2024-06-15T15:00:00",
            conn=conn,
        )

        assert stopped is not None
        assert stopped.duration_seconds == 3600

    def test_stop_thirty_minutes(self, conn: sqlite3.Connection) -> None:
        """Duration calculation for 30 minutes."""
        entry = time_entry_model.create(
            start_time="2024-06-15T14:00:00",
            conn=conn,
        )

        stopped = time_entry_model.stop_entry(
            entry.id,
            stop_time="2024-06-15T14:30:00",
            conn=conn,
        )

        assert stopped is not None
        assert stopped.duration_seconds == 1800

    def test_stop_clears_active_entry(self, conn: sqlite3.Connection) -> None:
        """After stopping, get_active_entry returns None."""
        entry = time_entry_model.create(
            start_time="2024-06-15T09:00:00",
            conn=conn,
        )

        time_entry_model.stop_entry(
            entry.id,
            stop_time="2024-06-15T10:00:00",
            conn=conn,
        )

        active = time_entry_model.get_active_entry(conn=conn)
        assert active is None

    def test_stop_preserves_description_and_project(
        self, conn: sqlite3.Connection
    ) -> None:
        """Stopping preserves the entry's description and project."""
        project = project_model.create("Test Project", conn=conn)
        entry = time_entry_model.create(
            start_time="2024-06-15T09:00:00",
            description="My task",
            project_id=project.id,
            conn=conn,
        )

        stopped = time_entry_model.stop_entry(
            entry.id,
            stop_time="2024-06-15T10:00:00",
            conn=conn,
        )

        assert stopped is not None
        assert stopped.description == "My task"
        assert stopped.project_id == project.id


# ============================================================
# Duration Format Tests
# ============================================================


class TestFormatDuration:
    """Tests for the format_duration helper (seconds to HH:MM:SS)."""

    def test_zero_seconds(self) -> None:
        """Zero seconds displays as 00:00:00."""
        assert format_duration(0) == "00:00:00"

    def test_none_seconds(self) -> None:
        """None seconds displays as 00:00:00."""
        assert format_duration(None) == "00:00:00"

    def test_negative_seconds(self) -> None:
        """Negative seconds displays as 00:00:00."""
        assert format_duration(-100) == "00:00:00"

    def test_one_second(self) -> None:
        """One second."""
        assert format_duration(1) == "00:00:01"

    def test_one_minute(self) -> None:
        """60 seconds = one minute."""
        assert format_duration(60) == "00:01:00"

    def test_one_hour(self) -> None:
        """3600 seconds = one hour."""
        assert format_duration(3600) == "01:00:00"

    def test_complex_duration(self) -> None:
        """2 hours, 15 minutes, 30 seconds."""
        assert format_duration(2 * 3600 + 15 * 60 + 30) == "02:15:30"

    def test_large_duration(self) -> None:
        """Over 24 hours still formats correctly."""
        assert format_duration(25 * 3600 + 59 * 60 + 59) == "25:59:59"

    def test_exact_day(self) -> None:
        """Exactly 24 hours."""
        assert format_duration(86400) == "24:00:00"


# ============================================================
# Manual Entry Validation Tests
# ============================================================


class TestManualEntryValidation:
    """Tests for manual entry validation logic."""

    def test_valid_entry(self) -> None:
        """A normal valid entry passes validation."""
        is_valid, msg = validate_manual_entry(
            "2024-06-15T09:00:00", "2024-06-15T10:00:00"
        )
        assert is_valid is True
        assert msg == ""

    def test_rejects_end_before_start(self) -> None:
        """End time before start time is rejected."""
        is_valid, msg = validate_manual_entry(
            "2024-06-15T10:00:00", "2024-06-15T09:00:00"
        )
        assert is_valid is False
        assert "after" in msg.lower()

    def test_rejects_end_equals_start(self) -> None:
        """End time equal to start time is rejected."""
        is_valid, msg = validate_manual_entry(
            "2024-06-15T10:00:00", "2024-06-15T10:00:00"
        )
        assert is_valid is False
        assert "after" in msg.lower()

    def test_rejects_duration_over_24_hours(self) -> None:
        """Duration over 24 hours is rejected."""
        is_valid, msg = validate_manual_entry(
            "2024-06-15T00:00:00", "2024-06-16T01:00:00"
        )
        assert is_valid is False
        assert "24" in msg

    def test_exactly_24_hours_is_valid(self) -> None:
        """Duration of exactly 24 hours is valid."""
        is_valid, msg = validate_manual_entry(
            "2024-06-15T00:00:00", "2024-06-16T00:00:00"
        )
        assert is_valid is True
        assert msg == ""

    def test_rejects_invalid_start_format(self) -> None:
        """Invalid start time format is rejected."""
        is_valid, msg = validate_manual_entry(
            "not-a-date", "2024-06-15T10:00:00"
        )
        assert is_valid is False
        assert "start" in msg.lower() or "format" in msg.lower()

    def test_rejects_invalid_end_format(self) -> None:
        """Invalid end time format is rejected."""
        is_valid, msg = validate_manual_entry(
            "2024-06-15T09:00:00", "not-a-date"
        )
        assert is_valid is False
        assert "end" in msg.lower() or "format" in msg.lower()


# ============================================================
# Today's Entries Filtering Tests
# ============================================================


class TestTodayEntriesFiltering:
    """Tests for today's entries filtering logic."""

    def test_filters_today_entries_only(self, conn: sqlite3.Connection) -> None:
        """Only entries from today are returned."""
        today = datetime.now()
        yesterday = today - timedelta(days=1)

        # Today's entry
        time_entry_model.create(
            start_time=today.strftime(DATETIME_FORMAT),
            stop_time=(today + timedelta(hours=1)).strftime(DATETIME_FORMAT),
            description="Today's work",
            conn=conn,
        )

        # Yesterday's entry
        time_entry_model.create(
            start_time=yesterday.strftime(DATETIME_FORMAT),
            stop_time=(yesterday + timedelta(hours=1)).strftime(DATETIME_FORMAT),
            description="Yesterday's work",
            conn=conn,
        )

        today_str = today.strftime("%Y-%m-%d")
        all_entries = time_entry_model.get_all(conn=conn)
        today_entries = [
            e for e in all_entries if e.start_time.startswith(today_str)
        ]

        assert len(today_entries) == 1
        assert today_entries[0].description == "Today's work"

    def test_no_entries_today(self, conn: sqlite3.Connection) -> None:
        """Returns empty list when no entries exist for today."""
        yesterday = datetime.now() - timedelta(days=1)

        time_entry_model.create(
            start_time=yesterday.strftime(DATETIME_FORMAT),
            stop_time=(yesterday + timedelta(hours=1)).strftime(DATETIME_FORMAT),
            description="Old entry",
            conn=conn,
        )

        today_str = datetime.now().strftime("%Y-%m-%d")
        all_entries = time_entry_model.get_all(conn=conn)
        today_entries = [
            e for e in all_entries if e.start_time.startswith(today_str)
        ]

        assert len(today_entries) == 0

    def test_multiple_today_entries_sorted_desc(
        self, conn: sqlite3.Connection
    ) -> None:
        """Multiple today entries are sorted by start_time descending."""
        today = datetime.now().replace(hour=0, minute=0, second=0)

        time_entry_model.create(
            start_time=(today.replace(hour=8)).strftime(DATETIME_FORMAT),
            stop_time=(today.replace(hour=9)).strftime(DATETIME_FORMAT),
            description="Morning",
            conn=conn,
        )
        time_entry_model.create(
            start_time=(today.replace(hour=14)).strftime(DATETIME_FORMAT),
            stop_time=(today.replace(hour=15)).strftime(DATETIME_FORMAT),
            description="Afternoon",
            conn=conn,
        )

        today_str = today.strftime("%Y-%m-%d")
        all_entries = time_entry_model.get_all(conn=conn)
        today_entries = [
            e for e in all_entries if e.start_time.startswith(today_str)
        ]

        # get_all returns DESC order, so afternoon first
        assert len(today_entries) == 2
        assert today_entries[0].description == "Afternoon"
        assert today_entries[1].description == "Morning"

    def test_today_running_entry_included(
        self, conn: sqlite3.Connection
    ) -> None:
        """Running entries (stop_time=NULL) from today are included."""
        now = datetime.now()

        time_entry_model.create(
            start_time=now.strftime(DATETIME_FORMAT),
            description="Still running",
            conn=conn,
        )

        today_str = now.strftime("%Y-%m-%d")
        all_entries = time_entry_model.get_all(conn=conn)
        today_entries = [
            e for e in all_entries if e.start_time.startswith(today_str)
        ]

        assert len(today_entries) == 1
        assert today_entries[0].stop_time is None
        assert today_entries[0].description == "Still running"


# ============================================================
# Today's Total Calculation Tests
# ============================================================


class TestTodayTotal:
    """Tests for today's total seconds calculation."""

    def test_total_with_completed_entries(
        self, conn: sqlite3.Connection
    ) -> None:
        """Total correctly sums duration_seconds of completed entries."""
        today = datetime.now()

        time_entry_model.create(
            start_time=today.replace(hour=9, minute=0, second=0).strftime(DATETIME_FORMAT),
            stop_time=today.replace(hour=10, minute=0, second=0).strftime(DATETIME_FORMAT),
            description="One hour",
            conn=conn,
        )
        time_entry_model.create(
            start_time=today.replace(hour=11, minute=0, second=0).strftime(DATETIME_FORMAT),
            stop_time=today.replace(hour=11, minute=30, second=0).strftime(DATETIME_FORMAT),
            description="Half hour",
            conn=conn,
        )

        today_str = today.strftime("%Y-%m-%d")
        all_entries = time_entry_model.get_all(conn=conn)
        today_entries = [
            e for e in all_entries if e.start_time.startswith(today_str)
        ]

        total = sum(e.duration_seconds for e in today_entries if e.duration_seconds is not None)
        assert total == 5400  # 1h + 30min = 5400s

    def test_total_with_no_entries(self, conn: sqlite3.Connection) -> None:
        """Total is 0 when no entries exist."""
        today_str = datetime.now().strftime("%Y-%m-%d")
        all_entries = time_entry_model.get_all(conn=conn)
        today_entries = [
            e for e in all_entries if e.start_time.startswith(today_str)
        ]

        total = sum(e.duration_seconds for e in today_entries if e.duration_seconds is not None)
        assert total == 0


# ============================================================
# Description/Project Update While Running Tests
# ============================================================


class TestUpdateWhileRunning:
    """Tests for updating description and project while timer is running."""

    def test_update_description_while_running(
        self, conn: sqlite3.Connection
    ) -> None:
        """Description can be changed on a running entry."""
        now = datetime.now().strftime(DATETIME_FORMAT)
        entry = time_entry_model.create(
            start_time=now,
            description="Original",
            conn=conn,
        )

        updated = time_entry_model.update(
            entry.id,
            description="Changed while running",
            conn=conn,
        )

        assert updated is not None
        assert updated.description == "Changed while running"
        assert updated.stop_time is None  # still running

    def test_update_project_while_running(
        self, conn: sqlite3.Connection
    ) -> None:
        """Project can be changed on a running entry."""
        project_a = project_model.create("Project A", conn=conn)
        project_b = project_model.create("Project B", conn=conn)

        now = datetime.now().strftime(DATETIME_FORMAT)
        entry = time_entry_model.create(
            start_time=now,
            project_id=project_a.id,
            conn=conn,
        )

        updated = time_entry_model.update(
            entry.id,
            project_id=project_b.id,
            conn=conn,
        )

        assert updated is not None
        assert updated.project_id == project_b.id
        assert updated.stop_time is None  # still running
