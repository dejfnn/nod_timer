"""Tests for Phase 3: Projects, Clients & Tags Management.

Tests for new model queries (get_total_tracked_time, has_active_projects,
get_usage_count) and business logic (tag deletion cascade, archive/unarchive).
"""

import sqlite3

import pytest

from db.connection import _create_connection
from db.migrations import init_db
from models import client as client_model
from models import project as project_model
from models import tag as tag_model
from models import time_entry as time_entry_model


@pytest.fixture
def conn() -> sqlite3.Connection:
    """Create a fresh in-memory database connection for each test."""
    connection = _create_connection(":memory:")
    init_db(connection)
    return connection


# ============================================================
# get_total_tracked_time Tests
# ============================================================


class TestGetTotalTrackedTime:
    """Tests for project.get_total_tracked_time()."""

    def test_no_entries_returns_zero(self, conn: sqlite3.Connection) -> None:
        """A project with no time entries should return 0 seconds."""
        proj = project_model.create("Empty Project", conn=conn)
        total = project_model.get_total_tracked_time(proj.id, conn=conn)
        assert total == 0

    def test_single_completed_entry(self, conn: sqlite3.Connection) -> None:
        """A project with one completed entry returns correct duration."""
        proj = project_model.create("My Project", conn=conn)
        time_entry_model.create(
            start_time="2025-01-15T09:00:00",
            stop_time="2025-01-15T10:30:00",
            project_id=proj.id,
            duration_seconds=5400,
            conn=conn,
        )
        total = project_model.get_total_tracked_time(proj.id, conn=conn)
        assert total == 5400  # 1.5 hours

    def test_multiple_entries_summed(self, conn: sqlite3.Connection) -> None:
        """Multiple entries for the same project are summed correctly."""
        proj = project_model.create("Multi Entry", conn=conn)
        time_entry_model.create(
            start_time="2025-01-15T09:00:00",
            stop_time="2025-01-15T10:00:00",
            project_id=proj.id,
            duration_seconds=3600,
            conn=conn,
        )
        time_entry_model.create(
            start_time="2025-01-15T11:00:00",
            stop_time="2025-01-15T11:30:00",
            project_id=proj.id,
            duration_seconds=1800,
            conn=conn,
        )
        time_entry_model.create(
            start_time="2025-01-15T14:00:00",
            stop_time="2025-01-15T14:15:00",
            project_id=proj.id,
            duration_seconds=900,
            conn=conn,
        )
        total = project_model.get_total_tracked_time(proj.id, conn=conn)
        assert total == 6300  # 3600 + 1800 + 900

    def test_running_entry_excluded(self, conn: sqlite3.Connection) -> None:
        """Running entries (no stop_time, no duration) are excluded from total."""
        proj = project_model.create("Running Test", conn=conn)
        # Completed entry
        time_entry_model.create(
            start_time="2025-01-15T09:00:00",
            stop_time="2025-01-15T10:00:00",
            project_id=proj.id,
            duration_seconds=3600,
            conn=conn,
        )
        # Running entry (no stop, no duration)
        time_entry_model.create(
            start_time="2025-01-15T11:00:00",
            project_id=proj.id,
            conn=conn,
        )
        total = project_model.get_total_tracked_time(proj.id, conn=conn)
        assert total == 3600  # Only completed entry counted

    def test_entries_from_other_projects_excluded(self, conn: sqlite3.Connection) -> None:
        """Only entries linked to the given project are counted."""
        proj_a = project_model.create("Project A", conn=conn)
        proj_b = project_model.create("Project B", conn=conn)
        time_entry_model.create(
            start_time="2025-01-15T09:00:00",
            stop_time="2025-01-15T10:00:00",
            project_id=proj_a.id,
            duration_seconds=3600,
            conn=conn,
        )
        time_entry_model.create(
            start_time="2025-01-15T11:00:00",
            stop_time="2025-01-15T12:00:00",
            project_id=proj_b.id,
            duration_seconds=3600,
            conn=conn,
        )
        total_a = project_model.get_total_tracked_time(proj_a.id, conn=conn)
        total_b = project_model.get_total_tracked_time(proj_b.id, conn=conn)
        assert total_a == 3600
        assert total_b == 3600


# ============================================================
# has_active_projects Tests
# ============================================================


