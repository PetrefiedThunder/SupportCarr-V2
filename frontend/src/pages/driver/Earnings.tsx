import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDriverStore } from '@/store/driverStore';
import { useRequireAuth } from '@/hooks/useAuth';
import { AppLayout, Container } from '@/components/layout';
import { Card, CardHeader, CardContent, Badge, Spinner, Select } from '@/components/ui';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { UserRole, RescueStatus } from '@/types';

/**
 * Driver Earnings Page
 *
 * View earnings history and statistics
 */
export const Earnings: React.FC = () => {
  useRequireAuth(UserRole.DRIVER);

  const profile = useAuthStore((state) => state.profile);
  const { completedRescues, isLoading, fetchCompletedRescues } = useDriverStore();

  const [timePeriod, setTimePeriod] = useState<'today' | 'week' | 'month' | 'all'>(
    'all',
  );

  /**
   * Load completed rescues on mount
   */
  useEffect(() => {
    fetchCompletedRescues();
  }, [fetchCompletedRescues]);

  /**
   * Calculate earnings for time period
   */
  const calculateEarnings = () => {
    const now = new Date();
    let filteredRescues = completedRescues;

    if (timePeriod !== 'all') {
      filteredRescues = completedRescues.filter((rescue) => {
        const completedDate = new Date(rescue.completedAt!);
        const diffDays = Math.floor(
          (now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        switch (timePeriod) {
          case 'today':
            return diffDays === 0;
          case 'week':
            return diffDays <= 7;
          case 'month':
            return diffDays <= 30;
          default:
            return true;
        }
      });
    }

    const total = filteredRescues.reduce(
      (sum, rescue) =>
        sum + (rescue.finalPrice?.amountInCents || rescue.estimatedPrice.amountInCents),
      0,
    );

    return {
      total,
      count: filteredRescues.length,
      average: filteredRescues.length > 0 ? total / filteredRescues.length : 0,
    };
  };

  const earnings = calculateEarnings();

  /**
   * Get time period label
   */
  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case 'today':
        return "Today's";
      case 'week':
        return "This Week's";
      case 'month':
        return "This Month's";
      case 'all':
        return 'Total';
      default:
        return '';
    }
  };

  if (isLoading && completedRescues.length === 0) {
    return (
      <AppLayout>
        <Container className="py-12">
          <div className="flex justify-center">
            <Spinner size="lg" label="Loading earnings..." />
          </div>
        </Container>
      </AppLayout>
    );
  }

  const timePeriodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <AppLayout>
      <Container className="py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
            <p className="mt-2 text-gray-600">
              Track your income and completed rescues
            </p>
          </div>

          {/* Time Period Filter */}
          <Select
            value={timePeriod}
            onChange={(e) =>
              setTimePeriod(e.target.value as 'today' | 'week' | 'month' | 'all')
            }
            options={timePeriodOptions}
            className="w-48"
          />
        </div>

        {/* Earnings Summary */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card variant="elevated" padding="lg">
            <h3 className="text-sm font-medium text-gray-500">
              {getTimePeriodLabel()} Earnings
            </h3>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {formatCurrency(earnings.total)}
            </p>
          </Card>

          <Card variant="elevated" padding="lg">
            <h3 className="text-sm font-medium text-gray-500">
              Rescues Completed
            </h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{earnings.count}</p>
          </Card>

          <Card variant="elevated" padding="lg">
            <h3 className="text-sm font-medium text-gray-500">Average Per Rescue</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {formatCurrency(Math.round(earnings.average))}
            </p>
          </Card>
        </div>

        {/* Earnings History */}
        <div>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            Earnings History
          </h2>

          {completedRescues.length === 0 ? (
            <Card variant="outlined" padding="lg">
              <div className="text-center py-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  No earnings yet
                </h3>
                <p className="mt-2 text-gray-600">
                  Complete your first rescue to start earning
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedRescues.map((rescue) => (
                <Card key={rescue._id} variant="outlined" padding="md">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900 capitalize">
                          {rescue.type.replace('_', ' ')}
                        </h3>
                        <Badge variant="success">Completed</Badge>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {formatRelativeTime(rescue.completedAt!)}
                      </p>
                      {rescue.description && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-1">
                          {rescue.description}
                        </p>
                      )}
                    </div>

                    <div className="ml-6 text-right">
                      <p className="text-xl font-bold text-green-600">
                        +
                        {formatCurrency(
                          rescue.finalPrice?.amountInCents ||
                            rescue.estimatedPrice.amountInCents,
                          rescue.estimatedPrice.currency,
                        )}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(rescue.completedAt!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Payout Info */}
        <Card variant="elevated" padding="lg" className="mt-8">
          <CardHeader title="Payout Information" />
          <CardContent>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <p>
                💳 <strong>Payment Method:</strong> Direct deposit to your linked
                bank account
              </p>
              <p>
                📅 <strong>Payout Schedule:</strong> Weekly, every Monday
              </p>
              <p>
                🏦 <strong>Processing Time:</strong> 2-3 business days
              </p>
              <p className="mt-4 rounded-lg bg-blue-50 p-3 text-blue-800">
                💡 Your next payout is scheduled for{' '}
                <strong>
                  {new Date(
                    new Date().setDate(
                      new Date().getDate() + ((8 - new Date().getDay()) % 7),
                    ),
                  ).toLocaleDateString()}
                </strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </Container>
    </AppLayout>
  );
};

Earnings.displayName = 'Earnings';
