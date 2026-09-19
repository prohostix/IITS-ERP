import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const fees = await prisma.programFeeStructure.findMany({ orderBy: { createdAt: 'desc' }, take: 2 });
  console.log(JSON.stringify(fees.map(f => f.feeBreakdown), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
