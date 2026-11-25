import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

async function resolveOrgId(req: AuthRequest): Promise<string | null> {
  if (req.user?.organizationId) return req.user.organizationId;
  if (req.body?.organizationId) return req.body.organizationId;
  const org = await prisma.organization.findFirst({ select: { id: true } });
  return org?.id || null;
}

export const createShift = async (req: AuthRequest, res: Response) => {
  try {
    const { name, startTime, endTime, isOpenShift, graceTimeMinutes } = req.body;
    const organizationId = await resolveOrgId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization not found' });
    }
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Shift name is required' });
    }

    const openShift = Boolean(isOpenShift);
    const shift = await prisma.shift.create({
      data: {
        organizationId,
        name: cleanName,
        startTime: openShift ? null : (startTime || '09:00'),
        endTime: openShift ? null : (endTime || '18:00'),
        isOpenShift: openShift,
        graceTimeMinutes: Math.max(0, Number(graceTimeMinutes ?? 15) || 0),
      },
      include: {
        employees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                designation: true,
                status: true,
                departmentId: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    res.json({ success: true, data: shift });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShifts = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = await resolveOrgId(req);
    const where: any = organizationId ? { organizationId } : {};
    const shifts = await prisma.shift.findMany({
      where,
      include: {
        employees: {
          where: { user: { status: { not: 'resigned' } } },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                designation: true,
                status: true,
                departmentId: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: shifts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateShift = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, isOpenShift, graceTimeMinutes } = req.body;

    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }
    if (req.user?.organizationId && existing.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this shift' });
    }

    const openShift = isOpenShift !== undefined ? Boolean(isOpenShift) : existing.isOpenShift;
    const shift = await prisma.shift.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : existing.name,
        startTime: openShift ? null : (startTime !== undefined ? startTime : existing.startTime || '09:00'),
        endTime: openShift ? null : (endTime !== undefined ? endTime : existing.endTime || '18:00'),
        isOpenShift: openShift,
        graceTimeMinutes:
          graceTimeMinutes !== undefined
            ? Math.max(0, Number(graceTimeMinutes) || 0)
            : existing.graceTimeMinutes,
      },
      include: {
        employees: {
          where: { user: { status: { not: 'resigned' } } },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                designation: true,
                status: true,
                departmentId: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    res.json({ success: true, data: shift });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteShift = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }
    if (req.user?.organizationId && existing.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this shift' });
    }

    // Safely detach employees before deleting shift
    await prisma.employeeProfile.updateMany({
      where: { shiftId: id },
      data: { shiftId: null },
    });
    await prisma.shift.delete({ where: { id } });
    res.json({ success: true, message: 'Shift deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign Shift to Single Employee, Multiple Employees, or Entire Department
export const assignShiftToEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, employeeIds, departmentId, shiftId, lateDeductionEnabled } = req.body;
    const normalizedShiftId = !shiftId || shiftId === 'none' || shiftId === 'default' ? null : String(shiftId);

    if (normalizedShiftId) {
      const shiftExists = await prisma.shift.findUnique({ where: { id: normalizedShiftId } });
      if (!shiftExists) {
        return res.status(404).json({ success: false, message: 'Selected shift not found' });
      }
    }

    let targetUserIds: string[] = [];
    if (Array.isArray(employeeIds) && employeeIds.length > 0) {
      targetUserIds = employeeIds.filter(Boolean);
    } else if (employeeId) {
      targetUserIds = [String(employeeId)];
    } else if (departmentId) {
      const deptUsers = await prisma.user.findMany({
        where: {
          departmentId: String(departmentId),
          ...(req.user?.organizationId ? { organizationId: req.user.organizationId } : {}),
          status: { not: 'resigned' },
        },
        select: { id: true },
      });
      targetUserIds = deptUsers.map((u) => u.id);
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No employees specified for shift assignment' });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: targetUserIds } },
      select: { id: true, organizationId: true },
    });

    const fallbackOrgId = await resolveOrgId(req);
    const updated = await Promise.all(
      users.map(async (u) => {
        const orgId = u.organizationId || fallbackOrgId;
        if (!orgId) return null;
        const profile = await prisma.employeeProfile.upsert({
          where: { userId: u.id },
          update: {
            shiftId: normalizedShiftId,
            ...(lateDeductionEnabled !== undefined ? { lateDeductionEnabled: Boolean(lateDeductionEnabled) } : {}),
          },
          create: {
            userId: u.id,
            organizationId: orgId,
            shiftId: normalizedShiftId,
            ...(lateDeductionEnabled !== undefined ? { lateDeductionEnabled: Boolean(lateDeductionEnabled) } : {}),
          },
        });
        if (lateDeductionEnabled !== undefined) {
          await prisma.salaryConfig.updateMany({
            where: { userId: u.id },
            data: { lateDeductionEnabled: Boolean(lateDeductionEnabled) },
          });
        }
        return profile;
      })
    );

    res.json({
      success: true,
      count: updated.filter(Boolean).length,
      message: `Shift updated for ${updated.filter(Boolean).length} employee(s)`,
      data: updated.filter(Boolean),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle Late Deduction for Individual Employee
export const toggleEmployeeLateDeduction = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { enabled } = req.body;
    const lateDeductionEnabled = Boolean(enabled);

    const user = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, organizationId: true },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const orgId = user.organizationId || (await resolveOrgId(req));
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'Organization not found' });
    }

    const profile = await prisma.employeeProfile.upsert({
      where: { userId: user.id },
      update: { lateDeductionEnabled },
      create: { userId: user.id, organizationId: orgId, lateDeductionEnabled },
    });

    await prisma.salaryConfig.updateMany({
      where: { userId: user.id },
      data: { lateDeductionEnabled },
    });

    res.json({
      success: true,
      message: `Late deduction ${lateDeductionEnabled ? 'enabled' : 'disabled'} for ${user.name}`,
      data: { userId: user.id, lateDeductionEnabled, profile },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
