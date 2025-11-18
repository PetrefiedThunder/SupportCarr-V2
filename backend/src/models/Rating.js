import mongoose from 'mongoose';

const { Schema } = mongoose;

const ratingSchema = new Schema(
  {
    rescueRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'RescueRequest',
      required: true,
      index: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      maxlength: 1000,
    },
    tags: [
      {
        type: String,
        enum: [
          'professional',
          'friendly',
          'on_time',
          'careful',
          'clean_vehicle',
          'helpful',
          'safe_driving',
          'good_communication',
          'polite',
          'respectful',
          'rude',
          'late',
          'unsafe',
          'dirty_vehicle',
          'poor_communication',
          'damaged_property',
        ],
      },
    ],
    isPublic: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    response: {
      text: String,
      respondedAt: Date,
    },
    flags: {
      isReported: {
        type: Boolean,
        default: false,
      },
      reportReason: String,
      isHidden: {
        type: Boolean,
        default: false,
      },
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

// Compound indexes
ratingSchema.index({ fromUserId: 1, rescueRequestId: 1 }, { unique: true });
ratingSchema.index({ toUserId: 1, createdAt: -1 });
ratingSchema.index({ score: 1 });

// Virtuals
ratingSchema.virtual('rescueRequest', {
  ref: 'RescueRequest',
  localField: 'rescueRequestId',
  foreignField: '_id',
  justOne: true,
});

ratingSchema.virtual('fromUser', {
  ref: 'User',
  localField: 'fromUserId',
  foreignField: '_id',
  justOne: true,
});

ratingSchema.virtual('toUser', {
  ref: 'User',
  localField: 'toUserId',
  foreignField: '_id',
  justOne: true,
});

// Instance methods
ratingSchema.methods.addResponse = function (responseText) {
  this.response = {
    text: responseText,
    respondedAt: new Date(),
  };
  return this.save();
};

ratingSchema.methods.report = function (reason) {
  this.flags.isReported = true;
  this.flags.reportReason = reason;
  return this.save();
};

ratingSchema.methods.hide = function () {
  this.flags.isHidden = true;
  return this.save();
};

// Static methods
ratingSchema.statics.findByUser = function (userId, filters = {}) {
  const query = { toUserId: userId, 'flags.isHidden': false, ...filters };
  return this.find(query).sort({ createdAt: -1 });
};

ratingSchema.statics.getAverageRating = async function (userId) {
  const result = await this.aggregate([
    {
      $match: {
        toUserId: mongoose.Types.ObjectId(userId),
        'flags.isHidden': false,
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: '$score' },
        count: { $sum: 1 },
      },
    },
  ]);

  return result[0] || { average: 0, count: 0 };
};

ratingSchema.statics.getRatingDistribution = async function (userId) {
  const result = await this.aggregate([
    {
      $match: {
        toUserId: mongoose.Types.ObjectId(userId),
        'flags.isHidden': false,
      },
    },
    {
      $group: {
        _id: '$score',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: -1 },
    },
  ]);

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  result.forEach((item) => {
    distribution[item._id] = item.count;
  });

  return distribution;
};

const Rating = mongoose.model('Rating', ratingSchema);

export default Rating;
