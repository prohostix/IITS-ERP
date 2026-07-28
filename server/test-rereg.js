const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function test() {
  const enrollments = await p.enrollment.findMany({
    select: { id: true, status: true, student: { select: { invoices: true } } }
  });
  const statusCounts = {};
  enrollments.forEach(e => {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  });
  console.log("Status counts:", statusCounts);
}
test().then(() => p.$disconnect());
