import prisma from '../lib/prisma.js';

export async function resolveProgramFeeStructure(
  organizationId: string,
  programId: string,
  sessionId: string | null,
  specialisation: string | null
) {
  // Priority 1: Match Program + Session + Specialisation
  if (sessionId && specialisation) {
    const fee = await prisma.programFeeStructure.findFirst({
      where: {
        organizationId,
        programId,
        admissionSessionId: sessionId,
        specialisation,
        level: 'program'
      }
    });
    if (fee) return fee;
  }

  // Priority 2: Match Program + Specialisation (Any session)
  if (specialisation) {
    const fee = await prisma.programFeeStructure.findFirst({
      where: {
        organizationId,
        programId,
        specialisation,
        level: 'program'
      }
    });
    if (fee) return fee;
  }

  // Priority 3: Match Program + Session + No Specialisation (Default fallback)
  if (sessionId) {
    const fee = await prisma.programFeeStructure.findFirst({
      where: {
        organizationId,
        programId,
        admissionSessionId: sessionId,
        specialisation: null,
        level: 'program'
      }
    });
    if (fee) return fee;
  }

  // Priority 4: Match Program + No Specialisation (Absolute default)
  const fee = await prisma.programFeeStructure.findFirst({
    where: {
      organizationId,
      programId,
      specialisation: null,
      level: 'program'
    }
  });
  if (fee) return fee;

  // Priority 5: Match any program fee structure (just in case they didn't properly set null)
  return await prisma.programFeeStructure.findFirst({
    where: {
      organizationId,
      programId,
      level: 'program'
    }
  });
}

/**
 * Filters a fee breakdown array down to the blocks relevant for an enrollment's
 * payment method. Fee structures may contain both Year and Semester blocks
 * (billingCycle 'both'); without filtering, totals and schedules get doubled.
 * Legacy (untagged) breakdowns fall back to the structure's billingCycle.
 */
export function filterBreakdownsForMethod(
  breakdowns: any[],
  paymentMethod: string | null | undefined,
  billingCycle?: string | null
): { blocks: any[]; label: 'Year' | 'Semester' } {
  const list = Array.isArray(breakdowns) ? breakdowns : [];
  const hasTagged = list.some(b => b?.installmentType === 'year' || b?.installmentType === 'semester');

  if (!hasTagged) {
    return { blocks: list, label: billingCycle === 'per_semester' ? 'Semester' : 'Year' };
  }

  const yearBlocks = list.filter(b => b?.installmentType === 'year');
  const semBlocks = list.filter(b => b?.installmentType === 'semester');

  if (paymentMethod === 'semester') {
    if (semBlocks.length > 0) return { blocks: semBlocks, label: 'Semester' };
    return { blocks: yearBlocks, label: 'Year' };
  }
  // 'yearly', 'installment', 'full_payment' or unknown -> prefer year blocks
  if (yearBlocks.length > 0) return { blocks: yearBlocks, label: 'Year' };
  return { blocks: semBlocks, label: 'Semester' };
}
