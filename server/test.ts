import prisma from './src/lib/prisma.js';

async function main() {
  const unis = await prisma.university.findMany({ where: { name: 'Test without wallet' } });
  console.log("Unis:", unis);
  if (unis.length > 0) {
    const fs = await prisma.programFeeStructure.findMany({
      where: { universityId: unis[0].id }
    });
    console.log("Fee structures for uni:", JSON.stringify(fs, null, 2));
  }
}

main().finally(() => prisma.$disconnect());
