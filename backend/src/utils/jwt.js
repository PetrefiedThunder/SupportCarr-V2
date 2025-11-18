import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import redisClient from '../config/redis.js';
import logger from './logger.js';

/**
 * Generate access token
 */
export const generateAccessToken = (userId, role) => {
  return jwt.sign(
    {
      userId,
      role,
      type: 'access',
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
    }
  );
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    {
      userId,
      type: 'refresh',
    },
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshExpiresIn,
    }
  );
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (userId, role) => {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId);

  return {
    accessToken,
    refreshToken,
    expiresIn: config.jwt.expiresIn,
  };
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    logger.error('Access token verification failed:', error);
    throw error;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret);

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    logger.error('Refresh token verification failed:', error);
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if refresh token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new Error('Refresh token has been revoked');
    }

    // Get user to check current role
    const { User } = await import('../models/index.js');
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive || user.isBanned) {
      throw new Error('User not found or inactive');
    }

    // Generate new access token
    const accessToken = generateAccessToken(user._id.toString(), user.role);

    return {
      accessToken,
      expiresIn: config.jwt.expiresIn,
    };
  } catch (error) {
    logger.error('Token refresh failed:', error);
    throw error;
  }
};

/**
 * Blacklist token (for logout)
 */
export const blacklistToken = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return false;
    }

    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl <= 0) {
      return true; // Already expired
    }

    const key = `blacklist:token:${token}`;
    await redisClient.set(key, '1', ttl);

    logger.info('Token blacklisted', {
      userId: decoded.userId,
      type: decoded.type,
    });

    return true;
  } catch (error) {
    logger.error('Failed to blacklist token:', error);
    return false;
  }
};

/**
 * Check if token is blacklisted
 */
export const isTokenBlacklisted = async (token) => {
  try {
    const key = `blacklist:token:${token}`;
    const exists = await redisClient.exists(key);
    return exists;
  } catch (error) {
    logger.error('Failed to check token blacklist:', error);
    return false;
  }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  refreshAccessToken,
  blacklistToken,
  isTokenBlacklisted,
  decodeToken,
};
