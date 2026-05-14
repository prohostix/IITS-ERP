import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import prisma from '../lib/prisma.js';

export const auditLog = (action: string, entityType: string) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const originalSend = res.json;

      res.json = function (data: any) {
        if (data.success && req.user) {
          const entityId = req.params.id || data.data?.id;

          if (entityId) {
            prisma.auditLog.create({
              data: {
                organizationId: req.user.organizationId,
                userId: req.user.id,
                action,
                entityType,
                entityId: entityId.toString(),
                newValue: req.body,
                ipAddress: req.ip || '0.0.0.0',
              }
            }).catch(err => console.error('Audit log error:', err));
          }
        }
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};
