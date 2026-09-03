-- CreateTable
CREATE TABLE "DiaperType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "koerbchenId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "note" TEXT,
    "count" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiaperType_koerbchenId_fkey" FOREIGN KEY ("koerbchenId") REFERENCES "Koerbchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DiaperType_koerbchenId_idx" ON "DiaperType"("koerbchenId");

-- Preserve existing single stock: seed one "Standard" type per Körbchen
-- carrying the previous diaperCount. Runs before Koerbchen is redefined
-- (which drops the diaperCount column).
INSERT INTO "DiaperType" ("id", "koerbchenId", "name", "count", "sortOrder", "active", "createdAt")
SELECT lower(hex(randomblob(16))), "id", 'Standard', "diaperCount", 0, true, CURRENT_TIMESTAMP
FROM "Koerbchen";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- ChangeLog: add optional diaperTypeId with SetNull FK
CREATE TABLE "new_ChangeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "koerbchenId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "diaperTypeId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChangeLog_koerbchenId_fkey" FOREIGN KEY ("koerbchenId") REFERENCES "Koerbchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChangeLog_diaperTypeId_fkey" FOREIGN KEY ("diaperTypeId") REFERENCES "DiaperType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChangeLog" ("id", "koerbchenId", "userId", "note", "createdAt") SELECT "id", "koerbchenId", "userId", "note", "createdAt" FROM "ChangeLog";
DROP TABLE "ChangeLog";
ALTER TABLE "new_ChangeLog" RENAME TO "ChangeLog";
CREATE INDEX "ChangeLog_koerbchenId_createdAt_idx" ON "ChangeLog"("koerbchenId", "createdAt");

-- Koerbchen: drop diaperCount (superseded by DiaperType stocks)
CREATE TABLE "new_Koerbchen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "drinkGoalMl" INTEGER NOT NULL DEFAULT 1500,
    "changeIntervalMinutes" INTEGER NOT NULL DEFAULT 180,
    "diaperLowThreshold" INTEGER NOT NULL DEFAULT 5,
    "lastChangeAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Koerbchen" ("id", "name", "inviteCode", "drinkGoalMl", "changeIntervalMinutes", "diaperLowThreshold", "lastChangeAt", "createdAt") SELECT "id", "name", "inviteCode", "drinkGoalMl", "changeIntervalMinutes", "diaperLowThreshold", "lastChangeAt", "createdAt" FROM "Koerbchen";
DROP TABLE "Koerbchen";
ALTER TABLE "new_Koerbchen" RENAME TO "Koerbchen";
CREATE UNIQUE INDEX "Koerbchen_inviteCode_key" ON "Koerbchen"("inviteCode");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
