import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  try {
    console.log('--- HR Verification ---');
    
    // Find superadmin
    const superadmin = await prisma.user.findFirst({ where: { role: 'superadmin' } });
    const opsadmin = await prisma.user.findFirst({ where: { role: 'ops_admin' } });
    
    if (!superadmin || !opsadmin) throw new Error('Missing seed users');
    
    const organizationId = superadmin.organizationId;
    
    // Find a department
    const department = await prisma.department.findFirst({ where: { organizationId } });
    if (!department) throw new Error('Missing department');
    
    console.log('1. Creating Hiring Request...');
    const hiringRequest = await prisma.hiringRequest.create({
      data: {
        organizationId,
        departmentId: department.id,
        title: 'Backend Developer',
        count: 1,
        description: 'Test position',
        requestedBy: opsadmin.id,
        status: 'pending_hr_approval'
      }
    });
    console.log('✅ Hiring Request Created:', hiringRequest.id);
    
    console.log('2. Approving Hiring Request...');
    await prisma.hiringRequest.update({
      where: { id: hiringRequest.id },
      data: { status: 'approved', hrApprovedBy: superadmin.id }
    });
    console.log('✅ Request Approved');
    
    console.log('3. Creating Candidate...');
    const email = 'candidate.' + Date.now() + '@example.com';
    const candidate = await prisma.candidate.create({
      data: {
        organizationId,
        hiringRequestId: hiringRequest.id,
        name: 'John Candidate',
        email,
        phone: '1234567890',
        status: 'offer_sent'
      }
    });
    console.log('✅ Candidate Created:', candidate.id);
    
    console.log('4. Transitioning Candidate to Joined...');
    
    // Simulate the exact API logic from updateCandidateStatus in hiringController
    await prisma.$transaction(async (tx) => {
      await tx.candidate.update({
        where: { id: candidate.id },
        data: { status: 'joined', joinDate: new Date() }
      });
      
      const user = await tx.user.create({
        data: {
          organizationId: candidate.organizationId,
          email: candidate.email,
          name: candidate.name,
          password: 'password123', // Hardcoded default for test
          role: 'employee',
          status: 'active'
        }
      });
      
      const dept = await tx.hiringRequest.findUnique({ where: { id: candidate.hiringRequestId }});
      
      await tx.employeeProfile.create({
        data: {
          userId: user.id,
          organizationId: candidate.organizationId,
          employmentRole: 'probation',
          inductionStatus: 'pending',
          joinDate: new Date()
        }
      });
    });
    
    console.log('✅ Candidate Joined & Auto-Onboarded.');
    
    // Verify auto-onboarding
    const newUser = await prisma.user.findUnique({ where: { email } });
    const newProfile = await prisma.employeeProfile.findUnique({ where: { userId: newUser.id } });
    
    if (newUser && newProfile) {
      console.log('✅ Auto-onboarding successfully verified in Database!');
      console.log('User Role:', newUser.role);
      console.log('Induction Status:', newProfile.inductionStatus);
    }
    
    console.log('🎉 Verification Complete.');
    
  } catch (error) {
    console.error('Test Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
