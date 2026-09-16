import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const useSSL = process.env.DATABASE_URL && 
               !process.env.DATABASE_URL.includes('localhost') && 
               !process.env.DATABASE_URL.includes('127.0.0.1') &&
               !process.env.DATABASE_URL.includes('::1');

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? {
    rejectUnauthorized: false
  } : undefined
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter: adapter,
  log: ['error', 'warn'],
});

async function main() {
  console.log('⚠️ STARTING BULK DELETION OF UNIVERSITY AND PROGRAM DATA ⚠️');

  try {
    const materials = await prisma.programMaterial.deleteMany({});
    console.log(`Deleted ${materials.count} ProgramMaterial records.`);

    const commIn = await prisma.commissionIn.deleteMany({});
    console.log(`Deleted ${commIn.count} CommissionIn records.`);

    const reregRules = await prisma.reregRule.deleteMany({});
    console.log(`Deleted ${reregRules.count} ReregRule records.`);

    const sessions = await prisma.admissionSession.deleteMany({});
    console.log(`Deleted ${sessions.count} AdmissionSession records.`);

    const progAlloc = await prisma.programAllocation.deleteMany({});
    console.log(`Deleted ${progAlloc.count} ProgramAllocation records.`);

    const uniAlloc = await prisma.universityAllocation.deleteMany({});
    console.log(`Deleted ${uniAlloc.count} UniversityAllocation records.`);

    const authFees = await prisma.universityAuthFee.deleteMany({});
    console.log(`Deleted ${authFees.count} UniversityAuthFee records.`);

    const feeStruct = await prisma.feeStructure.deleteMany({});
    console.log(`Deleted ${feeStruct.count} FeeStructure records.`);

    const progFeeStruct = await prisma.programFeeStructure.deleteMany({});
    console.log(`Deleted ${progFeeStruct.count} ProgramFeeStructure records.`);

    const programs = await prisma.program.deleteMany({});
    console.log(`Deleted ${programs.count} Program records.`);

    // Delete Users who are associated with a university
    const users = await prisma.user.deleteMany({
      where: { universityId: { not: null } }
    });
    console.log(`Deleted ${users.count} User records (university users).`);

    const universities = await prisma.university.deleteMany({});
    console.log(`Deleted ${universities.count} University records.`);

    console.log('✅ ALL UNIVERSITY & PROGRAM DATA DELETED SUCCESSFULLY.');
  } catch (err) {
    console.error('❌ Error during deletion:', err);
  } finally {
    process.exit(0);
  }
}

main();
