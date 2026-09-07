import express from 'express';
import { prisma } from '../config/database.js';

const router = express.Router();

const NO_WALLET_CATEGORIES = ['direct_iits', 'team_lease'];

router.get('/fix-commissions', async (req, res) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { status: 'enrolled' },
      include: { commissionIn: true, program: { include: { university: true } } }
    });

    let createdCount = 0;
    const log: string[] = [];

    for (const e of enrollments) {
      const category = (e as any).program?.university?.category;
      const isDirectToUni = e.paymentType === 'direct_to_university' || NO_WALLET_CATEGORIES.includes(category);
      if (isDirectToUni && !e.commissionIn) {
        await prisma.commissionIn.create({
          data: { organizationId: e.organizationId, enrollmentId: e.id, expectedAmount: 0, status: 'pending' }
        });
        createdCount++;
        log.push(`Created CommissionIn for ${e.studentName} (${e.id}) [category: ${category}]`);
      }
    }
    res.json({ success: true, createdCount, log });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
