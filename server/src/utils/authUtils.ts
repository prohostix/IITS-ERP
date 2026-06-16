// @ts-nocheck
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
  const lastUser = await prisma.user.findFirst({
    where: {
      userId: {
        startsWith: 'IITSRPS'
      }
    },
    orderBy: {
      userId: 'desc'
    }
  });

  let nextNum = 1;
  if (lastUser && lastUser.userId) {
    const match = lastUser.userId.match(/IITSRPS(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  let userId = `IITSRPS${String(nextNum).padStart(4, '0')}`;
  let exists = await prisma.user.findUnique({ where: { userId } });
  while (exists) {
    nextNum++;
    userId = `IITSRPS${String(nextNum).padStart(4, '0')}`;
    exists = await prisma.user.findUnique({ where: { userId } });
  }

  return userId;
};
