import mongoose from 'mongoose';

const { Schema } = mongoose;

const paymentRecordSchema = new Schema(
  {
    rescueRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'RescueRequest',
      required: true,
      index: true,
    },
    riderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      enum: ['charge', 'refund', 'payout', 'adjustment'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'usd',
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'cash', 'account_balance', 'other'],
      required: true,
    },
    stripe: {
      paymentIntentId: String,
      chargeId: String,
      refundId: String,
      transferId: String,
      payoutId: String,
      customerId: String,
      paymentMethodId: String,
    },
    breakdown: {
      subtotal: Number,
      platformFee: Number,
      tip: Number,
      discount: Number,
      total: Number,
    },
    refund: {
      amount: Number,
      reason: String,
      refundedAt: Date,
      stripeRefundId: String,
    },
    payout: {
      amount: Number,
      status: {
        type: String,
        enum: ['pending', 'processing', 'paid', 'failed', 'cancelled'],
      },
      paidAt: Date,
      stripePayoutId: String,
    },
    failureReason: {
      code: String,
      message: String,
    },
    processedAt: {
      type: Date,
    },
    settledAt: {
      type: Date,
    },
    receiptUrl: {
      type: String,
    },
    notes: {
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
paymentRecordSchema.index({ riderId: 1, createdAt: -1 });
paymentRecordSchema.index({ driverId: 1, createdAt: -1 });
paymentRecordSchema.index({ status: 1, createdAt: -1 });
paymentRecordSchema.index({ 'stripe.paymentIntentId': 1 });
paymentRecordSchema.index({ 'stripe.chargeId': 1 });

// Virtuals
paymentRecordSchema.virtual('rescueRequest', {
  ref: 'RescueRequest',
  localField: 'rescueRequestId',
  foreignField: '_id',
  justOne: true,
});

paymentRecordSchema.virtual('rider', {
  ref: 'User',
  localField: 'riderId',
  foreignField: '_id',
  justOne: true,
});

paymentRecordSchema.virtual('driver', {
  ref: 'User',
  localField: 'driverId',
  foreignField: '_id',
  justOne: true,
});

// Instance methods
paymentRecordSchema.methods.markAsSucceeded = function (stripeData = {}) {
  this.status = 'succeeded';
  this.processedAt = new Date();
  if (stripeData.chargeId) {
    this.stripe.chargeId = stripeData.chargeId;
  }
  if (stripeData.receiptUrl) {
    this.receiptUrl = stripeData.receiptUrl;
  }
  return this.save();
};

paymentRecordSchema.methods.markAsFailed = function (errorCode, errorMessage) {
  this.status = 'failed';
  this.failureReason = {
    code: errorCode,
    message: errorMessage,
  };
  this.processedAt = new Date();
  return this.save();
};

paymentRecordSchema.methods.processRefund = function (amount, reason) {
  this.status = 'refunded';
  this.refund = {
    amount,
    reason,
    refundedAt: new Date(),
  };
  return this.save();
};

paymentRecordSchema.methods.processPayout = function (amount, stripePayoutId) {
  this.payout = {
    amount,
    status: 'paid',
    paidAt: new Date(),
    stripePayoutId,
  };
  return this.save();
};

// Static methods
paymentRecordSchema.statics.findByRider = function (riderId, status = null) {
  const query = { riderId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

paymentRecordSchema.statics.findByDriver = function (driverId, status = null) {
  const query = { driverId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

paymentRecordSchema.statics.findPendingPayouts = function () {
  return this.find({
    type: 'payout',
    'payout.status': 'pending',
  }).sort({ createdAt: 1 });
};

paymentRecordSchema.statics.getTotalRevenue = async function (startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        status: 'succeeded',
        type: 'charge',
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$breakdown.platformFee' },
        count: { $sum: 1 },
      },
    },
  ]);

  return result[0] || { totalAmount: 0, totalFees: 0, count: 0 };
};

const PaymentRecord = mongoose.model('PaymentRecord', paymentRecordSchema);

export default PaymentRecord;
