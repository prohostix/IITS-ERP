import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = {};
  
  if (req.user.role !== 'superadmin') {
    query.organizationId = req.user.organizationId;
  }

  if (req.query.role) query.role = req.query.role;
  if (req.query.departmentId) query.departmentId = req.query.departmentId;
  if (req.query.status) query.status = req.query.status;

  const users = await User.find(query)
    .populate('organizationId', 'name')
    .populate('departmentId', 'name')
    .populate('reportingTo', 'name email');

  res.status(200).json({ success: true, count: users.length, data: users });
});

export const getUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id)
    .populate('organizationId')
    .populate('departmentId')
    .populate('reportingTo', 'name email designation');

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

  const user = await User.create(req.body);
  res.status(201).json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  res.status(200).json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});
