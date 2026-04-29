import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

/**
 * Hash a plain text password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

/**
 * Compare plain text password with hashed password
 */
export const comparePassword = async (password: string, hashed: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashed);
};

/**
 * Generate a unique userId in the format IITSRPS0001
 */
export const generateUserId = async (): Promise<string> => {
  const count = await prisma.user.count();
  return `IITSRPS${String(count + 1).padStart(4, '0')}`;
};
