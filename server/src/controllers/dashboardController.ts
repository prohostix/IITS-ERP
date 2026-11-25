// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getBranchScope, getBranchScopeByBranchId, getAllBranchesScope } from '../utils/branchScope.js';

export const getDashboardMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organizationId = req.user.organizationId;
  const role = req.user.role;
  const sessionId = req.query.sessionId as string | undefined;
  const branchId = req.query.branchId as string | undefined;

  const metrics: any = {};

  if (role === 'superadmin') {
    metrics.totalOrganizations = await prisma.organization.count();
    metrics.activeOrganizations = await prisma.organization.count({ where: { status: 'active' as any } });

    const superStudentWhere: any = {};
    if (sessionId && sessionId !== 'all') {
      superStudentWhere.OR = [
        { sessionId: sessionId },
        { enrollments: { some: { sessionId: sessionId } } }
      ];
    }
    const [sTotal, sActive, sPending, sHold, sDropout, sRejected] = await Promise.all([
      prisma.student.count({ where: superStudentWhere }),
      prisma.student.count({ where: { ...superStudentWhere, status: 'active' } }),
      prisma.student.count({ where: { ...superStudentWhere, status: 'pending' } }),
      prisma.student.count({ where: { ...superStudentWhere, status: 'hold' } }),
      prisma.student.count({ where: { ...superStudentWhere, status: 'dropout' } }),
      prisma.student.count({ where: { ...superStudentWhere, status: { in: ['rejected', 'rejected_by_university'] } } })
    ]);
    metrics.totalStudents = sTotal;
    metrics.studentsActive = sActive;
    metrics.studentsPending = sPending;
    metrics.studentsHold = sHold;
    metrics.studentsDropout = sDropout;
    metrics.studentsRejected = sRejected;
    metrics.studentCounts = {
      total: sTotal,
      active: sActive,
      pending: sPending,
      hold: sHold,
      dropout: sDropout,
      rejected: sRejected
    };

    const [cTotal, cActive, cPending, cDeactive] = await Promise.all([
      prisma.studyCenter.count(),
      prisma.studyCenter.count({ where: { status: 'active' as any } }),
      prisma.studyCenter.count({ where: { status: { in: ['pending_verification', 'pending', 'pending_payment'] } as any } }),
      prisma.studyCenter.count({ where: { status: { in: ['inactive', 'suspended', 'deactive', 'rejected'] } as any } })
    ]);
    metrics.totalCenters = cTotal;
    metrics.activeCenters = cActive;
    metrics.centersActive = cActive;
    metrics.pendingCenters = cPending;
    metrics.centersPending = cPending;
    metrics.deactiveCenters = cDeactive;
    metrics.centersDeactive = cDeactive;
    metrics.centerCounts = {
      total: cTotal,
      active: cActive,
      pending: cPending,
      deactive: cDeactive
    };
  }

  if (role !== 'superadmin') {
    metrics.totalEmployees = await prisma.user.count({
      where: { 
        organizationId: organizationId, 
        status: 'active',
        NOT: { role: { in: ['student', 'center_admin', 'superadmin'] } } 
      }
    });

    const studentWhere: any = { organizationId: organizationId };
    const enrollmentWhere: any = { organizationId: organizationId };
    const centerWhere: any = { organizationId: organizationId };
    const studentAnd: any[] = [];

    if (sessionId && sessionId !== 'all') {
      studentAnd.push({
        OR: [
          { sessionId: sessionId },
          { enrollments: { some: { sessionId: sessionId } } }
        ]
      });
      enrollmentWhere.sessionId = sessionId;
    }

    const GLOBAL_ROLES = ['superadmin', 'org_admin', 'ceo', 'general_manager', 'project_manager'];
    const userAssignedBranchId = !GLOBAL_ROLES.includes(role)
      ? (req.user.branchId || req.user.designationRef?.branchId || null)
      : null;

    if (role === 'branch_manager' || Boolean(req.user.managedBranch)) {
      const scope = await getBranchScope(req.user);
      studentAnd.push({
        OR: [
          { centerId: { in: scope.centerIds } },
          { enrollments: { some: { studyCenterId: { in: scope.centerIds } } } }
        ]
      });
      enrollmentWhere.studyCenterId = { in: scope.centerIds };
      centerWhere.id = { in: scope.centerIds };
    } else if (userAssignedBranchId) {
      const scope = await getBranchScopeByBranchId(organizationId, userAssignedBranchId);
      studentAnd.push({
        OR: [
          { centerId: { in: scope.centerIds } },
          { enrollments: { some: { studyCenterId: { in: scope.centerIds } } } }
        ]
      });
      enrollmentWhere.studyCenterId = { in: scope.centerIds };
      centerWhere.id = { in: scope.centerIds };
    } else if (branchId && branchId !== 'all') {
      const scope = await getBranchScopeByBranchId(organizationId, branchId);
      studentAnd.push({
        OR: [
          { centerId: { in: scope.centerIds } },
          { enrollments: { some: { studyCenterId: { in: scope.centerIds } } } }
        ]
      });
      enrollmentWhere.studyCenterId = { in: scope.centerIds };
      centerWhere.id = { in: scope.centerIds };
    }

    if (studentAnd.length > 0) {
      studentWhere.AND = studentAnd;
    }

    const [
      totalStudents,
      studentsActive,
      studentsPending,
      studentsHold,
      studentsDropout,
      studentsRejected
    ] = await Promise.all([
      prisma.student.count({ where: studentWhere }),
      prisma.student.count({ where: { ...studentWhere, status: 'active' } }),
      prisma.student.count({ where: { ...studentWhere, status: 'pending' } }),
      prisma.student.count({ where: { ...studentWhere, status: 'hold' } }),
      prisma.student.count({ where: { ...studentWhere, status: 'dropout' } }),
      prisma.student.count({ where: { ...studentWhere, status: { in: ['rejected', 'rejected_by_university'] } } })
    ]);

    metrics.totalStudents = totalStudents;
    metrics.studentsActive = studentsActive;
    metrics.studentsPending = studentsPending;
    metrics.studentsHold = studentsHold;
    metrics.studentsDropout = studentsDropout;
    metrics.studentsRejected = studentsRejected;
    metrics.studentCounts = {
      total: totalStudents,
      active: studentsActive,
      pending: studentsPending,
      hold: studentsHold,
      dropout: studentsDropout,
      rejected: studentsRejected
    };

    const [totalCenters, centersActive, centersPending, centersDeactive] = await Promise.all([
      prisma.studyCenter.count({ where: centerWhere }),
      prisma.studyCenter.count({ where: { ...centerWhere, status: 'active' as any } }),
      prisma.studyCenter.count({ where: { ...centerWhere, status: { in: ['pending_verification', 'pending', 'pending_payment'] } as any } }),
      prisma.studyCenter.count({ where: { ...centerWhere, status: { in: ['inactive', 'suspended', 'deactive', 'rejected'] } as any } })
    ]);
    metrics.totalCenters = totalCenters;
    metrics.activeCenters = centersActive;
    metrics.centersActive = centersActive;
    metrics.pendingCenters = centersPending;
    metrics.centersPending = centersPending;
    metrics.deactiveCenters = centersDeactive;
    metrics.centersDeactive = centersDeactive;
    metrics.centerCounts = {
      total: totalCenters,
      active: centersActive,
      pending: centersPending,
      deactive: centersDeactive
    };

    metrics.totalDepartments = await prisma.department.count({ where: { organizationId: organizationId } });
    metrics.totalPrograms = await prisma.program.count({ where: { organizationId: organizationId } });
    metrics.totalOrganizations = await prisma.university.count({ where: { organizationId: organizationId } });
    
    // Pipeline stats with accurate enrollment statuses in the system
    metrics.totalLeads = await prisma.lead.count({ where: { organizationId: organizationId } });
    metrics.pendingApplications = await prisma.enrollment.count({ 
      where: { ...enrollmentWhere, status: { in: ['pending_doc_review', 'document_review', 'submitted'] } as any } 
    });
    metrics.verifiedApplications = await prisma.enrollment.count({ 
      where: { ...enrollmentWhere, status: { in: ['pending_finance_review', 'finance_review', 'approved', 'verified'] } as any } 
    });
    metrics.enrolledStudents = await prisma.enrollment.count({ 
      where: { ...enrollmentWhere, status: { in: ['enrolled', 'confirmed'] } as any } 
    });
    metrics.rejectedApplications = await prisma.enrollment.count({
      where: { ...enrollmentWhere, status: 'rejected' as any }
    });

    // Compute per-branch breakdown for global Project Manager / Operations Admin / CEO (not branch-scoped staff)
    if (!userAssignedBranchId && ['general_manager', 'project_manager', 'ops_admin', 'ops_sub_admin', 'ceo', 'org_admin'].includes(role)) {
      const allBranches = await getAllBranchesScope(organizationId);
      const branchBreakdown = await Promise.all(allBranches.branches.map(async (b: any) => {
        const bScope = allBranches.branchScopes[b.id];
        const cIds = bScope?.centerIds || [];
        const bStudentAnd: any[] = [{
          OR: [
            { centerId: { in: cIds } },
            { enrollments: { some: { studyCenterId: { in: cIds } } } }
          ]
        }];
        const bEnrollmentWhere: any = { organizationId, studyCenterId: { in: cIds } };
        if (sessionId && sessionId !== 'all') {
          bStudentAnd.push({
            OR: [
              { sessionId },
              { enrollments: { some: { sessionId } } }
            ]
          });
          bEnrollmentWhere.sessionId = sessionId;
        }
        const bStudentWhere = { organizationId, AND: bStudentAnd };
        const bCenterWhere = { organizationId, id: { in: cIds } };

        const [bTotalStudents, bActiveStudents, bPendingStudents, bHoldStudents, bDropoutStudents, bRejectedStudents, bTotalCenters, bActiveCenters, bPendingCenters, bPendingReviews, bEnrolled] = await Promise.all([
          prisma.student.count({ where: bStudentWhere }),
          prisma.student.count({ where: { ...bStudentWhere, status: 'active' } }),
          prisma.student.count({ where: { ...bStudentWhere, status: 'pending' } }),
          prisma.student.count({ where: { ...bStudentWhere, status: 'hold' } }),
          prisma.student.count({ where: { ...bStudentWhere, status: 'dropout' } }),
          prisma.student.count({ where: { ...bStudentWhere, status: { in: ['rejected', 'rejected_by_university'] } } }),
          prisma.studyCenter.count({ where: bCenterWhere }),
          prisma.studyCenter.count({ where: { ...bCenterWhere, status: 'active' as any } }),
          prisma.studyCenter.count({ where: { ...bCenterWhere, status: { in: ['pending_verification', 'pending', 'pending_payment'] } as any } }),
          prisma.enrollment.count({ where: { ...bEnrollmentWhere, status: { in: ['pending_doc_review', 'document_review', 'submitted'] } as any } }),
          prisma.enrollment.count({ where: { ...bEnrollmentWhere, status: { in: ['enrolled', 'confirmed'] } as any } })
        ]);

        return {
          branchId: b.id,
          branchName: b.name,
          branchCode: b.code,
          totalStudents: bTotalStudents,
          activeStudents: bActiveStudents,
          pendingStudents: bPendingStudents,
          holdStudents: bHoldStudents,
          dropoutStudents: bDropoutStudents,
          rejectedStudents: bRejectedStudents,
          totalCenters: bTotalCenters,
          activeCenters: bActiveCenters,
          pendingCenters: bPendingCenters,
          pendingReviews: bPendingReviews,
          enrolledStudents: bEnrolled
        };
      }));
      metrics.branchBreakdown = branchBreakdown;
    }

    // Urgent actions for Operations and Admins
    const urgentActions = [];
    if (metrics.pendingApplications > 0) {
      urgentActions.push({
        type: 'warning',
        title: 'Pending Enrollments Review',
        desc: `${metrics.pendingApplications} student enrollment(s) are pending document verification.`,
        btnText: 'Review Now',
        tab: 'enrollment_review'
      });
    }
    if (metrics.pendingCenters > 0) {
      urgentActions.push({
        type: 'error',
        title: 'Study Center Verifications',
        desc: `${metrics.pendingCenters} center affiliation request(s) awaiting verification.`,
        btnText: 'Verify Centers',
        tab: 'pending_verification'
      });
    }
    metrics.urgentActions = urgentActions;
  }

  if (['hr_admin', 'ceo', 'org_admin'].includes(role)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    metrics.presentToday = await prisma.attendance.count({ 
      where: { 
        organizationId: organizationId, 
        date: { gte: today, lte: endOfDay }, 
        status: { in: ['present', 'late', 'half_day'] as any } 
      } 
    });

    metrics.onLeave = await prisma.leaveRequest.count({
      where: {
        organizationId: organizationId,
        status: 'approved' as any,
        startDate: { lte: endOfDay },
        endDate: { gte: today }
      }
    });
    
    metrics.absentToday = Math.max(0, (metrics.totalEmployees || 0) - metrics.presentToday - metrics.onLeave);

    metrics.pendingLeaves = await prisma.leaveRequest.count({ where: { organizationId: organizationId, status: 'pending' as any } });
    metrics.pendingHRTada = await prisma.expenseClaim.count({ where: { organizationId: organizationId, status: 'pending' as any } });
    metrics.totalVacancies = await prisma.vacancy.count({ where: { organizationId: organizationId, status: 'open' as any } });
  }

  if (['finance_admin', 'finance', 'ceo', 'org_admin'].includes(role)) {
    const enrollments = await prisma.enrollment.findMany({
      where: { organizationId: organizationId },
      select: { totalFee: true, payment: { select: { amount: true } }, status: true }
    });
    const totalEnrollmentFee = enrollments.reduce((sum, e) => sum + (e.totalFee || 0), 0);
    const totalEnrollmentCollected = enrollments.reduce((sum, e) => sum + (e.payment?.amount || (e.status === 'enrolled' ? (e.totalFee || 0) : 0)), 0);

    const invoices = await prisma.invoice.findMany({ where: { organizationId: organizationId, status: 'paid' as any }, select: { total: true } });
    const invoiceRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);

    metrics.totalRevenue = totalEnrollmentCollected + invoiceRevenue;
    metrics.totalReceivables = totalEnrollmentFee;
    metrics.pendingInvoices = await prisma.invoice.count({ where: { organizationId: organizationId, status: { in: ['draft', 'sent'] } } });
    metrics.totalPayments = enrollments.filter(e => e.payment?.amount || e.status === 'enrolled').length;
    metrics.pendingExpenses = await prisma.expenseClaim.count({ where: { organizationId: organizationId, status: 'hr_approved' as any } });
    metrics.pendingWalletTopUps = await prisma.walletTopUp.count({ where: { organizationId: organizationId, status: 'pending' as any } });
    metrics.pendingEnrollments = await prisma.enrollment.count({ where: { organizationId: organizationId, status: { in: ['pending_doc_review', 'document_review', 'pending_finance_review', 'payment_pending'] } } });
    metrics.pendingCenters = await prisma.studyCenter.count({ where: { organizationId: organizationId, status: 'pending_payment' as any } });
  }

  if (['sales_admin', 'sales_sub_admin', 'ceo'].includes(role)) {
    metrics.totalLeads = await prisma.lead.count({ where: { organizationId: organizationId } });
    metrics.convertedLeads = await prisma.lead.count({ where: { organizationId: organizationId, status: 'converted' as any } });
  }

  if (role !== 'superadmin') {
    const taskWhere: any = { organizationId: organizationId };
    if (role === 'employee') taskWhere.assignedTo = req.user.id;

    metrics.pendingTasks = await prisma.task.count({ where: { ...taskWhere, status: 'pending' as any } });
    metrics.completedTasks = await prisma.task.count({ where: { ...taskWhere, status: 'completed' as any } });
  }

  if (role === 'ceo') {
    metrics.activeEscalations = await prisma.escalation.count({ where: { organizationId: organizationId, status: 'active' as any } });
  }

  res.status(200).json({ success: true, data: metrics });
});
