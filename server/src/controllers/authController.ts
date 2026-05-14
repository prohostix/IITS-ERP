import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import User from '../models/User.js';
import { generateToken, generateRefreshToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public (or Superadmin/OrgAdmin only)
export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    organizationId,
    departmentId,
    subDepartmentId,
    email,
    password,
    name,
    role,
    phone,
    designation,
    reportingTo,
  } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400).json({ success: false, message: 'User already exists' });
    return;
  }

  // Create user
  const user = await User.create({
    organizationId,
    departmentId,
    subDepartmentId,
    email,
    password,
    name,
    role,
    phone,
    designation,
    reportingTo,
  });

  if (user) {
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id.toString()),
      },
    });
  } else {
    res.status(400).json({ success: false, message: 'Invalid user data' });
  }
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ 
      success: false, 
      message: 'Please provide email and password' 
    });
    return;
  }

  // Check for user
  const user = await User.findOne({ email })
    .select('+password')
    .populate('organizationId')
    .populate('departmentId')
    .populate('subDepartmentId', 'name parentDeptId assignedUniversities assignedPrograms assignedCenters');

  if (!user) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  // Check if password matches
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  // For center_admin, include center status so frontend can gate the dashboard
  let centerStatus: string | null = null;
  if (user.role === 'center_admin' && user.studyCenterId) {
    const StudyCenter = (await import('../models/StudyCenter.js')).default;
    const center = await StudyCenter.findById(user.studyCenterId).select('status');
    centerStatus = center?.status ?? null;
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        departmentId: user.departmentId,
        subDepartmentId: user.subDepartmentId,
        studyCenterId: user.studyCenterId,
        designation: user.designation,
        status: user.status,
        ...(centerStatus !== null && { centerStatus }),
      },
      token,
      refreshToken,
    },
  });
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user._id)
    .populate('organizationId')
    .populate('departmentId')
    .populate('subDepartmentId', 'name parentDeptId assignedUniversities assignedPrograms assignedCenters')
    .populate('reportingTo', 'name email designation');

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
export const updateDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
  };

  const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
export const updatePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  // Check current password
  const isMatch = await user.comparePassword(req.body.currentPassword);

  if (!isMatch) {
    res.status(401).json({ success: false, message: 'Password is incorrect' });
    return;
  }

  user.password = req.body.newPassword;
  await user.save();

  const token = generateToken(user._id.toString());

  res.status(200).json({
    success: true,
    data: { token },
  });
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(200).json({
    success: true,
    data: {},
  });
});
