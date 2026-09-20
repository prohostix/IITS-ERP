import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const students = await prisma.student.findMany({
    take: 5,
    where: { documents: { not: {} } }
  });
  console.log(students.map(s => ({ id: s.id, docs: s.documents, type: typeof s.documents })));
}
main().finally(() => prisma.$disconnect());
