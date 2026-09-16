import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const fees = await prisma.programFeeStructure.findMany({ select: { id: true, billingCycle: true, program: { select: { name: true } } } });
  console.log(JSON.stringify(fees, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
