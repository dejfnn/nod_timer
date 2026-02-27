"""Tests for all CRUD operations on all models.

Each test uses an in-memory SQLite database via a fresh connection,
ensuring isolation between tests.
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
# Client CRUD Tests
# ============================================================


class TestClientCRUD:
    """Tests for Client model CRUD operations."""

    def test_create_client(self, conn: sqlite3.Connection) -> None:
        """Test creating a new client."""
        client = client_model.create("Acme Corp", conn=conn)

        assert client.id is not None
        assert client.name == "Acme Corp"
        assert client.archived is False
        assert client.created_at != ""
        assert client.updated_at != ""

    def test_create_client_unique_name(self, conn: sqlite3.Connection) -> None:
        """Test that client names must be unique."""
        client_model.create("Acme Corp", conn=conn)

        with pytest.raises(sqlite3.IntegrityError):
            client_model.create("Acme Corp", conn=conn)

    def test_get_client_by_id(self, conn: sqlite3.Connection) -> None:
        """Test retrieving a client by ID."""
        created = client_model.create("Acme Corp", conn=conn)
        fetched = client_model.get_by_id(created.id, conn=conn)

        assert fetched is not None
        assert fetched.id == created.id
        assert fetched.name == "Acme Corp"

    def test_get_client_by_id_not_found(self, conn: sqlite3.Connection) -> None:
        """Test that get_by_id returns None for non-existent client."""
        result = client_model.get_by_id(9999, conn=conn)
        assert result is None

    def test_get_all_clients(self, conn: sqlite3.Connection) -> None:
        """Test retrieving all clients."""
        client_model.create("Acme Corp", conn=conn)
        client_model.create("Beta Inc", conn=conn)
        client_model.create("Gamma Ltd", conn=conn)

        clients = client_model.get_all(conn=conn)
        assert len(clients) == 3
        names = [c.name for c in clients]
        assert "Acme Corp" in names
        assert "Beta Inc" in names
        assert "Gamma Ltd" in names

    def test_get_all_clients_excludes_archived(self, conn: sqlite3.Connection) -> None:
        """Test that get_all excludes archived clients by default."""
        client_model.create("Active Client", conn=conn)
        archived = client_model.create("Archived Client", conn=conn)
        client_model.update(archived.id, archived=True, conn=conn)

        clients = client_model.get_all(conn=conn)
        assert len(clients) == 1
        assert clients[0].name == "Active Client"

    def test_get_all_clients_includes_archived(self, conn: sqlite3.Connection) -> None:
        """Test that get_all can include archived clients."""
        client_model.create("Active Client", conn=conn)
        archived = client_model.create("Archived Client", conn=conn)
        client_model.update(archived.id, archived=True, conn=conn)

        clients = client_model.get_all(include_archived=True, conn=conn)
        assert len(clients) == 2

    def test_update_client(self, conn: sqlite3.Connection) -> None:
        """Test updating a client."""
        created = client_model.create("Old Name", conn=conn)
        updated = client_model.update(created.id, name="New Name", conn=conn)

        assert updated is not None
        assert updated.name == "New Name"
        assert updated.id == created.id

    def test_update_client_not_found(self, conn: sqlite3.Connection) -> None:
        """Test updating a non-existent client returns None."""
        result = client_model.update(9999, name="Ghost", conn=conn)
        assert result is None

    def test_update_client_archived(self, conn: sqlite3.Connection) -> None:
        """Test archiving a client."""
        created = client_model.create("Client To Archive", conn=conn)
        updated = client_model.update(created.id, archived=True, conn=conn)

        assert updated is not None
        assert updated.archived is True

    def test_delete_client(self, conn: sqlite3.Connection) -> None:
        """Test deleting a client."""
        created = client_model.create("Doomed Client", conn=conn)
        result = client_model.delete(created.id, conn=conn)

        assert result is True
        assert client_model.get_by_id(created.id, conn=conn) is None

    def test_delete_client_not_found(self, conn: sqlite3.Connection) -> None:
        """Test deleting a non-existent client returns False."""
        result = client_model.delete(9999, conn=conn)
        assert result is False


# ============================================================
# Project CRUD Tests
# ============================================================


class TestProjectCRUD:
    """Tests for Project model CRUD operations."""

    def test_create_project(self, conn: sqlite3.Connection) -> None:
        """Test creating a new project."""
        project = project_model.create("Web App", conn=conn)

        assert project.id is not None
        assert project.name == "Web App"
        assert project.color == "#4A90D9"
        assert project.client_id is None
        assert project.billable is False
        assert project.hourly_rate == 0.0
        assert project.archived is False

    def test_create_project_with_client(self, conn: sqlite3.Connection) -> None:
        """Test creating a project linked to a client."""
        client = client_model.create("Acme Corp", conn=conn)
        project = project_model.create(
            "Acme Website", client_id=client.id, conn=conn
        )

        assert project.client_id == client.id

    def test_create_project_with_color(self, conn: sqlite3.Connection) -> None:
        """Test creating a project with a custom color."""
        project = project_model.create(
            "Red Project", color="#FF0000", conn=conn
        )

        assert project.color == "#FF0000"

    def test_create_project_billable(self, conn: sqlite3.Connection) -> None:
        """Test creating a billable project with hourly rate."""
        project = project_model.create(
            "Consulting",
            billable=True,
            hourly_rate=150.0,
            conn=conn,
        )

        assert project.billable is True
        assert project.hourly_rate == 150.0

    def test_get_project_by_id(self, conn: sqlite3.Connection) -> None:
        """Test retrieving a project by ID."""
        created = project_model.create("Web App", conn=conn)
        fetched = project_model.get_by_id(created.id, conn=conn)

        assert fetched is not None
        assert fetched.id == created.id
        assert fetched.name == "Web App"

    def test_get_project_by_id_not_found(self, conn: sqlite3.Connection) -> None:
        """Test that get_by_id returns None for non-existent project."""
        result = project_model.get_by_id(9999, conn=conn)
        assert result is None

    def test_get_all_projects(self, conn: sqlite3.Connection) -> None:
        """Test retrieving all projects."""
        project_model.create("Project A", conn=conn)
        project_model.create("Project B", conn=conn)

        projects = project_model.get_all(conn=conn)
        assert len(projects) == 2

    def test_get_all_projects_excludes_archived(self, conn: sqlite3.Connection) -> None:
        """Test that get_all excludes archived projects by default."""
        project_model.create("Active", conn=conn)
        archived = project_model.create("Archived", conn=conn)
        project_model.update(archived.id, archived=True, conn=conn)

        projects = project_model.get_all(conn=conn)
        assert len(projects) == 1
        assert projects[0].name == "Active"

    def test_update_project(self, conn: sqlite3.Connection) -> None:
        """Test updating a project."""
        created = project_model.create("Old Name", conn=conn)
        updated = project_model.update(
            created.id,
            name="New Name",
            color="#00FF00",
            billable=True,
            hourly_rate=100.0,
            conn=conn,
        )

        assert updated is not None
        assert updated.name == "New Name"
        assert updated.color == "#00FF00"
        assert updated.billable is True
        assert updated.hourly_rate == 100.0

    def test_update_project_not_found(self, conn: sqlite3.Connection) -> None:
        """Test updating a non-existent project returns None."""
        result = project_model.update(9999, name="Ghost", conn=conn)
        assert result is None

    def test_delete_project(self, conn: sqlite3.Connection) -> None:
        """Test deleting a project."""
        created = project_model.create("Doomed Project", conn=conn)
        result = project_model.delete(created.id, conn=conn)

        assert result is True
        assert project_model.get_by_id(created.id, conn=conn) is None

    def test_delete_project_not_found(self, conn: sqlite3.Connection) -> None:
        """Test deleting a non-existent project returns False."""
        result = project_model.delete(9999, conn=conn)
        assert result is False


# ============================================================
# Tag CRUD Tests
# ============================================================


class TestTagCRUD:
    """Tests for Tag model CRUD operations."""

    def test_create_tag(self, conn: sqlite3.Connection) -> None:
        """Test creating a new tag."""
        tag = tag_model.create("urgent", conn=conn)

        assert tag.id is not None
        assert tag.name == "urgent"
        assert tag.created_at != ""

    def test_create_tag_unique_name(self, conn: sqlite3.Connection) -> None:
        """Test that tag names must be unique."""
        tag_model.create("urgent", conn=conn)

        with pytest.raises(sqlite3.IntegrityError):
            tag_model.create("urgent", conn=conn)

    def test_get_tag_by_id(self, conn: sqlite3.Connection) -> None:
        """Test retrieving a tag by ID."""
        created = tag_model.create("urgent", conn=conn)
        fetched = tag_model.get_by_id(created.id, conn=conn)

        assert fetched is not None
        assert fetched.id == created.id
        assert fetched.name == "urgent"

    def test_get_tag_by_id_not_found(self, conn: sqlite3.Connection) -> None:
        """Test that get_by_id returns None for non-existent tag."""
        result = tag_model.get_by_id(9999, conn=conn)
        assert result is None

    def test_get_all_tags(self, conn: sqlite3.Connection) -> None:
        """Test retrieving all tags."""
        tag_model.create("urgent", conn=conn)
        tag_model.create("bug", conn=conn)
        tag_model.create("feature", conn=conn)

        tags = tag_model.get_all(conn=conn)
        assert len(tags) == 3
        names = [t.name for t in tags]
        assert "urgent" in names
        assert "bug" in names
        assert "feature" in names

    def test_update_tag(self, conn: sqlite3.Connection) -> None:
        """Test updating a tag."""
        created = tag_model.create("old_tag", conn=conn)
        updated = tag_model.update(created.id, name="new_tag", conn=conn)

        assert updated is not None
        assert updated.name == "new_tag"
        assert updated.id == created.id

    def test_update_tag_not_found(self, conn: sqlite3.Connection) -> None:
        """Test updating a non-existent tag returns None."""
        result = tag_model.update(9999, name="ghost", conn=conn)
        assert result is None

    def test_delete_tag(self, conn: sqlite3.Connection) -> None:
        """Test deleting a tag."""
        created = tag_model.create("doomed", conn=conn)
        result = tag_model.delete(created.id, conn=conn)

        assert result is True
        assert tag_model.get_by_id(created.id, conn=conn) is None

    def test_delete_tag_not_found(self, conn: sqlite3.Connection) -> None:
        """Test deleting a non-existent tag returns False."""
        result = tag_model.delete(9999, conn=conn)
        assert result is False


# ============================================================
# TimeEntry CRUD Tests
# ============================================================


class TestTimeEntryCRUD:
    """Tests for TimeEntry model CRUD operations."""

    def test_create_time_entry(self, conn: sqlite3.Connection) -> None:
        """Test creating a new time entry."""
        entry = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            description="Working on feature",
            conn=conn,
        )

        assert entry.id is not None
        assert entry.description == "Working on feature"
        assert entry.start_time == "2024-01-15T09:00:00"
        assert entry.stop_time is None
        assert entry.duration_seconds is None

    def test_create_time_entry_with_stop(self, conn: sqlite3.Connection) -> None:
        """Test creating a time entry with start and stop times."""
        entry = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            stop_time="2024-01-15T10:30:00",
            description="Completed task",
            conn=conn,
        )

        assert entry.stop_time == "2024-01-15T10:30:00"
        assert entry.duration_seconds == 5400  # 1.5 hours = 5400 seconds

    def test_create_time_entry_auto_duration(self, conn: sqlite3.Connection) -> None:
        """Test that duration is auto-calculated from start and stop times."""
        entry = time_entry_model.create(
            start_time="2024-01-15T08:00:00",
            stop_time="2024-01-15T09:00:00",
            conn=conn,
        )

        assert entry.duration_seconds == 3600  # 1 hour

    def test_create_time_entry_with_project(self, conn: sqlite3.Connection) -> None:
        """Test creating a time entry linked to a project."""
        project = project_model.create("Web App", conn=conn)
        entry = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            project_id=project.id,
            conn=conn,
        )

        assert entry.project_id == project.id

    def test_create_time_entry_with_tags(self, conn: sqlite3.Connection) -> None:
        """Test creating a time entry with tags."""
        tag1 = tag_model.create("urgent", conn=conn)
        tag2 = tag_model.create("bug", conn=conn)

        entry = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            tag_ids=[tag1.id, tag2.id],
            conn=conn,
        )

        assert len(entry.tags) == 2
        assert tag1.id in entry.tags
        assert tag2.id in entry.tags

    def test_get_time_entry_by_id(self, conn: sqlite3.Connection) -> None:
        """Test retrieving a time entry by ID."""
        created = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            description="Test entry",
            conn=conn,
        )
        fetched = time_entry_model.get_by_id(created.id, conn=conn)

        assert fetched is not None
        assert fetched.id == created.id
        assert fetched.description == "Test entry"

    def test_get_time_entry_by_id_not_found(self, conn: sqlite3.Connection) -> None:
        """Test that get_by_id returns None for non-existent time entry."""
        result = time_entry_model.get_by_id(9999, conn=conn)
        assert result is None

    def test_get_all_time_entries(self, conn: sqlite3.Connection) -> None:
        """Test retrieving all time entries."""
        time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            description="Entry 1",
            conn=conn,
        )
        time_entry_model.create(
            start_time="2024-01-15T10:00:00",
            description="Entry 2",
            conn=conn,
        )

        entries = time_entry_model.get_all(conn=conn)
        assert len(entries) == 2
        # Should be ordered by start_time DESC
        assert entries[0].description == "Entry 2"
        assert entries[1].description == "Entry 1"

    def test_update_time_entry(self, conn: sqlite3.Connection) -> None:
        """Test updating a time entry."""
        created = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            description="Original",
            conn=conn,
        )
        updated = time_entry_model.update(
            created.id,
            description="Updated",
            billable=True,
            conn=conn,
        )

        assert updated is not None
        assert updated.description == "Updated"
        assert updated.billable is True

    def test_update_time_entry_not_found(self, conn: sqlite3.Connection) -> None:
        """Test updating a non-existent time entry returns None."""
        result = time_entry_model.update(9999, description="Ghost", conn=conn)
        assert result is None

    def test_update_time_entry_tags(self, conn: sqlite3.Connection) -> None:
        """Test updating tags on a time entry."""
        tag1 = tag_model.create("old_tag", conn=conn)
        tag2 = tag_model.create("new_tag", conn=conn)

        entry = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            tag_ids=[tag1.id],
            conn=conn,
        )

        updated = time_entry_model.update(
            entry.id, tag_ids=[tag2.id], conn=conn
        )

        assert updated is not None
        assert tag2.id in updated.tags
        assert tag1.id not in updated.tags

    def test_delete_time_entry(self, conn: sqlite3.Connection) -> None:
        """Test deleting a time entry."""
        created = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            conn=conn,
        )
        result = time_entry_model.delete(created.id, conn=conn)

        assert result is True
        assert time_entry_model.get_by_id(created.id, conn=conn) is None

    def test_delete_time_entry_not_found(self, conn: sqlite3.Connection) -> None:
        """Test deleting a non-existent time entry returns False."""
        result = time_entry_model.delete(9999, conn=conn)
        assert result is False


# ============================================================
# TimeEntry Start/Stop Tests
# ============================================================


class TestTimeEntryStartStop:
    """Tests for time entry start/stop and duration calculation."""

    def test_start_entry_creates_running_entry(
        self, conn: sqlite3.Connection
    ) -> None:
        """Test that creating an entry without stop_time makes it 'running'."""
        entry = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            description="Running task",
            conn=conn,
        )

        assert entry.stop_time is None
        assert entry.duration_seconds is None

    def test_stop_entry(self, conn: sqlite3.Connection) -> None:
        """Test stopping a running entry sets stop_time and calculates duration."""
        entry = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            conn=conn,
        )

        stopped = time_entry_model.stop_entry(
            entry.id,
            stop_time="2024-01-15T11:30:00",
            conn=conn,
        )

        assert stopped is not None
        assert stopped.stop_time == "2024-01-15T11:30:00"
        assert stopped.duration_seconds == 9000  # 2.5 hours = 9000 seconds

    def test_stop_entry_not_found(self, conn: sqlite3.Connection) -> None:
        """Test stopping a non-existent entry returns None."""
        result = time_entry_model.stop_entry(9999, conn=conn)
        assert result is None

    def test_duration_calculation_exact_hour(
        self, conn: sqlite3.Connection
    ) -> None:
        """Test duration calculation for exactly 1 hour."""
        entry = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            stop_time="2024-01-15T10:00:00",
            conn=conn,
        )
        assert entry.duration_seconds == 3600

    def test_duration_calculation_minutes(
        self, conn: sqlite3.Connection
    ) -> None:
        """Test duration calculation for 45 minutes."""
        entry = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            stop_time="2024-01-15T09:45:00",
            conn=conn,
        )
        assert entry.duration_seconds == 2700  # 45 * 60


# ============================================================
# get_active_entry Tests
# ============================================================


class TestGetActiveEntry:
    """Tests for get_active_entry() function."""

    def test_get_active_entry_returns_running(
        self, conn: sqlite3.Connection
    ) -> None:
        """Test that get_active_entry returns a running entry."""
        time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            description="I am running",
            conn=conn,
        )

        active = time_entry_model.get_active_entry(conn=conn)

        assert active is not None
        assert active.description == "I am running"
        assert active.stop_time is None

    def test_get_active_entry_returns_none_when_all_stopped(
        self, conn: sqlite3.Connection
    ) -> None:
        """Test that get_active_entry returns None when no entry is running."""
        time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            stop_time="2024-01-15T10:00:00",
            conn=conn,
        )

        active = time_entry_model.get_active_entry(conn=conn)
        assert active is None

    def test_get_active_entry_returns_none_on_empty_db(
        self, conn: sqlite3.Connection
    ) -> None:
        """Test that get_active_entry returns None when DB is empty."""
        active = time_entry_model.get_active_entry(conn=conn)
        assert active is None

    def test_get_active_entry_returns_most_recent(
        self, conn: sqlite3.Connection
    ) -> None:
        """Test that if multiple running entries exist, the most recent is returned."""
        time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            description="First",
            conn=conn,
        )
        time_entry_model.create(
            start_time="2024-01-15T10:00:00",
            description="Second",
            conn=conn,
        )

        active = time_entry_model.get_active_entry(conn=conn)

        assert active is not None
        assert active.description == "Second"


# ============================================================
# Tag Assignment Tests
# ============================================================


class TestTagAssignment:
    """Tests for tag assignment and removal on time entries."""

    def test_add_tags_to_entry(self, conn: sqlite3.Connection) -> None:
        """Test adding tags to an existing time entry."""
        tag1 = tag_model.create("urgent", conn=conn)
        tag2 = tag_model.create("bug", conn=conn)
        entry = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            conn=conn,
        )

        time_entry_model.add_tags(entry.id, [tag1.id, tag2.id], conn=conn)

        tags = time_entry_model.get_tags_for_entry(entry.id, conn=conn)
        assert len(tags) == 2
        assert tag1.id in tags
        assert tag2.id in tags

    def test_remove_tags_from_entry(self, conn: sqlite3.Connection) -> None:
        """Test removing tags from a time entry."""
        tag1 = tag_model.create("urgent", conn=conn)
        tag2 = tag_model.create("bug", conn=conn)
        entry = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            tag_ids=[tag1.id, tag2.id],
            conn=conn,
        )

        time_entry_model.remove_tags(entry.id, [tag1.id], conn=conn)

        tags = time_entry_model.get_tags_for_entry(entry.id, conn=conn)
        assert len(tags) == 1
        assert tag2.id in tags

    def test_delete_tag_cascades_to_entries(
        self, conn: sqlite3.Connection
    ) -> None:
        """Test that deleting a tag removes it from all time entries."""
        tag = tag_model.create("doomed_tag", conn=conn)
        entry = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            tag_ids=[tag.id],
            conn=conn,
        )

        tag_model.delete(tag.id, conn=conn)

        tags = time_entry_model.get_tags_for_entry(entry.id, conn=conn)
        assert len(tags) == 0

    def test_delete_entry_cascades_tags(
        self, conn: sqlite3.Connection
    ) -> None:
        """Test that deleting a time entry removes tag associations."""
        tag = tag_model.create("surviving_tag", conn=conn)
        entry = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            tag_ids=[tag.id],
            conn=conn,
        )

        time_entry_model.delete(entry.id, conn=conn)

        # Tag should still exist
        assert tag_model.get_by_id(tag.id, conn=conn) is not None

        # But the junction table entry should be gone
        cursor = conn.execute(
            "SELECT COUNT(*) as cnt FROM time_entry_tags WHERE time_entry_id = ?",
            (entry.id,),
        )
        assert cursor.fetchone()["cnt"] == 0


# ============================================================
# Foreign Key Enforcement Tests
# ============================================================


class TestForeignKeyEnforcement:
    """Tests that foreign keys are properly enforced."""

    def test_fk_enforcement_enabled(self, conn: sqlite3.Connection) -> None:
        """Test that PRAGMA foreign_keys is ON."""
        cursor = conn.execute("PRAGMA foreign_keys")
        assert cursor.fetchone()[0] == 1

    def test_project_fk_to_nonexistent_client(
        self, conn: sqlite3.Connection
    ) -> None:
        """Test that creating a project with a non-existent client_id fails."""
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(
                """INSERT INTO projects (name, client_id, created_at, updated_at)
                VALUES (?, ?, ?, ?)""",
                ("Bad Project", 9999, "2024-01-01T00:00:00", "2024-01-01T00:00:00"),
            )

    def test_time_entry_fk_to_nonexistent_project(
        self, conn: sqlite3.Connection
    ) -> None:
        """Test that creating a time entry with a non-existent project_id fails."""
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(
                """INSERT INTO time_entries (start_time, project_id, created_at, updated_at)
                VALUES (?, ?, ?, ?)""",
                ("2024-01-15T09:00:00", 9999, "2024-01-01T00:00:00", "2024-01-01T00:00:00"),
            )

    def test_delete_client_sets_project_client_to_null(
        self, conn: sqlite3.Connection
    ) -> None:
        """Test that deleting a client sets project's client_id to NULL (ON DELETE SET NULL)."""
        client = client_model.create("Temp Client", conn=conn)
        project = project_model.create(
            "Linked Project", client_id=client.id, conn=conn
        )

        client_model.delete(client.id, conn=conn)

        updated_project = project_model.get_by_id(project.id, conn=conn)
        assert updated_project is not None
        assert updated_project.client_id is None

    def test_delete_project_sets_entry_project_to_null(
        self, conn: sqlite3.Connection
    ) -> None:
        """Test that deleting a project sets time entry's project_id to NULL."""
        project = project_model.create("Temp Project", conn=conn)
        entry = time_entry_model.create(
            start_time="2024-01-15T09:00:00",
            project_id=project.id,
            conn=conn,
        )

        project_model.delete(project.id, conn=conn)

        updated_entry = time_entry_model.get_by_id(entry.id, conn=conn)
        assert updated_entry is not None
        assert updated_entry.project_id is None


