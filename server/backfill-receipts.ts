import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const paidInvoices = await prisma.invoice.findMany({
    where: { status: 'paid', notes: { contains: 'Installment' } },
    include: { student: { include: { enrollments: true } } }
  });

  console.log(`Found ${paidInvoices.length} paid installment invoices.`);

  let created = 0;
  for (const inv of paidInvoices) {
    if (!inv.student || !inv.student.enrollments.length) continue;
    const enrollment = inv.student.enrollments[0];
    
    // Check if receipt already exists for this amount and enrollment
    const existing = await prisma.studentFeeReceipt.findFirst({
      where: {
        enrollmentId: enrollment.id,
        amount: inv.total,
      }
    });

    if (!existing) {
      // Find a recordedBy user (the organization owner or first admin)
      const user = await prisma.user.findFirst({
        where: { organizationId: inv.organizationId, role: { in: ['superadmin', 'admin'] } }
      });
      if (!user) {
        console.log(`No user found for organization ${inv.organizationId}`);
        continue;
      }
      
      await prisma.studentFeeReceipt.create({
        data: {
          organizationId: inv.organizationId,
          enrollmentId: enrollment.id,
          amount: inv.total,
          receiptDate: inv.updatedAt,
          paymentMode: inv.notes?.includes('directly') ? 'Direct to University' : 'Wallet',
          remarks: `Auto-backfilled from Invoice: ${inv.invoiceNo}`,
          recordedBy: user.id
        }
      });
      created++;
      console.log(`Backfilled receipt for Invoice ${inv.invoiceNo} amount ${inv.total}`);
    }
  }
  console.log(`Created ${created} missing receipts.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
