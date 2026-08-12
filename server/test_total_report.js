import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.enrollment.count();
  console.log("Total enrollments:", count);
  
  const org = await prisma.organization.findFirst();
  console.log("Org ID:", org?.id);
  
  const enrollments = await prisma.enrollment.findMany({
    where: { organizationId: org?.id },
    take: 5
  });
  console.log("Found enrollments:", enrollments.map(e => e.studentName));
}
main();
