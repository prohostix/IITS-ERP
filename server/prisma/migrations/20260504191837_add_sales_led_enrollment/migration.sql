-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "salesUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_salesUserId_fkey" FOREIGN KEY ("salesUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
