import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getWalletTopUps = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = { organizationId: req.user.organizationId };
  if (req.query.status) where.status = req.query.status as string;
  else where.status = 'pending';

  const topUps = await prisma.walletTopUp.findMany({
    where,
    include: {
      studyCenter: { select: { name: true, code: true } },
      verifier: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({ success: true, count: topUps.length, data: topUps });
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
      create: { studyCenterId: topUp.studyCenterId, balance: topUp.amount },
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
