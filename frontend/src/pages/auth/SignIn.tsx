import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Button, Input, Card, CardHeader, CardContent, Spinner } from '@/components/ui';
import { Container } from '@/components/layout';
import { cn } from '@/lib/utils';

/**
 * Sign In Page
 *
 * Phone number authentication entry point
 */
export const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);
  const showToast = useUIStore((state) => state.showToast);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!phoneNumber) {
      setError('Phone number is required');
      return;
    }

    // Validate phone format (basic)
    const phoneRegex = /^\+?[1-9]\d{10,14}$/;
    if (!phoneRegex.test(phoneNumber.replace(/[\s()-]/g, ''))) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);

    try {
      // Clean phone number
      const cleanedPhone = phoneNumber.replace(/[\s()-]/g, '');

      await signIn(cleanedPhone);

      showToast({
        type: 'success',
        message: 'OTP sent to your phone!',
      });

      // Navigate to OTP verification
      navigate('/verify-otp', { state: { phoneNumber: cleanedPhone, isSignIn: true } });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      setError(errorMessage);
      showToast({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="mt-2 text-gray-600">Sign in to continue to SupportCarr</p>
        </div>

        <Card variant="elevated" padding="lg">
          <CardHeader
            title="Sign In"
            subtitle="Enter your phone number to receive a verification code"
          />

          <CardContent>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input
                type="tel"
                label="Phone Number"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                error={error}
                isFullWidth
                leftIcon={
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                }
                disabled={isLoading}
                autoComplete="tel"
                autoFocus
              />

              <Button
                type="submit"
                isLoading={isLoading}
                isFullWidth
                size="lg"
                className="mt-6"
              >
                {isLoading ? 'Sending OTP...' : 'Continue'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-gray-500">
          By continuing, you agree to SupportCarr's Terms of Service and Privacy Policy
        </p>
      </Container>
    </div>
  );
};

SignIn.displayName = 'SignIn';
