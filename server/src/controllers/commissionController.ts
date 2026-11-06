// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ─── Commission In (Expected / Received Commissions) ──────────────────────────

export const getCommissionInList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const where: any = { organizationId: req.user.organizationId };
  if (status) {
    where.status = status;
  }
  if (req.query.universityId || req.query.centerId) {
    where.enrollment = {};
    if (req.query.universityId) where.enrollment.program = { universityId: req.query.universityId as string };
    if (req.query.centerId) where.enrollment.studyCenterId = req.query.centerId as string;
  }

  const list = await prisma.commissionIn.findMany({
    where,
    include: {
      enrollment: {
        include: {
          program: { select: { name: true, university: { select: { name: true } } } },
          studyCenter: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, count: list.length, data: list });
});

export const markCommissionInReceived = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    receivedAmount,
    grossAmount,
    tdsPercentage,
    tdsAmount,
    netAmount,
    paymentDetails,
    centerPayoutAmount
  } = req.body;

  const item = await prisma.commissionIn.findUnique({
    where: { id },
    include: { enrollment: true }
  });

  if (!item || item.organizationId !== req.user.organizationId) {
    res.status(404).json({ success: false, message: 'Commission record not found' });
    return;
  }

  const grossVal = parseFloat(grossAmount || receivedAmount || String(item.expectedAmount));
  if (isNaN(grossVal) || grossVal <= 0) {
    res.status(400).json({ success: false, message: 'Please enter a valid amount' });
    return;
  }

  const tdsPercentValue = tdsPercentage !== undefined && tdsPercentage !== null && tdsPercentage !== ''
    ? parseFloat(tdsPercentage)
    : 0;

  const finalTdsAmount = tdsAmount !== undefined && tdsAmount !== null && tdsAmount !== ''
    ? parseFloat(tdsAmount)
    : Math.round((grossVal * tdsPercentValue) / 100);

  const finalNetAmount = netAmount !== undefined && netAmount !== null && netAmount !== ''
    ? parseFloat(netAmount)
    : (grossVal - finalTdsAmount);

  const newReceivedAmount = (item.receivedAmount || 0) + grossVal;
  const status = newReceivedAmount >= item.expectedAmount ? 'received' : 'pending';

  const updated = await prisma.commissionIn.update({
    where: { id },
    data: {
      status,
      receivedAmount: newReceivedAmount,
      tdsPercentage: tdsPercentValue,
      tdsAmount: (item.tdsAmount || 0) + finalTdsAmount,
      netAmount: (item.netAmount || 0) + finalNetAmount,
      receivedAt: new Date(),
      paymentDetails: paymentDetails || '',
    }
  });

  // Automatically create a CommissionOut record (payout to Study Center)
  if (item.enrollment?.studyCenterId) {
    // If a custom payout amount was specified, use it. Otherwise, set it to 0 (can be edited/paid later)
    const payout = parseFloat(centerPayoutAmount || 0);

    // Check if CommissionOut already exists for this CommissionIn to avoid duplicates
    const existingOut = await prisma.commissionOut.findFirst({
      where: { commissionInId: id }
    });

    if (existingOut) {
      if (payout > 0) {
        await prisma.commissionOut.update({
          where: { id: existingOut.id },
          data: { amount: { increment: payout } }
        });
      }
    } else {
      await prisma.commissionOut.create({
        data: {
          organizationId: req.user.organizationId,
          studyCenterId: item.enrollment.studyCenterId,
          commissionInId: id,
          amount: payout,
          status: 'pending'
        }
      });
    }
  }

  res.json({ success: true, data: updated });
});

// ─── Commission Out (Payouts to Centers) ──────────────────────────────────────

export const getCommissionOutList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const where: any = { organizationId: req.user.organizationId };
  
  if (req.user.role === 'center_admin') {
    where.studyCenterId = req.user.studyCenterId;
  }

  if (status) {
    where.status = status;
  }
  if (req.query.centerId) {
    where.studyCenterId = req.query.centerId as string;
  }
  if (req.query.universityId) {
    where.commissionIn = { enrollment: { program: { universityId: req.query.universityId as string } } };
  }

  const list = await prisma.commissionOut.findMany({
    where,
    include: {
      studyCenter: { select: { id: true, name: true, code: true } },
      commissionIn: {
        include: {
          enrollment: {
            include: {
              program: { select: { id: true, name: true, university: { select: { id: true, name: true } } } }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const enrichedList = list.map(item => {
    const gross = Number(item.amount || 0);
    const tds = Number(item.tdsAmount || 0);
    const net = item.netAmount !== null && item.netAmount !== undefined ? Number(item.netAmount) : Math.max(0, gross - tds);
    const tdsPct = gross > 0 && tds > 0 ? Number(((tds / gross) * 100).toFixed(1)) : 0;
    return {
      ...item,
      grossAmount: gross,
      tdsAmount: tds,
      netAmount: net,
      tdsPercentage: tdsPct
    };
  });

  res.json({ success: true, count: enrichedList.length, data: enrichedList });
});

export const payCommissionOut = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { amount, tdsPercentage, tdsAmount: customTds, netAmount: customNet, paymentDetails } = req.body;

  const item = await prisma.commissionOut.findUnique({
    where: { id }
  });

  if (!item || item.organizationId !== req.user.organizationId) {
    res.status(404).json({ success: false, message: 'Commission payout record not found' });
    return;
  }

  const grossAmount = parseFloat(amount || item.amount.toString());
  const tdsPercentValue = tdsPercentage !== undefined && tdsPercentage !== null && tdsPercentage !== ''
    ? parseFloat(tdsPercentage)
    : 0;

  const tdsAmount = customTds !== undefined && customTds !== null && customTds !== ''
    ? parseFloat(customTds)
    : Math.round((grossAmount * tdsPercentValue) / 100);

  const netAmount = customNet !== undefined && customNet !== null && customNet !== ''
    ? parseFloat(customNet)
    : Math.max(0, grossAmount - tdsAmount);

  const updated = await prisma.commissionOut.update({
    where: { id },
    data: {
      status: 'paid',
      amount: grossAmount,
      tdsAmount: tdsAmount,
      netAmount: netAmount,
      paidAt: new Date(),
      paymentDetails: paymentDetails || ''
    }
  });

  res.json({
    success: true,
    data: {
      ...updated,
      grossAmount,
      tdsAmount,
      netAmount,
      tdsPercentage: tdsPercentValue || (grossAmount > 0 && tdsAmount > 0 ? Number(((tdsAmount / grossAmount) * 100).toFixed(1)) : 0)
    }
  });
});
