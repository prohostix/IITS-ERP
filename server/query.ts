import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query']
});

async function main() {
  const enrs = await prisma.enrollment.findMany({
    where: { 
      enrollmentNumber: { in: ['ENR-1789378329826-848', 'ENR-1789377768683-425'] } 
    }
  });
  console.log("Enrollments:", JSON.stringify(enrs, null, 2));

  const students = await prisma.student.findMany({
    where: { 
      enrollmentNo: { in: ['ENR-1789378329826-848', 'ENR-1789377768683-425'] } 
    }
  });
  console.log("Students:", JSON.stringify(students, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
