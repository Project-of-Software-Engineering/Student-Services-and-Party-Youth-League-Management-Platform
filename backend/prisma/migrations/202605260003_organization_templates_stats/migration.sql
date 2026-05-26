CREATE TABLE "LeagueBranch" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "major" TEXT NOT NULL,
  "className" TEXT NOT NULL,
  "secretaryName" TEXT,
  "contact" TEXT,
  "description" TEXT,
  "activityPlan" TEXT,
  "memberSummary" JSONB,
  "maintainedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LeagueBranch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "businessType" TEXT NOT NULL,
  "description" TEXT,
  "fileAttachmentId" TEXT,
  "fileName" TEXT,
  "content" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BusinessTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Student" ADD COLUMN "leagueBranchId" TEXT;

CREATE UNIQUE INDEX "LeagueBranch_grade_major_className_key" ON "LeagueBranch"("grade", "major", "className");
CREATE INDEX "LeagueBranch_maintainedById_idx" ON "LeagueBranch"("maintainedById");
CREATE INDEX "BusinessTemplate_category_businessType_idx" ON "BusinessTemplate"("category", "businessType");
CREATE INDEX "BusinessTemplate_enabled_idx" ON "BusinessTemplate"("enabled");

ALTER TABLE "LeagueBranch" ADD CONSTRAINT "LeagueBranch_maintainedById_fkey" FOREIGN KEY ("maintainedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_leagueBranchId_fkey" FOREIGN KEY ("leagueBranchId") REFERENCES "LeagueBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