class TestHasActiveProjects:
    """Tests for client.has_active_projects()."""

    def test_no_projects_returns_false(self, conn: sqlite3.Connection) -> None:
        """A client with no projects should return False."""
        client = client_model.create("No Projects Client", conn=conn)
        assert client_model.has_active_projects(client.id, conn=conn) is False

    def test_with_active_project_returns_true(self, conn: sqlite3.Connection) -> None:
        """A client with a non-archived project should return True."""
        client = client_model.create("Active Client", conn=conn)
        project_model.create("Active Project", client_id=client.id, conn=conn)
        assert client_model.has_active_projects(client.id, conn=conn) is True

    def test_with_only_archived_projects_returns_false(self, conn: sqlite3.Connection) -> None:
        """A client with only archived projects should return False."""
        client = client_model.create("Archived Client", conn=conn)
        proj = project_model.create("Archived Project", client_id=client.id, conn=conn)
        project_model.update(proj.id, archived=True, conn=conn)
        assert client_model.has_active_projects(client.id, conn=conn) is False

    def test_mixed_projects(self, conn: sqlite3.Connection) -> None:
        """A client with both active and archived projects should return True."""
        client = client_model.create("Mixed Client", conn=conn)
        project_model.create("Active Project", client_id=client.id, conn=conn)
        archived = project_model.create("Archived Project", client_id=client.id, conn=conn)
        project_model.update(archived.id, archived=True, conn=conn)
        assert client_model.has_active_projects(client.id, conn=conn) is True

    def test_archiving_last_active_project_makes_false(self, conn: sqlite3.Connection) -> None:
        """After archiving all projects, has_active_projects should return False."""
        client = client_model.create("Transition Client", conn=conn)
        proj = project_model.create("Only Project", client_id=client.id, conn=conn)
        assert client_model.has_active_projects(client.id, conn=conn) is True

        project_model.update(proj.id, archived=True, conn=conn)
        assert client_model.has_active_projects(client.id, conn=conn) is False


# ============================================================
# get_usage_count Tests
# ============================================================


class TestGetUsageCount:
    """Tests for tag.get_usage_count()."""

    def test_unused_tag_returns_zero(self, conn: sqlite3.Connection) -> None:
        """A tag not assigned to any time entry should return 0."""
        t = tag_model.create("Unused", conn=conn)
        count = tag_model.get_usage_count(t.id, conn=conn)
        assert count == 0

    def test_tag_used_once(self, conn: sqlite3.Connection) -> None:
        """A tag assigned to one time entry should return 1."""
        t = tag_model.create("Single Use", conn=conn)
        time_entry_model.create(
            start_time="2025-01-15T09:00:00",
            stop_time="2025-01-15T10:00:00",
            tag_ids=[t.id],
            conn=conn,
        )
        count = tag_model.get_usage_count(t.id, conn=conn)
        assert count == 1

    def test_tag_used_multiple_times(self, conn: sqlite3.Connection) -> None:
        """A tag assigned to multiple time entries should return correct count."""
        t = tag_model.create("Multi Use", conn=conn)
        for i in range(5):
            time_entry_model.create(
                start_time=f"2025-01-15T{9 + i:02d}:00:00",
                stop_time=f"2025-01-15T{10 + i:02d}:00:00",
                tag_ids=[t.id],
                conn=conn,
            )
        count = tag_model.get_usage_count(t.id, conn=conn)
        assert count == 5

    def test_multiple_tags_counted_independently(self, conn: sqlite3.Connection) -> None:
        """Each tag's usage count is independent of others."""
        t1 = tag_model.create("Tag A", conn=conn)
        t2 = tag_model.create("Tag B", conn=conn)
        # Entry with both tags
        time_entry_model.create(
            start_time="2025-01-15T09:00:00",
            stop_time="2025-01-15T10:00:00",
            tag_ids=[t1.id, t2.id],
            conn=conn,
        )
        # Entry with only t1
        time_entry_model.create(
            start_time="2025-01-15T11:00:00",
            stop_time="2025-01-15T12:00:00",
            tag_ids=[t1.id],
            conn=conn,
        )
        assert tag_model.get_usage_count(t1.id, conn=conn) == 2
        assert tag_model.get_usage_count(t2.id, conn=conn) == 1


# ============================================================
# Tag Deletion Cascade Tests
# ============================================================


