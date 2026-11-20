// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { ensureOpenPositionInHierarchy, assignHireToHierarchyPosition } from './orgAdminController.js';

// Manager API: Create a hiring request
export const createHiringRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { departmentId, designationId, parentDesignationId, branchId, title, description, count } = req.body;
    const organizationId = req.user.organizationId;
    const requestedBy = req.user.id;

    // Resolve departmentId fallback from requester or organization
    let resolvedDeptId = departmentId;
    if (!resolvedDeptId) {
      resolvedDeptId = req.user.departmentId || req.user.designationRef?.departmentId || null;
    }
    if (!resolvedDeptId && designationId) {
      const d = await prisma.designation.findUnique({ where: { id: designationId }, select: { departmentId: true } });
      if (d?.departmentId) resolvedDeptId = d.departmentId;
    }
    if (!resolvedDeptId && parentDesignationId) {
      const pd = await prisma.designation.findUnique({ where: { id: parentDesignationId }, select: { departmentId: true } });
      if (pd?.departmentId) resolvedDeptId = pd.departmentId;
    }
    if (!resolvedDeptId) {
      const fallbackDept = await prisma.department.findFirst({ where: { organizationId } });
      resolvedDeptId = fallbackDept?.id;
    }

    let resolvedTitle = (title || '').trim();
    if (!resolvedTitle && designationId) {
      const d = await prisma.designation.findUnique({ where: { id: designationId }, select: { title: true } });
      resolvedTitle = d?.title || 'Open Position';
    }

    // If manager specified a parentDesignationId (to create a new child position under them),
    // store parentDesignationId in designationId if no direct designationId was chosen, or resolve on approval
    const request = await prisma.hiringRequest.create({
      data: {
        organizationId,
        departmentId: resolvedDeptId,
        designationId: designationId || null,
        title: resolvedTitle || 'Open Position',
        description: parentDesignationId && !designationId
          ? `${description || ''}${description ? '\n' : ''}[PARENT_DESIGNATION:${parentDesignationId}]${branchId ? `[BRANCH:${branchId}]` : ''}`
          : description || '',
        count: Math.max(1, parseInt(count, 10) || 1),
        requestedBy,
        status: 'pending_hr_approval'
      },
      include: {
        department: true,
        requester: { select: { id: true, name: true, email: true, designation: true } },
        candidates: true
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
        requester: { select: { id: true, name: true, email: true, designation: true } },
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

    const existing = await prisma.hiringRequest.findUnique({
      where: { id }
    });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Hiring request not found' });
      return;
    }

    let linkedDesignationId = existing.designationId;

    // When HR approves a hiring request, automatically create/update the open position in the Org Chart hierarchy
    // and ensure an open Vacancy record exists!
    if (status === 'approved' && existing.status !== 'approved') {
      const parentMatch = (existing.description || '').match(/\[PARENT_DESIGNATION:([^\]]+)\]/);
      const branchMatch = (existing.description || '').match(/\[BRANCH:([^\]]+)\]/);

      const desig = await ensureOpenPositionInHierarchy({
        organizationId: existing.organizationId,
        title: existing.title,
        count: existing.count,
        designationId: existing.designationId,
        parentDesignationId: parentMatch ? parentMatch[1] : null,
        branchId: branchMatch ? branchMatch[1] : null,
        departmentId: existing.departmentId,
        requestedByUserId: existing.requestedBy
      });

      if (desig?.id) {
        linkedDesignationId = desig.id;
      }

      // Also create/sync an open Vacancy record so it shows in HR -> Vacancies
      const existingVacancy = await prisma.vacancy.findFirst({
        where: {
          organizationId: existing.organizationId,
          departmentId: existing.departmentId,
          designation: { equals: existing.title, mode: 'insensitive' },
          status: 'open'
        }
      });

      if (existingVacancy) {
        await prisma.vacancy.update({
          where: { id: existingVacancy.id },
          data: { count: (existingVacancy.count || 0) + existing.count }
        });
      } else {
        await prisma.vacancy.create({
          data: {
            organizationId: existing.organizationId,
            departmentId: existing.departmentId,
            designation: existing.title,
            count: existing.count,
            filled: 0,
            status: 'open'
          }
        });
      }
    }

    const request = await prisma.hiringRequest.update({
      where: { id },
      data: {
        status,
        hrRemarks,
        hrApprovedBy,
        ...(linkedDesignationId ? { designationId: linkedDesignationId } : {})
      },
      include: {
        department: true,
        requester: { select: { id: true, name: true, email: true, designation: true } },
        candidates: true
      }
    });
    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR API: Add Candidate to Hiring Request (and optionally mark joined / hire immediately)
