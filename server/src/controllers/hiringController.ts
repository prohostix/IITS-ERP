import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { PrismaClient, HiringStatus, EmploymentRole, InductionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Manager API: Create a hiring request
export const createHiringRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { departmentId, designationId, title, description, count } = req.body;
    const organizationId = req.user.organizationId;
    const requestedBy = req.user.id;

    const request = await prisma.hiringRequest.create({
      data: {
        organizationId,
        departmentId,
        designationId,
        title,
        description,
        count: parseInt(count, 10),
        requestedBy,
        status: 'pending_hr_approval'
      }
    });

    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR API: Get all hiring requests
export const getHiringRequests = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user.organizationId;
    const requests = await prisma.hiringRequest.findMany({
      where: { organizationId },
      include: {
        department: true,
        requester: { select: { name: true, email: true } },
        candidates: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: requests });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR API: Approve or Reject Hiring Request
export const updateHiringRequestStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, hrRemarks } = req.body;
    const hrApprovedBy = req.user.id;

    const request = await prisma.hiringRequest.update({
      where: { id },
      data: {
        status,
        hrRemarks,
        hrApprovedBy
      }
    });
    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR API: Add Candidate to Hiring Request
export const addCandidate = async (req: AuthRequest, res: Response) => {
  try {
    const { hiringRequestId, name, email, phone, offerLetterUrl } = req.body;
    const organizationId = req.user.organizationId;

    const candidate = await prisma.candidate.create({
      data: {
        organizationId,
        hiringRequestId,
        name,
        email,
        phone,
        offerLetterUrl,
        status: 'offer_sent'
      }
    });
    res.json({ success: true, data: candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR API: Update Candidate Status
export const updateCandidateStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, appointmentLetterUrl, joinDate, employmentRole } = req.body;
    const organizationId = req.user.organizationId;
    
    let updateData: any = { status };
    if (appointmentLetterUrl) updateData.appointmentLetterUrl = appointmentLetterUrl;
    if (joinDate) updateData.joinDate = new Date(joinDate);
    if (employmentRole) updateData.employmentRole = employmentRole;
    
    if (status === 'induction_completed') {
      updateData.inductionStatus = 'completed';
      updateData.inductionCompletedBy = req.user.id;
      updateData.inductionCompletedAt = new Date();
    }

    let candidate = await prisma.candidate.findUnique({ where: { id }, include: { hiringRequest: true } });
    if (!candidate) throw new Error("Candidate not found");

    if (status === 'joined' && !candidate.employeeId) {
      // Auto-create user and employee record
      const passwordHash = await bcrypt.hash('password123', 10);
      
      const newUser = await prisma.user.create({
        data: {
          organizationId,
          name: candidate.name,
          email: candidate.email,
          password: passwordHash,
          role: 'employee',
          departmentId: candidate.hiringRequest.departmentId,
          status: 'active'
        }
      });
      
      const newEmployee = await prisma.employeeProfile.create({
        data: {
          organizationId,
          userId: newUser.id,
          employmentType: 'full_time',
          employmentRole: employmentRole || 'probation',
          inductionStatus: 'pending',
          joinDate: new Date(joinDate || new Date())
        }
      });
      
      updateData.employeeId = newEmployee.id;
    }

    candidate = await prisma.candidate.update({
      where: { id },
      data: updateData,
      include: { hiringRequest: true }
    });

    res.json({ success: true, data: candidate });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Manager API: Get Hiring Requests by Department
export const getManagerHiringRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requestedBy = req.user.id;
    const requests = await prisma.hiringRequest.findMany({
      where: { requestedBy },
      include: {
        department: true,
        candidates: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: requests });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
