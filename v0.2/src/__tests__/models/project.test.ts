import { createTestDb } from "../helpers/testDb";
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getTotalTrackedTime,
} from "@/models/project";
import { createClient } from "@/models/client";
import { createTimeEntry } from "@/models/timeEntry";

describe("Project model", () => {
  let db: any;
  let sqlite: any;

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    sqlite = testDb.sqlite;
  });

  afterEach(() => {
    sqlite.close();
  });

  describe("createProject", () => {
    it("should create a project with default values", async () => {
      const project = await createProject(db, { name: "My Project" });
      expect(project).toBeDefined();
      expect(project.id).toBe(1);
      expect(project.name).toBe("My Project");
      expect(project.color).toBe("#4A90D9");
      expect(project.billable).toBe(0);
      expect(project.hourlyRate).toBe(0);
      expect(project.archived).toBe(0);
    });

    it("should create a project with all fields", async () => {
      await createClient(db, { name: "Client" });
      const project = await createProject(db, {
        name: "Billable Project",
        color: "#e74c3c",
        clientId: 1,
        billable: 1,
        hourlyRate: 150.0,
      });
      expect(project.name).toBe("Billable Project");
      expect(project.color).toBe("#e74c3c");
      expect(project.clientId).toBe(1);
      expect(project.billable).toBe(1);
      expect(project.hourlyRate).toBe(150.0);
    });
  });

  describe("getAllProjects", () => {
    it("should return all non-archived projects by default", async () => {
      await createProject(db, { name: "Active" });
      const archived = await createProject(db, { name: "Archived" });
      await updateProject(db, archived.id, { archived: 1 });

      const projects = await getAllProjects(db);
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe("Active");
    });

    it("should return all projects when includeArchived is true", async () => {
      await createProject(db, { name: "Active" });
      const archived = await createProject(db, { name: "Archived" });
      await updateProject(db, archived.id, { archived: 1 });

      const projects = await getAllProjects(db, true);
      expect(projects).toHaveLength(2);
    });
  });

  describe("getProjectById", () => {
    it("should return a project by ID", async () => {
      await createProject(db, { name: "Test Project" });
      const project = await getProjectById(db, 1);
      expect(project).toBeDefined();
      expect(project!.name).toBe("Test Project");
    });

    it("should return undefined for non-existent ID", async () => {
      const project = await getProjectById(db, 999);
      expect(project).toBeUndefined();
    });
  });

  describe("updateProject", () => {
    it("should update project fields", async () => {
      await createProject(db, { name: "Old Name" });
      const updated = await updateProject(db, 1, {
        name: "New Name",
        color: "#2ecc71",
        billable: 1,
        hourlyRate: 100,
      });
      expect(updated!.name).toBe("New Name");
      expect(updated!.color).toBe("#2ecc71");
      expect(updated!.billable).toBe(1);
      expect(updated!.hourlyRate).toBe(100);
    });

    it("should set updatedAt on update", async () => {
      await createProject(db, { name: "Test" });
      const updated = await updateProject(db, 1, { name: "Updated" });
      expect(updated!.updatedAt).toBeDefined();
    });
  });

  describe("deleteProject", () => {
    it("should delete a project", async () => {
      await createProject(db, { name: "To Delete" });
      const result = await deleteProject(db, 1);
      expect(result).toBe(true);

      const project = await getProjectById(db, 1);
      expect(project).toBeUndefined();
    });

    it("should return false for non-existent project", async () => {
      const result = await deleteProject(db, 999);
      expect(result).toBe(false);
    });
  });

  describe("getTotalTrackedTime", () => {
    it("should return 0 when no entries exist", async () => {
      await createProject(db, { name: "Empty" });
      const total = await getTotalTrackedTime(db, 1);
      expect(total).toBe(0);
    });

    it("should return correct total tracked seconds", async () => {
      await createProject(db, { name: "Project" });
      await createTimeEntry(db, {
        startTime: "2024-01-01T09:00:00",
        stopTime: "2024-01-01T10:00:00",
        durationSeconds: 3600,
        projectId: 1,
      });
      await createTimeEntry(db, {
        startTime: "2024-01-01T10:00:00",
        stopTime: "2024-01-01T10:30:00",
        durationSeconds: 1800,
        projectId: 1,
      });

      const total = await getTotalTrackedTime(db, 1);
      expect(total).toBe(5400);
    });
  });
});
