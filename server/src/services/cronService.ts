import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { startEscalationCron } from './escalationService.js';

export const startAllCronJobs = () => {
  startInviteExpiryCron();
  startEscalationCron();
  console.log('✅ All cron jobs started');
};

const startInviteExpiryCron = () => {
  cron.schedule('0 1 * * *', async () => {
    console.log('🔄 Running invite token expiry check...');
    try {
      const result = await prisma.studyCenterInvite.updateMany({
        where: {
          status: 'pending',
          expiresAt: { lt: new Date() }
        },
        data: { status: 'expired' }
      });
      console.log(`✅ Expired ${result.count} invite tokens`);
    } catch (error) {
      console.error('❌ Invite expiry cron error:', error);
    }
  });
};
