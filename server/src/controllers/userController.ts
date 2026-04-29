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

  if (req.query.role) where.role = req.query.role as string;
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