export const addCandidate = async (req: AuthRequest, res: Response) => {
  try {
    const { hiringRequestId, name, email, phone, offerLetterUrl, hireImmediately, password, role, joinDate, employmentRole } = req.body;
    const organizationId = req.user.organizationId;

    const candidate = await prisma.candidate.create({
      data: {
        organizationId,
        hiringRequestId,
        name,
        email,
        phone: phone || '',
        offerLetterUrl,
        status: 'offer_sent'
      }
    });

    if (hireImmediately) {
      req.params.id = candidate.id;
      req.body = {
        status: 'joined',
        password: password || 'password123',
        role: role || 'employee',
        joinDate: joinDate || new Date().toISOString(),
        employmentRole: employmentRole || 'probation'
      };
      return await updateCandidateStatus(req, res);
    }

    res.json({ success: true, data: candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR API: Update Candidate Status
export const updateCandidateStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, appointmentLetterUrl, joinDate, employmentRole, password, role } = req.body;
    const organizationId = req.user.organizationId;
    
    const updateData: any = { status };
    if (appointmentLetterUrl) updateData.appointmentLetterUrl = appointmentLetterUrl;
    if (joinDate) updateData.joinDate = new Date(joinDate);
    if (employmentRole) updateData.employmentRole = employmentRole;
    
    if (status === 'induction_completed') {
      updateData.inductionStatus = 'completed';
      updateData.inductionCompletedBy = req.user.id;
      updateData.inductionCompletedAt = new Date();
    }

    let candidate = await prisma.candidate.findUnique({ where: { id }, include: { hiringRequest: true } });
    if (!candidate) throw new Error('Candidate not found');

    if (status === 'joined' && !candidate.employeeId) {
      const passwordHash = await bcrypt.hash(password || 'password123', 10);
      const empCode = `EMP-${Date.now().toString().slice(-6)}`;

      // Check if user with this email already exists
      let targetUser = await prisma.user.findFirst({
        where: { email: candidate.email }
      });

      if (!targetUser) {
        targetUser = await prisma.user.create({
          data: {
            organizationId,
            userId: empCode,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone || null,
            password: passwordHash,
            role: (role as any) || 'employee',
            departmentId: candidate.hiringRequest.departmentId,
            designation: candidate.hiringRequest.title,
            status: 'active'
          }
        });
      }

      // Assign hired user to the open position on the Org Chart & set reportingTo + EmployeeProfile
      await assignHireToHierarchyPosition({
        organizationId,
        userId: targetUser.id,
        designationId: candidate.hiringRequest.designationId,
        title: candidate.hiringRequest.title,
        departmentId: candidate.hiringRequest.departmentId,
        employmentRole: employmentRole || 'probation',
        joinDate: joinDate || new Date()
      });

      const empProfile = await prisma.employeeProfile.findUnique({
        where: { userId: targetUser.id }
      });
      if (empProfile) {
        updateData.employeeId = empProfile.id;
      }

      // Update corresponding open Vacancy count if present
      const matchingVacancy = await prisma.vacancy.findFirst({
        where: {
          organizationId,
          departmentId: candidate.hiringRequest.departmentId,
          designation: { equals: candidate.hiringRequest.title, mode: 'insensitive' },
          status: 'open'
        }
      });
      if (matchingVacancy) {
        const nextFilled = (matchingVacancy.filled || 0) + 1;
        await prisma.vacancy.update({
          where: { id: matchingVacancy.id },
          data: {
            filled: nextFilled,
            ...(nextFilled >= (matchingVacancy.count || 1) ? { status: 'closed' } : {})
          }
        });
      }
    }

    candidate = await prisma.candidate.update({
      where: { id },
      data: updateData,
      include: { hiringRequest: true }
    });

    // Check if all requested positions in the HiringRequest are now joined/completed
    if (status === 'joined' && candidate.hiringRequest) {
      const joinedCount = await prisma.candidate.count({
        where: {
          hiringRequestId: candidate.hiringRequestId,
          status: { in: ['joined', 'appointment_sent', 'induction_pending', 'induction_completed', 'completed'] as any }
        }
      });
      if (joinedCount >= (candidate.hiringRequest.count || 1)) {
        await prisma.hiringRequest.update({
          where: { id: candidate.hiringRequestId },
          data: { status: 'completed' as any }
        });
      }
    }

    res.json({ success: true, data: candidate });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Manager API: Get Hiring Requests by Requester / Department
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

export const getMyDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const candidate = await prisma.candidate.findFirst({
      where: { email: req.user.email }
    });
    res.json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
};
