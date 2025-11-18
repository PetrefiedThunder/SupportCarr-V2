import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function SignUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup, isLoading } = useAuthStore();

  const [formData, setFormData] = useState({
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    email: '',
    firstName: '',
    lastName: '',
    role: searchParams.get('role') || 'rider',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await signup(formData);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create account');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link to="/" className="flex justify-center text-4xl">
            🚚
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/signin"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              sign in to existing account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'rider' })}
                className={`flex-1 py-2 px-4 rounded-md border-2 font-medium ${
                  formData.role === 'rider'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                I Need Rescue
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'driver' })}
                className={`flex-1 py-2 px-4 rounded-md border-2 font-medium ${
                  formData.role === 'driver'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                I'm a Driver
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input
                name="firstName"
                type="text"
                required
                className="input"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleChange}
              />
              <input
                name="lastName"
                type="text"
                required
                className="input"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>

            <input
              name="phoneNumber"
              type="tel"
              required
              className="input"
              placeholder="Phone number"
              value={formData.phoneNumber}
              onChange={handleChange}
            />

            <input
              name="email"
              type="email"
              className="input"
              placeholder="Email (optional)"
              value={formData.email}
              onChange={handleChange}
            />

            <input
              name="password"
              type="password"
              required
              className="input"
              placeholder="Password (min 8 characters)"
              value={formData.password}
              onChange={handleChange}
            />

            <input
              name="confirmPassword"
              type="password"
              required
              className="input"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>

          <p className="text-xs text-center text-gray-600">
            By signing up, you agree to our{' '}
            <a href="#" className="text-primary-600">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary-600">
              Privacy Policy
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
