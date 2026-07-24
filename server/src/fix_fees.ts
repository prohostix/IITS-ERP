import prisma from './lib/prisma.js';

async function main() {
    const wrongPayments = await prisma.universityFeePayment.findMany({
        where: { amount: 15000, semesterOrYear: 'Year 1' }
    });

    for (const payment of wrongPayments) {
        console.log("Found wrong payment:", payment.id, "for enrollment:", payment.enrollmentId);
        
        const enrollment = await prisma.enrollment.findUnique({
            where: { id: payment.enrollmentId }
        });

        if (!enrollment) continue;

        // Find fee structure for this enrollment
        const feeStructure = await prisma.programFeeStructure.findFirst({
            where: {
                organizationId: payment.organizationId,
                programId: enrollment.programId,
                admissionSessionId: enrollment.sessionId,
                level: 'program'
            }
        });

        if (feeStructure && feeStructure.feeBreakdown) {
            const breakdown = feeStructure.feeBreakdown as any[];
            if (breakdown.length > 0) {
                console.log("Applying breakdown for", payment.studentId);
                
                // Delete old
                await prisma.universityFeePayment.delete({ where: { id: payment.id } });

                // Create new
                const isSemester = feeStructure.billingCycle === 'per_semester';
                const paymentsToCreate = breakdown.map((cycle, index) => ({
                    organizationId: payment.organizationId,
                    studentId: payment.studentId,
                    enrollmentId: payment.enrollmentId,
                    semesterOrYear: isSemester ? `Semester ${index + 1}` : `Year ${index + 1}`,
                    amount: Number(cycle.universityFee || 0),
                    status: 'pending'
                }));
                
                await prisma.universityFeePayment.createMany({ data: paymentsToCreate });
                console.log("Created", paymentsToCreate.length, "new records.");
            }
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
