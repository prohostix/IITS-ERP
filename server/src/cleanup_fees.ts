import prisma from './lib/prisma.js';

async function main() {
    const students = await prisma.student.findMany({
        include: {
            program: true,
            enrollments: true,
            universityFeePayments: true
        }
    });

    let totalDeleted = 0;

    for (const student of students) {
        if (!student.universityFeePayments || student.universityFeePayments.length === 0) continue;

        // For each enrollment of the student
        for (const enrollment of student.enrollments) {
            // Fetch fee structure
            const feeStructure = await prisma.programFeeStructure.findFirst({
                where: {
                    organizationId: enrollment.organizationId,
                    programId: enrollment.programId,
                    admissionSessionId: enrollment.sessionId,
                    level: 'program'
                }
            });

            if (!feeStructure || !feeStructure.feeBreakdown) continue;

            const breakdown = feeStructure.feeBreakdown as any[];
            const isSemester = feeStructure.billingCycle === 'per_semester';
            const expectedCycles = breakdown.map((_, index) => isSemester ? `Semester ${index + 1}` : `Year ${index + 1}`);

            const payments = student.universityFeePayments.filter(p => p.enrollmentId === enrollment.id);
            const paidPayments = payments.filter(p => p.status === 'paid');
            const pendingPayments = payments.filter(p => p.status !== 'paid');

            // We want to keep pending payments that are in expectedCycles AND we don't want duplicates of the same cycle
            const seenCycles = new Set<string>();
            // Add paid cycles to seen so we don't recreate them or keep pending versions of them
            for (const p of paidPayments) {
                seenCycles.add(p.semesterOrYear);
            }

            const paymentsToDelete: string[] = [];

            for (const p of pendingPayments) {
                if (!expectedCycles.includes(p.semesterOrYear)) {
                    // Not in expected cycles (e.g. 'Year 1' when expecting 'Semester 1')
                    paymentsToDelete.push(p.id);
                } else if (seenCycles.has(p.semesterOrYear)) {
                    // Duplicate of already seen/paid cycle
                    paymentsToDelete.push(p.id);
                } else {
                    // Valid expected cycle, keep it and mark as seen
                    seenCycles.add(p.semesterOrYear);
                }
            }

            if (paymentsToDelete.length > 0) {
                console.log(`Student ${student.name} (${student.enrollmentNo}) - Deleting ${paymentsToDelete.length} invalid/duplicate pending fee records.`);
                await prisma.universityFeePayment.deleteMany({
                    where: { id: { in: paymentsToDelete } }
                });
                totalDeleted += paymentsToDelete.length;
            }
        }
    }

    console.log(`\nCleanup complete! Deleted ${totalDeleted} invalid/duplicate pending fee records.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
