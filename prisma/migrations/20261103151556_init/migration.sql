-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'backlog',
    "position" REAL,
    "linkedProjectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_linkedProjectId_fkey" FOREIGN KEY ("linkedProjectId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dependency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Dependency_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Dependency_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Item_status_position_idx" ON "Item"("status", "position");

-- CreateIndex
CREATE INDEX "Dependency_prerequisiteId_idx" ON "Dependency"("prerequisiteId");

-- CreateIndex
CREATE UNIQUE INDEX "Dependency_itemId_prerequisiteId_key" ON "Dependency"("itemId", "prerequisiteId");
