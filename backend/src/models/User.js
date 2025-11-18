import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import validator from 'validator';
import encrypt from 'mongoose-encryption';
import config from '../config/index.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      validate: {
        validator: (v) => validator.isMobilePhone(v, 'any', { strictMode: false }),
        message: 'Invalid phone number format',
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      validate: {
        validator: (v) => !v || validator.isEmail(v),
        message: 'Invalid email format',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    role: {
      type: String,
      enum: ['rider', 'driver', 'admin', 'support'],
      default: 'rider',
    },
    avatar: {
      type: String,
      validate: {
        validator: (v) => !v || validator.isURL(v),
        message: 'Invalid avatar URL',
      },
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
    },
    bannedAt: {
      type: Date,
    },
    stripeCustomerId: {
      type: String,
      sparse: true,
    },
    stripeAccountId: {
      type: String,
      sparse: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    deviceTokens: [
      {
        token: String,
        platform: {
          type: String,
          enum: ['ios', 'android', 'web'],
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastLoginAt: {
      type: Date,
    },
    lastActiveAt: {
      type: Date,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes
userSchema.index({ phoneNumber: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Encrypt PII fields
const encOptions = {
  encryptionKey: config.encryption.key,
  signingKey: config.encryption.key,
  encryptedFields: ['email', 'firstName', 'lastName'],
};

if (config.env !== 'test') {
  userSchema.plugin(encrypt, encOptions);
}

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || 'Anonymous';
});

// Virtual populate for driver profile
userSchema.virtual('driverProfile', {
  ref: 'DriverProfile',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});

// Virtual populate for rider profile
userSchema.virtual('riderProfile', {
  ref: 'RiderProfile',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to check if user can be driver
userSchema.methods.canBeDriver = function () {
  return this.isPhoneVerified && this.isActive && !this.isBanned;
};

// Instance method to add device token
userSchema.methods.addDeviceToken = function (token, platform) {
  // Remove existing token if present
  this.deviceTokens = this.deviceTokens.filter((dt) => dt.token !== token);

  // Add new token
  this.deviceTokens.push({ token, platform });

  // Keep only last 5 tokens
  if (this.deviceTokens.length > 5) {
    this.deviceTokens = this.deviceTokens.slice(-5);
  }

  return this.save();
};

// Static method to find by phone
userSchema.statics.findByPhone = function (phoneNumber) {
  return this.findOne({ phoneNumber });
};

// Static method to find active users
userSchema.statics.findActive = function () {
  return this.find({ isActive: true, isBanned: false });
};

const User = mongoose.model('User', userSchema);

export default User;
