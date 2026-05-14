import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import License from '../models/License.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getLicenses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const licenses = await License.find();
  res.status(200).json({ success: true, count: licenses.length, data: licenses });
});

export const getLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const license = await License.findById(req.params.id);
  if (!license) {
    res.status(404).json({ success: false, message: 'License not found' });
    return;
  }
  res.status(200).json({ success: true, data: license });
});

export const createLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const license = await License.create(req.body);
  res.status(201).json({ success: true, data: license });
});

export const updateLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const license = await License.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!license) {
    res.status(404).json({ success: false, message: 'License not found' });
    return;
  }
  res.status(200).json({ success: true, data: license });
});

export const deleteLicense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const license = await License.findByIdAndDelete(req.params.id);
  if (!license) {
    res.status(404).json({ success: false, message: 'License not found' });
    return;
  }
  res.status(200).json({ success: true, data: {} });
});
