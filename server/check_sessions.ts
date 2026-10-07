import prisma from './src/lib/prisma.js';
async function main() {
  const sessions = await prisma.admissionSession.findMany({ select: { id: true, name: true, status: true, universityId: true } });
  console.log(sessions);
}
main().catch(console.error).finally(() => prisma.$disconnect());
