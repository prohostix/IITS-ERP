import cron from 'node-cron';
import Task from '../models/Task';
import EscalationLog from '../models/EscalationLog';
import User from '../models/User';
import { emitToRole, emitToUser } from '../config/socket';

// Grace period in hours (default 48 hours)
const GRACE_PERIOD_HOURS = parseInt(process.env.ESCALATION_GRACE_PERIOD_HOURS || '48');

export const startEscalationCron = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Running escalation check...');
    try {
      await checkOverdueTasks();
      await checkGracePeriodExpired();
    } catch (error) {
      console.error('❌ Escalation cron error:', error);
    }
  });

  console.log('✅ Escalation cron job started');
};

// Check for newly overdue tasks
const checkOverdueTasks = async () => {
  const now = new Date();

  // Find tasks that are overdue but not yet escalated
  const overdueTasks = await Task.find({
    status: { $in: ['pending', 'in_progress'] },
    deadline: { $lt: now },
    escalationStatus: 'none',
  }).populate('assignedTo departmentId');

  console.log(`Found ${overdueTasks.length} overdue tasks`);

  for (const task of overdueTasks) {
    try {
      // Update task status
      task.status = 'overdue';
      task.escalationStatus = 'overdue_employee';
      task.gracePeriodEnd = new Date(now.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000);
      await task.save();

      // Find department admin
      const deptAdmin = await User.findOne({
        organizationId: task.organizationId,
        departmentId: task.departmentId,
        role: { $in: ['dept_admin', 'ops_admin', 'finance_admin', 'hr_admin', 'sales_admin'] },
      });

      if (deptAdmin) {
        // Create escalation log
        const escalation = await EscalationLog.create({
          organizationId: task.organizationId,
          taskId: task._id,
          employeeId: task.assignedTo,
          deptAdminId: deptAdmin._id,
          escalatedAt: now,
          status: 'pending',
          gracePeriodEnd: task.gracePeriodEnd,
          priority: task.priority,
          chain: [
            {
              level: 'employee',
              userId: task.assignedTo,
              action: 'Task overdue',
              timestamp: now,
            },
          ],
        });

        // Emit real-time notification to department admin
        emitToUser(deptAdmin._id.toString(), 'task-escalated', {
          type: 'overdue_employee',
          taskId: task._id,
          taskTitle: task.title,
          employeeName: (task.assignedTo as any).name,
          escalationId: escalation._id,
          gracePeriodEnd: task.gracePeriodEnd,
        });

        console.log(`✅ Escalated task ${task._id} to dept admin ${deptAdmin._id}`);
      }
    } catch (error) {
      console.error(`❌ Error escalating task ${task._id}:`, error);
    }
  }
};

// Check for grace period expired (escalate to CEO)
const checkGracePeriodExpired = async () => {
  const now = new Date();

  // Find escalations where grace period has expired
  const expiredEscalations = await EscalationLog.find({
    status: 'pending',
    gracePeriodEnd: { $lt: now },
    ceoId: { $exists: false },
  }).populate('taskId deptAdminId');

  console.log(`Found ${expiredEscalations.length} expired grace periods`);

  for (const escalation of expiredEscalations) {
    try {
      // Find CEO
      const ceo = await User.findOne({
        organizationId: escalation.organizationId,
        role: 'ceo',
      });

      if (ceo) {
        // Update escalation
        escalation.ceoId = ceo._id;
        escalation.chain.push({
          level: 'ceo',
          userId: ceo._id,
          action: 'Escalated to CEO - Department Admin inaction',
          timestamp: now,
        });
        await escalation.save();

        // Update task
        const task = escalation.taskId as any;
        if (task) {
          task.escalationStatus = 'escalated_ceo';
          task.escalatedTo = ceo._id;
          task.escalatedAt = now;
          await task.save();
        }

        // Emit real-time notification to CEO
        emitToRole(
          escalation.organizationId.toString(),
          'ceo',
          'critical-escalation',
          {
            type: 'dept_admin_inaction',
            taskId: task._id,
            taskTitle: task.title,
            escalationId: escalation._id,
            deptAdminName: (escalation.deptAdminId as any).name,
          }
        );

        console.log(`✅ Escalated to CEO: ${escalation._id}`);
      }
    } catch (error) {
      console.error(`❌ Error escalating to CEO ${escalation._id}:`, error);
    }
  }
};

// REREG carryforward cron (runs daily at midnight)
export const startReregCron = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Running REREG carryforward check...');
    try {
      // TODO: Implement REREG carryforward logic
      // This will be implemented when we create the REREG module
    } catch (error) {
      console.error('❌ REREG cron error:', error);
    }
  });

  console.log('✅ REREG cron job started');
};

// Metrics calculation cron (runs every 6 hours)
export const startMetricsCron = () => {
  cron.schedule('0 */6 * * *', async () => {
    console.log('🔄 Running metrics calculation...');
    try {
      // TODO: Implement metrics calculation
      // This will calculate and cache performance and risk metrics
    } catch (error) {
      console.error('❌ Metrics cron error:', error);
    }
  });

  console.log('✅ Metrics cron job started');
};

