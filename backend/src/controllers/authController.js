import { User, RiderProfile } from '../models/index.js';
import { generateTokenPair, verifyRefreshToken, blacklistToken } from '../utils/jwt.js';
import twilioService from '../services/twilioService.js';
import stripeService from '../services/stripeService.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { UnauthorizedError, ValidationError, ConflictError } from '../middleware/errorHandler.js';
import redisClient from '../config/redis.js';

/**
 * Sign up new user
 */
export const signup = asyncHandler(async (req, res) => {
  const { phoneNumber, password, email, firstName, lastName, role = 'rider' } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ phoneNumber });
  if (existingUser) {
    throw new ConflictError('Phone number already registered');
  }

  // Create user
  const user = await User.create({
    phoneNumber,
    password,
    email,
    firstName,
    lastName,
    role,
  });

  // Create Stripe customer
  if (stripeService.initialized) {
    try {
      const customer = await stripeService.createCustomer(email, phoneNumber, {
        userId: user._id.toString(),
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    } catch (error) {
      logger.error('Failed to create Stripe customer:', error);
    }
  }

  // Create rider profile by default
  if (role === 'rider') {
    await RiderProfile.create({
      userId: user._id,
    });
  }

  // Send verification SMS
  try {
    await twilioService.sendVerificationCode(phoneNumber);
  } catch (error) {
    logger.error('Failed to send verification SMS:', error);
  }

  // Generate tokens
  const tokens = generateTokenPair(user._id.toString(), user.role);

  logger.info('User signed up', { userId: user._id, role: user.role });

  res.status(201).json({
    success: true,
    message: 'Account created successfully. Please verify your phone number.',
    data: {
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
      },
      ...tokens,
    },
  });
});

/**
 * Sign in existing user
 */
export const signin = asyncHandler(async (req, res) => {
  const { phoneNumber, password } = req.body;

  // Find user with password field
  const user = await User.findOne({ phoneNumber }).select('+password');

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new UnauthorizedError('Account is deactivated');
  }

  if (user.isBanned) {
    throw new UnauthorizedError('Account is banned');
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  // Generate tokens
  const tokens = generateTokenPair(user._id.toString(), user.role);

  logger.info('User signed in', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Signed in successfully',
    data: {
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        avatar: user.avatar,
      },
      ...tokens,
    },
  });
});

/**
 * Send verification code
 */
export const sendVerificationCode = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;

  // Check rate limiting
  const rateLimitKey = `verify:ratelimit:${phoneNumber}`;
  const attempts = await redisClient.get(rateLimitKey);

  if (attempts && attempts >= 3) {
    throw new ValidationError({ phoneNumber: 'Too many verification attempts. Try again later.' });
  }

  // Send verification code
  await twilioService.sendVerificationCode(phoneNumber);

  // Increment rate limit counter
  await redisClient.set(rateLimitKey, (attempts || 0) + 1, 3600); // 1 hour

  logger.info('Verification code sent', { phoneNumber });

  res.status(200).json({
    success: true,
    message: 'Verification code sent',
  });
});

/**
 * Verify phone number
 */
export const verifyPhone = asyncHandler(async (req, res) => {
  const { phoneNumber, code } = req.body;

  // Verify code with Twilio
  const result = await twilioService.verifyCode(phoneNumber, code);

  if (!result.success) {
    throw new ValidationError({ code: 'Invalid or expired verification code' });
  }

  // Update user
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  user.isPhoneVerified = true;
  await user.save();

  logger.info('Phone verified', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Phone number verified successfully',
    data: {
      isPhoneVerified: true,
    },
  });
});

/**
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new ValidationError({ refreshToken: 'Refresh token is required' });
  }

  // Verify and decode refresh token
  const decoded = verifyRefreshToken(token);

  // Get user
  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive || user.isBanned) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Generate new access token
  const tokens = generateTokenPair(user._id.toString(), user.role);

  logger.info('Token refreshed', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: tokens,
  });
});

/**
 * Logout user
 */
export const logout = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    await blacklistToken(token);
  }

  // Also blacklist refresh token if provided
  const { refreshToken } = req.body;
  if (refreshToken) {
    await blacklistToken(refreshToken);
  }

  logger.info('User logged out', { userId: req.userId });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * Get current user
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId)
    .populate('riderProfile')
    .populate({
      path: 'driverProfile',
      populate: { path: 'vehicleId' },
    });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
});

/**
 * Update current user
 */
export const updateCurrentUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, avatar } = req.body;

  const user = await User.findById(req.userId);
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Update allowed fields
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (email !== undefined) user.email = email;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();

  logger.info('User updated', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
  });
});

/**
 * Change password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.userId).select('+password');
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new ValidationError({ currentPassword: 'Current password is incorrect' });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  logger.info('Password changed', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * Request password reset
 */
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;

  const user = await User.findOne({ phoneNumber });
  if (!user) {
    // Don't reveal if user exists
    return res.status(200).json({
      success: true,
      message: 'If the phone number exists, a reset code has been sent',
    });
  }

  // Send verification code for password reset
  await twilioService.sendVerificationCode(phoneNumber);

  // Store reset request in Redis
  const resetKey = `password:reset:${phoneNumber}`;
  await redisClient.set(resetKey, user._id.toString(), 900); // 15 minutes

  logger.info('Password reset requested', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'If the phone number exists, a reset code has been sent',
  });
});

/**
 * Reset password with verification code
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { phoneNumber, code, newPassword } = req.body;

  // Verify code
  const result = await twilioService.verifyCode(phoneNumber, code);
  if (!result.success) {
    throw new ValidationError({ code: 'Invalid or expired verification code' });
  }

  // Check if reset was requested
  const resetKey = `password:reset:${phoneNumber}`;
  const userId = await redisClient.get(resetKey);

  if (!userId) {
    throw new ValidationError({ code: 'Password reset not requested or expired' });
  }

  // Update password
  const user = await User.findById(userId);
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  user.password = newPassword;
  await user.save();

  // Delete reset request
  await redisClient.del(resetKey);

  logger.info('Password reset', { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Password reset successfully',
  });
});

export default {
  signup,
  signin,
  sendVerificationCode,
  verifyPhone,
  refreshToken,
  logout,
  getCurrentUser,
  updateCurrentUser,
  changePassword,
  requestPasswordReset,
  resetPassword,
};
