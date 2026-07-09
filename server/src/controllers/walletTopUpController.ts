// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getWalletTopUps = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  if (req.query.status) where.status = req.query.status as string;

  const topUps = await prisma.walletTopUp.findMany({
    where,
    include: {
      studyCenter: { select: { name: true, code: true } },
      verifier: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const mapped = topUps.map(t => ({
    ...t,
    studyCenterId: t.studyCenter || t.studyCenterId
  }));

  res.status(200).json({ success: true, count: mapped.length, data: mapped });
});

export const approveWalletTopUp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const topUp = await prisma.walletTopUp.findUnique({
    where: { id: req.params.id }
  });

  if (!topUp || topUp.status !== 'pending') {
    res.status(404).json({ success: false, message: 'Top-up request invalid or not pending' });
    return;
  }

  // Update wallet and mark top-up as approved in a transaction
  const [updatedTopUp, wallet] = await prisma.$transaction([
    prisma.walletTopUp.update({
      where: { id: topUp.id },
      data: {
        status: 'approved',
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
      }
    }),
    prisma.studyCenterWallet.upsert({
      where: { studyCenterId: topUp.studyCenterId },
      create: { studyCenterId: topUp.studyCenterId, balance: topUp.amount, organizationId: req.user.organizationId as any },
      update: { balance: { increment: topUp.amount } }
    })
  ]);

  res.status(200).json({ success: true, data: { topUp: updatedTopUp, wallet } });
});

export const rejectWalletTopUp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { remarks } = req.body;

  const topUp = await prisma.walletTopUp.update({
    where: { id: req.params.id },
    data: {
      status: 'rejected',
      remarks,
      verifiedBy: req.user.id,
      verifiedAt: new Date(),
    }
  });

  res.status(200).json({ success: true, data: topUp });
});

export const getWalletLedger = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studyCenterId } = req.query;
  const orgId = req.user.organizationId;

  // Build filters based on studyCenterId selection (or fetch all for organization)
  const scFilter = studyCenterId && studyCenterId !== '__all__' ? { studyCenterId: studyCenterId as string } : {};
  const centerFilter = studyCenterId && studyCenterId !== '__all__' ? { centerId: studyCenterId as string } : {};

  // 1. Fetch approved top-ups (credits)
  const topUps = await prisma.walletTopUp.findMany({
    where: {
      organizationId: orgId,
      status: 'approved',
      ...scFilter,
    },
    include: {
      studyCenter: { select: { name: true, code: true } }
    },
    orderBy: { verifiedAt: 'desc' }
  });

  // 2. Fetch enrollment debits (debits)
  const debits = await prisma.enrollmentPayment.findMany({
    where: {
      studyCenter: {
        organizationId: orgId
      },
      ...scFilter,
    },
    include: {
      studyCenter: { select: { name: true, code: true } },
      enrollment: {
        include: {
          program: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 3. Fetch student invoices paid by center wallet (debits)
  const studentInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      studentId: { not: null },
      status: 'paid',
      ...centerFilter,
    },
    include: {
      center: { select: { name: true, code: true } },
      student: {
        include: {
          program: true
        }
      }
    },
    orderBy: { paidAt: 'desc' }
  });

  // Map into a unified ledger structure
  const ledger = [
    ...topUps.map(t => ({
      id: t.id,
      date: t.verifiedAt || t.createdAt,
      type: 'credit',
      amount: t.amount,
      method: t.paymentMethod,
      reference: t.referenceNumber || 'N/A',
      description: 'Wallet Top-Up Approved',
      centerName: t.studyCenter?.name || 'Unknown',
      centerCode: t.studyCenter?.code || ''
    })),
    ...debits.map(d => ({
      id: d.id,
      date: d.debitedAt || d.createdAt,
      type: 'debit',
      amount: d.amount,
      method: 'wallet_debit',
      reference: d.enrollment?.enrollmentNumber || 'N/A',
      description: `Enrollment: ${d.enrollment?.studentName || 'Student'} (${d.enrollment?.program?.name || 'Program'})`,
      centerName: d.studyCenter?.name || 'Unknown',
      centerCode: d.studyCenter?.code || ''
    })),
    ...studentInvoices.map(inv => ({
      id: inv.id,
      date: inv.paidAt || inv.createdAt,
      type: 'debit',
      amount: inv.total,
      method: 'wallet_debit',
      reference: inv.invoiceNo,
      description: `Student Fee: ${inv.student?.name || 'Student'} (${inv.student?.program?.name || 'Program'}) - ${inv.items?.[0]?.description || 'Installment'}`,
      centerName: inv.center?.name || 'Unknown',
      centerCode: inv.center?.code || ''
    }))
  ];

  // Sort by date descending
  ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({ success: true, count: ledger.length, data: ledger });
});

