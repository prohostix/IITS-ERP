import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Escalation from '../models/Escalation.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getEscalations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.status) query.status = req.query.status;
  if (req.query.type) query.type = req.query.type;

  const escalations = await Escalation.find(query)
    .populate('raisedBy', 'name email')
    .sort('-raisedAt');

  res.status(200).json({ success: true, count: escalations.length, data: escalations });
});

export const getEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalation = await Escalation.findById(req.params.id)
    .populate('raisedBy', 'name email')
    .populate('chain.userId', 'name email role');

  if (!escalation) {
    res.status(404).json({ success: false, message: 'Escalation not found' });
    return;
  }

  res.status(200).json({ success: true, data: escalation });
});

export const createEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  req.body.organizationId = req.user.organizationId;
  req.body.raisedBy = req.user._id;

  const escalation = await Escalation.create(req.body);
  res.status(201).json({ success: true, data: escalation });
});

export const updateEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalation = await Escalation.findById(req.params.id);

  if (!escalation) {
    res.status(404).json({ success: false, message: 'Escalation not found' });
    return;
  }

  if (req.body.action) {
    escalation.chain.push({
      level: escalation.currentLevel,
      role: req.user.role,
      userId: req.user._id,
      action: req.body.action,
      actionAt: new Date(),
      remarks: req.body.remarks,
    });

    if (req.body.action === 'resolve') {
      escalation.status = 'resolved';
    } else if (req.body.action === 'escalate') {
      escalation.currentLevel += 1;
    }

    await escalation.save();
  }

  res.status(200).json({ success: true, data: escalation });
});

export const deleteEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalation = await Escalation.findByIdAndDelete(req.params.id);

  if (!escalation) {
    res.status(404).json({ success: false, message: 'Escalation not found' });
    return;
  }

  res.status(200).json({ success: true, data: {} });
});

export const resolveEscalation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const escalation = await Escalation.findById(req.params.id);

  if (!escalation) {
    res.status(404).json({ success: false, message: 'Escalation not found' });
    return;
  }

  escalation.status = 'resolved';
  escalation.chain.push({
    level: escalation.currentLevel,
    role: req.user.role,
    userId: req.user._id,
    action: 'resolve',
    actionAt: new Date(),
    remarks: req.body.remarks || 'Resolved',
  });

  await escalation.save();

  res.status(200).json({ success: true, data: escalation });
});

