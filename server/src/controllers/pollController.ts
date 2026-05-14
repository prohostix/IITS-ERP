import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Poll from '../models/Poll.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPolls = asyncHandler(async (req: AuthRequest, res: Response) => {
  const polls = await Poll.find({ organizationId: req.user.organizationId })
    .populate('createdBy', 'name')
    .sort('-createdAt');
  res.json({ success: true, count: polls.length, data: polls });
});

export const createPoll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { question, options, expiresAt, allowMultiple } = req.body;
  if (!question || !options || options.length < 2) {
    res.status(400).json({ success: false, message: 'Question and at least 2 options are required' });
    return;
  }
  const poll = await Poll.create({
    organizationId: req.user.organizationId,
    question,
    options: options.map((text: string) => ({ text, votes: [] })),
    createdBy: req.user._id,
    expiresAt: expiresAt || undefined,
    allowMultiple: allowMultiple || false,
    isActive: true,
  });
  res.status(201).json({ success: true, data: poll });
});

export const updatePoll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const poll = await Poll.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.user.organizationId },
    { question: req.body.question, expiresAt: req.body.expiresAt, isActive: req.body.isActive },
    { new: true }
  );
  if (!poll) { res.status(404).json({ success: false, message: 'Poll not found' }); return; }
  res.json({ success: true, data: poll });
});

export const deletePoll = asyncHandler(async (req: AuthRequest, res: Response) => {
  await Poll.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
  res.json({ success: true, data: {} });
});

export const votePoll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { optionIndexes } = req.body; // array of indexes
  if (!Array.isArray(optionIndexes) || optionIndexes.length === 0) {
    res.status(400).json({ success: false, message: 'optionIndexes array required' });
    return;
  }

  const poll = await Poll.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
  if (!poll) { res.status(404).json({ success: false, message: 'Poll not found' }); return; }
  if (!poll.isActive) { res.status(400).json({ success: false, message: 'Poll is closed' }); return; }
  if (poll.expiresAt && poll.expiresAt < new Date()) {
    res.status(400).json({ success: false, message: 'Poll has expired' }); return;
  }

  const userId = req.user._id.toString();

  // Remove existing votes from this user
  poll.options.forEach(opt => {
    opt.votes = opt.votes.filter(v => v.toString() !== userId) as any;
  });

  // Add new votes
  const indexes = poll.allowMultiple ? optionIndexes : [optionIndexes[0]];
  for (const idx of indexes) {
    if (idx >= 0 && idx < poll.options.length) {
      poll.options[idx].votes.push(req.user._id as any);
    }
  }

  await poll.save();
  res.json({ success: true, data: poll });
});
