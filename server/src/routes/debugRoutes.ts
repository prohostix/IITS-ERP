import express from 'express';
import { prisma } from '../config/database.js';

const router = express.Router();

const NO_WALLET_CATEGORIES = ['direct_iits', 'team_lease'];

// Re-calculate expectedAmount for all no-wallet CommissionIn records using fee structures
router.get('/recalc-commissions', async (req, res) => {
  try {
    const commissions = await prisma.commissionIn.findMany({
      where: { expectedAmount: 0, status: 'pending' },
      include: {
        enrollment: {
          include: { program: { include: { university: true } } }
        }
      }
    });

    let updatedCount = 0;
    const log: string[] = [];

    for (const comm of commissions) {
      const e = comm.enrollment;
      if (!e) continue;
      const category = (e as any).program?.university?.category;
      const isDirectToUni = e.paymentType === 'direct_to_university' || NO_WALLET_CATEGORIES.includes(category);
      if (!isDirectToUni) continue;

      // Look up the fee structure for this enrollment
      const feeStructure = await prisma.programFeeStructure.findFirst({
        where: {
          organizationId: e.organizationId,
          programId: e.programId,
          ...(e.sessionId ? { admissionSessionId: e.sessionId } : {}),
          level: 'program'
        }
      }) || await prisma.programFeeStructure.findFirst({
        where: {
          organizationId: e.organizationId,
          programId: e.programId,
          level: 'program'
        }
      });

      if (!feeStructure) continue;

      const commRate = (feeStructure as any).commissionRate;
      const baseFee = (feeStructure as any).baseFee;
      if (!commRate || commRate <= 0 || !baseFee) continue;

      const expectedAmount = (baseFee * commRate) / 100;

      await prisma.commissionIn.update({
        where: { id: comm.id },
        data: { expectedAmount }
      });

      updatedCount++;
      log.push(`Updated ${e.studentName}: ₹${expectedAmount} (rate: ${commRate}%, base: ₹${baseFee})`);
    }

    res.json({ success: true, updatedCount, log });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
