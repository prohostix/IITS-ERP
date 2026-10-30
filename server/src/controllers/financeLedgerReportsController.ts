// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ══════════════════════════════════════════════════════════════════════════════
// 1. COMMISSION REPORT AGAINST UNIVERSITY
// ══════════════════════════════════════════════════════════════════════════════

export const getCommissionAgainstUniversityReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { universityId, status, dateFrom, dateTo, search } = req.query;
  const orgId = req.user.organizationId;

  // Build where conditions
  const where: any = { organizationId: orgId };
  if (status && status !== 'all') {
    where.status = status;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
    if (dateTo) where.createdAt.lte = new Date((dateTo as string) + 'T23:59:59.999Z');
  }

  const enrollmentConditions: any = {};
  if (universityId && universityId !== 'all') {
    enrollmentConditions.program = { universityId: universityId as string };
  }
  const { centerId } = req.query;
  if (centerId && centerId !== 'all') {
    enrollmentConditions.studyCenterId = centerId as string;
  }

  if (search) {
    const s = String(search).trim();
    enrollmentConditions.OR = [
      { studentName: { contains: s, mode: 'insensitive' } },
      { enrollmentNumber: { contains: s, mode: 'insensitive' } },
      { uniEnrollmentNumber: { contains: s, mode: 'insensitive' } },
      { studyCenter: { name: { contains: s, mode: 'insensitive' } } }
    ];
  }

  if (Object.keys(enrollmentConditions).length > 0) {
    where.enrollment = enrollmentConditions;
  }

  const commissionList = await prisma.commissionIn.findMany({
    where,
    include: {
      enrollment: {
        include: {
          program: {
            include: {
              university: { select: { id: true, name: true, code: true } }
            }
          },
          studyCenter: { select: { id: true, name: true, code: true } }
        }
      },
      commissionOuts: {
        include: {
          studyCenter: { select: { id: true, name: true, code: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Aggregations
  let totalExpectedCommission = 0;
  let totalReceivedCommission = 0;
  let totalTdsDeducted = 0;
  let totalNetReceived = 0;
  let totalPayoutToCenters = 0;
  let totalPayoutPaid = 0;

  const uniMap: Record<string, {
    universityId: string;
    universityName: string;
    universityCode: string;
    studentsCount: number;
    expectedCommission: number;
    receivedCommission: number;
    tdsDeducted: number;
    netReceived: number;
    pendingCommission: number;
    centerPayoutsExpected: number;
    centerPayoutsPaid: number;
    netRetained: number;
    collectionRate: number;
  }> = {};

  const details = commissionList.map(c => {
    const expected = Number(c.expectedAmount || 0);
    const received = Number(c.receivedAmount || 0);
    const pending = Math.max(0, expected - received);
    const tdsAmt = Number(c.tdsAmount || 0);
    const netAmt = c.netAmount !== null && c.netAmount !== undefined ? Number(c.netAmount) : (received - tdsAmt);

    totalExpectedCommission += expected;
    totalReceivedCommission += received;
    totalTdsDeducted += tdsAmt;
    totalNetReceived += netAmt;

    const payouts = c.commissionOuts || [];
    const centerOutExpected = payouts.reduce((sum, o) => sum + Number(o.amount || 0), 0);
    const centerOutPaid = payouts.filter(o => o.status === 'paid').reduce((sum, o) => sum + Number(o.netAmount || o.amount || 0), 0);

    totalPayoutToCenters += centerOutExpected;
    totalPayoutPaid += centerOutPaid;

    const uni = c.enrollment?.program?.university;
    const uId = uni?.id || 'unknown';
    const uName = uni?.name || 'Unassigned University';
    const uCode = uni?.code || 'N/A';

    if (!uniMap[uId]) {
      uniMap[uId] = {
        universityId: uId,
        universityName: uName,
        universityCode: uCode,
        studentsCount: 0,
        expectedCommission: 0,
        receivedCommission: 0,
        tdsDeducted: 0,
        netReceived: 0,
        pendingCommission: 0,
        centerPayoutsExpected: 0,
        centerPayoutsPaid: 0,
        netRetained: 0,
        collectionRate: 0
      };
    }

    uniMap[uId].studentsCount += 1;
    uniMap[uId].expectedCommission += expected;
    uniMap[uId].receivedCommission += received;
    uniMap[uId].tdsDeducted += tdsAmt;
    uniMap[uId].netReceived += netAmt;
    uniMap[uId].pendingCommission += pending;
    uniMap[uId].centerPayoutsExpected += centerOutExpected;
    uniMap[uId].centerPayoutsPaid += centerOutPaid;

    return {
      id: c.id,
      studentName: c.enrollment?.studentName || 'N/A',
      enrollmentNumber: c.enrollment?.enrollmentNumber || 'N/A',
      uniEnrollmentNumber: c.enrollment?.uniEnrollmentNumber || 'N/A',
      universityId: uId,
      universityName: uName,
      programId: c.enrollment?.programId,
      programName: c.enrollment?.program?.name || 'N/A',
      studyCenterId: c.enrollment?.studyCenterId,
      studyCenterName: c.enrollment?.studyCenter?.name || 'N/A',
      studyCenterCode: c.enrollment?.studyCenter?.code || '',
      expectedAmount: expected,
      receivedAmount: received,
      tdsPercentage: Number(c.tdsPercentage || 0),
      tdsAmount: tdsAmt,
      netAmount: netAmt,
      pendingAmount: pending,
      status: c.status,
      receivedAt: c.receivedAt,
      paymentDetails: c.paymentDetails,
      createdAt: c.createdAt,
      centerPayouts: payouts.map(p => ({
        id: p.id,
        studyCenterName: p.studyCenter?.name || 'N/A',
        amount: p.amount,
        tdsAmount: p.tdsAmount,
        netAmount: p.netAmount,
        status: p.status,
        paidAt: p.paidAt
      }))
    };
  });

  // Calculate rates for each university
  const universities = Object.values(uniMap).map(u => {
    u.netRetained = u.receivedCommission - u.centerPayoutsPaid;
    u.collectionRate = u.expectedCommission > 0 ? Math.round((u.receivedCommission / u.expectedCommission) * 100) : 0;
    return u;
  }).sort((a, b) => b.expectedCommission - a.expectedCommission);

  const totalPendingCommission = Math.max(0, totalExpectedCommission - totalReceivedCommission);
  const totalPayoutPending = Math.max(0, totalPayoutToCenters - totalPayoutPaid);
  const netOrganizationMargin = totalReceivedCommission - totalPayoutPaid;
  const realizationRate = totalExpectedCommission > 0 ? Math.round((totalReceivedCommission / totalExpectedCommission) * 100) : 0;

  res.json({
    success: true,
    data: {
      summary: {
        totalExpectedCommission,
        totalReceivedCommission,
        totalTdsDeducted,
        totalNetReceived,
        totalPendingCommission,
        totalPayoutToCenters,
        totalPayoutPaid,
        totalPayoutPending,
        netOrganizationMargin,
        realizationRate,
        totalRecords: details.length,
        universitiesCount: universities.length
      },
      universities,
      details
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. UNIVERSITY FEE PAYMENT REPORT
// ══════════════════════════════════════════════════════════════════════════════

export const getUniversityFeePaymentReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, universityId, centerId, programId, search, dateFrom, dateTo } = req.query;
  const orgId = req.user.organizationId;

  const whereClause: any = { organizationId: orgId };

  if (status && status !== 'all') {
    whereClause.status = status;
  }

  if (dateFrom || dateTo) {
    whereClause.createdAt = {};
    if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom as string);
    if (dateTo) whereClause.createdAt.lte = new Date((dateTo as string) + 'T23:59:59.999Z');
  }

  const studentConditions: any = {};

  if (universityId && universityId !== 'all') {
    studentConditions.program = { universityId: universityId as string };
  }
  if (centerId && centerId !== 'all') {
    studentConditions.centerId = centerId as string;
  }
  if (programId && programId !== 'all') {
    studentConditions.programId = programId as string;
  }
  if (search) {
    const s = String(search).trim();
    studentConditions.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { enrollmentNo: { contains: s, mode: 'insensitive' } },
      { uniEnrollmentNumber: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } }
    ];
  }

  if (Object.keys(studentConditions).length > 0) {
    whereClause.student = studentConditions;
  }

  const rawPayments = await prisma.universityFeePayment.findMany({
    where: whereClause,
    include: {
      student: {
        include: {
          program: {
            include: {
              university: { select: { id: true, name: true, code: true } }
            }
          },
          center: { select: { id: true, name: true, code: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate summaries
  let totalPayable = 0;
  let totalPaid = 0;
  let totalPending = 0;
  const uniqueStudents = new Set<string>();

  const uniSummaryMap: Record<string, {
    universityId: string;
    universityName: string;
    universityCode: string;
    studentsCount: Set<string>;
    totalPayable: number;
    totalPaid: number;
    pendingAmount: number;
    paidCount: number;
    pendingCount: number;
    paymentRate: number;
  }> = {};

  const payments = rawPayments.map(p => {
    const amt = Number(p.amount || 0);
    totalPayable += amt;
    if (p.status === 'paid') {
      totalPaid += amt;
    } else {
      totalPending += amt;
    }

    if (p.studentId) uniqueStudents.add(p.studentId);

    const uni = p.student?.program?.university;
    const uId = uni?.id || 'unknown';
    const uName = uni?.name || 'Unassigned University';
    const uCode = uni?.code || 'N/A';

    if (!uniSummaryMap[uId]) {
      uniSummaryMap[uId] = {
        universityId: uId,
        universityName: uName,
        universityCode: uCode,
        studentsCount: new Set<string>(),
        totalPayable: 0,
        totalPaid: 0,
        pendingAmount: 0,
        paidCount: 0,
        pendingCount: 0,
        paymentRate: 0
      };
    }

    if (p.studentId) uniSummaryMap[uId].studentsCount.add(p.studentId);
    uniSummaryMap[uId].totalPayable += amt;
    if (p.status === 'paid') {
      uniSummaryMap[uId].totalPaid += amt;
      uniSummaryMap[uId].paidCount += 1;
    } else {
      uniSummaryMap[uId].pendingAmount += amt;
      uniSummaryMap[uId].pendingCount += 1;
    }

    return {
      id: p.id,
      studentId: p.studentId,
      studentName: p.student?.name || 'N/A',
      enrollmentNo: p.student?.enrollmentNo || 'N/A',
      uniEnrollmentNumber: p.student?.uniEnrollmentNumber || 'N/A',
      studentEmail: p.student?.email || '',
      studentPhone: p.student?.phone || '',
      universityId: uId,
      universityName: uName,
      programId: p.student?.programId,
      programName: p.student?.program?.name || 'N/A',
      centerId: p.student?.centerId,
      centerName: p.student?.center?.name || 'N/A',
      centerCode: p.student?.center?.code || '',
      semesterOrYear: p.semesterOrYear,
      amount: amt,
      status: p.status,
      referenceNo: p.referenceNo,
      paidAt: p.paidAt,
      screenshot: p.screenshot,
      createdAt: p.createdAt
    };
  });

  const universities = Object.values(uniSummaryMap).map(u => ({
    universityId: u.universityId,
    universityName: u.universityName,
    universityCode: u.universityCode,
    studentsCount: u.studentsCount.size,
    totalPayable: u.totalPayable,
    totalPaid: u.totalPaid,
    pendingAmount: u.pendingAmount,
    paidCount: u.paidCount,
    pendingCount: u.pendingCount,
    paymentRate: u.totalPayable > 0 ? Math.round((u.totalPaid / u.totalPayable) * 100) : 0
  })).sort((a, b) => b.totalPayable - a.totalPayable);

  const completionRate = totalPayable > 0 ? Math.round((totalPaid / totalPayable) * 100) : 0;

  res.json({
    success: true,
    data: {
      summary: {
        totalPayable,
        totalPaid,
        totalPending,
        studentCount: uniqueStudents.size,
        recordsCount: payments.length,
        completionRate,
        universitiesCount: universities.length
      },
      universities,
      payments
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. RE-REGISTRATION FEE PAYMENT REPORT
// ══════════════════════════════════════════════════════════════════════════════

export const getReregPaymentReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { universityId, centerId, programId, search, status, dateFrom, dateTo } = req.query;
  const orgId = req.user.organizationId;

  // 1. Fetch completed re-registration invoices
  const invoiceWhere: any = {
    organizationId: orgId,
    studentId: { not: null },
    status: 'paid'
  };

  if (centerId && centerId !== 'all') {
    invoiceWhere.centerId = centerId as string;
  }

  if (dateFrom || dateTo) {
    invoiceWhere.createdAt = {};
    if (dateFrom) invoiceWhere.createdAt.gte = new Date(dateFrom as string);
    if (dateTo) invoiceWhere.createdAt.lte = new Date((dateTo as string) + 'T23:59:59.999Z');
  }

  const invoices = await prisma.invoice.findMany({
    where: invoiceWhere,
    include: {
      student: {
        include: {
          program: {
            include: {
              university: { select: { id: true, name: true, code: true } }
            }
          },
          center: { select: { id: true, name: true, code: true, branchName: true } }
        }
      },
      payments: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const completedRecords: any[] = [];
  let totalCollected = 0;

  for (const inv of invoices) {
    let items: any[] = [];
    if (typeof inv.items === 'string') {
      try { items = JSON.parse(inv.items); } catch (e) { items = []; }
    } else if (Array.isArray(inv.items)) {
      items = inv.items;
    }

    // Filter items representing re-registrations (Sem 2+, Year 2+)
    const reregItems = items.filter(it => {
      const desc = String(it.description || '').toLowerCase();
      return (desc.includes('semester') || desc.includes('year') || desc.includes('re-reg')) &&
             !desc.includes('semester 1') && !desc.includes('year 1');
    });

    // If whole invoice was designated for re-registration or has rereg items
    const targetItems = reregItems.length > 0 ? reregItems : (
      items.length === 1 && String(items[0]?.description || '').toLowerCase().includes('re') ? items : []
    );

    if (targetItems.length > 0) {
      for (const item of targetItems) {
        const itemAmount = Number(item.amount || inv.total || inv.amount);
        totalCollected += itemAmount;

        const match = (item.description || '').match(/(Semester|Year)\s+\d+/i);
        const installmentName = match ? match[0] : (item.description || 'Re-Registration Fee');

        completedRecords.push({
          id: `${inv.id}-${item.id || Math.random()}`,
          invoiceId: inv.id,
          invoiceNo: inv.invoiceNo,
          studentId: inv.studentId,
          studentName: inv.student?.name || 'N/A',
          enrollmentNumber: inv.student?.enrollmentNo || 'N/A',
          uniEnrollmentNumber: inv.student?.uniEnrollmentNumber || 'N/A',
          studentEmail: inv.student?.email || '',
          studentPhone: inv.student?.phone || '',
          universityId: inv.student?.program?.university?.id,
          universityName: inv.student?.program?.university?.name || 'Unassigned University',
          programId: inv.student?.programId,
          programName: inv.student?.program?.name || 'N/A',
          centerId: inv.centerId,
          centerName: inv.student?.center?.name || 'N/A',
          branchName: inv.student?.center?.branchName || '',
          installment: installmentName,
          amount: itemAmount,
          status: 'completed',
          paidDate: inv.paidAt || inv.createdAt,
          paymentMethod: inv.payments?.[0]?.method || 'Online/Wallet',
          referenceNo: inv.payments?.[0]?.referenceNo || inv.invoiceNo
        });
      }
    }
  }

  // 2. Fetch pending re-registrations
  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: orgId,
      status: { in: ['enrolled', 'approved'] },
      ...(universityId && universityId !== 'all' ? { program: { universityId: universityId as string } } : {}),
      ...(centerId && centerId !== 'all' ? { studyCenterId: centerId as string } : {}),
      ...(programId && programId !== 'all' ? { programId: programId as string } : {})
    },
    include: {
      program: {
        include: {
          university: { select: { id: true, name: true, code: true } }
        }
      },
      studyCenter: { select: { id: true, name: true, code: true, branchName: true } },
      session: { select: { id: true, name: true } },
      studentFeeReceipts: true
    }
  });

  const pendingRecords: any[] = [];
  let totalPendingAmount = 0;

  // Pre-fetch all fee structures to eliminate N+1 queries
  const allFeeStructures = await prisma.programFeeStructure.findMany({
    where: { organizationId: orgId }
  });
  const feeStructureMap = new Map<string, any[]>();
  for (const fs of allFeeStructures) {
    if (fs.programId) {
      if (!feeStructureMap.has(fs.programId)) feeStructureMap.set(fs.programId, []);
      feeStructureMap.get(fs.programId)!.push(fs);
    }
  }

  for (const enr of enrollments) {
    const feeStructures = feeStructureMap.get(enr.programId) || [];
    const feeStruct = feeStructures.find(f => f.admissionSessionId === enr.sessionId) || feeStructures[0];
    if (!feeStruct) continue;

    let breakdowns: any[] = [];
    if (typeof feeStruct.feeBreakdown === 'string') {
      try { breakdowns = JSON.parse(feeStruct.feeBreakdown); } catch (e) {}
    } else if (Array.isArray(feeStruct.feeBreakdown)) {
      breakdowns = feeStruct.feeBreakdown;
    }

    // Subsequent semesters / years
    for (let i = 1; i < breakdowns.length; i++) {
      const b = breakdowns[i];
      const semNum = i + 1;
      const semLabel = (feeStruct.billingCycle === 'per_year' ? 'Year ' : 'Semester ') + semNum;

      // Check if already paid in completedRecords
      const alreadyPaidInInvoices = completedRecords.some(c => 
        (c.enrollmentNumber === enr.enrollmentNumber || c.studentId === enr.studentId) &&
        c.installment.toLowerCase().includes(semLabel.toLowerCase())
      );

      const matchingReceipt = (enr.studentFeeReceipts || []).find((r: any) =>
        (r.remarks || '').toLowerCase().includes(semLabel.toLowerCase())
      );

      const semFee = Number(b.baseFee || b.tuitionFee || 0) + Number(b.examFee || 0);

      if (matchingReceipt && !alreadyPaidInInvoices) {
        completedRecords.push({
          id: `rcpt-${matchingReceipt.id}`,
          invoiceId: matchingReceipt.id,
          invoiceNo: matchingReceipt.referenceNo || `RCPT-${matchingReceipt.id.slice(0, 8)}`,
          studentId: enr.studentId,
          studentName: enr.studentName,
          enrollmentNumber: enr.enrollmentNumber || 'N/A',
          uniEnrollmentNumber: enr.uniEnrollmentNumber || 'N/A',
          studentEmail: enr.studentEmail,
          studentPhone: enr.studentPhone,
          universityId: enr.program?.university?.id,
          universityName: enr.program?.university?.name || 'Unassigned University',
          programId: enr.programId,
          programName: enr.program?.name || 'N/A',
          centerId: enr.studyCenterId,
          centerName: enr.studyCenter?.name || 'N/A',
          branchName: enr.studyCenter?.branchName || '',
          installment: semLabel,
          amount: Number(matchingReceipt.amount || semFee),
          status: 'completed',
          paidDate: matchingReceipt.receiptDate || matchingReceipt.createdAt,
          paymentMethod: matchingReceipt.paymentMode || 'Direct / Receipt',
          referenceNo: matchingReceipt.referenceNo || 'Receipt'
        });
        totalCollected += Number(matchingReceipt.amount || semFee);
      } else if (!alreadyPaidInInvoices) {
        totalPendingAmount += semFee;

        pendingRecords.push({
          id: `pending-${enr.id}-${semNum}`,
          enrollmentId: enr.id,
          studentId: enr.studentId,
          studentName: enr.studentName,
          enrollmentNumber: enr.enrollmentNumber || 'N/A',
          uniEnrollmentNumber: enr.uniEnrollmentNumber || 'N/A',
          studentEmail: enr.studentEmail,
          studentPhone: enr.studentPhone,
          universityId: enr.program?.university?.id,
          universityName: enr.program?.university?.name || 'Unassigned University',
          programId: enr.programId,
          programName: enr.program?.name || 'N/A',
          centerId: enr.studyCenterId,
          centerName: enr.studyCenter?.name || 'N/A',
          branchName: enr.studyCenter?.branchName || '',
          installment: semLabel,
          amount: semFee,
          status: 'pending',
          dueDate: null
        });
      }
    }
  }

  // Filter completed and pending by university, program, center, search, status
  let filteredCompleted = completedRecords;
  let filteredPending = pendingRecords;

  if (universityId && universityId !== 'all') {
    filteredCompleted = filteredCompleted.filter(r => r.universityId === universityId);
    filteredPending = filteredPending.filter(r => r.universityId === universityId);
  }

  if (programId && programId !== 'all') {
    filteredCompleted = filteredCompleted.filter(r => r.programId === programId);
    filteredPending = filteredPending.filter(r => r.programId === programId);
  }

  if (centerId && centerId !== 'all') {
    filteredCompleted = filteredCompleted.filter(r => r.centerId === centerId);
    filteredPending = filteredPending.filter(r => r.centerId === centerId);
  }

  if (search) {
    const s = String(search).toLowerCase();
    const matchesSearch = (r: any) =>
      (r.studentName || '').toLowerCase().includes(s) ||
      (r.enrollmentNumber || '').toLowerCase().includes(s) ||
      (r.uniEnrollmentNumber || '').toLowerCase().includes(s) ||
      (r.centerName || '').toLowerCase().includes(s);

    filteredCompleted = filteredCompleted.filter(matchesSearch);
    filteredPending = filteredPending.filter(matchesSearch);
  }

  // Calculate filtered totals for KPI summary cards
  const totalCollectedFiltered = filteredCompleted.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalPendingAmountFiltered = filteredPending.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  // Group by University
  const uniSummaryMap: Record<string, {
    universityId: string;
    universityName: string;
    totalCollected: number;
    totalPending: number;
    completedCount: number;
    pendingCount: number;
  }> = {};

  filteredCompleted.forEach(r => {
    const uId = r.universityId || 'unknown';
    if (!uniSummaryMap[uId]) {
      uniSummaryMap[uId] = {
        universityId: uId,
        universityName: r.universityName,
        totalCollected: 0,
        totalPending: 0,
        completedCount: 0,
        pendingCount: 0
      };
    }
    uniSummaryMap[uId].totalCollected += r.amount;
    uniSummaryMap[uId].completedCount += 1;
  });

  filteredPending.forEach(r => {
    const uId = r.universityId || 'unknown';
    if (!uniSummaryMap[uId]) {
      uniSummaryMap[uId] = {
        universityId: uId,
        universityName: r.universityName,
        totalCollected: 0,
        totalPending: 0,
        completedCount: 0,
        pendingCount: 0
      };
    }
    uniSummaryMap[uId].totalPending += r.amount;
    uniSummaryMap[uId].pendingCount += 1;
  });

  const universities = Object.values(uniSummaryMap).sort((a, b) => b.totalCollected - a.totalCollected);

  res.json({
    success: true,
    data: {
      summary: {
        totalCollected: totalCollectedFiltered,
        totalPendingAmount: totalPendingAmountFiltered,
        completedCount: filteredCompleted.length,
        pendingCount: filteredPending.length,
        totalStudentsCount: new Set([...filteredCompleted.map(r => r.enrollmentNumber), ...filteredPending.map(r => r.enrollmentNumber)]).size
      },
      universities,
      completedRecords: status === 'pending' ? [] : filteredCompleted,
      pendingRecords: status === 'completed' ? [] : filteredPending
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. STUDENT LEDGER
// ══════════════════════════════════════════════════════════════════════════════

export const getStudentLedgerList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { search, universityId, centerId, programId, status } = req.query;
  const orgId = req.user.organizationId;

  const where: any = { organizationId: orgId };

  if (req.user.role === 'center_admin' && req.user.studyCenterId) {
    where.studyCenterId = req.user.studyCenterId;
  } else if (centerId && centerId !== 'all') {
    where.studyCenterId = centerId as string;
  }
  if (programId && programId !== 'all') {
    where.programId = programId as string;
  }
  if (universityId && universityId !== 'all') {
    where.program = { universityId: universityId as string };
  }
  if (search) {
    const s = String(search).trim();
    where.OR = [
      { studentName: { contains: s, mode: 'insensitive' } },
      { enrollmentNumber: { contains: s, mode: 'insensitive' } },
      { uniEnrollmentNumber: { contains: s, mode: 'insensitive' } },
      { studentPhone: { contains: s, mode: 'insensitive' } },
      { studentEmail: { contains: s, mode: 'insensitive' } }
    ];
  }

  const enrollments = await prisma.enrollment.findMany({
    where,
    include: {
      program: {
        include: {
          university: { select: { id: true, name: true } },
          programFeeStructure: true
        }
      },
      studyCenter: { select: { id: true, name: true, code: true } },
      studentFeeReceipts: true,
      payment: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const studentsList = enrollments.map(enr => {
    const pfs = (enr.program?.programFeeStructure || (enr.program as any)?.programFeeStructures || []) as any[];
    const feeStruct = pfs.find(f => f.admissionSessionId === enr.sessionId && f.specialisation === enr.specialisation) ||
                      pfs.find(f => !f.admissionSessionId && f.specialisation === enr.specialisation) ||
                      pfs[0];

    const extraFees = (enr.extraFees as any[]) || [];
    const totalExtra = extraFees.reduce((s, f) => s + Number(f.amount || 0), 0);

    let breakdowns: any[] = [];
    if (typeof feeStruct?.feeBreakdown === 'string') {
      try { breakdowns = JSON.parse(feeStruct.feeBreakdown); } catch (e) {}
    } else if (Array.isArray(feeStruct?.feeBreakdown)) {
      breakdowns = feeStruct.feeBreakdown;
    }

    let fullFee = 0;
    if (enr.paymentType === 'full_payment') {
      fullFee = Number(feeStruct?.fullProgramFee || 0);
    } else if (breakdowns.length > 0) {
      fullFee = breakdowns.reduce((sum: number, b: any) => {
        const addFee = Array.isArray(b.additionalFees) ? b.additionalFees.reduce((s: number, f: any) => s + Number(f.amount || 0), 0) : 0;
        return sum + Number(b.baseFee || b.tuitionFee || 0) + Number(b.examFee || 0) + addFee;
      }, 0);
    }

    const baseProgramFee = fullFee > 0 ? fullFee : (Number(feeStruct?.baseFee || enr.totalFee || 0));
    const totalDebited = baseProgramFee + totalExtra;

    // Credits: receipts + initial wallet payment
    const manualReceipts = (enr.studentFeeReceipts || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    const walletPayment = (enr.paymentType === 'direct_to_university' ? 0 : Number(enr.totalFee || 0));
    const totalCredited = manualReceipts + walletPayment;
    const balance = totalDebited - totalCredited;

    let paymentStatus = 'pending';
    if (totalDebited === 0) paymentStatus = 'no_fee';
    else if (balance < 0) paymentStatus = 'advance';
    else if (balance === 0) paymentStatus = 'paid';
    else if (totalCredited > 0) paymentStatus = 'partial';

    return {
      id: enr.id,
      studentId: enr.studentId,
      studentName: enr.studentName,
      enrollmentNumber: enr.enrollmentNumber || 'N/A',
      uniEnrollmentNumber: enr.uniEnrollmentNumber || 'N/A',
      studentEmail: enr.studentEmail,
      studentPhone: enr.studentPhone,
      universityName: enr.program?.university?.name || 'Unassigned University',
      programName: enr.program?.name || 'N/A',
      studyCenterName: enr.studyCenter?.name || 'N/A',
      studyCenterCode: enr.studyCenter?.code || '',
      totalFee: totalDebited,
      totalPaid: totalCredited,
      balance,
      status: paymentStatus,
      receiptsCount: enr.studentFeeReceipts?.length || 0,
      admissionDate: enr.admissionDate || enr.createdAt,
      createdAt: enr.createdAt
    };
  });

  // Filter by status if specified
  let filtered = studentsList;
  if (status && status !== 'all') {
    filtered = filtered.filter(s => s.status === status);
  }

  const totalAssessed = filtered.reduce((s, x) => s + x.totalFee, 0);
  const totalCollected = filtered.reduce((s, x) => s + x.totalPaid, 0);
  const totalOutstanding = filtered.reduce((s, x) => s + Math.max(0, x.balance), 0);

  res.json({
    success: true,
    data: {
      summary: {
        totalStudents: filtered.length,
        totalAssessed,
        totalCollected,
        totalOutstanding,
        collectionRate: totalAssessed > 0 ? Math.round((totalCollected / totalAssessed) * 100) : 0
      },
      students: filtered
    }
  });
});

export const getStudentLedgerDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const where: any = {
    organizationId: orgId,
    OR: [
      { id },
      { studentId: id },
      { enrollmentNumber: id },
      { uniEnrollmentNumber: id }
    ]
  };

  if (req.user.role === 'center_admin' && req.user.studyCenterId) {
    where.studyCenterId = req.user.studyCenterId;
  }

  // Search by enrollmentId, studentId, or enrollment numbers
  const enrollment = await prisma.enrollment.findFirst({
    where,
    include: {
      program: {
        include: {
          university: true,
          programFeeStructure: true
        }
      },
      studyCenter: true,
      session: true,
      student: {
        include: {
          invoices: {
            include: { payments: true }
          }
        }
      },
      studentFeeReceipts: {
        include: { recorder: { select: { name: true } } },
        orderBy: { receiptDate: 'asc' }
      },
      payment: true
    }
  });

  if (!enrollment) {
    res.status(404).json({ success: false, message: 'Student / Enrollment record not found' });
    return;
  }

  const pfs = (enrollment.program?.programFeeStructure || (enrollment.program as any)?.programFeeStructures || []) as any[];
  const feeStruct = pfs.find(f => f.admissionSessionId === enrollment.sessionId && f.specialisation === enrollment.specialisation) ||
                    pfs.find(f => !f.admissionSessionId && f.specialisation === enrollment.specialisation) ||
                    pfs[0];

  const rawEntries: any[] = [];

  // 1. Initial Program / Admission Fee Assessment (Debit)
  const initialAdmissionDate = enrollment.admissionDate || enrollment.createdAt;
  let baseFee = Number(enrollment.totalFee || feeStruct?.baseFee || 0);

  let breakdowns: any[] = [];
  if (typeof feeStruct?.feeBreakdown === 'string') {
    try { breakdowns = JSON.parse(feeStruct.feeBreakdown); } catch (e) {}
  } else if (Array.isArray(feeStruct?.feeBreakdown)) {
    breakdowns = feeStruct.feeBreakdown;
  }

  if (enrollment.paymentType === 'full_payment' && feeStruct?.fullProgramFee) {
    rawEntries.push({
      date: initialAdmissionDate,
      type: 'debit',
      category: 'Tuition Fee',
      description: `Full Program Fee Assessment: ${enrollment.program?.name}`,
      referenceNo: enrollment.enrollmentNumber || 'ENR-FEE',
      paymentMode: 'System Assessed',
      amount: Number(feeStruct.fullProgramFee),
      remarks: 'Full program tuition fee'
    });
  } else if (breakdowns.length > 0) {
    // Add Semester 1 fee assessment
    const sem1 = breakdowns[0];
    const sem1Add = Array.isArray(sem1.additionalFees) ? sem1.additionalFees.reduce((s: number, f: any) => s + Number(f.amount || 0), 0) : 0;
    const sem1Total = Number(sem1.baseFee || sem1.tuitionFee || 0) + Number(sem1.examFee || 0) + sem1Add;
    const sem1Label = (feeStruct?.billingCycle === 'per_year' ? 'Year ' : 'Semester ') + '1';
    rawEntries.push({
      date: initialAdmissionDate,
      type: 'debit',
      category: `${sem1Label} Tuition`,
      description: `${sem1Label} Fee Assessment: ${enrollment.program?.name || 'Program'} (Base: ₹${sem1.baseFee || sem1.tuitionFee || 0}, Exam: ₹${sem1.examFee || 0}${sem1Add > 0 ? `, Additional: ₹${sem1Add}` : ''})`,
      referenceNo: enrollment.enrollmentNumber ? `${enrollment.enrollmentNumber}-TERM1` : 'TERM1',
      paymentMode: 'System Assessed',
      amount: sem1Total > 0 ? sem1Total : baseFee,
      remarks: 'Initial academic fee assessment'
    });

    // Add subsequent semesters/years if enrolled
    for (let i = 1; i < breakdowns.length; i++) {
      const sem = breakdowns[i];
      const semNum = i + 1;
      const semLabel = (feeStruct?.billingCycle === 'per_year' ? 'Year ' : 'Semester ') + semNum;
      const semAdd = Array.isArray(sem.additionalFees) ? sem.additionalFees.reduce((s: number, f: any) => s + Number(f.amount || 0), 0) : 0;
      const semTotal = Number(sem.baseFee || sem.tuitionFee || 0) + Number(sem.examFee || 0) + semAdd;

      // Subsequent semester due date estimation
      const semDate = new Date(initialAdmissionDate);
      const monthsToAdd = feeStruct?.billingCycle === 'per_year' ? i * 12 : i * 6;
      semDate.setMonth(semDate.getMonth() + monthsToAdd);

      rawEntries.push({
        date: semDate,
        type: 'debit',
        category: `${semLabel} Tuition`,
        description: `${semLabel} Fee Assessment (Base: ₹${sem.baseFee || sem.tuitionFee || 0}, Exam: ₹${sem.examFee || 0}${semAdd > 0 ? `, Additional: ₹${semAdd}` : ''})`,
        referenceNo: enrollment.enrollmentNumber ? `${enrollment.enrollmentNumber}-${semLabel.replace(/\s+/g, '')}` : `TERM${semNum}`,
        paymentMode: 'Scheduled Debit',
        amount: semTotal,
        remarks: `${semLabel} scheduled tuition fee`
      });
    }
  } else {
    rawEntries.push({
      date: initialAdmissionDate,
      type: 'debit',
      category: 'Program Fee',
      description: `Tuition Fee Assessment: ${enrollment.program?.name}`,
      referenceNo: enrollment.enrollmentNumber || 'ENR-FEE',
      paymentMode: 'System Assessed',
      amount: baseFee,
      remarks: 'Base program fee assessment'
    });
  }

  // 2. Extra Fees (Debits)
  const extraFees = (enrollment.extraFees as any[]) || [];
  extraFees.forEach((ef, idx) => {
    rawEntries.push({
      date: ef.date ? new Date(ef.date) : initialAdmissionDate,
      type: 'debit',
      category: 'Extra Fee',
      description: `Additional Charge: ${ef.reason || 'Extra fee'}`,
      referenceNo: `EXTRA-${idx + 1}`,
      paymentMode: 'System Assessed',
      amount: Number(ef.amount || 0),
      remarks: ef.reason || 'Additional academic/administrative fee'
    });
  });

  // 3. Initial Enrollment Payment (Credit)
  if (enrollment.payment) {
    rawEntries.push({
      date: enrollment.payment.debitedAt || enrollment.createdAt,
      type: 'credit',
      category: 'Enrollment Payment',
      description: `Study Center Wallet Payment for Admission (${enrollment.studyCenter?.name || 'Center'})`,
      referenceNo: `WALLET-PAY-${enrollment.payment.id.slice(0, 8)}`,
      paymentMode: 'Center Wallet',
      amount: Number(enrollment.payment.amount || enrollment.totalFee || 0),
      recordedBy: enrollment.studyCenter?.name || 'Study Center',
      remarks: 'Admission fee cleared via study center wallet'
    });
  } else if (enrollment.paymentType === 'direct_to_university') {
    rawEntries.push({
      date: enrollment.createdAt,
      type: 'credit',
      category: 'Direct University Payment',
      description: `Payment directly deposited to university`,
      referenceNo: 'DIRECT-UNI',
      paymentMode: 'Direct to University',
      amount: Number(enrollment.totalFee || 0),
      recordedBy: 'Direct / Student',
      remarks: 'Direct payment to university acknowledged'
    });
  } else if (Number(enrollment.totalFee || 0) > 0) {
    rawEntries.push({
      date: enrollment.createdAt,
      type: 'credit',
      category: 'Admission Fee Payment',
      description: `Admission fee payment acknowledged (${enrollment.studyCenter?.name || 'Center'})`,
      referenceNo: enrollment.enrollmentNumber || 'ADMISSION-PAID',
      paymentMode: 'Center Wallet / Admission',
      amount: Number(enrollment.totalFee || 0),
      recordedBy: enrollment.studyCenter?.name || 'Study Center',
      remarks: 'Admission fee processed on enrollment'
    });
  }

  // 4. Student Fee Receipts (Credits)
  (enrollment.studentFeeReceipts || []).forEach(r => {
    rawEntries.push({
      date: r.receiptDate || r.createdAt,
      type: 'credit',
      category: 'Fee Receipt',
      description: `Fee Receipt: ${r.remarks || 'Student fee installment'}`,
      referenceNo: r.referenceNo || `RCPT-${r.id.slice(0, 8)}`,
      paymentMode: r.paymentMode || 'Online',
      amount: Number(r.amount || 0),
      recordedBy: r.recorder?.name || 'Staff',
      remarks: r.remarks || 'Payment receipt recorded'
    });
  });

  // 5. Invoices & Payments if existing on Student record
  if (enrollment.student?.invoices) {
    for (const inv of enrollment.student.invoices) {
      if (inv.payments && inv.payments.length > 0) {
        inv.payments.forEach(p => {
          rawEntries.push({
            date: p.receivedAt || p.createdAt,
            type: 'credit',
            category: 'Invoice Payment',
            description: `Payment for Invoice ${inv.invoiceNo}`,
            referenceNo: p.referenceNo || inv.invoiceNo,
            paymentMode: p.method || 'Online',
            amount: Number(p.amount || 0),
            recordedBy: 'Finance / Accounts',
            remarks: p.notes || `Invoice ${inv.invoiceNo} payment`
          });
        });
      }
    }
  }

  // 6. Fee Refund Adjustments (Debits)
  if (enrollment.refundStatus === 'processed' && enrollment.refundAmount) {
    rawEntries.push({
      date: enrollment.updatedAt || new Date(),
      type: 'debit',
      category: 'Fee Refund',
      description: `Refund processed to student/center: ₹${enrollment.refundAmount}`,
      referenceNo: `REFUND-${enrollment.id.slice(0, 8)}`,
      paymentMode: 'Refund Adjustment',
      amount: Number(enrollment.refundAmount),
      recordedBy: 'Accounts',
      remarks: 'Processed enrollment fee refund'
    });
  }

  // Sort raw entries strictly chronologically ascending to calculate running balance
  rawEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  const ledgerEntries = rawEntries.map((e, idx) => {
    const amt = Number(e.amount || 0);
    let debit = 0;
    let credit = 0;

    if (e.type === 'debit') {
      debit = amt;
      totalDebit += amt;
      runningBalance += amt;
    } else {
      credit = amt;
      totalCredit += amt;
      runningBalance -= amt;
    }

    return {
      id: `entry-${idx + 1}`,
      date: e.date,
      type: e.type,
      category: e.category,
      description: e.description,
      referenceNo: e.referenceNo,
      paymentMode: e.paymentMode,
      debit,
      credit,
      runningBalance,
      recordedBy: e.recordedBy || 'System',
      remarks: e.remarks || ''
    };
  });

  res.json({
    success: true,
    data: {
      student: {
        id: enrollment.studentId || enrollment.id,
        enrollmentId: enrollment.id,
        name: enrollment.studentName,
        enrollmentNumber: enrollment.enrollmentNumber || 'N/A',
        uniEnrollmentNumber: enrollment.uniEnrollmentNumber || 'N/A',
        email: enrollment.studentEmail,
        phone: enrollment.studentPhone,
        address: enrollment.studentAddress,
        universityName: enrollment.program?.university?.name || 'Unassigned University',
        universityCode: enrollment.program?.university?.code || '',
        programName: enrollment.program?.name || 'N/A',
        programCode: enrollment.program?.code || '',
        sessionName: enrollment.session?.name || 'N/A',
        centerName: enrollment.studyCenter?.name || 'N/A',
        centerCode: enrollment.studyCenter?.code || '',
        centerBranch: enrollment.studyCenter?.branchName || '',
        admissionDate: enrollment.admissionDate || enrollment.createdAt,
        status: enrollment.status,
        specialisation: enrollment.specialisation || 'General'
      },
      summary: {
        totalDebit,
        totalCredit,
        closingBalance: runningBalance,
        status: runningBalance < 0 ? 'advance' : (runningBalance === 0 ? 'paid' : (totalCredit > 0 ? 'partial' : 'pending')),
        feeCompletionRate: totalDebit > 0 ? Math.min(100, Math.round((totalCredit / totalDebit) * 100)) : 100,
        transactionCount: ledgerEntries.length
      },
      ledgerEntries
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. CENTER LEDGER (STUDY CENTER LEDGER)
// ══════════════════════════════════════════════════════════════════════════════

export const getCenterLedgerList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { search } = req.query;
  const orgId = req.user.organizationId;

  const where: any = { organizationId: orgId };
  if (search) {
    const s = String(search).trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { code: { contains: s, mode: 'insensitive' } },
      { city: { contains: s, mode: 'insensitive' } },
      { coordinatorName: { contains: s, mode: 'insensitive' } }
    ];
  }

  const centers = await prisma.studyCenter.findMany({
    where,
    include: {
      wallet: true,
      walletTopUps: {
        where: { status: 'approved' }
      },
      enrollmentPayments: true,
      commissionOuts: {
        where: { status: 'paid' }
      }
    },
    orderBy: { name: 'asc' }
  });

  const centerList = centers.map(c => {
    const walletBalance = Number(c.wallet?.balance || 0);
    const totalTopUps = (c.walletTopUps || []).reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalEnrollmentDebits = (c.enrollmentPayments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalCommissionsEarned = (c.commissionOuts || []).reduce((s, co) => s + Number(co.netAmount || co.amount || 0), 0);

    return {
      centerId: c.id,
      centerName: c.name,
      code: c.code || 'N/A',
      branchName: c.branchName || '',
      city: c.city || '',
      state: c.state || '',
      coordinatorName: c.coordinatorName || '',
      phone: c.phone || '',
      email: c.email || '',
      walletBalance,
      totalCredits: totalTopUps + totalCommissionsEarned,
      totalDebits: totalEnrollmentDebits,
      totalTopUps,
      totalEnrollmentDebits,
      totalCommissionsEarned,
      transactionCount: (c.walletTopUps?.length || 0) + (c.enrollmentPayments?.length || 0) + (c.commissionOuts?.length || 0)
    };
  });

  const totalLiquidity = centerList.reduce((s, c) => s + c.walletBalance, 0);
  const totalTopUpsAll = centerList.reduce((s, c) => s + c.totalTopUps, 0);
  const totalDebitsAll = centerList.reduce((s, c) => s + c.totalDebits, 0);

  res.json({
    success: true,
    data: {
      summary: {
        totalCenters: centerList.length,
        totalLiquidity,
        totalTopUpsAll,
        totalDebitsAll
      },
      centers: centerList
    }
  });
});

export const getCenterLedgerDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { centerId } = req.params;
  const { dateFrom, dateTo, type, search } = req.query;
  const orgId = req.user.organizationId;

  if (req.user.role === 'center_admin' && req.user.studyCenterId && req.user.studyCenterId !== centerId) {
    res.status(403).json({ success: false, message: 'You can only view your own study center ledger' });
    return;
  }

  const center = await prisma.studyCenter.findFirst({
    where: { id: centerId, organizationId: orgId },
    include: { wallet: true }
  });

  if (!center) {
    res.status(404).json({ success: false, message: 'Study center not found' });
    return;
  }

  // 1. Approved Top-Ups (Credits)
  const topUps = await prisma.walletTopUp.findMany({
    where: {
      organizationId: orgId,
      studyCenterId: centerId,
      status: 'approved'
    },
    include: { verifier: { select: { name: true } } },
    orderBy: { verifiedAt: 'asc' }
  });

  // 2. Enrollment Debits
  const debits = await prisma.enrollmentPayment.findMany({
    where: {
      studyCenterId: centerId
    },
    include: {
      enrollment: {
        include: {
          program: { select: { name: true, code: true } }
        }
      }
    },
    orderBy: { debitedAt: 'asc' }
  });

  // 3. Student Invoices paid by wallet (Debits)
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      centerId: centerId,
      status: 'paid',
      studentId: { not: null }
    },
    include: {
      student: {
        include: { program: { select: { name: true } } }
      }
    },
    orderBy: { paidAt: 'asc' }
  });

  // 4. Commission Payouts Credited to Center (Credits)
  const commissions = await prisma.commissionOut.findMany({
    where: {
      organizationId: orgId,
      studyCenterId: centerId,
      status: 'paid'
    },
    include: {
      commissionIn: {
        include: {
          enrollment: { select: { studentName: true, enrollmentNumber: true } }
        }
      }
    },
    orderBy: { paidAt: 'asc' }
  });

  // Combine into raw entries
  const rawList: any[] = [];

  topUps.forEach(t => {
    rawList.push({
      id: `topup-${t.id}`,
      date: t.verifiedAt || t.createdAt,
      type: 'credit',
      category: 'Wallet Top-Up',
      description: `Wallet Top-Up via ${t.paymentMethod.toUpperCase()}`,
      reference: t.referenceNumber || 'N/A',
      amount: Number(t.amount || 0),
      method: t.paymentMethod,
      verifiedBy: t.verifier?.name || 'Finance Admin',
      remarks: t.remarks || 'Top-up approved & credited to wallet'
    });
  });

  debits.forEach(d => {
    rawList.push({
      id: `enr-${d.id}`,
      date: d.debitedAt || d.createdAt,
      type: 'debit',
      category: 'Student Enrollment Debit',
      description: `Enrollment Fee: ${d.enrollment?.studentName || 'Student'} (${d.enrollment?.program?.name || 'Program'})`,
      reference: d.enrollment?.enrollmentNumber || 'ENR-DEBIT',
      amount: Number(d.amount || 0),
      method: 'wallet_debit',
      verifiedBy: 'System',
      remarks: `Student Enrollment ${d.enrollment?.enrollmentNumber || ''}`
    });
  });

  invoices.forEach(inv => {
    // Avoid double counting if already in debits
    const alreadyCounted = debits.some(d => d.enrollmentId === inv.id);
    if (!alreadyCounted) {
      rawList.push({
        id: `inv-${inv.id}`,
        date: inv.paidAt || inv.createdAt,
        type: 'debit',
        category: 'Student Fee Invoice',
        description: `Student Fee: ${inv.student?.name || 'Student'} (${inv.student?.program?.name || 'Program'})`,
        reference: inv.invoiceNo,
        amount: Number(inv.total || inv.amount || 0),
        method: 'wallet_debit',
        verifiedBy: 'System',
        remarks: `Invoice ${inv.invoiceNo}`
      });
    }
  });

  commissions.forEach(co => {
    rawList.push({
      id: `comm-${co.id}`,
      date: co.paidAt || co.createdAt,
      type: 'credit',
      category: 'Commission Payout',
      description: `Commission Payout: ${co.commissionIn?.enrollment?.studentName || 'Student'} (${co.commissionIn?.enrollment?.enrollmentNumber || ''})`,
      reference: `COMM-OUT-${co.id.slice(0, 8)}`,
      amount: Number(co.netAmount || co.amount || 0),
      method: 'commission_credit',
      verifiedBy: 'Finance Admin',
      remarks: `Gross: ₹${co.amount}, TDS: ₹${co.tdsAmount || 0}`
    });
  });

  // Sort strictly ascending by date to compute exact running balance
  rawList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  let totalCredits = 0;
  let totalDebits = 0;

  const fullLedger = rawList.map((item, idx) => {
    let credit = 0;
    let debit = 0;
    const amt = Number(item.amount || 0);

    if (item.type === 'credit') {
      credit = amt;
      totalCredits += amt;
      runningBalance += amt;
    } else {
      debit = amt;
      totalDebits += amt;
      runningBalance -= amt;
    }

    return {
      ...item,
      entryIndex: idx + 1,
      credit,
      debit,
      runningBalance
    };
  });

  // Now apply filter for date, type, search on the entries (while preserving accurate running balance)
  let filtered = fullLedger;

  if (type && type !== 'all') {
    filtered = filtered.filter(f => f.type === type);
  }

  if (dateFrom) {
    filtered = filtered.filter(f => new Date(f.date) >= new Date(dateFrom as string));
  }

  if (dateTo) {
    filtered = filtered.filter(f => new Date(f.date) <= new Date((dateTo as string) + 'T23:59:59.999Z'));
  }

  if (search) {
    const s = String(search).toLowerCase();
    filtered = filtered.filter(f =>
      f.description.toLowerCase().includes(s) ||
      f.reference.toLowerCase().includes(s) ||
      f.category.toLowerCase().includes(s)
    );
  }

  // Present newest entries first for display
  const displayLedger = [...filtered].reverse();

  res.json({
    success: true,
    data: {
      center: {
        id: center.id,
        name: center.name,
        code: center.code || 'N/A',
        branchName: center.branchName || '',
        city: center.city || '',
        state: center.state || '',
        coordinatorName: center.coordinatorName || '',
        phone: center.phone || '',
        email: center.email || '',
        currentWalletBalance: Number(center.wallet?.balance || runningBalance)
      },
      summary: {
        currentWalletBalance: Number(center.wallet?.balance || runningBalance),
        totalCredits,
        totalDebits,
        calculatedBalance: runningBalance,
        totalTransactions: fullLedger.length,
        filteredCount: displayLedger.length
      },
      ledger: displayLedger
    }
  });
});
