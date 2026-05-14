// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getPolls = asyncHandler(async (req: AuthRequest, res: Response) => {
  const polls = await prisma.poll.findMany({
    where: { organizationId: req.user.organizationId },
    include: { assigner: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, count: polls.length, data: polls });
});

export const createPoll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { question, options, expiresAt, allowMultiple } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2) {
    res.status(400).json({ success: false, message: 'Question and 2 options required' });
    return;
  }

  const poll = await prisma.poll.create({
    data: {
      organizationId: req.user.organizationId,
      question,
      options: options.map(text => ({ text, votes: [] })),
      createdBy: req.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      allowMultiple: allowMultiple || false,
      isActive: true,
    },
  });

  res.status(201).json({ success: true, data: poll });
});

export const updatePoll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const poll = await prisma.poll.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json({ success: true, data: poll });
});

export const deletePoll = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.poll.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: {} });
});

export const votePoll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { optionIndexes } = req.body;
  const pollId = req.params.id;

  const poll = await prisma.poll.findUnique({
    where: { id: pollId }
  });

  if (!poll || !poll.isActive) {
    res.status(404).json({ success: false, message: 'Poll not found or closed' });
    return;
  }

  const options = poll.options as any[];
  const userId = req.user.id;

  const newOptions = options.map((opt, idx) => {
    let filteredVotes = opt.votes.filter((v: string) => v !== userId);
    if (optionIndexes.includes(idx)) {
      if (poll.allowMultiple || optionIndexes.indexOf(idx) === 0) {
        filteredVotes.push(userId);
      }
    }
    return { ...opt, votes: filteredVotes };
  });

  const updatedPoll = await prisma.poll.update({
    where: { id: pollId },
    data: { options: newOptions }
  });

  res.json({ success: true, data: updatedPoll });
});