class TestTagDeletionCascade:
    """Tests for tag deletion cascading to time_entry_tags."""

    def test_delete_unused_tag(self, conn: sqlite3.Connection) -> None:
        """Deleting an unused tag should succeed."""
        t = tag_model.create("Deletable", conn=conn)
        result = tag_model.delete(t.id, conn=conn)
        assert result is True
        assert tag_model.get_by_id(t.id, conn=conn) is None

    def test_delete_tag_removes_junction_entries(self, conn: sqlite3.Connection) -> None:
        """Deleting a tag should remove all entries from time_entry_tags junction table."""
        t = tag_model.create("Cascade Tag", conn=conn)
        entry1 = time_entry_model.create(
            start_time="2025-01-15T09:00:00",
            stop_time="2025-01-15T10:00:00",
            tag_ids=[t.id],
            conn=conn,
        )
        entry2 = time_entry_model.create(
            start_time="2025-01-15T11:00:00",
            stop_time="2025-01-15T12:00:00",
            tag_ids=[t.id],
            conn=conn,
        )

        # Verify tag is associated
        assert tag_model.get_usage_count(t.id, conn=conn) == 2

        # Delete the tag
        tag_model.delete(t.id, conn=conn)

        # Verify junction table entries are gone
        cursor = conn.execute(
            "SELECT COUNT(*) AS cnt FROM time_entry_tags WHERE tag_id = ?",
            (t.id,),
        )
        assert cursor.fetchone()["cnt"] == 0

        # Verify time entries still exist (only the tag association was removed)
        assert time_entry_model.get_by_id(entry1.id, conn=conn) is not None
        assert time_entry_model.get_by_id(entry2.id, conn=conn) is not None

    def test_delete_tag_preserves_other_tags_on_entry(self, conn: sqlite3.Connection) -> None:
        """Deleting one tag should not remove other tags from a time entry."""
        t1 = tag_model.create("Keep Tag", conn=conn)
        t2 = tag_model.create("Delete Tag", conn=conn)
        entry = time_entry_model.create(
            start_time="2025-01-15T09:00:00",
            stop_time="2025-01-15T10:00:00",
            tag_ids=[t1.id, t2.id],
            conn=conn,
        )

        # Delete t2
        tag_model.delete(t2.id, conn=conn)

        # t1 should still be associated with the entry
        tags = time_entry_model.get_tags_for_entry(entry.id, conn=conn)
        assert t1.id in tags
        assert t2.id not in tags


# ============================================================
# Archive/Unarchive Project Tests
# ============================================================


class TestArchiveUnarchiveProject:
    """Tests for project archive/unarchive toggling."""

    def test_archive_project(self, conn: sqlite3.Connection) -> None:
        """Archiving a project sets archived=True."""
        proj = project_model.create("Archivable", conn=conn)
        assert proj.archived is False

        updated = project_model.update(proj.id, archived=True, conn=conn)
        assert updated is not None
        assert updated.archived is True

        # Verify in DB
        fetched = project_model.get_by_id(proj.id, conn=conn)
        assert fetched.archived is True

    def test_unarchive_project(self, conn: sqlite3.Connection) -> None:
        """Unarchiving a project sets archived=False."""
        proj = project_model.create("Unarchivable", conn=conn)
        project_model.update(proj.id, archived=True, conn=conn)

        updated = project_model.update(proj.id, archived=False, conn=conn)
        assert updated is not None
        assert updated.archived is False

        fetched = project_model.get_by_id(proj.id, conn=conn)
        assert fetched.archived is False

    def test_archived_project_hidden_by_default(self, conn: sqlite3.Connection) -> None:
        """get_all() without include_archived should hide archived projects."""
        proj_a = project_model.create("Active", conn=conn)
        proj_b = project_model.create("To Archive", conn=conn)
        project_model.update(proj_b.id, archived=True, conn=conn)

        active_projects = project_model.get_all(include_archived=False, conn=conn)
        active_ids = [p.id for p in active_projects]
        assert proj_a.id in active_ids
        assert proj_b.id not in active_ids

    def test_archived_project_shown_when_include_archived(self, conn: sqlite3.Connection) -> None:
        """get_all(include_archived=True) should include archived projects."""
        proj_a = project_model.create("Active", conn=conn)
        proj_b = project_model.create("Archived", conn=conn)
        project_model.update(proj_b.id, archived=True, conn=conn)

        all_projects = project_model.get_all(include_archived=True, conn=conn)
        all_ids = [p.id for p in all_projects]
        assert proj_a.id in all_ids
        assert proj_b.id in all_ids

    def test_archive_unarchive_toggle(self, conn: sqlite3.Connection) -> None:
        """Toggle archived status back and forth."""
        proj = project_model.create("Toggle", conn=conn)
        assert proj.archived is False

        project_model.update(proj.id, archived=True, conn=conn)
        assert project_model.get_by_id(proj.id, conn=conn).archived is True

        project_model.update(proj.id, archived=False, conn=conn)
        assert project_model.get_by_id(proj.id, conn=conn).archived is False

        project_model.update(proj.id, archived=True, conn=conn)
        assert project_model.get_by_id(proj.id, conn=conn).archived is True


