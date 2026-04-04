import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import CredentialRequest from '../models/CredentialRequest';
import { asyncHandler } from '../utils/asyncHandler';

// @desc    Submit credential reveal request (Ops → Finance)
// @route   POST /api/v1/credentials/request
// @access  Private (ops_admin)
export const submitCredentialRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    targetCredential,
    targetCollection,
    targetId,
    remarks,
  } = req.body;

  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

  const credentialRequest = await CredentialRequest.create({
    organizationId: req.user.organizationId,
    requesterId: req.user._id,
    requesterName: req.user.name,
    requesterRole: req.user.role,
    ipAddress,
    targetCredential,
    targetCollection,
    targetId,
    remarks,
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    data: credentialRequest,
  });
});

// @desc    Get credential requests (filtered by role)
// @route   GET /api/v1/credentials/requests
// @access  Private (ops_admin, finance_admin)
export const getCredentialRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.query;

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

  const requests = await CredentialRequest.find(query)
    .populate('requesterId', 'name email role')
    .populate('respondedBy', 'name email role')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

// @desc    Get single credential request
// @route   GET /api/v1/credentials/requests/:id
// @access  Private (ops_admin, finance_admin)
export const getCredentialRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const request = await CredentialRequest.findById(req.params.id)
    .populate('requesterId', 'name email role')
    .populate('respondedBy', 'name email role');

  if (!request) {
    res.status(404);
    throw new Error('Credential request not found');
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

// @desc    Approve/Reject credential request (Finance only)
// @route   PATCH /api/v1/credentials/requests/:id
// @access  Private (finance_admin)
export const respondToCredentialRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, responseRemarks } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('Status must be approved or rejected');
  }

  const request = await CredentialRequest.findById(req.params.id);

  if (!request) {
    res.status(404);
    throw new Error('Credential request not found');
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
  // io.to(`user:${request.requesterId}`).emit('credentialRequestResponse', {
  //   requestId: request._id,
  //   status,
  //   responseRemarks,
  // });

  res.json({
    success: true,
    data: request,
  });
});

// @desc    Get credential request statistics
// @route   GET /api/v1/credentials/stats
// @access  Private (finance_admin)
export const getCredentialStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await CredentialRequest.aggregate([
    {
      $match: {
        organizationId: req.user.organizationId,
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const formattedStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  stats.forEach((stat) => {
    formattedStats[stat._id as keyof typeof formattedStats] = stat.count;
  });

  res.json({
    success: true,
    data: formattedStats,
  });
});
