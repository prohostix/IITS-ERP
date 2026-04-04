import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import SubDepartment from '../models/SubDepartment.js';
import University from '../models/University.js';
import Program from '../models/Program.js';
import StudyCenter from '../models/StudyCenter.js';
import User from '../models/User.js';
import Department from '../models/Department.js';

dotenv.config();

const seed = async () => {
  await connectDatabase();

  // Find the organization
  const orgAdmin = await User.findOne({ role: 'org_admin' });
  if (!orgAdmin) { console.error('No org_admin found'); process.exit(1); }
  const orgId = orgAdmin.organizationId;
  console.log('Org ID:', orgId);

  // Find ops and sales departments
  const opsDept = await Department.findOne({ organizationId: orgId, type: 'operations' });
  const salesDept = await Department.findOne({ organizationId: orgId, type: 'sales' });
  console.log('Ops dept:', opsDept?.name, '| Sales dept:', salesDept?.name);

  // Create universities
  const uni1 = await University.findOneAndUpdate(
    { organizationId: orgId, code: 'GU001' },
    { organizationId: orgId, name: 'Global University', code: 'GU001', status: 'active' },
    { upsert: true, new: true }
  );
  const uni2 = await University.findOneAndUpdate(
    { organizationId: orgId, code: 'NU002' },
    { organizationId: orgId, name: 'National University', code: 'NU002', status: 'active' },
    { upsert: true, new: true }
  );
  console.log('Universities:', uni1.name, uni2.name);

  // Create programs
  const prog1 = await Program.findOneAndUpdate(
    { organizationId: orgId, code: 'MBA001' },
    { organizationId: orgId, name: 'MBA', code: 'MBA001', duration: 2, status: 'active', universityId: uni1._id },
    { upsert: true, new: true }
  );
  const prog2 = await Program.findOneAndUpdate(
    { organizationId: orgId, code: 'BCA002' },
    { organizationId: orgId, name: 'BCA', code: 'BCA002', duration: 3, status: 'active', universityId: uni1._id },
    { upsert: true, new: true }
  );
  console.log('Programs:', prog1.name, prog2.name);

  // Create study centers
  const center1 = await StudyCenter.findOneAndUpdate(
    { organizationId: orgId, code: 'SC001' },
    { organizationId: orgId, name: 'Delhi Study Center', code: 'SC001', city: 'Delhi', state: 'Delhi', status: 'active', associatedUniversityIds: [uni1._id] },
    { upsert: true, new: true }
  );
  const center2 = await StudyCenter.findOneAndUpdate(
    { organizationId: orgId, code: 'SC002' },
    { organizationId: orgId, name: 'Mumbai Study Center', code: 'SC002', city: 'Mumbai', state: 'Maharashtra', status: 'active', associatedUniversityIds: [uni2._id] },
    { upsert: true, new: true }
  );
  console.log('Centers:', center1.name, center2.name);

  // Create sub-departments
  if (opsDept) {
    const subOps = await SubDepartment.findOneAndUpdate(
      { organizationId: orgId, name: 'SkillVoc Ops Branch' },
      {
        organizationId: orgId,
        name: 'SkillVoc Ops Branch',
        parentDeptId: opsDept._id,
        assignedUniversities: [uni1._id, uni2._id],
        assignedPrograms: [prog1._id, prog2._id],
        assignedCenters: [center1._id, center2._id],
        status: 'active',
      },
      { upsert: true, new: true }
    );
    console.log('Sub-dept (ops):', subOps.name, subOps._id);

    // Assign MK to this sub-department
    const mk = await User.findOne({ email: 'ops@iitseducation.org' });
    if (mk) {
      await User.findByIdAndUpdate(mk._id, { subDepartmentId: subOps._id });
      console.log('Assigned MK to sub-dept:', subOps.name);
    } else {
      console.log('MK user not found by email ops@iitseducation.org');
      // Try to find by name
      const mkByName = await User.findOne({ name: 'MK', organizationId: orgId });
      if (mkByName) {
        await User.findByIdAndUpdate(mkByName._id, { subDepartmentId: subOps._id });
        console.log('Assigned MK (by name) to sub-dept:', subOps.name);
      }
    }
  }

  if (salesDept) {
    const subSales = await SubDepartment.findOneAndUpdate(
      { organizationId: orgId, name: 'SkillVoc Sales Branch' },
      {
        organizationId: orgId,
        name: 'SkillVoc Sales Branch',
        parentDeptId: salesDept._id,
        assignedUniversities: [uni1._id],
        assignedPrograms: [prog1._id],
        assignedCenters: [center1._id],
        status: 'active',
      },
      { upsert: true, new: true }
    );
    console.log('Sub-dept (sales):', subSales.name, subSales._id);

    // Assign Sharoon to this sub-department
    const sharoon = await User.findOne({ email: 'sales@iitseducation.org' });
    if (sharoon) {
      await User.findByIdAndUpdate(sharoon._id, { subDepartmentId: subSales._id });
      console.log('Assigned Sharoon to sub-dept:', subSales.name);
    } else {
      const sharoonByName = await User.findOne({ name: 'Sharoon', organizationId: orgId });
      if (sharoonByName) {
        await User.findByIdAndUpdate(sharoonByName._id, { subDepartmentId: subSales._id });
        console.log('Assigned Sharoon (by name) to sub-dept:', subSales.name);
      }
    }
  }

  console.log('\n✅ Seed complete! Users need to log out and back in to see changes.');
  process.exit(0);
};

seed().catch(e => { console.error(e); process.exit(1); });
