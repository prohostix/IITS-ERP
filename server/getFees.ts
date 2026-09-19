import prisma from './src/lib/prisma.js';

prisma.programFeeStructure.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
  .then(res => console.log(JSON.stringify(res.map(r => r.feeBreakdown), null, 2)))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
