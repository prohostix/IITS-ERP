// @ts-nocheck
import { Request, Response, NextFunction } from 'express';

type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const asyncHandler = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Extract the string ID from an organizationId that may be a populated object or plain ObjectId
export function resolveOrgId(organizationId: any): string {
  if (!organizationId) return '';
  if (typeof organizationId === 'object' && organizationId._id) return organizationId._id.toString();
  return organizationId.toString();
}
