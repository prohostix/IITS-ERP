
import { prisma } from '../config/postgres.js';
import bcrypt from 'bcryptjs';

// No new PrismaClient() needed

async function resetPasswords() {
  const emails = ['ops@gcn.com', 'fin@gcn.com'];
  const newPassword = 'admin123';

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    console.log('🔄 Resetting passwords for admin accounts...');

    for (const email of emails) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.user.update({
          where: { email },
          data: { password: hashedPassword }
        });
        console.log(`✅ Reset password for ${email}`);
      } else {
        console.warn(`⚠️ User with email ${email} not found.`);
      }
    }

    console.log('✨ Password reset process completed.');
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPasswords();
