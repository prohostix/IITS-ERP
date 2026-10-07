import prisma from './src/lib/prisma.js';
async function main() {
  await prisma.admissionSession.updateMany({
    where: { universityId: "" },
    data: { universityId: null }
  });
  console.log("Fixed empty universityId");
}
main().catch(console.error).finally(() => prisma.$disconnect());
