-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Koerbchen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "drinkGoalMl" INTEGER NOT NULL DEFAULT 1500,
    "changeIntervalMinutes" INTEGER NOT NULL DEFAULT 180,
    "diaperCount" INTEGER NOT NULL DEFAULT 0,
    "diaperLowThreshold" INTEGER NOT NULL DEFAULT 5,
    "lastChangeAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "koerbchenId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_koerbchenId_fkey" FOREIGN KEY ("koerbchenId") REFERENCES "Koerbchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DrinkLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "koerbchenId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountMl" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DrinkLog_koerbchenId_fkey" FOREIGN KEY ("koerbchenId") REFERENCES "Koerbchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DrinkLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChangeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "koerbchenId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChangeLog_koerbchenId_fkey" FOREIGN KEY ("koerbchenId") REFERENCES "Koerbchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "koerbchenId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "costStars" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reward_koerbchenId_fkey" FOREIGN KEY ("koerbchenId") REFERENCES "Koerbchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RewardRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rewardId" TEXT NOT NULL,
    "koerbchenId" TEXT NOT NULL,
    "puppUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RewardRedemption_koerbchenId_fkey" FOREIGN KEY ("koerbchenId") REFERENCES "Koerbchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RewardRedemption_puppUserId_fkey" FOREIGN KEY ("puppUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StarTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "koerbchenId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StarTransaction_koerbchenId_fkey" FOREIGN KEY ("koerbchenId") REFERENCES "Koerbchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StarTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuickCallPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "koerbchenId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "emoji" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuickCallPreset_koerbchenId_fkey" FOREIGN KEY ("koerbchenId") REFERENCES "Koerbchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuickCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "koerbchenId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "presetId" TEXT,
    "text" TEXT NOT NULL,
    "emoji" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" DATETIME,
    "acknowledgedBy" TEXT,
    CONSTRAINT "QuickCall_koerbchenId_fkey" FOREIGN KEY ("koerbchenId") REFERENCES "Koerbchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuickCall_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Koerbchen_inviteCode_key" ON "Koerbchen"("inviteCode");

-- CreateIndex
CREATE INDEX "Membership_koerbchenId_idx" ON "Membership"("koerbchenId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_koerbchenId_key" ON "Membership"("userId", "koerbchenId");

-- CreateIndex
CREATE INDEX "DrinkLog_koerbchenId_createdAt_idx" ON "DrinkLog"("koerbchenId", "createdAt");

-- CreateIndex
CREATE INDEX "ChangeLog_koerbchenId_createdAt_idx" ON "ChangeLog"("koerbchenId", "createdAt");

-- CreateIndex
CREATE INDEX "Reward_koerbchenId_idx" ON "Reward"("koerbchenId");

-- CreateIndex
CREATE INDEX "RewardRedemption_koerbchenId_idx" ON "RewardRedemption"("koerbchenId");

-- CreateIndex
CREATE INDEX "StarTransaction_koerbchenId_userId_idx" ON "StarTransaction"("koerbchenId", "userId");

-- CreateIndex
CREATE INDEX "QuickCallPreset_koerbchenId_idx" ON "QuickCallPreset"("koerbchenId");

-- CreateIndex
CREATE INDEX "QuickCall_koerbchenId_createdAt_idx" ON "QuickCall"("koerbchenId", "createdAt");
