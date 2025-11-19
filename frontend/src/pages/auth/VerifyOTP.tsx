import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Button, Card, CardHeader, CardContent } from '@/components/ui';
import { Container } from '@/components/layout';
import { cn } from '@/lib/utils';

/**
 * OTP Verification Page
 *
 * Verify phone number with OTP code
 */
export const VerifyOTP: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const verifyOTP = useAuthStore((state) => state.verifyOTP);
  const resendOTP = useAuthStore((state) => state.resendOTP);
  const showToast = useUIStore((state) => state.showToast);

  // Get phone number from navigation state
  const phoneNumber = location.state?.phoneNumber as string | undefined;
  const isSignIn = location.state?.isSignIn as boolean;

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /**
   * Redirect if no phone number
   */
  if (!phoneNumber) {
    return <Navigate to="/signin" replace />;
  }

  /**
   * Countdown timer for resend
   */
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  /**
   * Handle input change
   */
  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields filled
    if (newCode.every((digit) => digit !== '') && index === 5) {
      handleSubmit(newCode.join(''));
    }
  };

  /**
   * Handle key down
   */
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  /**
   * Handle paste
   */
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();

      // Auto-submit
      handleSubmit(pastedData);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (otpCode?: string) => {
    const finalCode = otpCode || code.join('');

    if (finalCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await verifyOTP(phoneNumber, finalCode);

      showToast({
        type: 'success',
        message: 'Verification successful!',
      });

      // Navigate based on user role
      if (response.profile.role === 'rider') {
        navigate('/rider/dashboard', { replace: true });
      } else if (response.profile.role === 'driver') {
        navigate('/driver/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Invalid verification code';
      setError(errorMessage);
      showToast({
        type: 'error',
        message: errorMessage,
      });
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle resend OTP
   */
  const handleResend = async () => {
    setIsResending(true);
    setError('');

    try {
      await resendOTP(phoneNumber);

      showToast({
        type: 'success',
        message: 'New verification code sent!',
      });

      setCountdown(60);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend code';
      showToast({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsResending(false);
    }
  };

  // Mask phone number for display
  const maskedPhone = phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <Container size="sm">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
            <svg
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Verify Your Phone</h1>
          <p className="mt-2 text-gray-600">
            We sent a code to <span className="font-medium">{maskedPhone}</span>
          </p>
        </div>

        <Card variant="elevated" padding="lg">
          <CardHeader
            title="Enter Verification Code"
            subtitle="Enter the 6-digit code sent to your phone"
          />

          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="mt-6"
            >
              {/* OTP Input */}
              <div className="flex justify-center gap-2 mb-6">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={cn(
                      'h-12 w-12 text-center text-xl font-semibold rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                      error
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
                      isLoading && 'opacity-50 cursor-not-allowed',
                    )}
                    disabled={isLoading}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-600 text-center mb-4">{error}</p>
              )}

              <Button
                type="submit"
                isLoading={isLoading}
                isFullWidth
                size="lg"
                disabled={code.some((digit) => !digit)}
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </form>

            {/* Resend Code */}
            <div className="mt-6 text-center">
              {countdown > 0 ? (
                <p className="text-sm text-gray-600">
                  Resend code in{' '}
                  <span className="font-medium text-blue-600">{countdown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
                >
                  {isResending ? 'Sending...' : 'Resend code'}
                </button>
              )}
            </div>

            {/* Back to Sign In */}
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate(isSignIn ? '/signin' : '/signup')}
                className="text-sm text-gray-600 hover:text-gray-900"
                disabled={isLoading}
              >
                ← Back to {isSignIn ? 'sign in' : 'sign up'}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-gray-500">
          Having trouble? Contact support for assistance
        </p>
      </Container>
    </div>
  );
};

VerifyOTP.displayName = 'VerifyOTP';
