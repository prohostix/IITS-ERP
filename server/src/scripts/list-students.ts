// @ts-nocheck
import { prisma, connectPostgres } from '../config/postgres.js';

const run = async () => {
  await connectPostgres();
  try {
    const students = await prisma.student.findMany();
    console.log('Students inside database:');
    console.log(JSON.stringify(students, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
};

run();
