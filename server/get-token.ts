import prisma from './src/lib/prisma.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

async function main() {
  const user = await prisma.user.findFirst({
    where: { role: 'superadmin' }
  });
  if (!user) return console.log("No superadmin found");
  
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
  console.log("TOKEN:", token);
  
  await prisma.$disconnect();
}
main();
