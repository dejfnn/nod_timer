-- Workspaces: every user gets a personal workspace whose id equals their user
-- id; existing data is backfilled into it.

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId","userId")
);

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
CREATE UNIQUE INDEX "WorkspaceInvite_workspaceId_email_key" ON "WorkspaceInvite"("workspaceId", "email");
CREATE INDEX "WorkspaceInvite_email_idx" ON "WorkspaceInvite"("email");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one personal workspace per existing user (workspace id = user id)
INSERT INTO "Workspace" ("id", "name")
SELECT "id", 'Personal' FROM "User";

INSERT INTO "WorkspaceMember" ("workspaceId", "userId", "role")
SELECT "id", "id", 'owner' FROM "User";

-- Client: userId -> workspaceId
ALTER TABLE "Client" ADD COLUMN "workspaceId" TEXT;
UPDATE "Client" SET "workspaceId" = "userId";
ALTER TABLE "Client" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Client" DROP CONSTRAINT "Client_userId_fkey";
DROP INDEX "Client_userId_idx";
ALTER TABLE "Client" DROP COLUMN "userId";
CREATE INDEX "Client_workspaceId_idx" ON "Client"("workspaceId");
ALTER TABLE "Client" ADD CONSTRAINT "Client_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Project: userId -> workspaceId
ALTER TABLE "Project" ADD COLUMN "workspaceId" TEXT;
UPDATE "Project" SET "workspaceId" = "userId";
ALTER TABLE "Project" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Project" DROP CONSTRAINT "Project_userId_fkey";
DROP INDEX "Project_userId_idx";
ALTER TABLE "Project" DROP COLUMN "userId";
CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tag: userId -> workspaceId
ALTER TABLE "Tag" ADD COLUMN "workspaceId" TEXT;
UPDATE "Tag" SET "workspaceId" = "userId";
ALTER TABLE "Tag" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_userId_fkey";
DROP INDEX "Tag_userId_idx";
ALTER TABLE "Tag" DROP COLUMN "userId";
CREATE INDEX "Tag_workspaceId_idx" ON "Tag"("workspaceId");
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TimeEntry: keeps userId (actor), gains workspaceId
ALTER TABLE "TimeEntry" ADD COLUMN "workspaceId" TEXT;
UPDATE "TimeEntry" SET "workspaceId" = "userId";
ALTER TABLE "TimeEntry" ALTER COLUMN "workspaceId" SET NOT NULL;
CREATE INDEX "TimeEntry_workspaceId_start_idx" ON "TimeEntry"("workspaceId", "start");
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RunningEntry: gains workspaceId (no FK by design symmetry with projectId)
ALTER TABLE "RunningEntry" ADD COLUMN "workspaceId" TEXT;
UPDATE "RunningEntry" SET "workspaceId" = "userId";
ALTER TABLE "RunningEntry" ALTER COLUMN "workspaceId" SET NOT NULL;

-- SavedReport: gains workspaceId
ALTER TABLE "SavedReport" ADD COLUMN "workspaceId" TEXT;
UPDATE "SavedReport" SET "workspaceId" = "userId";
ALTER TABLE "SavedReport" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
