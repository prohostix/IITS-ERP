import prisma from '../lib/prisma.js';

async function fix() {
  const enrollments = await prisma.enrollment.findMany({
    where: { totalFee: null, payment: { isNot: null } },
    include: { payment: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log('Found', enrollments.length, 'enrollments with null totalFee');
  
  for (const e of enrollments) {
    if (e.paymentMethod === 'installment') {
        await prisma.enrollment.update({
            where: { id: e.id },
            data: { totalFee: 34 }
        });
        console.log('Fixed', e.studentName);
    }
  }
  await prisma.$disconnect();
}
fix().catch(console.error);
