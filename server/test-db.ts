import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const student = await prisma.student.findFirst({
    where: { email: 'prohostixss@gmail.com' }, // or whatever their email is? Wait, the name is "Pro Hostixss" in the screenshot.
    include: { enrollments: true }
  });
  console.log(JSON.stringify(student, null, 2));
}
main().finally(() => prisma.$disconnect());
