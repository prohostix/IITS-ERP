import prisma from '../src/lib/prisma.js';

async function check() {
  const users = await prisma.user.findMany({ select: { email: true, role: true } });
  console.log(users);
}
check();
