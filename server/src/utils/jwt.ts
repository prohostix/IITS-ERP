import jwt, { SignOptions } from 'jsonwebtoken';

export const generateToken = (id: string): string => {
  const secret = process.env.JWT_SECRET || 'secret';
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRE || '7d') as any,
  };
  return jwt.sign({ id }, secret, options);
};

export const generateRefreshToken = (id: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
  const options: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRE || '30d') as any,
  };
  return jwt.sign({ id }, secret, options);
};

export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET || 'secret';
  return jwt.verify(token, secret);
};

export const verifyRefreshToken = (token: string): any => {
  const secret = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
  return jwt.verify(token, secret);
};
