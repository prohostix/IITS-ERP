const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.enrollment.groupBy({
    by: ['paymentType'],
    _count: {
      paymentType: true,
    },
  });
  console.log(types);
}
main().finally(() => prisma.$disconnect());
