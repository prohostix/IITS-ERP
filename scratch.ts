import { AuthRequest } from "../types";
import { Response } from "express";

export const getActivityReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { date, departmentId } = req.query;
  const targetDate = date ? new Date(date as string) : new Date();
  
  // Set to midnight UTC for comparison
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  let userWhere: any = { 
    organizationId: req.user.organizationId, 
    status: 'active' as any,
    role: { notIn: ['student', 'center_admin', 'superadmin'] }
  };
  if (departmentId) {
    userWhere.departmentId = departmentId as string;
  }

  const users = await prisma.user.findMany({
    where: userWhere,
    include: {
      department: true,
      attendances: {
        where: {
          date: { gte: startOfDay, lte: endOfDay }
        }
      },
      assignedTasks: {
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay } // Or targetDate
        }
      },
      auditLogs: {
        where: {
          timestamp: { gte: startOfDay, lte: endOfDay }
        }
      }
    }
  });

  const scheduledHours = 8;
  const breakMinutes = 60;

  const data = users.map(u => {
    const att = u.attendances[0];
    const tasks = u.assignedTasks || [];
    const auditLogs = u.auditLogs || [];

    const completedToday = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const overdue = tasks.filter(t => t.status === 'overdue').length;

    const erpActivity: Record<string, number> = {};
    auditLogs.forEach(log => {
      erpActivity[log.action] = (erpActivity[log.action] || 0) + 1;
    });

    let productiveHours = 0;
    let timeWasted: number | null = null;
    let workingHours = att?.workingHours || 0;

    if (att && att.checkIn) {
      productiveHours = workingHours;
      timeWasted = Math.max(0, scheduledHours - productiveHours);
    }

    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role || 'Employee',
      designation: u.designation || '',
      department: u.department?.name || '-',
      departmentId: u.departmentId,
      attendance: att ? {
        status: att.status,
        checkIn: att.checkIn,
        checkOut: att.checkOut,
        isLate: att.isLate,
        lateMinutes: att.lateMinutes,
        workingHours: att.workingHours
      } : null,
      productiveHours,
      scheduledHours,
      timeWasted,
      breakMinutes,
      erpActions: auditLogs.length,
      erpActivity,
      tasks: {
        total: tasks.length,
        completedToday,
        inProgress,
        overdue,
        list: tasks.map(t => ({ id: t.id, title: t.title, status: t.status }))
      }
    };
  });

  res.json({ success: true, data, scheduledHours, breakMinutes });
});
