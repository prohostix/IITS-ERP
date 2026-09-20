import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.program.findFirst();
  console.log('PROGRAM_ID:', p?.id);
  const u = await prisma.user.findFirst({ where: { role: 'ops_admin' }});
  console.log('USER_TOKEN:', u?.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
