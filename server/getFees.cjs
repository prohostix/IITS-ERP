const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.programFeeStructure.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
  .then(res => console.log(JSON.stringify(res.map(r => r.feeBreakdown), null, 2)))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
