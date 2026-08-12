const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    where: { email: 'test@gmail.com' },
    include: { invoices: true }
  });
  console.log(JSON.stringify(student.invoices, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
