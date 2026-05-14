import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Models in Prisma Client:');
  const models = Object.keys(prisma).filter(key => !key.startsWith('$'));
  console.log(models.join(', '));
  
  if (prisma.salaryConfig) console.log('✅ Found salaryConfig');
  else console.log('❌ Missing salaryConfig');
  
  if (prisma.payroll) console.log('✅ Found payroll');
  else console.log('❌ Missing payroll');

  if (prisma.attendance) console.log('✅ Found attendance');
  else console.log('❌ Missing attendance');
}

main().catch(console.error).finally(() => prisma.$disconnect());
