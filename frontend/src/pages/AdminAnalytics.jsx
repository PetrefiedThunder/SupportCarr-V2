import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import apiClient from '../services/apiClient';
import { useAuthStore } from '../store/authStore';

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [rescueTrends, setRescueTrends] = useState([]);
  const [revenueAnalytics, setRevenueAnalytics] = useState([]);
  const [driverLeaderboard, setDriverLeaderboard] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [issueDistribution, setIssueDistribution] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'support') {
      toast.error('Unauthorized access');
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch all analytics data
  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [
        metricsRes,
        trendsRes,
        revenueRes,
        leaderboardRes,
        peakRes,
        issuesRes,
        activityRes,
      ] = await Promise.all([
        apiClient.get('/analytics/dashboard'),
        apiClient.get(`/analytics/trends/rescues?days=${selectedPeriod}`),
        apiClient.get(`/analytics/trends/revenue?days=${selectedPeriod}`),
        apiClient.get('/analytics/drivers/leaderboard?limit=10'),
        apiClient.get('/analytics/insights/peak-hours'),
        apiClient.get('/analytics/insights/issues'),
        apiClient.get('/analytics/activity?limit=10'),
      ]);

      setDashboardMetrics(metricsRes.data.data);
      setRescueTrends(trendsRes.data.data.trends);
      setRevenueAnalytics(revenueRes.data.data.analytics);
      setDriverLeaderboard(leaderboardRes.data.data.leaderboard);
      setPeakHours(peakRes.data.data.analysis);
      setIssueDistribution(issuesRes.data.data.distribution);
      setActivityFeed(activityRes.data.data.feed);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Real-time insights and platform metrics
          </p>
        </div>

        {/* Period Selector */}
        <div className="mb-6 flex space-x-4">
          {[7, 30, 90, 180, 365].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedPeriod(days)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedPeriod === days
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {days === 7 ? 'Week' : days === 30 ? 'Month' : days === 90 ? '3 Months' : days === 180 ? '6 Months' : 'Year'}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        {dashboardMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              title="Total Rescues"
              value={dashboardMetrics.rescues.total.toLocaleString()}
              subtitle={`${dashboardMetrics.rescues.completedToday} completed today`}
              trend={dashboardMetrics.rescues.completionRate}
              icon="🚨"
              color="blue"
            />
            <KPICard
              title="Active Drivers"
              value={dashboardMetrics.drivers.online}
              subtitle={`${dashboardMetrics.drivers.activeRate}% online rate`}
              trend={dashboardMetrics.drivers.activeRate}
              icon="🚗"
              color="green"
            />
            <KPICard
              title="Total Revenue"
              value={`$${(dashboardMetrics.revenue.total / 100).toLocaleString()}`}
              subtitle={`$${(dashboardMetrics.revenue.today / 100).toFixed(2)} today`}
              trend="+12.5"
              icon="💰"
              color="yellow"
            />
            <KPICard
              title="Avg Rating"
              value={dashboardMetrics.rating.average}
              subtitle="Platform rating"
              trend="+0.2"
              icon="⭐"
              color="purple"
            />
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Rescue Trends */}
          <ChartCard title="Rescue Trends">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={rescueTrends}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(parseISO(date), 'MMM d')}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(date) => format(parseISO(date), 'MMM d, yyyy')}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  name="Total Rescues"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                  name="Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Revenue Analytics */}
          <ChartCard title="Revenue Trends">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(parseISO(date), 'MMM d')}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(date) => format(parseISO(date), 'MMM d, yyyy')}
                  formatter={(value) => `$${(value / 100).toFixed(2)}`}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Peak Hours */}
          <ChartCard title="Peak Hours Analysis">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#10b981" name="Rescues" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Issue Distribution */}
          <ChartCard title="Issue Type Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={issueDistribution}
                  dataKey="count"
                  nameKey="issueType"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => entry.issueType}
                >
                  {issueDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Driver Leaderboard & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leaderboard */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Drivers</h3>
            <div className="space-y-4">
              {driverLeaderboard.map((driver, index) => (
                <div key={driver.driverId} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                    }`}>
                      {driver.rank}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{driver.name}</p>
                    <p className="text-sm text-gray-500">
                      {driver.totalRescues} rescues • {driver.rating.toFixed(1)}⭐
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      ${(driver.totalEarnings / 100).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{driver.completionRate}% completion</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {activityFeed.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                    activity.status === 'completed' ? 'bg-green-500' :
                    activity.status === 'in_progress' ? 'bg-blue-500' :
                    activity.status.includes('cancelled') ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.rider}</span> requested rescue
                    </p>
                    <p className="text-xs text-gray-500">{activity.location}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(parseISO(activity.timestamp), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      ${(activity.amount / 100).toFixed(2)}
                    </p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                      activity.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      activity.status.includes('cancelled') ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={() => window.open(`/api/v1/analytics/export?format=csv&type=comprehensive&days=${selectedPeriod}`, '_blank')}
            className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition flex items-center space-x-2"
          >
            <span>📊</span>
            <span>Export Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// KPI Card Component
const KPICard = ({ title, value, subtitle, trend, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
        {trend && (
          <span className="text-green-600 text-sm font-semibold">
            +{trend}%
          </span>
        )}
      </div>
      <h3 className="mt-4 text-2xl font-bold text-gray-900">{value}</h3>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
};

// Chart Card Component
const ChartCard = ({ title, children }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
};

export default AdminAnalytics;
