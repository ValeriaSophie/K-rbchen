-- CreateTable
CREATE TABLE "Plushie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "koerbchenId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "species" TEXT,
    "character" TEXT,
    "favorites" TEXT,
    "bio" TEXT,
    "photo" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Plushie_koerbchenId_fkey" FOREIGN KEY ("koerbchenId") REFERENCES "Koerbchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Plushie_koerbchenId_idx" ON "Plushie"("koerbchenId");
