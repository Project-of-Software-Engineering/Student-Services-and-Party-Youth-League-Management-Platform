-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "PolicyDoc" ADD COLUMN "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE';
