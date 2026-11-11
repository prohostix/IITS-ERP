// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getOrganizations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where = req.user.role === 'superadmin' ? {} : { id: req.user.organizationId || 'none' };
  const organizations = await prisma.organization.findMany({ where });
  res.status(200).json({ success: true, count: organizations.length, data: organizations });
});

export const getOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organization = await prisma.organization.findUnique({
    where: { id: req.params.id }
  });
  if (!organization) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }
  res.status(200).json({ success: true, data: organization });
});

export const createOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, phone, ...rest } = req.body;
  
  const slug = rest.slug || name.toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '') + '-' + Math.random().toString(36).substring(2, 7);

  const organization = await prisma.organization.create({
    data: {
      ...rest,
      name,
      slug,
      contactEmail: email || rest.contactEmail,
      contactPhone: phone || rest.contactPhone,
    }
  });
  res.status(201).json({ success: true, data: organization });
});

export const updateOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organization = await prisma.organization.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.status(200).json({ success: true, data: organization });
});

export const deleteOrganization = asyncHandler(async (req: AuthRequest, res: Response) => {
  const organization = await prisma.organization.findUnique({ where: { id: req.params.id } });
  if (!organization) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }
  await prisma.organization.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, data: {} });
});

export const assignLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { licenseId, durationMonths } = req.body;
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

  const updatedOrg = await prisma.organization.update({
    where: { id: req.params.id },
    data: {
      licenseId,
      licenseExpiry: expiryDate,
    }
  });
  res.status(200).json({ success: true, data: updatedOrg });
});

