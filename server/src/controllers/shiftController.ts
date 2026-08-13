import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

export const createShift = async (req: AuthRequest, res: Response) => {
  try {
    const { name, startTime, endTime, isOpenShift, graceTimeMinutes } = req.body;
    const organizationId = req.user.organizationId;
    
    const shift = await prisma.shift.create({
      data: {
        organizationId,
        name,
        startTime,
        endTime,
        isOpenShift,
        graceTimeMinutes
      }
    });
    res.json({ success: true, data: shift });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShifts = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user.organizationId;
    const shifts = await prisma.shift.findMany({ where: { organizationId } });
    res.json({ success: true, data: shifts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateShift = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, isOpenShift, graceTimeMinutes } = req.body;
    
    const shift = await prisma.shift.update({
      where: { id },
      data: {
        name,
        startTime,
        endTime,
        isOpenShift,
        graceTimeMinutes
      }
    });
    res.json({ success: true, data: shift });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteShift = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.shift.delete({ where: { id } });
    res.json({ success: true, message: 'Shift deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign Shift to Employee
export const assignShiftToEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, shiftId } = req.body;
    
    const profile = await prisma.employeeProfile.updateMany({
      where: { userId: employeeId },
      data: { shiftId }
    });
    
    res.json({ success: true, data: profile });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
