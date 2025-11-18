import { Notification } from '../models/index.js';
import twilioService from './twilioService.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

class NotificationService {
  /**
   * Send notification through multiple channels
   */
  async send(userId, type, title, body, data = {}, options = {}) {
    try {
      // Create notification record
      const notification = await Notification.create({
        userId,
        type,
        title,
        body,
        data,
        priority: options.priority || 'normal',
        expiresAt: options.expiresAt,
        actionUrl: options.actionUrl,
        relatedTo: options.relatedTo,
        channels: {
          push: { sent: false },
          sms: { sent: false },
          email: { sent: false },
          inApp: { sent: true, read: false },
        },
      });

      // Get user preferences
      const user = await this.getUserWithPreferences(userId);

      // Send through enabled channels
      const promises = [];

      if (options.sendPush !== false && user.preferences?.notifyByPush) {
        promises.push(this.sendPushNotification(user, notification));
      }

      if (options.sendSMS && user.preferences?.notifyBySMS) {
        promises.push(this.sendSMSNotification(user, notification));
      }

      if (options.sendEmail && user.preferences?.notifyByEmail) {
        promises.push(this.sendEmailNotification(user, notification));
      }

      // Execute all channel sends in parallel
      await Promise.allSettled(promises);

      return notification;
    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(user, notification) {
    try {
      if (!user.deviceTokens || user.deviceTokens.length === 0) {
        logger.debug('No device tokens for push notification', { userId: user._id });
        return;
      }

      // In production, integrate with FCM/APNs
      // For now, just mark as sent
      await notification.markChannelAsSent('push', 'mock-message-id');

      logger.info('Push notification sent', {
        userId: user._id,
        type: notification.type,
      });
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      await notification.markChannelAsSent('push', null, error.message);
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(user, notification) {
    try {
      const message = `${notification.title}\n\n${notification.body}`;
      const result = await twilioService.sendSMS(user.phoneNumber, message);

      await notification.markChannelAsSent('sms', result.messageId);

      logger.info('SMS notification sent', {
        userId: user._id,
        type: notification.type,
      });
    } catch (error) {
      logger.error('Failed to send SMS notification:', error);
      await notification.markChannelAsSent('sms', null, error.message);
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(user, notification) {
    try {
      // In production, integrate with email service (SendGrid, SES, etc.)
      // For now, just mark as sent
      await notification.markChannelAsSent('email', 'mock-email-id');

      logger.info('Email notification sent', {
        userId: user._id,
        type: notification.type,
      });
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      await notification.markChannelAsSent('email', null, error.message);
    }
  }

  /**
   * Send rescue request notification to driver
   */
  async notifyDriverOfRescueRequest(driver, rescueRequest) {
    const distance = rescueRequest.distance?.estimated || 'N/A';
    const price = rescueRequest.pricing?.total || 0;

    return this.send(
      driver._id,
      'rescue_request',
      '🚨 New Rescue Request',
      `New rescue ${distance} km away. Earn $${price.toFixed(2)}`,
      {
        rescueRequestId: rescueRequest._id,
        pickupAddress: rescueRequest.pickupLocation.address,
        distance,
        price,
      },
      {
        priority: 'high',
        sendSMS: true,
        sendPush: true,
        actionUrl: `/rescues/${rescueRequest._id}`,
        relatedTo: {
          model: 'RescueRequest',
          id: rescueRequest._id,
        },
      }
    );
  }

  /**
   * Send rescue accepted notification to rider
   */
  async notifyRiderOfAcceptance(rider, rescueRequest, driver) {
    return this.send(
      rider._id,
      'rescue_accepted',
      '✅ Driver Assigned',
      `${driver.fullName} has accepted your rescue request!`,
      {
        rescueRequestId: rescueRequest._id,
        driverName: driver.fullName,
        driverPhone: driver.phoneNumber,
      },
      {
        priority: 'high',
        sendSMS: true,
        sendPush: true,
        actionUrl: `/rescues/${rescueRequest._id}`,
        relatedTo: {
          model: 'RescueRequest',
          id: rescueRequest._id,
        },
      }
    );
  }

  /**
   * Send rescue status update
   */
  async notifyRescueStatusUpdate(userId, rescueRequest, newStatus) {
    const statusMessages = {
      driver_enroute: {
        title: '🚗 Driver On The Way',
        body: 'Your driver is heading to your location',
      },
      driver_arrived: {
        title: '📍 Driver Arrived',
        body: 'Your driver has arrived at the pickup location',
      },
      in_progress: {
        title: '🔄 Rescue In Progress',
        body: 'Your e-bike is loaded and heading to destination',
      },
      completed: {
        title: '✨ Rescue Completed',
        body: 'Your rescue has been completed successfully!',
      },
      cancelled_by_driver: {
        title: '❌ Rescue Cancelled',
        body: 'Your rescue has been cancelled by the driver',
      },
      cancelled_by_system: {
        title: '❌ Rescue Cancelled',
        body: 'Your rescue has been cancelled',
      },
    };

    const message = statusMessages[newStatus] || {
      title: 'Rescue Update',
      body: `Status: ${newStatus}`,
    };

    return this.send(
      userId,
      newStatus,
      message.title,
      message.body,
      {
        rescueRequestId: rescueRequest._id,
        status: newStatus,
      },
      {
        priority: 'normal',
        sendPush: true,
        actionUrl: `/rescues/${rescueRequest._id}`,
        relatedTo: {
          model: 'RescueRequest',
          id: rescueRequest._id,
        },
      }
    );
  }

  /**
   * Send payment received notification
   */
  async notifyPaymentReceived(userId, paymentRecord) {
    return this.send(
      userId,
      'payment_received',
      '💳 Payment Received',
      `Payment of $${paymentRecord.amount.toFixed(2)} has been processed`,
      {
        paymentRecordId: paymentRecord._id,
        amount: paymentRecord.amount,
      },
      {
        priority: 'normal',
        sendPush: true,
        relatedTo: {
          model: 'PaymentRecord',
          id: paymentRecord._id,
        },
      }
    );
  }

  /**
   * Send payout processed notification to driver
   */
  async notifyPayoutProcessed(driverId, paymentRecord) {
    return this.send(
      driverId,
      'payout_processed',
      '💰 Payout Processed',
      `You've received $${paymentRecord.payout.amount.toFixed(2)}`,
      {
        paymentRecordId: paymentRecord._id,
        amount: paymentRecord.payout.amount,
      },
      {
        priority: 'normal',
        sendPush: true,
        relatedTo: {
          model: 'PaymentRecord',
          id: paymentRecord._id,
        },
      }
    );
  }

  /**
   * Send rating received notification
   */
  async notifyRatingReceived(userId, rating) {
    return this.send(
      userId,
      'rating_received',
      '⭐ New Rating',
      `You received a ${rating.score}-star rating`,
      {
        ratingId: rating._id,
        score: rating.score,
      },
      {
        priority: 'low',
        sendPush: true,
        relatedTo: {
          model: 'Rating',
          id: rating._id,
        },
      }
    );
  }

  /**
   * Get user with preferences
   */
  async getUserWithPreferences(userId) {
    const User = (await import('../models/index.js')).User;
    const user = await User.findById(userId)
      .populate('riderProfile')
      .populate('driverProfile');

    // Merge preferences from rider or driver profile
    const preferences = user.riderProfile?.preferences || user.driverProfile?.preferences || {};

    return {
      ...user.toObject(),
      preferences,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification.markAsRead();
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    return Notification.markAllAsRead(userId);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    return Notification.countDocuments({
      userId,
      'channels.inApp.read': false,
    });
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ userId });

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete old notifications
   */
  async deleteOldNotifications(daysOld = 30) {
    return Notification.deleteOld(daysOld);
  }
}

export default new NotificationService();
