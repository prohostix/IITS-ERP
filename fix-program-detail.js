const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.program.findFirst();
  console.log('Program:', p.id);
  const u = await prisma.user.findFirst({ where: { role: 'ops_admin' } });
  console.log('User Org:', u.organizationId);

  const materials = await prisma.programMaterial.findMany({
    where: { 
      programId: p.id, 
      organizationId: u.organizationId, 
      isActive: true 
    },
    include: { uploader: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });
  console.log('Materials:', materials.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
