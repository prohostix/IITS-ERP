import { PrismaClient } from '/var/www/pype-erp/server/node_modules/@prisma/client/index.js';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient({ datasourceUrl: 'postgresql://postgres:postgres@erp.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres' });
async function main() {
  const user = await prisma.user.findFirst({ where: { role: 'superadmin' } });
  if (!user) { console.log('No superadmin found'); process.exit(1); }
  const token = jwt.sign({ id: user.id }, 'secret', { expiresIn: '1d' });
  console.log('TOKEN:', token);
  await prisma.$disconnect();
}
main();
