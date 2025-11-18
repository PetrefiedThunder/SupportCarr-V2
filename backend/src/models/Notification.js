import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'rescue_request',
        'rescue_accepted',
        'driver_enroute',
        'driver_arrived',
        'rescue_completed',
        'rescue_cancelled',
        'payment_received',
        'payment_failed',
        'payout_processed',
        'rating_received',
        'message_received',
        'document_verified',
        'document_rejected',
        'account_suspended',
        'promo_available',
        'system_announcement',
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    body: {
      type: String,
      required: true,
      maxlength: 500,
    },
    data: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    relatedTo: {
      model: {
        type: String,
        enum: ['RescueRequest', 'PaymentRecord', 'Rating', 'User'],
      },
      id: {
        type: Schema.Types.ObjectId,
      },
    },
    channels: {
      push: {
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
        messageId: String,
        error: String,
      },
      sms: {
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
        messageId: String,
        error: String,
      },
      email: {
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
        messageId: String,
        error: String,
      },
      inApp: {
        sent: {
          type: Boolean,
          default: true,
        },
        read: {
          type: Boolean,
          default: false,
        },
        readAt: Date,
      },
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    expiresAt: {
      type: Date,
    },
    actionUrl: {
      type: String,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, 'channels.inApp.read': 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtuals
notificationSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Instance methods
notificationSchema.methods.markAsRead = function () {
  this.channels.inApp.read = true;
  this.channels.inApp.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markChannelAsSent = function (channel, messageId = null, error = null) {
  if (this.channels[channel]) {
    this.channels[channel].sent = !error;
    this.channels[channel].sentAt = new Date();
    if (messageId) {
      this.channels[channel].messageId = messageId;
    }
    if (error) {
      this.channels[channel].error = error;
    }
  }
  return this.save();
};

// Static methods
notificationSchema.statics.findUnread = function (userId) {
  return this.find({
    userId,
    'channels.inApp.read': false,
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findByUser = function (userId, limit = 50) {
  return this.find({ userId }).sort({ createdAt: -1 }).limit(limit);
};

notificationSchema.statics.markAllAsRead = function (userId) {
  return this.updateMany(
    {
      userId,
      'channels.inApp.read': false,
    },
    {
      $set: {
        'channels.inApp.read': true,
        'channels.inApp.readAt': new Date(),
      },
    }
  );
};

notificationSchema.statics.deleteOld = function (daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    'channels.inApp.read': true,
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
