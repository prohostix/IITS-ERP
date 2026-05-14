import { PrismaClient } from '../src/generated/client';
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.user.findMany({
    select: { role: true },
    distinct: ['role'],
  });
  console.log('Roles:', roles.map(r => r.role));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
