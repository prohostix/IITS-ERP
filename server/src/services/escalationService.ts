// @ts-nocheck
import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { getNextSuperior } from '../controllers/taskController.js';

const GRACE_PERIOD_HOURS = parseInt(process.env.TASK_OVERDUE_GRACE_HOURS || '24');

export const checkOverdueTasks = async (): Promise<void> => {
  try {
    const now = new Date();

    // 1. Find overdue tasks that have not had explanation requested yet
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: { in: ['pending', 'in_progress'] },
        deadline: { lt: now },
      },
      include: {
        assignee: { select: { id: true, name: true } }
      }
    });

    for (const task of overdueTasks) {
      const graceEnd = new Date(now.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000);

      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'overdue',
          escalationStatus: 'overdue_employee',
          explanationPendingFrom: task.assignedTo,
          gracePeriodEnd: graceEnd
        }
      });

      // Send high-priority notification to employee
      await prisma.notification.create({
        data: {
          userId: task.assignedTo,
          organizationId: task.organizationId,
          title: '🚨 Task Overdue: Mandatory Explanation Required',
          message: `The deadline for task "${task.title}" has passed. In accordance with organizational policy, you must provide an explanation immediately.`,
          type: 'escalation',
          link: '/tasks'
        }
      }).catch(() => {});
    }

    // 2. Check overdue tasks where employee ignored explanation past the grace period
    const expiredGraceTasks = await prisma.task.findMany({
      where: {
        status: 'overdue',
        escalationStatus: 'overdue_employee',
        gracePeriodEnd: { lt: now },
        explanationPendingFrom: { not: null }
      },
      include: {
        assignee: { select: { id: true, name: true, role: true } }
      }
    });

    for (const task of expiredGraceTasks) {
      const existingExplanations = Array.isArray(task.explanations) ? task.explanations : [];
      const hasEmployeeExplained = existingExplanations.some((e: any) => e.userId === task.assignedTo);

      if (!hasEmployeeExplained) {
        // Auto-inject system notice into explanations chain
        const systemNotice = {
          id: `auto-sys-${Date.now()}`,
          userId: 'system',
          userName: 'System Monitor',
          role: 'system',
          level: 1,
          type: 'employee_failure_grace_expired',
          explanation: `Employee ${task.assignee?.name} failed to submit an explanation within the ${GRACE_PERIOD_HOURS}-hour grace period. Automatically escalated to superior.`,
          submittedAt: new Date().toISOString()
        };

        const updatedExplanations = [...existingExplanations, systemNotice];
        const nextSuperior = await getNextSuperior(task.assignedTo, task.organizationId, [task.assignedTo]);

        if (nextSuperior) {
          await prisma.task.update({
            where: { id: task.id },
            data: {
              explanations: updatedExplanations,
              explanationPendingFrom: nextSuperior.id,
              escalationStatus: nextSuperior.role === 'ceo' ? 'escalated_ceo' : 'escalated_dept',
              escalatedTo: nextSuperior.id,
              escalatedAt: new Date()
            }
          });

          await prisma.notification.create({
            data: {
              userId: nextSuperior.id,
              organizationId: task.organizationId,
              title: '⚠️ Unexplained Task Failure Escalated',
              message: `Subordinate ${task.assignee?.name} failed to provide an explanation for task "${task.title}". The task has escalated to you for managerial explanation.`,
              type: 'escalation',
              link: '/tasks'
            }
          }).catch(() => {});
        }
      }
    }

    console.log(`✅ Checked ${overdueTasks.length} newly overdue tasks and ${expiredGraceTasks.length} expired grace tasks`);
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
