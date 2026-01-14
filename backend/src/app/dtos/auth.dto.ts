import { z } from 'zod';

/**
 * Sign Up Request Schema
 */
export const SignUpSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be at most 15 digits')
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['rider', 'driver'], {
    errorMap: () => ({ message: 'Role must be either rider or driver' }),
  }),
});

export type SignUpDTO = z.infer<typeof SignUpSchema>;

/**
 * Verify OTP Request Schema
 */
export const VerifyOTPSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format'),
  code: z.string().length(6, 'OTP code must be 6 digits').regex(/^\d{6}$/, 'OTP code must be numeric'),
});

export type VerifyOTPDTO = z.infer<typeof VerifyOTPSchema>;

/**
 * Resend OTP Request Schema
 */
export const ResendOTPSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format'),
});

export type ResendOTPDTO = z.infer<typeof ResendOTPSchema>;

/**
 * Refresh Token Request Schema
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenDTO = z.infer<typeof RefreshTokenSchema>;

/**
 * Auth Response Interface
 */
export interface IAuthResponse {
  user: {
    _id: string;
    phoneNumber: string;
  };
  profile: {
    _id: string;
    userId: string;
    name: string;
    role: 'rider' | 'driver';
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}
