import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema } = mongoose;

const apiKeySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    keyPrefix: {
      type: String,
      required: true,
      index: true,
    },
    hashedKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      select: false,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    organizationName: {
      type: String,
      trim: true,
    },
    scopes: [
      {
        type: String,
        enum: [
          'read:rescues',
          'write:rescues',
          'read:users',
          'write:users',
          'read:payments',
          'write:payments',
          'read:analytics',
          'admin',
        ],
      },
    ],
    rateLimit: {
      requestsPerHour: {
        type: Number,
        default: 1000,
      },
      requestsPerDay: {
        type: Number,
        default: 10000,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
    },
    ipWhitelist: [
      {
        type: String,
      },
    ],
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
apiKeySchema.index({ hashedKey: 1 });
apiKeySchema.index({ keyPrefix: 1 });
apiKeySchema.index({ userId: 1, isActive: 1 });
apiKeySchema.index({ expiresAt: 1 });

// Virtual for user
apiKeySchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Instance methods
apiKeySchema.methods.isValid = function () {
  return this.isActive && (!this.expiresAt || this.expiresAt > new Date());
};

apiKeySchema.methods.hasScope = function (requiredScope) {
  return this.scopes.includes(requiredScope) || this.scopes.includes('admin');
};

apiKeySchema.methods.recordUsage = function () {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

apiKeySchema.methods.revoke = function () {
  this.isActive = false;
  return this.save();
};

// Static methods
apiKeySchema.statics.generateKey = function () {
  const key = `sc_${crypto.randomBytes(32).toString('hex')}`;
  const prefix = key.substring(0, 10);
  const hashedKey = crypto.createHash('sha256').update(key).digest('hex');

  return { key, prefix, hashedKey };
};

apiKeySchema.statics.findByKey = async function (key) {
  const hashedKey = crypto.createHash('sha256').update(key).digest('hex');
  return this.findOne({ hashedKey, isActive: true }).select('+hashedKey');
};

apiKeySchema.statics.verifyKey = function (key, providedKey) {
  const hashedProvided = crypto.createHash('sha256').update(providedKey).digest('hex');
  return hashedProvided === key;
};

apiKeySchema.statics.findByUser = function (userId) {
  return this.find({ userId, isActive: true }).sort({ createdAt: -1 });
};

apiKeySchema.statics.revokeExpired = function () {
  return this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      isActive: true,
    },
    {
      $set: { isActive: false },
    }
  );
};

const APIKey = mongoose.model('APIKey', apiKeySchema);

export default APIKey;
