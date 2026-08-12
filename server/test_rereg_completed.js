const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    where: { status: 'paid' },
    include: {
      student: { select: { name: true, enrollmentNumber: true, email: true, program: { select: { name: true } } } }
    }
  });
  
  console.log("Total paid invoices:", invoices.length);
  const reregInvoices = invoices.filter(inv => {
    let items = [];
    if (typeof inv.items === 'string') {
        try { items = JSON.parse(inv.items); } catch(e){}
    } else if (Array.isArray(inv.items)) {
        items = inv.items;
    }
    
    // Check if any item represents a re-registration (e.g. Semester 2, Year 2, etc.)
    return items.some(item => {
        const desc = (item.description || '').toLowerCase();
        return (desc.includes('semester') || desc.includes('year')) && 
               !desc.includes('semester 1') && !desc.includes('year 1');
    });
  });
  
  console.log("Rereg paid invoices:", reregInvoices.map(i => ({ student: i.student?.name, desc: i.items })));
}
main().finally(() => process.exit(0));
