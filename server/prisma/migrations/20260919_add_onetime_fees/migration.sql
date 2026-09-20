-- AlterTable: Add oneTimeUniversityFee and oneTimeCommission to ProgramFeeStructure
ALTER TABLE "ProgramFeeStructure" ADD COLUMN IF NOT EXISTS "oneTimeUniversityFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ProgramFeeStructure" ADD COLUMN IF NOT EXISTS "oneTimeCommission" DOUBLE PRECISION NOT NULL DEFAULT 0;
