import prisma from '../src/lib/prisma.js';

async function main() {
  const students = await prisma.student.findMany({
    where: { enrolledAt: null, status: 'active' },
    include: { enrollments: true }
  });
  console.log(`Found ${students.length} students without enrolledAt`);
  for (const s of students) {
    if (s.enrollments.length > 0) {
      await prisma.student.update({
        where: { id: s.id },
        data: { enrolledAt: s.createdAt } // fallback to createdAt if not explicitly set
      });
      console.log(`Updated student ${s.name}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
