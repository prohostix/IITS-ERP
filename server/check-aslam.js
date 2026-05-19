import prisma from './dist/lib/prisma.js';

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Aslam' } },
    include: {
      department: true,
      subDepartment: true
    }
  });
  console.log('--- USER ASLAM ---');
  console.log(JSON.stringify(user, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