# ============================================================
# get_project_count Tests
# ============================================================


class TestGetProjectCount:
    """Tests for client.get_project_count()."""

    def test_no_projects(self, conn: sqlite3.Connection) -> None:
        """Client with no projects returns 0."""
        client = client_model.create("Empty", conn=conn)
        assert client_model.get_project_count(client.id, conn=conn) == 0

    def test_with_projects(self, conn: sqlite3.Connection) -> None:
        """Client with multiple projects returns correct count."""
        client = client_model.create("Multi", conn=conn)
        project_model.create("P1", client_id=client.id, conn=conn)
        project_model.create("P2", client_id=client.id, conn=conn)
        project_model.create("P3", client_id=client.id, conn=conn)
        assert client_model.get_project_count(client.id, conn=conn) == 3

    def test_includes_archived_projects(self, conn: sqlite3.Connection) -> None:
        """get_project_count counts all projects including archived ones."""
        client = client_model.create("Count All", conn=conn)
        project_model.create("Active", client_id=client.id, conn=conn)
        archived = project_model.create("Archived", client_id=client.id, conn=conn)
        project_model.update(archived.id, archived=True, conn=conn)
        assert client_model.get_project_count(client.id, conn=conn) == 2


# ============================================================
# Project CRUD with Color, Client, Billable Tests
# ============================================================


class TestProjectCreationWithFields:
    """Tests for project creation with all fields."""

    def test_create_with_color(self, conn: sqlite3.Connection) -> None:
        """Project can be created with a custom color."""
        proj = project_model.create("Colored", color="#E74C3C", conn=conn)
        assert proj.color == "#E74C3C"
        fetched = project_model.get_by_id(proj.id, conn=conn)
        assert fetched.color == "#E74C3C"

    def test_create_with_client(self, conn: sqlite3.Connection) -> None:
        """Project can be created with a client link."""
        client = client_model.create("Client X", conn=conn)
        proj = project_model.create("Linked", client_id=client.id, conn=conn)
        assert proj.client_id == client.id

    def test_create_billable_with_rate(self, conn: sqlite3.Connection) -> None:
        """Project can be created with billable flag and hourly rate."""
        proj = project_model.create(
            "Billable", billable=True, hourly_rate=150.0, conn=conn
        )
        assert proj.billable is True
        assert proj.hourly_rate == 150.0

    def test_update_all_fields(self, conn: sqlite3.Connection) -> None:
        """All project fields can be updated."""
        client = client_model.create("Client Y", conn=conn)
        proj = project_model.create("Original", conn=conn)

        updated = project_model.update(
            proj.id,
            name="Updated",
            color="#2ECC71",
            client_id=client.id,
            billable=True,
            hourly_rate=200.0,
            conn=conn,
        )
        assert updated.name == "Updated"
        assert updated.color == "#2ECC71"
        assert updated.client_id == client.id
        assert updated.billable is True
        assert updated.hourly_rate == 200.0


# ============================================================
# Config PROJECT_COLORS Tests
# ============================================================


class TestProjectColors:
    """Tests for PROJECT_COLORS configuration."""

    def test_colors_defined(self) -> None:
        """PROJECT_COLORS should be a non-empty list."""
        from config import PROJECT_COLORS
        assert isinstance(PROJECT_COLORS, list)
        assert len(PROJECT_COLORS) >= 12

    def test_colors_are_hex_strings(self) -> None:
        """All colors should be valid hex color strings."""
        from config import PROJECT_COLORS
        for color in PROJECT_COLORS:
            assert isinstance(color, str)
            assert color.startswith("#")
            assert len(color) == 7  # #RRGGBB format

    def test_default_color_in_palette(self) -> None:
        """DEFAULT_PROJECT_COLOR should be in the palette."""
        from config import DEFAULT_PROJECT_COLOR, PROJECT_COLORS
        assert DEFAULT_PROJECT_COLOR in PROJECT_COLORS
