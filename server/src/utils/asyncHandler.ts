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
export function resolveOrgId(orgId: any): string {
  if (!orgId) return '';
  if (typeof orgId === 'object' && orgId._id) return orgId._id.toString();
  return orgId.toString();
}
