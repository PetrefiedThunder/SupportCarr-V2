import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useRescueStore } from '@/store/rescueStore';
import { useRequireAuth } from '@/hooks/useAuth';
import { AppLayout, Container } from '@/components/layout';
import { Card, CardHeader, CardContent, Button, Badge, Spinner } from '@/components/ui';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { RescueStatus, UserRole } from '@/types';

/**
 * Rider Dashboard Page
 *
 * Overview of current and past rescues
 */
export const RiderDashboard: React.FC = () => {
  useRequireAuth(UserRole.RIDER);

  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const {
    currentRescue,
    pastRescues,
    isLoading,
    fetchCurrentRescue,
    fetchPastRescues,
  } = useRescueStore();

  /**
   * Load rescue data on mount
   */
  useEffect(() => {
    fetchCurrentRescue();
    fetchPastRescues();
  }, [fetchCurrentRescue, fetchPastRescues]);

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

  if (isLoading && !currentRescue && pastRescues.length === 0) {
    return (
      <AppLayout>
        <Container className="py-12">
          <div className="flex justify-center">
            <Spinner size="lg" label="Loading your dashboard..." />
          </div>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Container className="py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.name}!
          </h1>
          <p className="mt-2 text-gray-600">
            {currentRescue
              ? 'You have an active rescue request'
              : 'Ready to request a rescue?'}
          </p>
        </div>

        {/* Current Rescue */}
        {currentRescue ? (
          <Card variant="elevated" padding="lg" className="mb-8">
            <CardHeader
              title="Active Rescue"
              subtitle={`Created ${formatRelativeTime(currentRescue.createdAt)}`}
              action={
                <Badge variant={getStatusVariant(currentRescue.status)} size="lg">
                  {formatStatus(currentRescue.status)}
                </Badge>
              }
            />

            <CardContent>
              <div className="mt-6 space-y-4">
                {/* Rescue Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Rescue Type</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900 capitalize">
                      {currentRescue.type.replace('_', ' ')}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Estimated Price
                    </h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {formatCurrency(
                        currentRescue.estimatedPrice.amountInCents,
                        currentRescue.estimatedPrice.currency,
                      )}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Pickup Location
                    </h3>
                    <p className="mt-1 text-gray-900">
                      {currentRescue.pickupLocation.address ||
                        `${currentRescue.pickupLocation.coordinates[1].toFixed(6)}, ${currentRescue.pickupLocation.coordinates[0].toFixed(6)}`}
                    </p>
                  </div>

                  {currentRescue.dropoffLocation && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Dropoff Location
                      </h3>
                      <p className="mt-1 text-gray-900">
                        {currentRescue.dropoffLocation.address ||
                          `${currentRescue.dropoffLocation.coordinates[1].toFixed(6)}, ${currentRescue.dropoffLocation.coordinates[0].toFixed(6)}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => navigate(`/rider/rescue/${currentRescue._id}`)}
                    variant="primary"
                  >
                    Track Rescue
                  </Button>
                  {currentRescue.status === RescueStatus.REQUESTED && (
                    <Button variant="danger" onClick={() => {}}>
                      Cancel Request
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card variant="elevated" padding="lg" className="mb-8">
            <div className="text-center py-8">
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                No Active Rescue
              </h3>
              <p className="mt-2 text-gray-600">
                Need help with your e-bike? Request a rescue now.
              </p>
              <Button
                onClick={() => navigate('/rider/request')}
                variant="primary"
                size="lg"
                className="mt-6"
              >
                Request Rescue
              </Button>
            </div>
          </Card>
        )}

        {/* Past Rescues */}
        <div>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Rescue History</h2>

          {pastRescues.length === 0 ? (
            <Card variant="outlined" padding="lg">
              <p className="text-center text-gray-600">No past rescues yet</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {pastRescues.slice(0, 5).map((rescue) => (
                <Card key={rescue._id} variant="outlined" padding="md">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900 capitalize">
                          {rescue.type.replace('_', ' ')}
                        </h3>
                        <Badge variant={getStatusVariant(rescue.status)}>
                          {formatStatus(rescue.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {formatRelativeTime(rescue.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(
                          rescue.finalPrice?.amountInCents ||
                            rescue.estimatedPrice.amountInCents,
                          rescue.estimatedPrice.currency,
                        )}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/rider/rescue/${rescue._id}`)}
                        className="mt-1"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Container>
    </AppLayout>
  );
};

RiderDashboard.displayName = 'RiderDashboard';
