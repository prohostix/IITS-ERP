const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true }});
  console.log(users.filter(u => u.name && u.name.toLowerCase().includes('student')));
  console.log('All roles:', [...new Set(users.map(u => u.role))]);
}
main().then(() => prisma.$disconnect());
