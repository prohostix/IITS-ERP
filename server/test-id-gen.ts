
import { prisma } from './src/config/postgres.js';

async function testIdGeneration() {
  try {
    console.log('🧪 Starting User ID generation test...');

    // 1. Get current highest ID
    const lastUser = await prisma.user.findFirst({
      orderBy: { userId: 'desc' },
      where: { userId: { startsWith: 'IITSRPS' } }
    });

    const currentMax = lastUser ? lastUser.userId : 'None';
    console.log(`Current Maximum User ID: ${currentMax}`);

    // 2. Simulate logic for generating next ID
    let nextId = 1;
    if (lastUser && lastUser.userId) {
      const numericPart = lastUser.userId.replace('IITSRPS', '');
      nextId = parseInt(numericPart, 10) + 1;
    }
    const generatedId = `IITSRPS${String(nextId).padStart(4, '0')}`;
    console.log(`Generated Next User ID: ${generatedId}`);

    // 3. Verify it's unique (it should be since we took max + 1)
    const collision = await prisma.user.findUnique({ where: { userId: generatedId } });
    if (collision) {
      console.error('❌ COLLISION DETECTED: The generated ID already exists!');
    } else {
      console.log('✅ SUCCESS: The generated ID is unique.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testIdGeneration();
