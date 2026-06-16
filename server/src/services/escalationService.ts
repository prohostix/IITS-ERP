// @ts-nocheck
import cron from 'node-cron';
import prisma from '../lib/prisma.js';

const GRACE_PERIOD_HOURS = parseInt(process.env.TASK_OVERDUE_GRACE_HOURS || '48');

export const checkOverdueTasks = async (): Promise<void> => {
  try {
    const now = new Date();
    const gracePeriodDate = new Date(now.getTime() - GRACE_PERIOD_HOURS * 60 * 60 * 1000);

    // Find overdue tasks that haven't been escalated yet
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: { in: ['pending', 'in_progress', 'overdue'] },
        deadline: { lt: now },
        escalationStatus: 'none',
      },
    });

    for (const task of overdueTasks) {
      // Mark task as overdue and start grace period
      const graceEnd = new Date(now.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000);
      
      await prisma.task.update({
        where: { id: task.id },
        data: { 
          status: 'overdue',
          escalationStatus: 'overdue_employee',
          gracePeriodEnd: graceEnd
        }
      });
    }

    console.log(`✅ Checked ${overdueTasks.length} overdue tasks`);
  } catch (error) {
    console.error('❌ Error checking overdue tasks:', error);
  }
};

export const startEscalationCron = (): void => {
  cron.schedule('0 * * * *', () => {
    console.log('🔄 Running escalation check...');
    checkOverdueTasks();
  });
  console.log('✅ Escalation cron job started');
};
