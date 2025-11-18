import rateLimit from 'express-rate-limit';
import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Create rate limiter with Redis store
 */
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userId: req.userId,
      });

      res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
      });
    },
    skip: (req) => {
      // Skip rate limiting for admins
      return req.user && req.user.role === 'admin';
    },
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * General API rate limiter
 */
export const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true,
});

/**
 * SMS/Phone verification rate limiter
 */
export const smsLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 SMS per hour
  message: 'Too many SMS requests, please try again later',
});

/**
 * Upload rate limiter
 */
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
});

/**
 * Rescue creation rate limiter
 */
export const rescueCreationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 rescue requests per hour
  message: 'Too many rescue requests, please contact support if you need assistance',
});

/**
 * API key rate limiter
 */
export const apiKeyLimiter = async (req, res, next) => {
  try {
    if (!req.apiKey) {
      return next();
    }

    const key = `ratelimit:apikey:${req.apiKey._id}`;
    const hourKey = `${key}:hour`;
    const dayKey = `${key}:day`;

    // Check hourly limit
    const hourCount = await redisClient.incr(hourKey);
    if (hourCount === 1) {
      await redisClient.expire(hourKey, 3600); // 1 hour
    }

    if (hourCount > req.apiKey.rateLimit.requestsPerHour) {
      return res.status(429).json({
        success: false,
        error: 'Hourly API rate limit exceeded',
      });
    }

    // Check daily limit
    const dayCount = await redisClient.incr(dayKey);
    if (dayCount === 1) {
      await redisClient.expire(dayKey, 86400); // 24 hours
    }

    if (dayCount > req.apiKey.rateLimit.requestsPerDay) {
      return res.status(429).json({
        success: false,
        error: 'Daily API rate limit exceeded',
      });
    }

    next();
  } catch (error) {
    logger.error('API key rate limiter error:', error);
    next(); // Continue on error
  }
};

export default {
  generalLimiter,
  authLimiter,
  smsLimiter,
  uploadLimiter,
  rescueCreationLimiter,
  apiKeyLimiter,
};
