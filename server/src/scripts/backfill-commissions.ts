import prisma from '../lib/prisma.js';
import { resolveProgramFeeStructure } from '../utils/feeStructureHelper.js';

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
    
    // 2. Fetch program fee structure matching session and specialisation
    let feeStructure = await resolveProgramFeeStructure(
      dbEnrollment.organizationId,
      dbEnrollment.programId,
      dbEnrollment.sessionId,
      dbEnrollment.specialisation
    );

    if (feeStructure) {
      // Calculate expected amount
      const uniCategory = (dbEnrollment as any).program?.university?.category;
      const NO_WALLET_CATEGORIES = ['direct_iits', 'team_lease'];
      const isDirectToUni = dbEnrollment.paymentType === 'direct_to_university' || NO_WALLET_CATEGORIES.includes(uniCategory);

      if ((feeStructure.commissionRate && feeStructure.commissionRate > 0) || isDirectToUni) {
        
        let breakdowns: any[] = [];
        if (typeof (feeStructure as any).feeBreakdown === 'string') {
          try { breakdowns = JSON.parse((feeStructure as any).feeBreakdown); } catch (e) { breakdowns = []; }
        } else if (Array.isArray((feeStructure as any).feeBreakdown)) {
          breakdowns = (feeStructure as any).feeBreakdown;
        }

        let expectedAmount = 0;
        if (dbEnrollment.paymentMethod === 'installment' && breakdowns.length > 0) {
          const b = breakdowns[0];
          const bCommRate = Number(b.commissionRate || feeStructure.commissionRate || 0);
          const bUni = Number(b.universityFee || 0);
          
          if (bCommRate > 0) {
            expectedAmount = (bUni * bCommRate) / 100;
          }
        } else {
          const commRate = Number(feeStructure.commissionRate || 0);
          const uni = Number(feeStructure.universityFee || 0);
          
          if (commRate > 0) {
            expectedAmount = (uni * commRate) / 100;
          }
        }

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
