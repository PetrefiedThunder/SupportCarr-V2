import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, smsLimiter } from '../middleware/rateLimiter.js';
import {
  signupValidation,
  signinValidation,
  verifyPhoneValidation,
} from '../middleware/validators.js';

const router = express.Router();

/**
 * @route   POST /api/v1/auth/signup
 * @desc    Register new user
 * @access  Public
 */
router.post('/signup', authLimiter, signupValidation, authController.signup);

/**
 * @route   POST /api/v1/auth/signin
 * @desc    Login user
 * @access  Public
 */
router.post('/signin', authLimiter, signinValidation, authController.signin);

/**
 * @route   POST /api/v1/auth/verify/send
 * @desc    Send verification code
 * @access  Public
 */
router.post('/verify/send', smsLimiter, authController.sendVerificationCode);

/**
 * @route   POST /api/v1/auth/verify
 * @desc    Verify phone number
 * @access  Public
 */
router.post('/verify', verifyPhoneValidation, authController.verifyPhone);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * @route   PUT /api/v1/auth/me
 * @desc    Update current user
 * @access  Private
 */
router.put('/me', authenticate, authController.updateCurrentUser);

/**
 * @route   POST /api/v1/auth/password/change
 * @desc    Change password
 * @access  Private
 */
router.post('/password/change', authenticate, authController.changePassword);

/**
 * @route   POST /api/v1/auth/password/reset/request
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/password/reset/request',
  smsLimiter,
  authController.requestPasswordReset
);

/**
 * @route   POST /api/v1/auth/password/reset
 * @desc    Reset password with code
 * @access  Public
 */
router.post('/password/reset', authController.resetPassword);

export default router;
