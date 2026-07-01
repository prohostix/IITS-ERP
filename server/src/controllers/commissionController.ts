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

  const list = await prisma.commissionIn.findMany({
    where,
    include: {
      enrollment: {
        include: {
          program: { select: { name: true } },
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
  const { receivedAmount, paymentDetails, centerPayoutAmount } = req.body;

  const item = await prisma.commissionIn.findUnique({
    where: { id },
    include: { enrollment: true }
  });

  if (!item || item.organizationId !== req.user.organizationId) {
    res.status(404).json({ success: false, message: 'Commission record not found' });
    return;
  }

  const updated = await prisma.commissionIn.update({
    where: { id },
    data: {
      status: 'received',
      receivedAmount: parseFloat(receivedAmount || item.expectedAmount),
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

    if (!existingOut) {
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
  if (status) {
    where.status = status;
  }

  const list = await prisma.commissionOut.findMany({
    where,
    include: {
      studyCenter: { select: { name: true } },
      commissionIn: {
        include: {
          enrollment: {
            include: {
              program: { select: { name: true } }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, count: list.length, data: list });
});

export const payCommissionOut = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { amount, paymentDetails } = req.body;

  const item = await prisma.commissionOut.findUnique({
    where: { id }
  });

  if (!item || item.organizationId !== req.user.organizationId) {
    res.status(404).json({ success: false, message: 'Commission payout record not found' });
    return;
  }

  const updated = await prisma.commissionOut.update({
    where: { id },
    data: {
      status: 'paid',
      amount: parseFloat(amount || item.amount),
      paidAt: new Date(),
      paymentDetails: paymentDetails || ''
    }
  });

  res.json({ success: true, data: updated });
});
