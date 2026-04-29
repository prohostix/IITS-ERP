import prisma from '../lib/prisma.js';

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, name: true }
  });
  console.log('Users in database:', JSON.stringify(users, null, 2));
}

main().catch(console.error);
