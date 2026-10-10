-- REVIEW ONLY. Outside prisma/migrations. Do not apply without authorization.
-- Prisma provides uuid() and @updatedAt values in application code.
CREATE TABLE "LearnerModuleProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "contentVersion" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "state" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LearnerModuleProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LearnerModuleProgress_userId_moduleId_key"
    ON "LearnerModuleProgress"("userId", "moduleId");
ALTER TABLE "LearnerModuleProgress" ADD CONSTRAINT "LearnerModuleProgress_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
