import { get, post } from './client';
import type {
  AuthResponse,
  SignUpRequest,
  SignInRequest,
  VerifyOTPRequest,
  User,
  RiderProfile,
  DriverProfile,
} from '@/types';

/**
 * Authentication API Service
 */
export const authApi = {
  /**
   * Sign up new user
   */
  async signUp(data: SignUpRequest): Promise<{ message: string }> {
    return post('/api/v1/auth/signup', data);
  },

  /**
   * Request OTP for sign in
   */
  async signIn(data: SignInRequest): Promise<{ message: string }> {
    return post('/api/v1/auth/signin', data);
  },

  /**
   * Verify OTP and get tokens
   */
  async verifyOTP(data: VerifyOTPRequest): Promise<AuthResponse> {
    return post('/api/v1/auth/verify-otp', data);
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return post('/api/v1/auth/refresh', { refreshToken });
  },

  /**
   * Sign out
   */
  async signOut(): Promise<{ message: string }> {
    return post('/api/v1/auth/signout');
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    return get('/api/v1/auth/me');
  },

  /**
   * Get current user profile
   */
  async getCurrentProfile(): Promise<RiderProfile | DriverProfile> {
    return get('/api/v1/auth/me/profile');
  },

  /**
   * Resend OTP
   */
  async resendOTP(phoneNumber: string): Promise<{ message: string }> {
    return post('/api/v1/auth/resend-otp', { phoneNumber });
  },
};
