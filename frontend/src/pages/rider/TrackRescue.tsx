import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useRescueStore } from '@/store/rescueStore';
import { useRescueWebSocket } from '@/hooks/useWebSocket';
import { useRequireAuth } from '@/hooks/useAuth';
import { AppLayout, Container } from '@/components/layout';
import { Card, CardHeader, CardContent, Button, Badge, Spinner } from '@/components/ui';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { RescueStatus, UserRole } from '@/types';

/**
 * Track Rescue Page
 *
 * Real-time tracking of active rescue with map
 */
export const TrackRescue: React.FC = () => {
  useRequireAuth(UserRole.RIDER);

  const { rescueId } = useParams<{ rescueId: string }>();
  const navigate = useNavigate();

  const profile = useAuthStore((state) => state.profile);
  const { currentRescue, isLoading, fetchRescueById } = useRescueStore();

  // Subscribe to real-time updates
  useRescueWebSocket(rescueId);

  /**
   * Load rescue data
   */
  useEffect(() => {
    if (rescueId) {
      fetchRescueById(rescueId);
    }
  }, [rescueId, fetchRescueById]);

  /**
   * Get status badge variant
   */
  const getStatusVariant = (status: RescueStatus) => {
    switch (status) {
      case RescueStatus.REQUESTED:
        return 'info';
      case RescueStatus.MATCHED:
      case RescueStatus.ACCEPTED:
        return 'primary';
      case RescueStatus.EN_ROUTE:
      case RescueStatus.ARRIVED:
      case RescueStatus.IN_PROGRESS:
        return 'warning';
      case RescueStatus.COMPLETED:
        return 'success';
      case RescueStatus.CANCELLED:
        return 'danger';
      default:
        return 'default';
    }
  };

  /**
   * Format status for display
   */
  const formatStatus = (status: RescueStatus): string => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  /**
   * Get status description
   */
  const getStatusDescription = (status: RescueStatus): string => {
    switch (status) {
      case RescueStatus.REQUESTED:
        return 'Searching for available drivers nearby...';
      case RescueStatus.MATCHED:
        return 'A driver has been found! Waiting for acceptance.';
      case RescueStatus.ACCEPTED:
        return 'Driver accepted your request and is preparing to help.';
      case RescueStatus.EN_ROUTE:
        return 'Driver is on the way to your location.';
      case RescueStatus.ARRIVED:
        return 'Driver has arrived at your location.';
      case RescueStatus.IN_PROGRESS:
        return 'Driver is working on your e-bike.';
      case RescueStatus.COMPLETED:
        return 'Rescue completed successfully!';
      case RescueStatus.CANCELLED:
        return 'This rescue request was cancelled.';
      default:
        return '';
    }
  };

  if (isLoading || !currentRescue) {
    return (
      <AppLayout>
        <Container className="py-12">
          <div className="flex justify-center">
            <Spinner size="lg" label="Loading rescue details..." />
          </div>
        </Container>
      </AppLayout>
    );
  }

  // Check if this rescue belongs to the current user
  if (currentRescue.riderId !== profile?._id) {
    return (
      <AppLayout>
        <Container className="py-12">
          <Card variant="elevated" padding="lg">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
              <p className="mt-2 text-gray-600">
                You don't have permission to view this rescue.
              </p>
              <Button
                onClick={() => navigate('/rider/dashboard')}
                variant="primary"
                className="mt-6"
              >
                Go to Dashboard
              </Button>
            </div>
          </Card>
        </Container>
      </AppLayout>
    );
  }

  const isActive = ![
    RescueStatus.COMPLETED,
    RescueStatus.CANCELLED,
  ].includes(currentRescue.status);

  return (
    <AppLayout>
      <Container className="py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Track Rescue</h1>
            <p className="mt-1 text-gray-600">
              Created {formatRelativeTime(currentRescue.createdAt)}
            </p>
          </div>
          <Badge variant={getStatusVariant(currentRescue.status)} size="lg">
            {formatStatus(currentRescue.status)}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Map Placeholder - Will be replaced with actual map component */}
          <div className="lg:col-span-2">
            <Card variant="elevated" padding="none" className="h-[500px]">
              <div className="flex h-full items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <svg
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600">Map view coming soon</p>
                  <p className="mt-2 text-sm text-gray-500">
                    Mapbox integration in progress
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Rescue Details */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card variant="elevated" padding="lg">
              <h3 className="text-lg font-semibold text-gray-900">Status</h3>
              <p className="mt-2 text-gray-600">
                {getStatusDescription(currentRescue.status)}
              </p>

              {isActive && (
                <div className="mt-4">
                  <Spinner size="sm" />
                </div>
              )}
            </Card>

            {/* Rescue Info */}
            <Card variant="elevated" padding="lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Rescue Details
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="mt-1 font-medium text-gray-900 capitalize">
                    {currentRescue.type.replace('_', ' ')}
                  </p>
                </div>

                {currentRescue.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="mt-1 text-gray-900">{currentRescue.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-500">Pickup Location</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {currentRescue.pickupLocation.address ||
                      `${currentRescue.pickupLocation.coordinates[1].toFixed(6)}, ${currentRescue.pickupLocation.coordinates[0].toFixed(6)}`}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatCurrency(
                      currentRescue.finalPrice?.amountInCents ||
                        currentRescue.estimatedPrice.amountInCents,
                      currentRescue.estimatedPrice.currency,
                    )}
                  </p>
                  {!currentRescue.finalPrice && (
                    <p className="text-xs text-gray-500">Estimated</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Driver Info */}
            {currentRescue.driverId && (
              <Card variant="elevated" padding="lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Driver
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <svg
                        className="h-6 w-6"
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
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Driver #{currentRescue.driverId.slice(-6)}
                      </p>
                      <p className="text-sm text-gray-500">Verified Driver</p>
                    </div>
                  </div>

                  {isActive && (
                    <Button variant="outline" size="sm" isFullWidth>
                      Contact Driver
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Actions */}
            {isActive && currentRescue.status === RescueStatus.REQUESTED && (
              <Button variant="danger" isFullWidth>
                Cancel Request
              </Button>
            )}

            {!isActive && (
              <Button
                variant="primary"
                onClick={() => navigate('/rider/dashboard')}
                isFullWidth
              >
                Back to Dashboard
              </Button>
            )}
          </div>
        </div>
      </Container>
    </AppLayout>
  );
};

TrackRescue.displayName = 'TrackRescue';
