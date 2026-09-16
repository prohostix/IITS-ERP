import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const unis = await prisma.university.findMany({ select: { category: true } });
  console.log(new Set(unis.map(u => u.category)));
}
main().catch(console.error).finally(() => prisma.$disconnect());
