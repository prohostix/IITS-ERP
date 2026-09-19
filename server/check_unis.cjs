const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const unis = await prisma.university.findMany({ select: { name: true, category: true } });
  console.log(unis);
}
main().catch(console.error).finally(() => prisma.$disconnect());
