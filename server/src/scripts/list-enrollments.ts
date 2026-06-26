// @ts-nocheck
import { prisma, connectPostgres } from '../config/postgres.js';

const run = async () => {
  await connectPostgres();
  try {
    const enrollments = await prisma.enrollment.findMany({
      select: {
        id: true,
        studentName: true,
        studentEmail: true,
        status: true,
        documents: true,
        educationalDetails: true,
      }
    });
    console.log('Enrollments inside database:');
    console.log(JSON.stringify(enrollments, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
};

run();
