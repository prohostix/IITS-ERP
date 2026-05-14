-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "universityRemarks" TEXT,
ADD COLUMN     "universityReviewedAt" TIMESTAMP(3),
ADD COLUMN     "universityReviewedBy" TEXT;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_universityReviewedBy_fkey" FOREIGN KEY ("universityReviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
