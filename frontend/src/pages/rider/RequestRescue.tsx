import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useRescueStore } from '@/store/rescueStore';
import { useUIStore } from '@/store/uiStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useRequireAuth } from '@/hooks/useAuth';
import { AppLayout, Container } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Select,
  TextArea,
  Spinner,
} from '@/components/ui';
import { RescueType, UserRole } from '@/types';

/**
 * Request Rescue Page
 *
 * Form to create a new rescue request
 */
export const RequestRescue: React.FC = () => {
  useRequireAuth(UserRole.RIDER);

  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const createRescue = useRescueStore((state) => state.createRescue);
  const showToast = useUIStore((state) => state.showToast);

  const {
    position: currentLocation,
    error: locationError,
    isLoading: isLoadingLocation,
    requestLocation,
  } = useGeolocation();

  const [formData, setFormData] = useState({
    type: '' as RescueType | '',
    description: '',
    useCurrentLocation: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handle input change
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.type) {
      newErrors.type = 'Please select a rescue type';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Please describe your situation';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (formData.useCurrentLocation && !currentLocation) {
      newErrors.location = 'Unable to get your location. Please try again.';
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

    if (!currentLocation) {
      showToast({
        type: 'error',
        message: 'Unable to determine your location',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const rescue = await createRescue({
        type: formData.type as RescueType,
        description: formData.description.trim(),
        pickupLocation: currentLocation,
        // Could add dropoff location in future
      });

      showToast({
        type: 'success',
        message: 'Rescue request created! Finding nearby drivers...',
      });

      // Navigate to track page
      navigate(`/rider/rescue/${rescue._id}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create rescue request';
      showToast({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const rescueTypeOptions = [
    { value: RescueType.DEAD_BATTERY, label: 'Dead Battery - Need a charge' },
    { value: RescueType.FLAT_TIRE, label: 'Flat Tire - Puncture or deflation' },
    {
      value: RescueType.MECHANICAL_ISSUE,
      label: 'Mechanical Issue - Chain, brakes, etc.',
    },
    { value: RescueType.ACCIDENT, label: 'Accident - Collision or crash' },
    { value: RescueType.OTHER, label: 'Other - Something else' },
  ];

  return (
    <AppLayout>
      <Container size="md" className="py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Request a Rescue</h1>
          <p className="mt-2 text-gray-600">
            Tell us what happened and we'll find a nearby driver to help
          </p>
        </div>

        <Card variant="elevated" padding="lg">
          <CardHeader title="Rescue Details" />

          <CardContent>
            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              {/* Rescue Type */}
              <Select
                name="type"
                label="What's wrong?"
                placeholder="Select the type of issue"
                value={formData.type}
                onChange={handleChange}
                options={rescueTypeOptions}
                error={errors.type}
                isFullWidth
                disabled={isSubmitting}
              />

              {/* Description */}
              <TextArea
                name="description"
                label="Describe your situation"
                placeholder="Tell us more about what happened and what help you need..."
                value={formData.description}
                onChange={handleChange}
                error={errors.description}
                helperText="Minimum 10 characters"
                maxLength={500}
                showCharCount
                rows={5}
                isFullWidth
                disabled={isSubmitting}
              />

              {/* Location */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Pickup Location
                </h3>

                {isLoadingLocation ? (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-300 bg-gray-50 p-4">
                    <Spinner size="sm" />
                    <span className="text-sm text-gray-600">
                      Getting your location...
                    </span>
                  </div>
                ) : locationError ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-red-300 bg-red-50 p-4">
                      <p className="text-sm text-red-800">
                        Unable to access your location. Please enable location
                        services.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={requestLocation}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : currentLocation ? (
                  <div className="flex items-start gap-3 rounded-lg border border-green-300 bg-green-50 p-4">
                    <svg
                      className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">
                        Location detected
                      </p>
                      <p className="text-xs text-green-700 mt-1 font-mono">
                        {currentLocation.coordinates[1].toFixed(6)},{' '}
                        {currentLocation.coordinates[0].toFixed(6)}
                      </p>
                    </div>
                  </div>
                ) : null}

                {errors.location && (
                  <p className="mt-2 text-sm text-red-600">{errors.location}</p>
                )}
              </div>

              {/* Estimated Pricing Info */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="text-sm font-medium text-blue-900">
                  Pricing Information
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  The final price will be calculated based on distance and service
                  type. You'll see an estimate before a driver is assigned.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/rider/dashboard')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={!currentLocation || isLoadingLocation}
                  className="flex-1"
                >
                  {isSubmitting ? 'Creating Request...' : 'Request Rescue'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Container>
    </AppLayout>
  );
};

RequestRescue.displayName = 'RequestRescue';
