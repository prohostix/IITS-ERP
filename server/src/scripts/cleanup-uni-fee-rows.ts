import prisma from '../lib/prisma.js';

/**
 * Cleanup Script: Remove extra future semester fee rows for installment enrollments.
 *
 * Logic:
 *   - Finds all pending UniversityFeePayment rows that are future semesters
 *   - For each enrollmentId, if the enrollment is on 'installment':
 *     - Keep: 'One-Time University Fee' (always)
 *     - Keep: all 'paid' semester/year rows
 *     - Keep: ONLY the lowest-numbered pending semester (the next due)
 *     - DELETE: any other pending future semester rows
 *
 * Run: npx tsx src/scripts/cleanup-uni-fee-rows.ts [--dry-run]
 */

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log('=== University Fee Row Cleanup Script ===');
  if (dryRun) console.log('🔍 DRY RUN — no records will be deleted.\n');

  // Fetch all payments that have an enrollmentId, ordered by semesterOrYear number
  const allPayments = await prisma.universityFeePayment.findMany({
    where: { enrollmentId: { not: null } },
    orderBy: { createdAt: 'asc' },
  });

  // Group by enrollmentId
  const byEnrollment = new Map<string, typeof allPayments>();
  for (const p of allPayments) {
    if (!p.enrollmentId) continue;
    if (!byEnrollment.has(p.enrollmentId)) byEnrollment.set(p.enrollmentId, []);
    byEnrollment.get(p.enrollmentId)!.push(p);
  }

  // Fetch all relevant enrollments in one query
  const enrollmentIds = [...byEnrollment.keys()];
  const enrollments = await prisma.enrollment.findMany({
    where: { id: { in: enrollmentIds } },
    select: { id: true, paymentMethod: true, enrollmentNumber: true },
  });
  const enrollmentMap = new Map(enrollments.map(e => [e.id, e]));

  let totalToDelete = 0;
  const idsToDelete: string[] = [];

  for (const [enrollmentId, payments] of byEnrollment.entries()) {
    const enrollment = enrollmentMap.get(enrollmentId);
    if (!enrollment || enrollment.paymentMethod !== 'installment') continue;

    // Separate semester/year rows from one-time rows
    const semesterRows = payments.filter(p =>
      /^(Semester|Year)\s+\d+$/.test(p.semesterOrYear || '')
    );
    const paidRows = semesterRows.filter(p => p.status === 'paid');
    const pendingRows = semesterRows.filter(p => p.status === 'pending');

    // Sort pending by semester number
    pendingRows.sort((a, b) => {
      const na = parseInt((a.semesterOrYear || '').match(/\d+/)?.[0] || '0', 10);
      const nb = parseInt((b.semesterOrYear || '').match(/\d+/)?.[0] || '0', 10);
      return na - nb;
    });

    // Keep only the first pending, mark rest for deletion
    const [_keep, ...toDelete] = pendingRows;
    if (toDelete.length === 0) continue;

    const deleteIds = toDelete.map(p => p.id);
    idsToDelete.push(...deleteIds);
    totalToDelete += deleteIds.length;

    console.log(
      `ENR ${enrollment.enrollmentNumber || enrollmentId.slice(0, 8)} | ` +
      `Paid: [${paidRows.map(p => p.semesterOrYear).join(', ') || 'none'}] | ` +
      `Keep next: [${_keep?.semesterOrYear || 'none'}] | ` +
      `DELETE (${deleteIds.length}): [${toDelete.map(p => p.semesterOrYear).join(', ')}]`
    );
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total excess rows: ${totalToDelete}`);

  if (!dryRun && idsToDelete.length > 0) {
    const result = await prisma.universityFeePayment.deleteMany({
      where: { id: { in: idsToDelete } },
    });
    console.log(`✅ Deleted ${result.count} rows.`);
  } else if (dryRun) {
    console.log('Run without --dry-run to apply changes.');
  } else {
    console.log('Nothing to delete.');
  }
}

main()
  .catch(e => { console.error('Script failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
