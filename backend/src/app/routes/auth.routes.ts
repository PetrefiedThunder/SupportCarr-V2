import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateRequest } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import {
  SignUpSchema,
  VerifyOTPSchema,
  ResendOTPSchema,
  RefreshTokenSchema,
} from '../dtos/auth.dto';

/**
 * Create Auth Routes
 *
 * Factory function to create authentication routes with dependencies
 */
export function createAuthRoutes(authController: AuthController): Router {
  const router = Router();

  /**
   * @route   POST /api/v1/auth/signup
   * @desc    Register new user and send OTP
   * @access  Public
   */
  router.post(
    '/signup',
    validateRequest({ body: SignUpSchema }),
    authController.signUp,
  );

  /**
   * @route   POST /api/v1/auth/verify-otp
   * @desc    Verify OTP and complete authentication
   * @access  Public
   */
  router.post(
    '/verify-otp',
    validateRequest({ body: VerifyOTPSchema }),
    authController.verifyOTP,
  );

  /**
   * @route   POST /api/v1/auth/resend-otp
   * @desc    Resend OTP to phone number
   * @access  Public
   */
  router.post(
    '/resend-otp',
    validateRequest({ body: ResendOTPSchema }),
    authController.resendOTP,
  );

  /**
   * @route   POST /api/v1/auth/refresh
   * @desc    Refresh access token using refresh token
   * @access  Public
   */
  router.post(
    '/refresh',
    validateRequest({ body: RefreshTokenSchema }),
    authController.refreshToken,
  );

  /**
   * @route   POST /api/v1/auth/logout
   * @desc    Logout user and revoke refresh token
   * @access  Private
   */
  router.post(
    '/logout',
    authenticate(authController['jwtService']),
    authController.logout,
  );

  return router;
}
