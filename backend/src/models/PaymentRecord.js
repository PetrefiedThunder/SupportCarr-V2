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

// Instance methods - use atomic updates to prevent race conditions
paymentRecordSchema.methods.markAsSucceeded = function (stripeData = {}) {
  // Validate state transition
  const validFromStates = ['pending', 'processing'];
  if (!validFromStates.includes(this.status)) {
    throw new Error(`Cannot mark as succeeded from status: ${this.status}`);
  }

  const updateData = {
    status: 'succeeded',
    processedAt: new Date(),
  };

  if (stripeData.chargeId) {
    updateData['stripe.chargeId'] = stripeData.chargeId;
  }
  if (stripeData.receiptUrl) {
    updateData.receiptUrl = stripeData.receiptUrl;
  }

  // Use atomic update with state validation
  return this.constructor.findOneAndUpdate(
    {
      _id: this._id,
      status: { $in: validFromStates },
    },
    { $set: updateData },
    { new: true }
  ).then((doc) => {
    if (!doc) {
      throw new Error('Payment record state transition failed - invalid current state');
    }
    Object.assign(this, doc.toObject());
    return this;
  });
};

paymentRecordSchema.methods.markAsFailed = function (errorCode, errorMessage) {
  // Validate state transition
  const validFromStates = ['pending', 'processing'];
  if (!validFromStates.includes(this.status)) {
    throw new Error(`Cannot mark as failed from status: ${this.status}`);
  }

  return this.constructor.findOneAndUpdate(
    {
      _id: this._id,
      status: { $in: validFromStates },
    },
    {
      $set: {
        status: 'failed',
        'failureReason.code': errorCode,
        'failureReason.message': errorMessage,
        processedAt: new Date(),
      },
    },
    { new: true }
  ).then((doc) => {
    if (!doc) {
      throw new Error('Payment record state transition failed - invalid current state');
    }
    Object.assign(this, doc.toObject());
    return this;
  });
};

paymentRecordSchema.methods.processRefund = function (amount, reason) {
  // Can only refund succeeded payments
  if (this.status !== 'succeeded') {
    throw new Error(`Cannot refund payment with status: ${this.status}`);
  }

  return this.constructor.findOneAndUpdate(
    {
      _id: this._id,
      status: 'succeeded',
    },
    {
      $set: {
        status: 'refunded',
        'refund.amount': amount,
        'refund.reason': reason,
        'refund.refundedAt': new Date(),
      },
    },
    { new: true }
  ).then((doc) => {
    if (!doc) {
      throw new Error('Payment record state transition failed - already refunded or invalid state');
    }
    Object.assign(this, doc.toObject());
    return this;
  });
};

paymentRecordSchema.methods.processPayout = function (amount, stripePayoutId) {
  return this.constructor.findOneAndUpdate(
    { _id: this._id },
    {
      $set: {
        'payout.amount': amount,
        'payout.status': 'paid',
        'payout.paidAt': new Date(),
        'payout.stripePayoutId': stripePayoutId,
      },
    },
    { new: true }
  ).then((doc) => {
    if (!doc) {
      throw new Error('Failed to process payout - payment record not found');
    }
    Object.assign(this, doc.toObject());
    return this;
  });
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
