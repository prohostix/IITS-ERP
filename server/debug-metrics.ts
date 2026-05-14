import { prisma } from './src/config/postgres.js';

async function debugMetrics() {
  try {
    const role = 'superadmin';
    const orgId = null; // or whatever the superadmin has

    console.log('Testing superadmin metrics...');
    const metrics: any = {};

    metrics.totalOrganizations = await prisma.organization.count();
    console.log('totalOrganizations:', metrics.totalOrganizations);

    metrics.activeOrganizations = await prisma.organization.count({ where: { status: 'active' } });
    console.log('activeOrganizations:', metrics.activeOrganizations);

    const userWhere: any = { organizationId: orgId };
    metrics.totalEmployees = await prisma.user.count({ where: userWhere });
    console.log('totalEmployees:', metrics.totalEmployees);

    metrics.totalStudents = await prisma.student.count({ where: { organizationId: orgId } });
    console.log('totalStudents:', metrics.totalStudents);

    metrics.totalCenters = await prisma.studyCenter.count({ where: { organizationId: orgId } });
    console.log('totalCenters:', metrics.totalCenters);

    metrics.activeCenters = await prisma.studyCenter.count({ 
      where: { organizationId: orgId, status: 'active' } 
    });
    console.log('activeCenters:', metrics.activeCenters);

    metrics.totalDepartments = await prisma.department.count({ where: { organizationId: orgId } });
    console.log('totalDepartments:', metrics.totalDepartments);

    metrics.totalPrograms = await prisma.program.count({ where: { organizationId: orgId } });
    console.log('totalPrograms:', metrics.totalPrograms);

    console.log('All metrics fetched successfully!');
  } catch (error) {
    console.error('❌ Error fetching metrics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMetrics();
