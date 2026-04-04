import cron from 'node-cron';
import Task from '../models/Task.js';
import Escalation from '../models/Escalation.js';
import User from '../models/User.js';

const GRACE_PERIOD_HOURS = parseInt(process.env.TASK_OVERDUE_GRACE_HOURS || '48');

export const checkOverdueTasks = async (): Promise<void> => {
  try {
    const now = new Date();
    const gracePeriodDate = new Date(now.getTime() - GRACE_PERIOD_HOURS * 60 * 60 * 1000);

    // Find overdue tasks that haven't been escalated
    const overdueTasks = await Task.find({
      status: { $in: ['pending', 'in_progress'] },
      deadline: { $lt: now },
      escalatedTo: { $exists: false },
    }).populate('assignedTo departmentId');

    for (const task of overdueTasks) {
      // Mark task as overdue
      task.status = 'overdue';
      await task.save();

      // Check if grace period has passed
      if (task.deadline < gracePeriodDate) {
        // Find department admin
        const deptAdmin = await User.findOne({
          organizationId: task.organizationId,
          departmentId: task.departmentId,
          role: { $in: ['ops_admin', 'finance_admin', 'hr_admin', 'sales_admin'] },
        });

        if (deptAdmin) {
          // Create escalation
          const escalation = await Escalation.create({
            organizationId: task.organizationId,
            type: 'task_overdue',
            entityId: task._id,
            entityType: 'Task',
            raisedBy: task.assignedTo,
            description: `Task "${task.title}" is overdue and no action taken by department admin`,
            impact: task.priority === 'critical' ? 'critical' : 'high',
            currentLevel: 2,
            maxLevel: 3,
            chain: [
              {
                level: 1,
                role: 'employee',
                userId: task.assignedTo,
                action: 'missed_deadline',
                actionAt: task.deadline,
              },
              {
                level: 2,
                role: 'dept_admin',
                userId: deptAdmin._id,
                action: 'no_action',
                actionAt: now,
              },
            ],
          });

          // Find CEO and escalate
          const ceo = await User.findOne({
            organizationId: task.organizationId,
            role: 'ceo',
          });

          if (ceo) {
            task.escalatedTo = ceo._id;
            task.escalatedAt = now;
            await task.save();

            escalation.currentLevel = 3;
            escalation.chain.push({
              level: 3,
              role: 'ceo',
              userId: ceo._id,
            });
            await escalation.save();

            console.log(`✅ Task ${task._id} escalated to CEO`);
          }
        }
      }
    }

    console.log(`✅ Checked ${overdueTasks.length} overdue tasks`);
  } catch (error) {
    console.error('❌ Error checking overdue tasks:', error);
  }
};

export const startEscalationCron = (): void => {
  // Run every hour
  cron.schedule('0 * * * *', () => {
    console.log('🔄 Running escalation check...');
    checkOverdueTasks();
  });

  console.log('✅ Escalation cron job started');
};
