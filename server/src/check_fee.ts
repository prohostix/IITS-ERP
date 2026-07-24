import prisma from './lib/prisma.js';

async function main() {
    const feeStructures = await prisma.programFeeStructure.findMany({
        where: { program: { name: { contains: 'testprogram' } } },
        include: { program: true }
    });
    console.dir(feeStructures, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
