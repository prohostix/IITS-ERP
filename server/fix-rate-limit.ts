/**
 * Quick Fix: Adjust Rate Limiting for Development
 * 
 * This script shows how to configure rate limiting based on environment
 */

import rateLimit from 'express-rate-limit';

// Recommended rate limit configuration
export const createRateLimiter = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 1000 : 100, // Higher limit for development
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for health checks
    skip: (req) => req.path === '/health' || req.path === '/api/v1/health',
  });
};

// Usage in server.ts:
// import { createRateLimiter } from './fix-rate-limit.js';
// app.use('/api', createRateLimiter());
