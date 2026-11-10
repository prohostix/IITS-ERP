const prisma = require('../dist/lib/prisma.js').default;

async function syncReporting() {
  console.log('--- Starting Org Hierarchy reportingTo synchronization ---');
  
  const designations = await prisma.designation.findMany({
    where: { status: { not: 'deleted' } },
    select: { id: true, title: true, parentDesignationId: true, branchId: true, organizationId: true }
  });

  const users = await prisma.user.findMany({
    where: { status: 'active', designationId: { not: null } },
    select: { id: true, name: true, designationId: true, branchId: true, reportingTo: true, organizationId: true }
  });

  console.log(`Found ${designations.length} active designations and ${users.length} active users with designations.`);

  // Map designationId -> user(s)
  const desigToUsers = new Map();
  for (const u of users) {
    if (!desigToUsers.has(u.designationId)) {
      desigToUsers.set(u.designationId, []);
    }
    desigToUsers.get(u.designationId).push(u);
  }

  const desigMap = new Map();
  for (const d of designations) {
    desigMap.set(d.id, d);
  }

  let updatedCount = 0;
  for (const u of users) {
    const desig = desigMap.get(u.designationId);
    if (!desig || !desig.parentDesignationId) continue;

    const parentDesig = desigMap.get(desig.parentDesignationId);
    const candidateManagers = desigToUsers.get(desig.parentDesignationId) || [];

    if (candidateManagers.length === 0) {
      console.log(`  [NO MANAGER] ${u.name} (${desig.title}) -> Parent desig "${parentDesig?.title || desig.parentDesignationId}" has no assigned user.`);
      continue;
    }

    // Match candidate manager: if user has branchId, prefer manager with same branchId
    let manager = candidateManagers[0];
    if (u.branchId && candidateManagers.length > 1) {
      const branchMatch = candidateManagers.find(m => m.branchId === u.branchId);
      if (branchMatch) manager = branchMatch;
    }

    if (manager.id === u.id) continue;

    if (u.reportingTo !== manager.id) {
      console.log(`  [UPDATE] ${u.name} (${desig.title}) -> reports to: ${manager.name} (${parentDesig?.title || 'Manager'})`);
      await prisma.user.update({
        where: { id: u.id },
        data: { reportingTo: manager.id }
      });
      updatedCount++;
    } else {
      console.log(`  [OK] ${u.name} (${desig.title}) -> already reports to ${manager.name}`);
    }
  }

  console.log(`\nSynchronization finished. Total users updated: ${updatedCount}`);
  await prisma.$disconnect();
}

syncReporting().catch(err => {
  console.error('Error syncing reporting chain:', err);
  process.exit(1);
});