export const getSuperadminBilling = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const orgFilter = req.query.organizationId ? String(req.query.organizationId) : 'all';
  const countMode = req.query.countMode ? String(req.query.countMode) : 'all'; // 'all' | 'enrolled_only'

  // Fetch all organizations
  const allOrgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'asc' }
  });

  // System org or first org holds global billing settings in metadata.superadminBilling
  const systemOrg = allOrgs.find((o) => o.id === 'system') || allOrgs[0];
  const sysMeta: any = (systemOrg?.metadata && typeof systemOrg.metadata === 'object') ? systemOrg.metadata : {};
  const billingConfig: any = sysMeta.superadminBilling || {};
  const defaultRatePerStudent = Number(billingConfig.defaultRatePerStudent ?? 500);
  const monthStatuses: Record<string, any> = billingConfig.monthStatuses || {};

  // Active client organizations (exclude 'system' unless it's the only org)
  const clientOrgs = allOrgs.filter((o) => o.id !== 'system');
  const targetOrgs = clientOrgs.length > 0 ? clientOrgs : allOrgs;
  const filteredOrgs =
    orgFilter && orgFilter !== 'all'
      ? targetOrgs.filter((o) => o.id === orgFilter)
      : targetOrgs;
  const filteredOrgIds = filteredOrgs.map((o) => o.id);

  // Per-org rate helper
  const getOrgRate = (orgId: string): number => {
    const org = allOrgs.find((o) => o.id === orgId);
    const meta: any = org?.metadata && typeof org.metadata === 'object' ? org.metadata : {};
    if (meta.billingRatePerStudent !== undefined && meta.billingRatePerStudent !== null && meta.billingRatePerStudent !== '') {
      return Number(meta.billingRatePerStudent);
    }
    if (billingConfig.orgRates && billingConfig.orgRates[orgId] !== undefined) {
      return Number(billingConfig.orgRates[orgId]);
    }
    return defaultRatePerStudent;
  };

  const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  // Fetch enrollments in the selected year
  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: { in: filteredOrgIds },
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true } }
        }
      },
      studyCenter: { select: { id: true, name: true, code: true } },
      session: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Also fetch any direct Student records created in this year that don't have an Enrollment row
  const enrolledStudentIds = new Set(enrollments.map((e) => e.studentId).filter(Boolean));
  const standaloneStudents = await prisma.student.findMany({
    where: {
      organizationId: { in: filteredOrgIds },
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true } }
        }
      },
      center: { select: { id: true, name: true, code: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Normalize all enrollment items
  const allItems: any[] = [
    ...enrollments.map((e) => {
      const d = new Date(e.admissionDate || e.createdAt);
      const isConfirmed = ['enrolled', 'approved', 'active', 'completed', 'verified'].includes(
        String(e.status || '').toLowerCase()
      );
      const rate = getOrgRate(e.organizationId);
      const org = allOrgs.find((o) => o.id === e.organizationId);
      return {
        id: e.id,
        organizationId: e.organizationId,
        organizationName: org?.name || 'Organization',
        studentName: e.studentName,
        studentEmail: e.studentEmail,
        studentPhone: e.studentPhone,
        admissionNo: e.enrollmentNumber || '-',
        uniEnrollmentNo: e.uniEnrollmentNumber || '-',
        programName: e.program?.name || '-',
        universityName: e.program?.university?.name || '-',
        centerName: e.studyCenter?.name || '-',
        sessionName: e.session?.name || '-',
        status: e.status || 'pending',
        isConfirmed,
        date: d,
        month: d.getUTCMonth() + 1, // 1..12
        rate
      };
    }),
    ...standaloneStudents
      .filter((s) => !enrolledStudentIds.has(s.id))
      .map((s) => {
        const d = new Date(s.joinDate || s.createdAt);
        const isConfirmed = ['active', 'enrolled', 'approved', 'completed'].includes(
          String(s.status || '').toLowerCase()
        );
        const rate = getOrgRate(s.organizationId);
        const org = allOrgs.find((o) => o.id === s.organizationId);
        return {
          id: s.id,
          organizationId: s.organizationId,
          organizationName: org?.name || 'Organization',
          studentName: s.name,
          studentEmail: s.email,
          studentPhone: s.phone,
          admissionNo: s.enrollmentNo || '-',
          uniEnrollmentNo: s.uniEnrollmentNumber || '-',
          programName: s.program?.name || '-',
          universityName: s.program?.university?.name || '-',
          centerName: s.center?.name || '-',
          sessionName: '-',
          status: s.status || 'pending',
          isConfirmed,
          date: d,
          month: d.getUTCMonth() + 1,
          rate
        };
      })
  ].filter((item) => item.date.getUTCFullYear() === year);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthlyBreakdown = monthNames.map((monthName, idx) => {
    const monthNum = idx + 1;
    const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
    const itemsInMonth = allItems.filter((it) => it.month === monthNum);
    const confirmedItems = itemsInMonth.filter((it) => it.isConfirmed);
    const pendingItems = itemsInMonth.filter((it) => !it.isConfirmed);

    const billableItems = countMode === 'enrolled_only' ? confirmedItems : itemsInMonth;
    const billableCount = billableItems.length;
    const totalAmount = billableItems.reduce((sum, it) => sum + Number(it.rate || defaultRatePerStudent), 0);
    const effectiveRate =
      billableCount > 0
        ? Math.round(totalAmount / billableCount)
        : orgFilter !== 'all'
          ? getOrgRate(orgFilter)
          : defaultRatePerStudent;

    const statusInfo = monthStatuses[`${orgFilter}:${monthKey}`] || monthStatuses[`all:${monthKey}`] || {};

    return {
      monthNumber: monthNum,
      monthKey,
      monthName,
      year,
      totalEnrollments: itemsInMonth.length,
      confirmedEnrollments: confirmedItems.length,
      pendingEnrollments: pendingItems.length,
      billableCount,
      ratePerStudent: effectiveRate,
      billAmount: totalAmount,
      billingStatus: statusInfo.status || 'unpaid', // 'paid' | 'unpaid' | 'invoiced'
      paidAt: statusInfo.paidAt || null,
      referenceNo: statusInfo.referenceNo || '',
      remarks: statusInfo.remarks || '',
      students: billableItems
    };
  });

  // Organization summary for the selected year
  const orgBreakdown = targetOrgs.map((org) => {
    const orgItems = allItems.filter((it) => it.organizationId === org.id);
    const confirmedOrgItems = orgItems.filter((it) => it.isConfirmed);
    const billableOrgItems = countMode === 'enrolled_only' ? confirmedOrgItems : orgItems;
    const rate = getOrgRate(org.id);
    return {
      organizationId: org.id,
      organizationName: org.name,
      email: org.email || org.contactEmail || '-',
      status: org.status || 'active',
      ratePerStudent: rate,
      totalEnrollments: orgItems.length,
      confirmedEnrollments: confirmedOrgItems.length,
      pendingEnrollments: orgItems.length - confirmedOrgItems.length,
      billableCount: billableOrgItems.length,
      totalBillAmount: billableOrgItems.length * rate
    };
  });

  const totalYearEnrollments = monthlyBreakdown.reduce((s, m) => s + m.totalEnrollments, 0);
  const totalYearConfirmed = monthlyBreakdown.reduce((s, m) => s + m.confirmedEnrollments, 0);
  const totalYearBillable = monthlyBreakdown.reduce((s, m) => s + m.billableCount, 0);
  const totalYearBillAmount = monthlyBreakdown.reduce((s, m) => s + m.billAmount, 0);
  const totalPaidAmount = monthlyBreakdown
    .filter((m) => m.billingStatus === 'paid')
    .reduce((s, m) => s + m.billAmount, 0);

  res.status(200).json({
    success: true,
    data: {
      year,
      organizationId: orgFilter,
      countMode,
      defaultRatePerStudent,
      activeRatePerStudent: orgFilter !== 'all' ? getOrgRate(orgFilter) : defaultRatePerStudent,
      summary: {
        totalYearEnrollments,
        totalYearConfirmed,
        totalYearBillable,
        totalYearBillAmount,
        totalPaidAmount,
        totalOutstandingAmount: Math.max(0, totalYearBillAmount - totalPaidAmount)
      },
      monthlyBreakdown,
      organizations: orgBreakdown
    }
  });
});

