const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({ where: { name: { contains: 'Anju' } } });
  console.log(users);
}
run();
