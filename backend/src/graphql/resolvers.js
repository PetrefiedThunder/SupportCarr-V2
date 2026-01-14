import { GraphQLScalarType, Kind } from 'graphql';
import { GraphQLUpload } from 'graphql-upload';
import GraphQLJSON from 'graphql-type-json';
import { User, DriverProfile, RiderProfile, RescueRequest, PaymentRecord, Notification } from '../models/index.js';
import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { generateTokens } from '../utils/jwt.js';
import bcrypt from 'bcryptjs';
import analyticsService from '../services/analyticsService.js';
import locationService from '../services/locationService.js';

// Custom DateTime scalar
const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Date time scalar type',
  serialize(value) {
    return value.toISOString();
  },
  parseValue(value) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

export const resolvers = {
  DateTime: dateTimeScalar,
  Upload: GraphQLUpload,
  JSON: GraphQLJSON,

  Query: {
    // User queries
    me: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');
      return User.findById(user.userId);
    },

    user: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');
      return User.findById(id);
    },

    users: async (_, { role, limit = 50, page = 1 }, { user }) => {
      if (!user || (user.role !== 'admin' && user.role !== 'support')) {
        throw new ForbiddenError('Not authorized');
      }

      const query = role ? { role } : {};
      return User.find(query)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });
    },

    // Rescue queries
    rescue: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');
      return RescueRequest.findById(id);
    },

    rescues: async (_, { filter, pagination }, { user }) => {
      if (!user || (user.role !== 'admin' && user.role !== 'support')) {
        throw new ForbiddenError('Not authorized');
      }

      const query = {};
      if (filter) {
        if (filter.status) query.status = filter.status;
        if (filter.riderId) query.riderId = filter.riderId;
        if (filter.driverId) query.driverId = filter.driverId;
        if (filter.startDate || filter.endDate) {
          query.createdAt = {};
          if (filter.startDate) query.createdAt.$gte = filter.startDate;
          if (filter.endDate) query.createdAt.$lte = filter.endDate;
        }
      }

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const sortBy = pagination?.sortBy || 'createdAt';
      const sortOrder = pagination?.sortOrder === 'asc' ? 1 : -1;

      const [rescues, total] = await Promise.all([
        RescueRequest.find(query)
          .sort({ [sortBy]: sortOrder })
          .limit(limit)
          .skip((page - 1) * limit),
        RescueRequest.countDocuments(query),
      ]);

      return {
        rescues,
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    },

    myRescues: async (_, { status, limit = 20 }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      const query = {};
      if (user.role === 'rider') {
        query.riderId = user.userId;
      } else if (user.role === 'driver') {
        query.driverId = user.userId;
      }

      if (status) {
        query.status = status;
      }

      return RescueRequest.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);
    },

    activeRescues: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      return RescueRequest.find({
        status: { $in: ['pending', 'accepted', 'driver_enroute', 'driver_arrived', 'in_progress'] },
      }).sort({ createdAt: -1 });
    },

    // Driver queries
    driver: async (_, { id }) => {
      return DriverProfile.findById(id);
    },

    nearbyDrivers: async (_, { latitude, longitude, radius = 10 }) => {
      const drivers = await locationService.findNearbyDrivers(latitude, longitude, radius);
      return drivers;
    },

    driverLeaderboard: async (_, { limit = 10 }, { user }) => {
      if (!user || (user.role !== 'admin' && user.role !== 'support')) {
        throw new ForbiddenError('Not authorized');
      }

      return DriverProfile.find()
        .sort({ 'rating.average': -1, 'stats.totalRescues': -1 })
        .limit(limit);
    },

    // Analytics queries
    analyticsDashboard: async (_, __, { user }) => {
      if (!user || (user.role !== 'admin' && user.role !== 'support')) {
        throw new ForbiddenError('Not authorized');
      }

      return analyticsService.getDashboardMetrics();
    },

    rescueTrends: async (_, { days = 30 }, { user }) => {
      if (!user || (user.role !== 'admin' && user.role !== 'support')) {
        throw new ForbiddenError('Not authorized');
      }

      return analyticsService.getRescueTrends(days);
    },

    revenueAnalytics: async (_, { days = 30 }, { user }) => {
      if (!user || (user.role !== 'admin' && user.role !== 'support')) {
        throw new ForbiddenError('Not authorized');
      }

      return analyticsService.getRevenueAnalytics(days);
    },

    // Notification queries
    notifications: async (_, { limit = 50, unreadOnly = false }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      const query = { userId: user.userId };
      if (unreadOnly) {
        query.isRead = false;
      }

      return Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);
    },

    unreadNotificationCount: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      return Notification.countDocuments({
        userId: user.userId,
        isRead: false,
      });
    },

    // Payment queries
    payments: async (_, { limit = 50 }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      const query = {};
      if (user.role !== 'admin' && user.role !== 'support') {
        query.userId = user.userId;
      }

      return PaymentRecord.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);
    },

    payment: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      const payment = await PaymentRecord.findById(id);

      if (!payment) {
        throw new UserInputError('Payment not found');
      }

      if (user.role !== 'admin' && user.role !== 'support' && payment.userId.toString() !== user.userId) {
        throw new ForbiddenError('Not authorized');
      }

      return payment;
    },
  },

  Mutation: {
    // Auth mutations
    signup: async (_, { phoneNumber, password, firstName, lastName, role }) => {
      const existingUser = await User.findOne({ phoneNumber });
      if (existingUser) {
        throw new UserInputError('Phone number already registered');
      }

      const user = await User.create({
        phoneNumber,
        password,
        firstName,
        lastName,
        role,
      });

      // Create profile based on role
      if (role === 'rider') {
        await RiderProfile.create({ userId: user._id });
      } else if (role === 'driver') {
        await DriverProfile.create({ userId: user._id });
      }

      const tokens = generateTokens(user._id, role);

      return {
        ...tokens,
        user,
      };
    },

    signin: async (_, { phoneNumber, password }) => {
      const user = await User.findOne({ phoneNumber }).select('+password');
      if (!user) {
        throw new AuthenticationError('Invalid credentials');
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new AuthenticationError('Invalid credentials');
      }

      const tokens = generateTokens(user._id, user.role);

      return {
        ...tokens,
        user,
      };
    },

    // Rescue mutations
    createRescue: async (_, { input }, { user }) => {
      if (!user || user.role !== 'rider') {
        throw new ForbiddenError('Only riders can create rescues');
      }

      const rescue = await RescueRequest.create({
        riderId: user.userId,
        pickupLocation: {
          address: input.pickupLocation.address,
          location: {
            type: 'Point',
            coordinates: [input.pickupLocation.longitude, input.pickupLocation.latitude],
          },
          landmark: input.pickupLocation.landmark,
        },
        dropoffLocation: {
          address: input.dropoffLocation.address,
          location: {
            type: 'Point',
            coordinates: [input.dropoffLocation.longitude, input.dropoffLocation.latitude],
          },
          landmark: input.dropoffLocation.landmark,
        },
        issue: input.issue,
        ebike: input.ebike,
        status: 'pending',
      });

      return rescue;
    },

    acceptRescue: async (_, { rescueId }, { user }) => {
      if (!user || user.role !== 'driver') {
        throw new ForbiddenError('Only drivers can accept rescues');
      }

      // Use atomic findOneAndUpdate to prevent race condition where multiple drivers
      // try to accept the same rescue simultaneously
      const rescue = await RescueRequest.findOneAndUpdate(
        {
          _id: rescueId,
          status: 'pending', // Only update if still pending
        },
        {
          $set: {
            driverId: user.userId,
            status: 'accepted',
            acceptedAt: new Date(),
          },
          $push: {
            timeline: {
              status: 'accepted',
              timestamp: new Date(),
              message: 'Driver accepted the rescue request',
            },
          },
        },
        {
          new: true, // Return updated document
          runValidators: true,
        }
      );

      if (!rescue) {
        throw new UserInputError('Rescue not found or no longer available');
      }

      return rescue;
    },

    updateRescueStatus: async (_, { rescueId, status }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      // Build query with authorization check
      const query = { _id: rescueId };
      if (user.role === 'driver') {
        query.driverId = user.userId;
      } else if (user.role !== 'admin') {
        throw new ForbiddenError('Not authorized');
      }

      // Use atomic update to prevent race conditions
      const updateFields = {
        $set: { status },
        $push: {
          timeline: {
            status,
            timestamp: new Date(),
          },
        },
      };

      if (status === 'completed') {
        updateFields.$set.completedAt = new Date();
      }

      const rescue = await RescueRequest.findOneAndUpdate(
        query,
        updateFields,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!rescue) {
        throw new UserInputError('Rescue not found or not authorized');
      }

      return rescue;
    },

    // Driver mutations
    updateDriverLocation: async (_, { input }, { user }) => {
      if (!user || user.role !== 'driver') {
        throw new ForbiddenError('Only drivers can update location');
      }

      await locationService.updateDriverLocation(
        user.userId,
        input.latitude,
        input.longitude,
        input.heading,
        input.speed
      );

      return DriverProfile.findOne({ userId: user.userId });
    },

    toggleDriverOnline: async (_, __, { user }) => {
      if (!user || user.role !== 'driver') {
        throw new ForbiddenError('Only drivers can toggle online status');
      }

      // Use atomic update to toggle without race condition
      const driver = await DriverProfile.findOne({ userId: user.userId });
      if (!driver) {
        throw new UserInputError('Driver profile not found');
      }

      const updated = await DriverProfile.findOneAndUpdate(
        { userId: user.userId },
        [
          {
            $set: {
              isOnline: { $not: '$isOnline' },
            },
          },
        ],
        { new: true }
      );

      return updated;
    },

    // Notification mutations
    markNotificationRead: async (_, { notificationId }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      const notification = await Notification.findById(notificationId);
      if (!notification || notification.userId.toString() !== user.userId) {
        throw new ForbiddenError('Not authorized');
      }

      notification.isRead = true;
      await notification.save();

      return notification;
    },

    markAllNotificationsRead: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      await Notification.updateMany(
        { userId: user.userId, isRead: false },
        { $set: { isRead: true } }
      );

      return true;
    },
  },

  // Field resolvers
  User: {
    riderProfile: async (user) => {
      if (user.role === 'rider') {
        return RiderProfile.findOne({ userId: user._id });
      }
      return null;
    },

    driverProfile: async (user) => {
      if (user.role === 'driver') {
        return DriverProfile.findOne({ userId: user._id });
      }
      return null;
    },
  },

  RiderProfile: {
    user: async (profile) => {
      return User.findById(profile.userId);
    },
  },

  DriverProfile: {
    user: async (profile) => {
      return User.findById(profile.userId);
    },
  },

  RescueRequest: {
    rider: async (rescue) => {
      return User.findById(rescue.riderId);
    },

    driver: async (rescue) => {
      if (rescue.driverId) {
        return User.findById(rescue.driverId);
      }
      return null;
    },
  },

  PaymentRecord: {
    user: async (payment) => {
      return User.findById(payment.userId);
    },

    rescue: async (payment) => {
      return RescueRequest.findById(payment.rescueId);
    },
  },

  Notification: {
    user: async (notification) => {
      return User.findById(notification.userId);
    },
  },

  Subscription: {
    rescueUpdated: {
      subscribe: (_, { rescueId }, { pubsub }) => {
        return pubsub.asyncIterator([`RESCUE_UPDATED_${rescueId}`]);
      },
    },

    driverLocationUpdated: {
      subscribe: (_, { driverId }, { pubsub }) => {
        return pubsub.asyncIterator([`DRIVER_LOCATION_${driverId}`]);
      },
    },

    notificationReceived: {
      subscribe: (_, __, { pubsub, user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator([`NOTIFICATION_${user.userId}`]);
      },
    },

    rescueRequestCreated: {
      subscribe: (_, __, { pubsub, user }) => {
        if (!user || user.role !== 'driver') {
          throw new ForbiddenError('Only drivers can subscribe to rescue requests');
        }
        return pubsub.asyncIterator(['RESCUE_REQUEST_CREATED']);
      },
    },
  },
};
