import re

with open('client/src/components/panels/EnrollStudentPanel.tsx', 'r') as f:
    content = f.read()

original = """    if (breakdowns && Array.isArray(breakdowns) && breakdowns.length > 0) {
      const b = breakdowns[0]; // first payment config
      subtotal = Number(b.baseFee || 0) + Number(b.registrationFee || 0) + Number(b.examFee || 0);
    } else {
      const addFees = Array.isArray(fs.additionalFees) ? fs.additionalFees : [];
      const nonGstFees = addFees.filter(f => f.label !== 'GST');
      subtotal = fs.baseFee + nonGstFees.reduce((s, f) => s + f.amount, 0);
    }

    const addFees = Array.isArray(fs.additionalFees) ? fs.additionalFees : [];
    const gstEntry = addFees.find(f => f.label === 'GST');
    const gstAmount = gstEntry ? Math.round((subtotal * gstEntry.amount) / 100) : 0;
    
    return subtotal + gstAmount;"""

new_code = """    const addFees = Array.isArray(fs.additionalFees) ? fs.additionalFees : [];
    const nonGstFees = addFees.filter(f => f.label !== 'GST');
    const additionalFeesTotal = nonGstFees.reduce((s, f) => s + f.amount, 0);

    if (breakdowns && Array.isArray(breakdowns) && breakdowns.length > 0) {
      const b = breakdowns[0]; // first payment config
      subtotal = Number(b.baseFee || 0) + Number(b.registrationFee || 0) + Number(b.examFee || 0) + additionalFeesTotal;
    } else {
      subtotal = fs.baseFee + additionalFeesTotal;
    }

    const gstEntry = addFees.find(f => f.label === 'GST');
    const gstAmount = gstEntry ? Math.round((subtotal * gstEntry.amount) / 100) : 0;
    
    return subtotal + gstAmount;"""

content = content.replace(original, new_code)

with open('client/src/components/panels/EnrollStudentPanel.tsx', 'w') as f:
    f.write(content)
