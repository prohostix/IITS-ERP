import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const receipts = await prisma.studentFeeReceipt.findMany({
    include: { enrollment: true }
  });
  console.log("RECEIPTS:", receipts);
  const enrollments = await prisma.enrollment.findMany({
    include: { studentFeeReceipts: true, student: true }
  });
  console.log("ENR 0:", enrollments[0]);
}

main().catch(console.error).finally(() => prisma.$disconnect());
