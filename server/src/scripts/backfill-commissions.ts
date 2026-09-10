import prisma from '../lib/prisma.js';

async function main() {
  console.log('Starting backfill for CommissionIn expectedAmounts...');
  
  const commissions = await prisma.commissionIn.findMany({
    where: { expectedAmount: 0 },
    include: {
      enrollment: {
        include: {
          program: { include: { university: true } }
        }
      }
    }
  });

  console.log(`Found ${commissions.length} commissions with expectedAmount = 0`);

  let updatedCount = 0;

  for (const comm of commissions) {
    if (!comm.enrollment) continue;

    const dbEnrollment = comm.enrollment;
    
    // Fetch program fee structure matching session
    let feeStructure = await prisma.programFeeStructure.findFirst({
      where: {
        organizationId: comm.organizationId,
        programId: dbEnrollment.programId,
        admissionSessionId: dbEnrollment.sessionId,
        level: 'program'
      }
    });

    if (!feeStructure) {
      feeStructure = await prisma.programFeeStructure.findFirst({
        where: {
          organizationId: comm.organizationId,
          programId: dbEnrollment.programId,
          level: 'program'
        }
      });
    }

    if (!feeStructure) {
      feeStructure = await prisma.programFeeStructure.findFirst({
        where: {
          organizationId: comm.organizationId,
          programId: dbEnrollment.programId
        }
      });
    }

    if (feeStructure) {
      // Calculate expected amount
      const uniCategory = (dbEnrollment as any).program?.university?.category;
      const NO_WALLET_CATEGORIES = ['direct_iits', 'team_lease'];
      const isDirectToUni = dbEnrollment.paymentType === 'direct_to_university' || NO_WALLET_CATEGORIES.includes(uniCategory);

      if ((feeStructure.commissionRate && feeStructure.commissionRate > 0) || isDirectToUni) {
        const expectedAmount = (feeStructure.commissionRate && feeStructure.commissionRate > 0 && feeStructure.baseFee)
          ? (feeStructure.baseFee * feeStructure.commissionRate) / 100
          : 0;

        if (expectedAmount > 0) {
          await prisma.commissionIn.update({
            where: { id: comm.id },
            data: { expectedAmount }
          });
          console.log(`Updated commission ${comm.id} expectedAmount to ${expectedAmount}`);
          updatedCount++;
        } else {
          console.log(`Commission ${comm.id}: expectedAmount is 0 (baseFee=${feeStructure.baseFee}, rate=${feeStructure.commissionRate})`);
        }
      } else {
        console.log(`Commission ${comm.id}: rate is 0 or not direct (rate=${feeStructure.commissionRate}, isDirect=${isDirectToUni})`);
      }
    } else {
      console.log(`Commission ${comm.id}: No fee structure found for program ${dbEnrollment.programId}`);
    }
  }

  console.log(`Backfill complete. Updated ${updatedCount} records.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
