import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import AuditLog from '../models/AuditLog.js';

export const auditLog = (action: string, entityType: string) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const originalSend = res.json;

      res.json = function (data: any) {
        // Only log successful operations
        if (data.success && req.user) {
          const entityId = 
            req.params.id || 
            data.data?._id || 
            data.data?.id;

          if (entityId) {
            AuditLog.create({
              organizationId: req.user.organizationId,
              userId: req.user._id,
              action,
              entityType,
              entityId,
              oldValue: req.body._oldValue,
              newValue: req.body,
              ipAddress: req.ip,
              timestamp: new Date(),
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
