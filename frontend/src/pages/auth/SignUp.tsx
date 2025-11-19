import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardContent,
} from '@/components/ui';
import { Container } from '@/components/layout';
import { UserRole } from '@/types';

/**
 * Sign Up Page
 *
 * New user registration with phone, name, and role
 */
export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const signUp = useAuthStore((state) => state.signUp);
  const showToast = useUIStore((state) => state.showToast);

  const [formData, setFormData] = useState({
    phoneNumber: '',
    name: '',
    role: '' as UserRole | '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle input change
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else {
      const phoneRegex = /^\+?[1-9]\d{10,14}$/;
      if (!phoneRegex.test(formData.phoneNumber.replace(/[\s()-]/g, ''))) {
        newErrors.phoneNumber = 'Please enter a valid phone number';
      }
    }

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Please enter your full name (at least 2 characters)';
    }

    if (!formData.role) {
      newErrors.role = 'Please select your role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      // Clean phone number
      const cleanedPhone = formData.phoneNumber.replace(/[\s()-]/g, '');

      await signUp({
        phoneNumber: cleanedPhone,
        name: formData.name.trim(),
        role: formData.role as UserRole,
      });

      showToast({
        type: 'success',
        message: 'Account created! OTP sent to your phone.',
      });

      // Navigate to OTP verification
      navigate('/verify-otp', {
        state: { phoneNumber: cleanedPhone, isSignIn: false },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up';
      showToast({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = [
    { value: UserRole.RIDER, label: 'Rider - I need e-bike rescue services' },
    { value: UserRole.DRIVER, label: 'Driver - I want to provide rescue services' },
  ];

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
          <h1 className="text-3xl font-bold text-gray-900">Join SupportCarr</h1>
          <p className="mt-2 text-gray-600">Create your account to get started</p>
        </div>

        <Card variant="elevated" padding="lg">
          <CardHeader
            title="Sign Up"
            subtitle="Fill in your details to create an account"
          />

          <CardContent>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <Input
                type="text"
                name="name"
                label="Full Name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                }
                disabled={isLoading}
                autoComplete="name"
                autoFocus
              />

              <Input
                type="tel"
                name="phoneNumber"
                label="Phone Number"
                placeholder="+1 (555) 123-4567"
                value={formData.phoneNumber}
                onChange={handleChange}
                error={errors.phoneNumber}
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
              />

              <Select
                name="role"
                label="I am a..."
                placeholder="Select your role"
                value={formData.role}
                onChange={handleChange}
                options={roleOptions}
                error={errors.role}
                isFullWidth
                disabled={isLoading}
              />

              <Button
                type="submit"
                isLoading={isLoading}
                isFullWidth
                size="lg"
                className="mt-6"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/signin"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in
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

SignUp.displayName = 'SignUp';
