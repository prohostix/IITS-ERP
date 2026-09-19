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
