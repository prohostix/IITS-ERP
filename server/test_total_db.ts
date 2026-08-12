import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const org = await prisma.organization.findFirst();
  console.log("Org ID:", org?.id);
  
  const enrollments = await prisma.enrollment.findMany({
    where: { organizationId: org?.id },
    take: 1
  });
  console.log("Enrollment:", enrollments[0]);
}
main();
