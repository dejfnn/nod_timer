import { createTestDb } from "../helpers/testDb";
import {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
  getProjectCount,
  hasActiveProjects,
} from "@/models/client";
import { createProject } from "@/models/project";

describe("Client model", () => {
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

  describe("createClient", () => {
    it("should create a client with a name", async () => {
      const client = await createClient(db, { name: "Acme Corp" });
      expect(client).toBeDefined();
      expect(client.id).toBe(1);
      expect(client.name).toBe("Acme Corp");
      expect(client.archived).toBe(0);
    });

    it("should auto-generate createdAt", async () => {
      const client = await createClient(db, { name: "Test Client" });
      expect(client.createdAt).toBeDefined();
    });
  });

  describe("getAllClients", () => {
    it("should return all non-archived clients by default", async () => {
      await createClient(db, { name: "Client A" });
      await createClient(db, { name: "Client B" });

      // Archive Client B
      await updateClient(db, 2, { archived: 1 });

      const clients = await getAllClients(db);
      expect(clients).toHaveLength(1);
      expect(clients[0].name).toBe("Client A");
    });

    it("should return all clients when includeArchived is true", async () => {
      await createClient(db, { name: "Client A" });
      await createClient(db, { name: "Client B" });
      await updateClient(db, 2, { archived: 1 });

      const clients = await getAllClients(db, true);
      expect(clients).toHaveLength(2);
    });

    it("should return empty array when no clients exist", async () => {
      const clients = await getAllClients(db);
      expect(clients).toHaveLength(0);
    });
  });

  describe("getClientById", () => {
    it("should return a client by ID", async () => {
      await createClient(db, { name: "Acme Corp" });
      const client = await getClientById(db, 1);
      expect(client).toBeDefined();
      expect(client!.name).toBe("Acme Corp");
    });

    it("should return undefined for non-existent ID", async () => {
      const client = await getClientById(db, 999);
      expect(client).toBeUndefined();
    });
  });

  describe("updateClient", () => {
    it("should update client name", async () => {
      await createClient(db, { name: "Old Name" });
      const updated = await updateClient(db, 1, { name: "New Name" });
      expect(updated).toBeDefined();
      expect(updated!.name).toBe("New Name");
    });

    it("should set updatedAt on update", async () => {
      await createClient(db, { name: "Test" });
      const updated = await updateClient(db, 1, { name: "Updated" });
      expect(updated!.updatedAt).toBeDefined();
    });

    it("should archive a client", async () => {
      await createClient(db, { name: "Test" });
      const updated = await updateClient(db, 1, { archived: 1 });
      expect(updated!.archived).toBe(1);
    });
  });

  describe("deleteClient", () => {
    it("should delete an existing client", async () => {
      await createClient(db, { name: "To Delete" });
      const result = await deleteClient(db, 1);
      expect(result).toBe(true);

      const client = await getClientById(db, 1);
      expect(client).toBeUndefined();
    });

    it("should return false for non-existent client", async () => {
      const result = await deleteClient(db, 999);
      expect(result).toBe(false);
    });
  });

  describe("getProjectCount", () => {
    it("should return 0 when client has no projects", async () => {
      await createClient(db, { name: "Empty Client" });
      const count = await getProjectCount(db, 1);
      expect(count).toBe(0);
    });

    it("should return correct project count", async () => {
      await createClient(db, { name: "Client" });
      await createProject(db, { name: "Project 1", clientId: 1 });
      await createProject(db, { name: "Project 2", clientId: 1 });

      const count = await getProjectCount(db, 1);
      expect(count).toBe(2);
    });
  });

  describe("hasActiveProjects", () => {
    it("should return false when client has no projects", async () => {
      await createClient(db, { name: "Client" });
      const has = await hasActiveProjects(db, 1);
      expect(has).toBe(false);
    });

    it("should return true when client has active projects", async () => {
      await createClient(db, { name: "Client" });
      await createProject(db, { name: "Active Project", clientId: 1 });

      const has = await hasActiveProjects(db, 1);
      expect(has).toBe(true);
    });

    it("should return false when all projects are archived", async () => {
      const { updateProject } = await import("@/models/project");
      await createClient(db, { name: "Client" });
      await createProject(db, { name: "Project", clientId: 1 });
      await updateProject(db, 1, { archived: 1 });

      const has = await hasActiveProjects(db, 1);
      expect(has).toBe(false);
    });
  });
});
