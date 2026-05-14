import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import EditDeleteRequest from '../models/EditDeleteRequest';
import { asyncHandler } from '../utils/asyncHandler';

// @desc    Submit edit/delete request (Ops → Finance)
// @route   POST /api/v1/edit-delete/request
// @access  Private (ops_admin)
export const submitEditDeleteRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    targetCollection,
    targetId,
    requestType,
    message,
    proposedChanges,
    currentData,
  } = req.body;

  if (!['edit', 'delete'].includes(requestType)) {
    res.status(400);
    throw new Error('Request type must be edit or delete');
  }

  const editDeleteRequest = await EditDeleteRequest.create({
    organizationId: req.user.organizationId,
    requesterId: req.user._id,
    requesterName: req.user.name,
    targetCollection,
    targetId,
    requestType,
    message,
    proposedChanges,
    currentData,
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    data: editDeleteRequest,
  });
});

// @desc    Get edit/delete requests (filtered by role)
// @route   GET /api/v1/edit-delete/requests
// @access  Private (ops_admin, finance_admin)
export const getEditDeleteRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, requestType } = req.query;

  const query: any = {
    organizationId: req.user.organizationId,
  };

  // Ops can only see their own requests
  if (req.user.role === 'ops_admin') {
    query.requesterId = req.user._id;
  }

  if (status) {
    query.status = status;
  }

  if (requestType) {
    query.requestType = requestType;
  }

  const requests = await EditDeleteRequest.find(query)
    .populate('requesterId', 'name email role')
    .populate('respondedBy', 'name email role')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

// @desc    Get single edit/delete request
// @route   GET /api/v1/edit-delete/requests/:id
// @access  Private (ops_admin, finance_admin)
export const getEditDeleteRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const request = await EditDeleteRequest.findById(req.params.id)
    .populate('requesterId', 'name email role')
    .populate('respondedBy', 'name email role');

  if (!request) {
    res.status(404);
    throw new Error('Edit/delete request not found');
  }

  // Ops can only view their own requests
  if (req.user.role === 'ops_admin' && request.requesterId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view this request');
  }

  res.json({
    success: true,
    data: request,
  });
});

// @desc    Approve/Reject edit/delete request (Finance only)
// @route   PATCH /api/v1/edit-delete/requests/:id
// @access  Private (finance_admin)
export const respondToEditDeleteRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, responseRemarks } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('Status must be approved or rejected');
  }

  const request = await EditDeleteRequest.findById(req.params.id);

  if (!request) {
    res.status(404);
    throw new Error('Edit/delete request not found');
  }

  if (request.status !== 'pending') {
    res.status(400);
    throw new Error('Request has already been processed');
  }

  request.status = status;
  request.respondedBy = req.user._id;
  request.respondedAt = new Date();
  request.responseRemarks = responseRemarks;

  await request.save();

  // TODO: Send real-time notification via Socket.io
  // io.to(`user:${request.requesterId}`).emit('editDeleteRequestResponse', {
  //   requestId: request._id,
  //   status,
  //   responseRemarks,
  // });

  res.json({
    success: true,
    data: request,
    message: status === 'approved' 
      ? 'Request approved. Please proceed with the operation manually.'
      : 'Request rejected.',
  });
});

// @desc    Get edit/delete request statistics
// @route   GET /api/v1/edit-delete/stats
// @access  Private (finance_admin)
export const getEditDeleteStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await EditDeleteRequest.aggregate([
    {
      $match: {
        organizationId: req.user.organizationId,
      },
    },
    {
      $group: {
        _id: {
          status: '$status',
          requestType: '$requestType',
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const formattedStats = {
    pending: { edit: 0, delete: 0 },
    approved: { edit: 0, delete: 0 },
    rejected: { edit: 0, delete: 0 },
  };

  stats.forEach((stat) => {
    const status = stat._id.status;
    const type = stat._id.requestType;
    if (formattedStats[status as keyof typeof formattedStats]) {
      formattedStats[status as keyof typeof formattedStats][type as 'edit' | 'delete'] = stat.count;
    }
  });

  res.json({
    success: true,
    data: formattedStats,
  });
});
