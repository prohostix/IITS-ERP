const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient();

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
