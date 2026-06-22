// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword, generateUserId } from '../utils/authUtils.js';

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: any = {};
  
  if (req.user.role !== 'superadmin') {
    where.organizationId = req.user.organizationId;
  }

  if (req.query.role) {
    where.role = req.query.role as string;
  } else {
    // Exclude study center admins from the general user list
    where.role = { not: 'center_admin' };
  }
  
  if (req.query.departmentId) where.departmentId = req.query.departmentId as string;
  if (req.query.status) where.status = req.query.status as string;

  const users = await prisma.user.findMany({
    where,
    include: {
      organization: { select: { name: true } },
      department: { select: { name: true } },
    }
  });

  res.status(200).json({ success: true, count: users.length, data: users });
});

export const getUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      organization: true,
      department: true,
    }
  });

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  res.status(200).json({ success: true, data: user });
});

export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user.role !== 'superadmin') {
    req.body.organizationId = req.user.organizationId;
  }

  // Generate userId and hash password if not provided
  if (!req.body.userId) {
    req.body.userId = await generateUserId();
  }
  
  if (req.body.password) {
    req.body.password = await hashPassword(req.body.password);
  }

  const user = await prisma.user.create({
    data: req.body
  });
  
  res.status(201).json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userExists = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!userExists) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  // If password is being updated, hash it
  if (req.body.password) {
    req.body.password = await hashPassword(req.body.password);
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: req.body
  });

  res.status(200).json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  await prisma.user.delete({
    where: { id: req.params.id }
  });

  res.status(200).json({ success: true, data: {} });
});

export const bulkImportUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { users } = req.body;

  if (!Array.isArray(users)) {
    res.status(400).json({ success: false, message: 'Invalid payload: users must be an array' });
    return;
  }

  const organizationId = req.user.role === 'superadmin' ? (req.body.organizationId || req.user.organizationId) : req.user.organizationId;
  
  if (!organizationId && req.user.role !== 'superadmin') {
    res.status(400).json({ success: false, message: 'Organization ID is required' });
    return;
  }

  // Fetch departments of the organization for name lookup
  const departments = await prisma.department.findMany({
    where: { organizationId }
  });

  const results = {
    total: users.length,
    successCount: 0,
    failedCount: 0,
    errors: [] as any[]
  };

  // Track emails inside this payload to prevent duplicates within the upload itself
  const processedEmails = new Set<string>();

  for (let i = 0; i < users.length; i++) {
    const rawUser = users[i];
    const rowNum = i + 2; // Row number in Excel (header is row 1)

    const name = rawUser.name?.toString().trim();
    const email = rawUser.email?.toString().trim().toLowerCase();
    const password = rawUser.password?.toString() || 'Welcome@123';
    const role = rawUser.role?.toString().trim().toLowerCase();
    const departmentName = rawUser.department?.toString().trim();
    const canAddPrograms = ['true', 'yes', '1', 'y'].includes(rawUser.canAddPrograms?.toString().trim().toLowerCase());

    if (!name || !email || !role) {
      results.failedCount++;
      results.errors.push({
        row: rowNum,
        email: email || 'Unknown',
        message: 'Name, Email, and Role are required fields'
      });
      continue;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      results.failedCount++;
      results.errors.push({
        row: rowNum,
        email,
        message: 'Invalid email format'
      });
      continue;
    }

    // Check duplicate in payload
    if (processedEmails.has(email)) {
      results.failedCount++;
      results.errors.push({
        row: rowNum,
        email,
        message: 'Duplicate email in the upload file'
      });
      continue;
    }
    processedEmails.add(email);

    // Validate role
    const validRoles = ['org_admin', 'ceo', 'hr_admin', 'finance_admin', 'ops_admin', 'sales_admin', 'center_admin', 'employee'];
    if (!validRoles.includes(role)) {
      results.failedCount++;
      results.errors.push({
        row: rowNum,
        email,
        message: `Invalid role: "${role}". Must be one of: ${validRoles.join(', ')}`
      });
      continue;
    }

    // Role restrictions for non-superadmins
    if (req.user.role !== 'superadmin' && role === 'superadmin') {
      results.failedCount++;
      results.errors.push({
        row: rowNum,
        email,
        message: 'You are not authorized to import superadmin users'
      });
      continue;
    }

    // Check duplicate in DB
    const dbUserExists = await prisma.user.findUnique({
      where: { email }
    });
    if (dbUserExists) {
      results.failedCount++;
      results.errors.push({
        row: rowNum,
        email,
        message: 'A user with this email already exists in the system'
      });
      continue;
    }

    // Map departmentName to departmentId
    let departmentId = null;
    if (departmentName) {
      const matchedDept = departments.find(
        (d) => d.name.toLowerCase() === departmentName.toLowerCase()
      );
      if (matchedDept) {
        departmentId = matchedDept.id;
      } else {
        results.failedCount++;
        results.errors.push({
          row: rowNum,
          email,
          message: `Department "${departmentName}" not found in this organization`
        });
        continue;
      }
    }

    try {
      const generatedId = await generateUserId();
      const hashedPassword = await hashPassword(password);

      await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          userId: generatedId,
          organizationId,
          departmentId,
          canAddPrograms,
          status: 'active'
        }
      });

      results.successCount++;
    } catch (err: any) {
      results.failedCount++;
      results.errors.push({
        row: rowNum,
        email,
        message: err.message || 'Database error occurred while creating user'
      });
    }
  }

  res.status(200).json({
    success: true,
    data: results
  });
});
