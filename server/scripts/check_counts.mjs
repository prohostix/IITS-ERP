import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.count();
  const universities = await prisma.university.count();
  const programs = await prisma.program.count();
  const invoices = await prisma.invoice.count();
  const walletTopUps = await prisma.walletTopUp.count();
  const tasks = await prisma.task.count();
  const leaves = await prisma.leaveRequest.count();
  const allocs = await prisma.leaveAllocation.count();
  
  console.log('Students:', students);
  console.log('Universities:', universities);
  console.log('Programs:', programs);
  console.log('Invoices:', invoices);
  console.log('WalletTopUps:', walletTopUps);
  console.log('Tasks:', tasks);
  console.log('LeaveRequests:', leaves);
  console.log('LeaveAllocations:', allocs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
