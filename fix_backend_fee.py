import re

with open('server/src/controllers/financeEnrollmentController.ts', 'r') as f:
    content = f.read()

original = """  // Calculate total fee
  const addFees = Array.isArray(feeStructure.additionalFees) ? feeStructure.additionalFees : [];
  const nonGstFees = addFees.filter((f: any) => f.label !== 'GST');
  const subtotal = feeStructure.baseFee + nonGstFees.reduce((s: number, f: any) => s + f.amount, 0);
  const gstEntry = addFees.find((f: any) => f.label === 'GST');
  const gstAmount = gstEntry ? Math.round((subtotal * gstEntry.amount) / 100) : 0;
  const totalFee = subtotal + gstAmount;"""

new_code = """  // Calculate total fee
  const addFees = Array.isArray(feeStructure.additionalFees) ? feeStructure.additionalFees : [];
  const nonGstFees = addFees.filter((f: any) => f.label !== 'GST');
  const additionalFeesTotal = nonGstFees.reduce((s: number, f: any) => s + f.amount, 0);

  let breakdowns = (feeStructure as any).feeBreakdown;
  if (typeof breakdowns === 'string') {
    try { breakdowns = JSON.parse(breakdowns); } catch (e) { breakdowns = []; }
  }

  let subtotal = 0;
  if (breakdowns && Array.isArray(breakdowns) && breakdowns.length > 0) {
    const b = breakdowns[0]; // first payment config
    subtotal = Number(b.baseFee || 0) + Number(b.registrationFee || 0) + Number(b.examFee || 0) + additionalFeesTotal;
  } else {
    subtotal = feeStructure.baseFee + additionalFeesTotal;
  }

  const gstEntry = addFees.find((f: any) => f.label === 'GST');
  const gstAmount = gstEntry ? Math.round((subtotal * gstEntry.amount) / 100) : 0;
  const totalFee = subtotal + gstAmount;"""

content = content.replace(original, new_code)

with open('server/src/controllers/financeEnrollmentController.ts', 'w') as f:
    f.write(content)
