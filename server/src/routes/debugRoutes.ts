import express from 'express';
import { prisma } from '../config/database.js';

const router = express.Router();

const NO_WALLET_CATEGORIES = ['direct_iits', 'team_lease'];

// Inspect fee structures for no-wallet programs
router.get('/fee-structures-check', async (req, res) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { status: 'enrolled' },
      include: { program: { include: { university: true } } },
      take: 20
    });

    const noWallet = enrollments.filter(e => {
      const cat = (e as any).program?.university?.category;
      return NO_WALLET_CATEGORIES.includes(cat);
    });

    const results = [];
    for (const e of noWallet.slice(0, 5)) {
      const fs = await prisma.programFeeStructure.findFirst({
        where: { programId: e.programId, level: 'program' }
      });
      results.push({
        student: e.studentName,
        program: (e as any).program?.name,
        programId: e.programId,
        sessionId: e.sessionId,
        feeStructureFound: !!fs,
        baseFee: (fs as any)?.baseFee,
        commissionRate: (fs as any)?.commissionRate,
        universityFee: (fs as any)?.universityFee,
      });
    }
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
