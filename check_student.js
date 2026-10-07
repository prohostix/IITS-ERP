const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentName: {
        contains: '7/10 sgvu',
        mode: 'insensitive'
      }
    },
    include: {
      student: true,
      program: true,
      university: true
    }
  });
  
  console.log("--- ENROLLMENTS ---");
  console.log(JSON.stringify(enrollments, null, 2));
  
  const students = await prisma.student.findMany({
    where: {
      name: {
        contains: '7/10 sgvu',
        mode: 'insensitive'
      }
    },
    include: {
      program: true,
      university: true,
      enrollments: {
        include: { program: true }
      }
    }
  });
  
  console.log("--- STUDENTS ---");
  console.log(JSON.stringify(students, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
