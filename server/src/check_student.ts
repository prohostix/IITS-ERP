import prisma from './lib/prisma.js';

async function main() {
    const student = await prisma.student.findFirst({
        where: { name: { contains: 'fuwiwoos' } },
        include: { 
            universityFeePayments: true,
            enrollments: true 
        }
    });
    console.dir(student, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
