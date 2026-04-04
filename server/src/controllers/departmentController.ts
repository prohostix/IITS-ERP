import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Department from '../models/Department.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get all departments
// @route   GET /api/v1/departments
// @access  Private
export const getDepartments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = {};
  
  if (req.user.role !== 'superadmin') {
    query.organizationId = req.user.organizationId;
  }

  // Filter by parent department if specified
  if (req.query.parentDepartmentId) {
    query.parentDepartmentId = req.query.parentDepartmentId;
  } else if (req.query.topLevel === 'true') {
    // Only get top-level departments (no parent)
    query.parentDepartmentId = null;
  }

  const departments = await Department.find(query)
    .populate('organizationId', 'name')
    .populate('parentDepartmentId', 'name')
    .populate('managerId', 'name email designation')
    .populate('assistantManagerIds', 'name email designation');

  res.status(200).json({
    success: true,
    count: departments.length,
    data: departments,
  });
});

// @desc    Get single department
// @route   GET /api/v1/departments/:id
// @access  Private
export const getDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const department = await Department.findById(req.params.id)
    .populate('organizationId', 'name')
    .populate('parentDepartmentId', 'name')
    .populate('managerId', 'name email designation')
    .populate('assistantManagerIds', 'name email designation');

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: department,
  });
});

// @desc    Create department
// @route   POST /api/v1/departments
// @access  Private (OrgAdmin)
export const createDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  // If superadmin, organizationId must be provided in request body
  // Otherwise, use the user's organizationId
  if (req.user.role !== 'superadmin') {
    req.body.organizationId = req.user.organizationId;
  } else if (!req.body.organizationId) {
    res.status(400).json({ 
      success: false, 
      message: 'Organization ID is required for superadmin' 
    });
    return;
  }

  const department = await Department.create(req.body);

  res.status(201).json({
    success: true,
    data: department,
  });
});

// @desc    Update department
// @route   PUT /api/v1/departments/:id
// @access  Private (OrgAdmin)
export const updateDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const department = await Department.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: department,
  });
});

// @desc    Delete department
// @route   DELETE /api/v1/departments/:id
// @access  Private (OrgAdmin)
export const deleteDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const department = await Department.findByIdAndDelete(req.params.id);

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Assign manager to department
// @route   PUT /api/v1/departments/:id/assign-manager
// @access  Private (OrgAdmin, Superadmin)
export const assignManager = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { managerId } = req.body;

  if (!managerId) {
    res.status(400).json({ success: false, message: 'Manager ID is required' });
    return;
  }

  const department = await Department.findByIdAndUpdate(
    req.params.id,
    { managerId },
    { new: true, runValidators: true }
  ).populate('managerId', 'name email designation');

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: department,
    message: 'Manager assigned successfully',
  });
});

// @desc    Remove manager from department
// @route   DELETE /api/v1/departments/:id/remove-manager
// @access  Private (OrgAdmin, Superadmin)
export const removeManager = asyncHandler(async (req: AuthRequest, res: Response) => {
  const department = await Department.findByIdAndUpdate(
    req.params.id,
    { managerId: null },
    { new: true }
  );

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: department,
    message: 'Manager removed successfully',
  });
});

// @desc    Add assistant manager to department
// @route   POST /api/v1/departments/:id/assistant-managers
// @access  Private (OrgAdmin, Superadmin)
export const addAssistantManager = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, message: 'User ID is required' });
    return;
  }

  const department = await Department.findById(req.params.id);

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  // Check if already an assistant manager
  if (department.assistantManagerIds?.some(id => id.toString() === userId)) {
    res.status(400).json({ success: false, message: 'User is already an assistant manager' });
    return;
  }

  department.assistantManagerIds = department.assistantManagerIds || [];
  department.assistantManagerIds.push(userId);
  await department.save();

  await department.populate('assistantManagerIds', 'name email designation');

  res.status(200).json({
    success: true,
    data: department,
    message: 'Assistant manager added successfully',
  });
});

// @desc    Remove assistant manager from department
// @route   DELETE /api/v1/departments/:id/assistant-managers/:userId
// @access  Private (OrgAdmin, Superadmin)
export const removeAssistantManager = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  const department = await Department.findById(req.params.id);

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  department.assistantManagerIds = department.assistantManagerIds?.filter(
    id => id.toString() !== userId
  ) || [];
  
  await department.save();

  res.status(200).json({
    success: true,
    data: department,
    message: 'Assistant manager removed successfully',
  });
});

// @desc    Get sub-departments
// @route   GET /api/v1/departments/:id/sub-departments
// @access  Private
export const getSubDepartments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subDepartments = await Department.find({ 
    parentDepartmentId: req.params.id 
  })
    .populate('managerId', 'name email designation')
    .populate('assistantManagerIds', 'name email designation');

  res.status(200).json({
    success: true,
    count: subDepartments.length,
    data: subDepartments,
  });
});

// @desc    Create sub-department
// @route   POST /api/v1/departments/:id/sub-departments
// @access  Private (OrgAdmin, Department Manager)
export const createSubDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parentDepartment = await Department.findById(req.params.id);

  if (!parentDepartment) {
    res.status(404).json({ success: false, message: 'Parent department not found' });
    return;
  }

  req.body.organizationId = parentDepartment.organizationId;
  req.body.parentDepartmentId = req.params.id;
  req.body.type = parentDepartment.type; // Inherit type from parent

  const subDepartment = await Department.create(req.body);

  res.status(201).json({
    success: true,
    data: subDepartment,
    message: 'Sub-department created successfully',
  });
});

// @desc    Get department hierarchy (with sub-departments)
// @route   GET /api/v1/departments/:id/hierarchy
// @access  Private
export const getDepartmentHierarchy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const department = await Department.findById(req.params.id)
    .populate('managerId', 'name email designation')
    .populate('assistantManagerIds', 'name email designation');

  if (!department) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  const subDepartments = await Department.find({ 
    parentDepartmentId: req.params.id 
  })
    .populate('managerId', 'name email designation')
    .populate('assistantManagerIds', 'name email designation');

  res.status(200).json({
    success: true,
    data: {
      department,
      subDepartments,
    },
  });
});

// @desc    Get departments managed by user
// @route   GET /api/v1/departments/my-departments
// @access  Private
export const getMyDepartments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const departments = await Department.find({
    $or: [
      { managerId: req.user._id },
      { assistantManagerIds: req.user._id }
    ]
  })
    .populate('organizationId', 'name')
    .populate('parentDepartmentId', 'name')
    .populate('managerId', 'name email designation')
    .populate('assistantManagerIds', 'name email designation');

  res.status(200).json({
    success: true,
    count: departments.length,
    data: departments,
  });
});
