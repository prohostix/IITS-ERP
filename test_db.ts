import prisma from './server/src/lib/prisma.js';

async function check() {
  const student = await prisma.student.findFirst({
    where: { name: 'a', program: { name: 'BVOC EV' } },
    include: {
      program: true,
      enrollments: true,
      universityFeePayments: true
    }
  });

  console.log(JSON.stringify(student, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
