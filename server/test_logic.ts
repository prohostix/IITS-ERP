import prisma from './src/lib/prisma.js';

async function main() {
  const orgId = "1efdfdd2-fc9c-43e7-ab74-7aa9fe36aa1e"; // Check database for correct orgId
  const enrollments = await prisma.enrollment.findMany({
    include: {
      program: { select: { id: true, name: true, duration: true, university: { select: { id: true, name: true } } } },
      session: { select: { id: true, name: true } },
      studyCenter: { select: { id: true, name: true, branchName: true } },
      student: { select: { id: true, createdAt: true, enrolledAt: true, invoices: true, status: true, email: true, name: true } },
    }
  });

  const feeStructures = await prisma.programFeeStructure.findMany({});
  
  const rows: any[] = [];
  
  for (const e of enrollments) {
    if (!e.student) continue;

    const sessionId = e.sessionId || null;
    
    // Find candidate fee structures
    const candidates = feeStructures.filter((c: any) => 
      (c.programId === e.programId) ||
      (c.level === 'university' && c.universityId === (e.program as any).university?.id)
    );

    // Rank candidate fee structures
    const sorted = candidates.map(c => {
      let score = 0;
      if (c.level === 'program' && c.programId === e.programId) {
        if (c.admissionSessionId === sessionId) score = 100;
        else if (c.admissionSessionId === null) score = 80;
        else score = 60;
      } else if (c.level === 'university' && c.universityId === (e.program as any).university?.id) {
        if (c.admissionSessionId === sessionId) score = 40;
        else if (c.admissionSessionId === null) score = 20;
        else score = 10;
      }
      return { c, score };
    }).sort((a, b) => b.score - a.score);

    const feeStructure = sorted[0]?.c;
    if (!feeStructure) continue;

    let breakdownArray: any[] = [];
    if (feeStructure.feeBreakdown) {
      if (typeof feeStructure.feeBreakdown === 'string') {
        try { breakdownArray = JSON.parse(feeStructure.feeBreakdown); } catch (err) {}
      } else if (Array.isArray(feeStructure.feeBreakdown)) {
        breakdownArray = feeStructure.feeBreakdown;
      }
    }

    if (breakdownArray.length === 0) continue;

    const billingCycle = feeStructure.billingCycle;
    let cycleLabel = 'Installment';
    if (billingCycle === 'per_semester') cycleLabel = 'Semester';
    else if (billingCycle === 'per_year' || billingCycle === 'yearly') cycleLabel = 'Year';

    const invoices = e.student.invoices || [];

    let nextUnpaidDate: Date | null = null;
    let nextUnpaidName = '';

    for (let i = 1; i < breakdownArray.length; i++) {
      const b = breakdownArray[i];
      const name = `${cycleLabel} ${b.year || i + 1}`;
      
      const isPaid = invoices.some((inv: any) => {
        const items = Array.isArray(inv.items) ? inv.items : JSON.parse(typeof inv.items === 'string' ? inv.items : '[]');
        return inv.status === 'paid' && items.some((item: any) => item.description?.toLowerCase().includes(name.toLowerCase()));
      });

      if (!isPaid) {
        nextUnpaidName = name;
        if (b.dueDate) {
          nextUnpaidDate = new Date(b.dueDate);
        } else {
          nextUnpaidDate = new Date(e.student.enrolledAt || e.student.createdAt);
          if (cycleLabel === 'Semester') nextUnpaidDate.setMonth(nextUnpaidDate.getMonth() + i * 6);
          else nextUnpaidDate.setFullYear(nextUnpaidDate.getFullYear() + i);
        }
        break; 
      }
    }

    if (nextUnpaidName && nextUnpaidDate) {
      const daysUntilDeadline = Math.ceil((nextUnpaidDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      rows.push({
        studentName: e.studentName,
        email: e.student.email,
        daysUntilDeadline,
        nextUnpaidName,
        nextUnpaidDate
      });
    }
  }
  
  console.log("Found rows:", rows);
}

main().catch(console.error).finally(() => process.exit(0));
