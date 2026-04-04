import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import WalletTopUp from '../models/WalletTopUp.js';
import StudyCenterWallet from '../models/StudyCenterWallet.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getWalletTopUps = asyncHandler(async (req: AuthRequest, res: Response) => {
  const query: any = { organizationId: req.user.organizationId };
  if (req.query.status) query.status = req.query.status;
  else query.status = 'pending'; // default to pending

  const topUps = await WalletTopUp.find(query)
    .populate('studyCenterId', 'name code email')
    .populate('verifiedBy', 'name email')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: topUps.length, data: topUps });
});

export const approveWalletTopUp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const topUp = await WalletTopUp.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });

  if (!topUp) {
    res.status(404).json({ success: false, message: 'Top-up request not found' });
    return;
  }

  if (topUp.status !== 'pending') {
    res.status(409).json({ success: false, message: 'Top-up request is not in pending status' });
    return;
  }

  // Credit wallet atomically
  const wallet = await StudyCenterWallet.findOneAndUpdate(
    { studyCenterId: topUp.studyCenterId },
    { $inc: { balance: topUp.amount } },
    { new: true, upsert: true }
  );

  topUp.status = 'approved';
  topUp.verifiedBy = req.user._id;
  topUp.verifiedAt = new Date();
  await topUp.save();

  res.status(200).json({ success: true, data: { topUp, wallet } });
});

export const rejectWalletTopUp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { remarks } = req.body;

  if (!remarks || remarks.trim().length === 0) {
    res.status(400).json({ success: false, message: 'remarks is required for rejection' });
    return;
  }

  const topUp = await WalletTopUp.findOne({
    _id: req.params.id,
    organizationId: req.user.organizationId,
  });

  if (!topUp) {
    res.status(404).json({ success: false, message: 'Top-up request not found' });
    return;
  }

  if (topUp.status !== 'pending') {
    res.status(409).json({ success: false, message: 'Top-up request is not in pending status' });
    return;
  }

  topUp.status = 'rejected';
  topUp.remarks = remarks;
  topUp.verifiedBy = req.user._id;
  topUp.verifiedAt = new Date();
  await topUp.save();

  res.status(200).json({ success: true, data: topUp });
});