// Start all cron jobs
export const startAllCronJobs = () => {
  startEscalationCron();
  startReregCron();
  startMetricsCron();
  startInviteExpiryCron();
  startOnboardingSLACron();
};

// Expire study center invite tokens daily at 1am
export const startInviteExpiryCron = () => {
  cron.schedule('0 1 * * *', async () => {
    console.log('🔄 Running invite token expiry check...');
    try {
      const StudyCenterInvite = (await import('../models/StudyCenterInvite.js')).default;
      const result = await StudyCenterInvite.updateMany(
        { status: 'pending', expiresAt: { $lt: new Date() } },
        { $set: { status: 'expired' } }
      );
      console.log(`✅ Expired ${result.modifiedCount} invite tokens`);
    } catch (error) {
      console.error('❌ Invite expiry cron error:', error);
    }
  });

  console.log('✅ Invite expiry cron job started');
};

// ─── Study Center Onboarding SLA Cron ────────────────────────────────────────
// Runs every 2 hours. If a center has been in pending_verification for > 48h
// without ops action, it:
//   1. Creates an Escalation against the ops department
//   2. Notifies the ops admin and their manager (sales_admin who referred it)
//   3. The delay is tracked — ops user's performance is impacted via the escalation chain

const ONBOARDING_SLA_HOURS = parseInt(process.env.ONBOARDING_SLA_HOURS || '48');

export const startOnboardingSLACron = () => {
  cron.schedule('0 */2 * * *', async () => {
    console.log('🔄 Running onboarding SLA check...');
    try {
      await checkOnboardingSLA();
    } catch (error) {
      console.error('❌ Onboarding SLA cron error:', error);
    }
  });
  console.log('✅ Onboarding SLA cron started');
};

const checkOnboardingSLA = async () => {
  const StudyCenter = (await import('../models/StudyCenter.js')).default;
  const Escalation = (await import('../models/Escalation.js')).default;

  const slaThreshold = new Date(Date.now() - ONBOARDING_SLA_HOURS * 60 * 60 * 1000);

  // Centers stuck in pending_verification beyond SLA with no existing active escalation
  const staleCenters = await StudyCenter.find({
    status: 'pending_verification',
    updatedAt: { $lt: slaThreshold },
  }).populate('referredBy', 'name email reportingTo').lean();

  for (const center of staleCenters) {
    // Check if escalation already exists for this center
    const existing = await Escalation.findOne({
      entityId: center._id,
      entityType: 'StudyCenter',
      status: 'active',
    });
    if (existing) continue;

    // Find ops admin in the org
    const opsAdmin = await User.findOne({
      organizationId: center.organizationId,
      role: 'ops_admin',
      status: 'active',
    }).select('_id name reportingTo');

    const referredBy = center.referredBy as any;

    // Create escalation — ops admin is responsible
    const escalation = await Escalation.create({
      organizationId: center.organizationId,
      type: 'approval_delay',
      entityId: center._id,
      entityType: 'StudyCenter',
      raisedBy: referredBy?._id || opsAdmin?._id,
      description: `Study center "${center.name}" (${center.code}) has been pending ops verification for over ${ONBOARDING_SLA_HOURS} hours. The responsible ops team has not acted within the SLA window. This delay is impacting the sales team's onboarding pipeline.`,
      impact: 'high',
      currentLevel: 1,
      maxLevel: 3,
      chain: [
        {
          level: 1,
          role: 'ops_admin',
          userId: opsAdmin?._id,
          action: 'sla_breach',
          actionAt: new Date(),
          remarks: `Center stuck in pending_verification since ${new Date(center.updatedAt).toLocaleString()}`,
        },
      ],
    });

    // Notify ops admin
    if (opsAdmin) {
      emitToUser(opsAdmin._id.toString(), 'onboarding-sla-breach', {
        centerId: center._id,
        centerName: center.name,
        escalationId: escalation._id,
        message: `SLA breach: "${center.name}" has been pending verification for over ${ONBOARDING_SLA_HOURS}h. Please act immediately — this is affecting your performance score.`,
      });

      // Also notify ops admin's manager (reportingTo)
      if ((opsAdmin as any).reportingTo) {
        emitToUser((opsAdmin as any).reportingTo.toString(), 'onboarding-sla-breach', {
          centerId: center._id,
          centerName: center.name,
          escalationId: escalation._id,
          message: `Your team member has breached the onboarding SLA for center "${center.name}". An escalation has been raised.`,
        });
      }
    }

    // Notify the sales user who referred the center
    if (referredBy?._id) {
      emitToUser(referredBy._id.toString(), 'onboarding-sla-breach', {
        centerId: center._id,
        centerName: center.name,
        escalationId: escalation._id,
        message: `Your referred center "${center.name}" is delayed in ops verification (${ONBOARDING_SLA_HOURS}h SLA breached). An escalation has been raised.`,
      });
    }

    console.log(`✅ SLA escalation created for center ${center._id} (${center.name})`);
  }
};
