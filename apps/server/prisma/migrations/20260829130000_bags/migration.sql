-- CreateTable
CREATE TABLE "Bag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "koerbchenId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bag_koerbchenId_fkey" FOREIGN KEY ("koerbchenId") REFERENCES "Koerbchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Bag_koerbchenId_idx" ON "Bag"("koerbchenId");

-- CreateTable
CREATE TABLE "BagItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bagId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "packed" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BagItem_bagId_fkey" FOREIGN KEY ("bagId") REFERENCES "Bag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BagItem_bagId_idx" ON "BagItem"("bagId");

-- Backfill: give every existing Körbchen a Schwimm- and a Wickeltasche.
INSERT INTO "Bag" ("id", "koerbchenId", "name", "emoji", "sortOrder", "createdAt")
SELECT lower(hex(randomblob(16))), "id", 'Schwimmtasche', '🏊', 0, CURRENT_TIMESTAMP FROM "Koerbchen";
INSERT INTO "Bag" ("id", "koerbchenId", "name", "emoji", "sortOrder", "createdAt")
SELECT lower(hex(randomblob(16))), "id", 'Wickeltasche', '🧷', 1, CURRENT_TIMESTAMP FROM "Koerbchen";
