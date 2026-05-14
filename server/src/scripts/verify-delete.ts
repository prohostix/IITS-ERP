import { prisma } from '../config/postgres.js';

async function verifyDeletion() {
  try {
    console.log('🚀 Starting Verification of Organization Deletion...');

    // 1. Create a test license if it doesn't exist
    let license = await prisma.license.findFirst({ where: { name: 'Test License' } });
    if (!license) {
      license = await prisma.license.create({
        data: {
          name: 'Test License',
          type: 'basic',
          features: ['test'],
          maxUsers: 10,
          maxStorage: 1024,
          durationMonths: 1,
          price: 0,
          status: 'active'
        }
      });
      console.log('✅ Created Test License');
    }

    // 2. Create a test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Delete Me Test Org',
        email: `test-${Date.now()}@test.com`,
        phone: '1234567890',
        address: 'Test Address',
        status: 'active',
        licenseId: license.id
      }
    });
    console.log(`✅ Created Test Organization: ${org.id}`);

    // 3. Create a dependent department
    const dept = await prisma.department.create({
      data: {
        organizationId: org.id,
        name: 'Test Department',
        type: 'operations',
        features: ['test'],
        status: 'active'
      }
    });
    console.log(`✅ Created Dependent Department: ${dept.id}`);

    // 4. Create a dependent user
    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: `testuser-${Date.now()}@test.com`,
        password: 'password123',
        name: 'Test User',
        role: 'org_admin',
        status: 'active'
      }
    });
    console.log(`✅ Created Dependent User: ${user.id}`);

    // 5. Attempt to delete the organization
    console.log('🗑️ Attempting to delete organization...');
    await prisma.organization.delete({
      where: { id: org.id }
    });
    console.log('🎉 Successfully deleted organization! Cascade delete worked.');

    // 6. Verify dependents are gone
    const deptCheck = await prisma.department.findUnique({ where: { id: dept.id } });
    const userCheck = await prisma.user.findUnique({ where: { id: user.id } });

    if (!deptCheck && !userCheck) {
      console.log('🛡️ Verified: All dependent records were automatically deleted.');
    } else {
      console.error('❌ Error: Dependent records still exist!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyDeletion();
