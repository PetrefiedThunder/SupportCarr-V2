import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema } = mongoose;

const referralSchema = new Schema(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    referredUsers: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        referredAt: {
          type: Date,
          default: Date.now,
        },
        firstRescueCompleted: {
          type: Boolean,
          default: false,
        },
        rewardEarned: {
          type: Boolean,
          default: false,
        },
        rewardAmount: {
          type: Number,
          default: 0,
        },
      },
    ],
    stats: {
      totalReferred: {
        type: Number,
        default: 0,
      },
      totalCompleted: {
        type: Number,
        default: 0,
      },
      totalEarned: {
        type: Number,
        default: 0,
      },
    },
    rewards: {
      referrerBonus: {
        type: Number,
        default: 10, // $10 per successful referral
      },
      refereeBonus: {
        type: Number,
        default: 10, // $10 for new user
      },
      requireFirstRide: {
        type: Boolean,
        default: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
referralSchema.index({ referralCode: 1 });
referralSchema.index({ referrerId: 1, isActive: 1 });

// Virtual for referrer
referralSchema.virtual('referrer', {
  ref: 'User',
  localField: 'referrerId',
  foreignField: '_id',
  justOne: true,
});

// Instance methods
referralSchema.methods.addReferral = function (userId) {
  const existing = this.referredUsers.find(
    (ref) => ref.userId.toString() === userId.toString()
  );

  if (existing) {
    throw new Error('User already referred');
  }

  this.referredUsers.push({
    userId,
    referredAt: new Date(),
  });

  this.stats.totalReferred += 1;

  return this.save();
};

referralSchema.methods.markRescueCompleted = async function (userId) {
  const referral = this.referredUsers.find(
    (ref) => ref.userId.toString() === userId.toString()
  );

  if (!referral) {
    throw new Error('Referral not found');
  }

  if (referral.firstRescueCompleted) {
    return this; // Already marked
  }

  referral.firstRescueCompleted = true;
  referral.rewardEarned = true;
  referral.rewardAmount = this.rewards.referrerBonus;

  this.stats.totalCompleted += 1;
  this.stats.totalEarned += this.rewards.referrerBonus;

  await this.save();

  // Credit referrer's account
  const { User } = await import('./index.js');
  const referrer = await User.findById(this.referrerId);
  if (referrer) {
    referrer.balance += this.rewards.referrerBonus;
    await referrer.save();
  }

  // Credit referee's account
  const referee = await User.findById(userId);
  if (referee) {
    referee.balance += this.rewards.refereeBonus;
    await referee.save();
  }

  return this;
};

// Static methods
referralSchema.statics.findByCode = function (code) {
  return this.findOne({ referralCode: code.toUpperCase(), isActive: true });
};

referralSchema.statics.findByReferrer = function (referrerId) {
  return this.findOne({ referrerId, isActive: true });
};

referralSchema.statics.generateCode = function () {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

referralSchema.statics.createForUser = async function (userId) {
  // Check if user already has a referral code
  const existing = await this.findOne({ referrerId: userId });
  if (existing) {
    return existing;
  }

  // Generate unique code
  let code;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = this.generateCode();
    const exists = await this.findOne({ referralCode: code });
    if (!exists) break;
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique referral code');
  }

  return this.create({
    referrerId: userId,
    referralCode: code,
  });
};

const Referral = mongoose.model('Referral', referralSchema);

export default Referral;