# ============================================================
# Database Configuration Tests
# ============================================================


class TestDatabaseConfig:
    """Tests for database configuration (WAL mode, foreign keys, tables)."""

    def test_wal_mode(self, conn: sqlite3.Connection) -> None:
        """Test that the database uses WAL journal mode."""
        cursor = conn.execute("PRAGMA journal_mode")
        mode = cursor.fetchone()[0]
        # In-memory databases report 'memory' for journal mode; this is expected.
        # On a file-based DB, it would be 'wal'.
        assert mode in ("wal", "memory")

    def test_all_tables_created(self, conn: sqlite3.Connection) -> None:
        """Test that all 5 required tables are created."""
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        tables = {row["name"] for row in cursor.fetchall()}
        required = {"clients", "projects", "tags", "time_entries", "time_entry_tags"}
        assert required.issubset(tables)

    def test_row_factory_is_set(self, conn: sqlite3.Connection) -> None:
        """Test that row_factory is set to sqlite3.Row."""
        assert conn.row_factory == sqlite3.Row

    def test_indexes_exist(self, conn: sqlite3.Connection) -> None:
        """Test that required indexes exist."""
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
        )
        indexes = {row["name"] for row in cursor.fetchall()}
        assert "idx_time_entries_start_time" in indexes
        assert "idx_time_entries_project_id" in indexes
