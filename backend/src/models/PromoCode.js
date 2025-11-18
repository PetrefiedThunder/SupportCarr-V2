import mongoose from 'mongoose';

const { Schema } = mongoose;

const promoCodeSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed_amount', 'free_rescue'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
    },
    minPurchase: {
      type: Number,
      default: 0,
      min: 0,
    },
    usageLimit: {
      total: {
        type: Number,
        default: null, // null = unlimited
      },
      perUser: {
        type: Number,
        default: 1,
      },
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    applicableFor: {
      type: String,
      enum: ['all', 'first_time_only', 'returning_only'],
      default: 'all',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    usedBy: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        rescueId: {
          type: Schema.Types.ObjectId,
          ref: 'RescueRequest',
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
        discountApplied: Number,
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
promoCodeSchema.index({ code: 1, isActive: 1 });
promoCodeSchema.index({ validUntil: 1 });

// Instance methods
promoCodeSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.isActive &&
    this.validFrom <= now &&
    this.validUntil >= now &&
    (this.usageLimit.total === null || this.usageCount < this.usageLimit.total)
  );
};

promoCodeSchema.methods.canUserUse = function (userId) {
  if (!this.isValid()) return false;

  const userUsages = this.usedBy.filter(
    (usage) => usage.userId.toString() === userId.toString()
  );

  return userUsages.length < this.usageLimit.perUser;
};

promoCodeSchema.methods.calculateDiscount = function (amount) {
  if (!this.isValid()) return 0;

  if (amount < this.minPurchase) return 0;

  let discount = 0;

  if (this.type === 'percentage') {
    discount = (amount * this.discountValue) / 100;
    if (this.maxDiscount) {
      discount = Math.min(discount, this.maxDiscount);
    }
  } else if (this.type === 'fixed_amount') {
    discount = Math.min(this.discountValue, amount);
  } else if (this.type === 'free_rescue') {
    discount = amount;
  }

  return discount;
};

promoCodeSchema.methods.use = function (userId, rescueId, discountApplied) {
  this.usedBy.push({
    userId,
    rescueId,
    discountApplied,
    usedAt: new Date(),
  });
  this.usageCount += 1;
  return this.save();
};

// Static methods
promoCodeSchema.statics.findByCode = function (code) {
  return this.findOne({ code: code.toUpperCase(), isActive: true });
};

promoCodeSchema.statics.findActive = function () {
  const now = new Date();
  return this.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  });
};

promoCodeSchema.statics.deactivateExpired = function () {
  const now = new Date();
  return this.updateMany(
    {
      isActive: true,
      validUntil: { $lt: now },
    },
    {
      $set: { isActive: false },
    }
  );
};

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);

export default PromoCode;
