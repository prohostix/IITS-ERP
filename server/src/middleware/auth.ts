import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export interface AuthRequest extends Request {
  user?: any;
  organizationId?: string;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ 
        success: false, 
        message: 'Not authorized to access this route' 
      });
      return;
    }

    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      
      const user = await User.findById(decoded.id)
        .populate('organizationId')
        .populate('departmentId')
        .populate('subDepartmentId', 'name parentDeptId assignedUniversities assignedPrograms assignedCenters')
        .populate('additionalDepartmentIds', 'name type')
        .populate('branchId', 'name branchCode')
        .populate('studyCenterId', 'name code status');

      if (!user) {
        res.status(401).json({ 
          success: false, 
          message: 'User not found' 
        });
        return;
      }

      if (user.status !== 'active') {
        // Allow inactive center_admin users — they're pending onboarding approval
        // The frontend gates their dashboard based on centerStatus
        if (!(user.role === 'center_admin' && user.status === 'inactive')) {
          res.status(401).json({ 
            success: false, 
            message: 'User account is not active' 
          });
          return;
        }
      }

      req.user = user;
      req.organizationId = user.organizationId ? user.organizationId.toString() : undefined;
      next();
    } catch (error) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error in authentication' 
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: 'Not authorized' 
      });
      return;
    }

    // Branch managers (any role with branchId set) get broad access
    const isBranchManager = Boolean(req.user.branchId);

    if (!roles.includes(req.user.role) && !isBranchManager) {
      res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
      return;
    }

    next();
  };
};

export const checkOrganization = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      message: 'Not authorized' 
    });
    return;
  }

  // Superadmin can access all organizations
  if (req.user.role === 'superadmin') {
    return next();
  }

  // Check if user belongs to the organization
  const orgId = req.params.organizationId || req.body.organizationId;
  
  if (orgId && orgId !== req.user.organizationId.toString()) {
    res.status(403).json({
      success: false,
      message: 'Not authorized to access this organization',
    });
    return;
  }

  next();
};
