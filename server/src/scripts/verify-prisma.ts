import { prisma, connectPostgres } from '../config/postgres.js';

const testPrisma = async () => {
  console.log('Testing Prisma connection...');
  await connectPostgres();
  
  try {
    const userCount = await prisma.user.count();
    console.log(`Current user count: ${userCount}`);
    console.log('✅ Prisma verification successful!');
  } catch (error) {
    console.error('❌ Prisma verification failed:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
};

testPrisma();
