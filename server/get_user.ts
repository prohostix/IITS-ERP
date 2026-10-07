import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({ where: { name: { contains: 'Pramod' } } });
  console.log(user);
}
main();