export const updateSuperadminBillingConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { defaultRatePerStudent, organizationId, orgRatePerStudent, monthKey, billingStatus, referenceNo, remarks } = req.body;

  const allOrgs = await prisma.organization.findMany({ orderBy: { createdAt: 'asc' } });
  let systemOrg = allOrgs.find((o) => o.id === 'system') || allOrgs[0];
  if (!systemOrg) {
    res.status(404).json({ success: false, message: 'No organization found to store billing settings' });
    return;
  }

  const sysMeta: any = systemOrg.metadata && typeof systemOrg.metadata === 'object' ? { ...(systemOrg.metadata as any) } : {};
  const billingConfig: any = sysMeta.superadminBilling ? { ...sysMeta.superadminBilling } : {};

  if (defaultRatePerStudent !== undefined && defaultRatePerStudent !== null && !isNaN(Number(defaultRatePerStudent))) {
    billingConfig.defaultRatePerStudent = Math.max(0, Number(defaultRatePerStudent));
  }

  if (organizationId && organizationId !== 'all' && orgRatePerStudent !== undefined) {
    const rateVal = Math.max(0, Number(orgRatePerStudent));
    billingConfig.orgRates = { ...(billingConfig.orgRates || {}), [organizationId]: rateVal };

    const targetOrg = allOrgs.find((o) => o.id === organizationId);
    if (targetOrg) {
      const targetMeta: any = targetOrg.metadata && typeof targetOrg.metadata === 'object' ? { ...(targetOrg.metadata as any) } : {};
      targetMeta.billingRatePerStudent = rateVal;
      await prisma.organization.update({
        where: { id: organizationId },
        data: { metadata: targetMeta }
      });
    }
  }

  if (monthKey && billingStatus) {
    const scopeOrg = organizationId || 'all';
    const statusMap = { ...(billingConfig.monthStatuses || {}) };
    statusMap[`${scopeOrg}:${monthKey}`] = {
      status: billingStatus,
      paidAt: billingStatus === 'paid' ? new Date().toISOString() : null,
      referenceNo: referenceNo || '',
      remarks: remarks || '',
      updatedBy: req.user.id,
      updatedAt: new Date().toISOString()
    };
    billingConfig.monthStatuses = statusMap;
  }

  sysMeta.superadminBilling = billingConfig;
  await prisma.organization.update({
    where: { id: systemOrg.id },
    data: { metadata: sysMeta }
  });

  res.status(200).json({
    success: true,
    message: 'Billing configuration updated successfully',
    data: billingConfig
  });
});
