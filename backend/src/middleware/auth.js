import jwt from 'jsonwebtoken';
import { User, APIKey } from '../models/index.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Check if user exists
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token - user not found',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated',
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        error: 'Account is banned',
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id.toString();

    // Update last active
    user.lastActiveAt = new Date();
    await user.save();

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }

    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Verify API key for partner integrations
 */
export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'No API key provided',
      });
    }

    // Find and verify API key
    const keyRecord = await APIKey.findByKey(apiKey);

    if (!keyRecord || !keyRecord.isValid()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired API key',
      });
    }

    // Check IP whitelist
    if (keyRecord.ipWhitelist && keyRecord.ipWhitelist.length > 0) {
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!keyRecord.ipWhitelist.includes(clientIp)) {
        return res.status(403).json({
          success: false,
          error: 'IP address not whitelisted',
        });
      }
    }

    // Attach API key info to request
    req.apiKey = keyRecord;
    req.apiKeyId = keyRecord._id.toString();

    // Record usage (async, don't wait)
    keyRecord.recordUsage().catch((err) => {
      logger.error('Failed to record API key usage:', err);
    });

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Check if user has required role(s)
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Check if user has required API scope
 */
export const requireScope = (...scopes) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required',
      });
    }

    const hasScope = scopes.some((scope) => req.apiKey.hasScope(scope));

    if (!hasScope) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient API key permissions',
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.userId);

    if (user && user.isActive && !user.isBanned) {
      req.user = user;
      req.userId = user._id.toString();
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Verify phone number is verified
 */
export const requirePhoneVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (!req.user.isPhoneVerified) {
    return res.status(403).json({
      success: false,
      error: 'Phone verification required',
    });
  }

  next();
};

export default {
  authenticate,
  authenticateApiKey,
  authorize,
  requireScope,
  optionalAuth,
  requirePhoneVerified,
};
