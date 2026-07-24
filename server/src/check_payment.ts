import prisma from './lib/prisma.js';

async function main() {
    const payments = await prisma.universityFeePayment.findMany({
        where: { student: { name: 'fuwiwoos' } }
    });
    console.dir(payments, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
