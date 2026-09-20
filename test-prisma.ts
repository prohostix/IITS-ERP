import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.program.findFirst();
  console.log('PROGRAM_ID:', p?.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
