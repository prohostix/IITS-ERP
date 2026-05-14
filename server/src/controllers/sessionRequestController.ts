import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import SessionRequest from '../models/SessionRequest';
import AdmissionSession from '../models/AdmissionSession';
import { asyncHandler } from '../utils/asyncHandler';

// @desc    Create session request (Study Center → Ops)
// @route   POST /api/v1/sessions/request
// @access  Private (center staff)
export const createSessionRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    centerId,
    centerName,
    sessionDetails,
  } = req.body;

  const sessionRequest = await SessionRequest.create({
    organizationId: req.user.organizationId,
    centerId,
    centerName,
    requestedBy: req.user._id,
    sessionDetails,
    status: 'pending',
  });

  // TODO: Send real-time notification to Ops
  // io.to(`role:ops_admin:${req.user.organizationId}`).emit('newSessionRequest', {
  //   requestId: sessionRequest._id,
  //   centerName,
  //   sessionName: sessionDetails.name,
  // });

  res.status(201).json({
    success: true,
    data: sessionRequest,
  });
});

// @desc    Get session requests
// @route   GET /api/v1/sessions/requests
// @access  Private (ops_admin, center staff)
export const getSessionRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, centerId } = req.query;

  const query: any = {
    organizationId: req.user.organizationId,
  };

  // Center staff can only see their own requests
  if (req.user.role !== 'ops_admin' && req.user.role !== 'superadmin') {
    query.requestedBy = req.user._id;
  }

  if (status) {
    query.status = status;
  }

  if (centerId) {
    query.centerId = centerId;
  }

  const requests = await SessionRequest.find(query)
    .populate('centerId', 'name address')
    .populate('requestedBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('sessionDetails.programId', 'name')
    .populate('sessionDetails.universityId', 'name')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

// @desc    Get single session request
// @route   GET /api/v1/sessions/requests/:id
// @access  Private
export const getSessionRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const request = await SessionRequest.findById(req.params.id)
    .populate('centerId', 'name address')
    .populate('requestedBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('sessionDetails.programId', 'name')
    .populate('sessionDetails.universityId', 'name');

  if (!request) {
    res.status(404);
    throw new Error('Session request not found');
  }

  // Authorization check
  if (
    req.user.role !== 'ops_admin' &&
    req.user.role !== 'superadmin' &&
    request.requestedBy.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Not authorized to view this request');
  }

  res.json({
    success: true,
    data: request,
  });
});

// @desc    Approve session request (Ops only)
// @route   PATCH /api/v1/sessions/requests/:id/approve
// @access  Private (ops_admin)
export const approveSessionRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const request = await SessionRequest.findById(req.params.id);

  if (!request) {
    res.status(404);
    throw new Error('Session request not found');
  }

  if (request.status !== 'pending') {
    res.status(400);
    throw new Error('Request has already been processed');
  }

  // Create the admission session
  const admissionSession = await AdmissionSession.create({
    organizationId: request.organizationId,
    name: request.sessionDetails.name,
    startDate: request.sessionDetails.startDate,
    endDate: request.sessionDetails.endDate,
    programId: request.sessionDetails.programId,
    universityId: request.sessionDetails.universityId,
    studyCenterId: request.centerId,
    capacity: request.sessionDetails.capacity,
    status: 'active',
    createdBy: req.user._id,
  });

  // Update request status
  request.status = 'approved';
  request.approvedBy = req.user._id;
  request.approvedAt = new Date();
  await request.save();

  // TODO: Send real-time notification to requester
  // io.to(`user:${request.requestedBy}`).emit('sessionRequestApproved', {
  //   requestId: request._id,
  //   sessionId: admissionSession._id,
  // });

  res.json({
    success: true,
    data: {
      request,
      session: admissionSession,
    },
    message: 'Session request approved and admission session created',
  });
});

// @desc    Reject session request (Ops only)
// @route   PATCH /api/v1/sessions/requests/:id/reject
// @access  Private (ops_admin)
export const rejectSessionRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { rejectionReason } = req.body;

  if (!rejectionReason) {
    res.status(400);
    throw new Error('Rejection reason is required');
  }

  const request = await SessionRequest.findById(req.params.id);

  if (!request) {
    res.status(404);
    throw new Error('Session request not found');
  }

  if (request.status !== 'pending') {
    res.status(400);
    throw new Error('Request has already been processed');
  }

  request.status = 'rejected';
  request.approvedBy = req.user._id;
  request.approvedAt = new Date();
  request.rejectionReason = rejectionReason;
  await request.save();

  // TODO: Send real-time notification to requester
  // io.to(`user:${request.requestedBy}`).emit('sessionRequestRejected', {
  //   requestId: request._id,
  //   reason: rejectionReason,
  // });

  res.json({
    success: true,
    data: request,
    message: 'Session request rejected',
  });
});

// @desc    Get session request statistics
// @route   GET /api/v1/sessions/stats
// @access  Private (ops_admin)
export const getSessionRequestStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await SessionRequest.aggregate([
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
