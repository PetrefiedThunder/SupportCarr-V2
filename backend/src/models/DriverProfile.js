import mongoose from 'mongoose';

const { Schema } = mongoose;

const driverProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
      trim: true,
    },
    licenseState: {
      type: String,
      required: [true, 'License state is required'],
      uppercase: true,
      minlength: 2,
      maxlength: 2,
    },
    licenseExpiryDate: {
      type: Date,
      required: [true, 'License expiry date is required'],
    },
    backgroundCheckStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
    },
    backgroundCheckDate: {
      type: Date,
    },
    insuranceProvider: {
      type: String,
      trim: true,
    },
    insurancePolicyNumber: {
      type: String,
      trim: true,
    },
    insuranceExpiryDate: {
      type: Date,
    },
    documents: [
      {
        type: {
          type: String,
          enum: ['license', 'insurance', 'registration', 'vehicle_photo', 'background_check'],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        verifiedAt: {
          type: Date,
        },
        verifiedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
        rejectionReason: String,
      },
    ],
    isAvailable: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    lastLocationUpdate: {
      type: Date,
    },
    heading: {
      type: Number, // 0-360 degrees
      min: 0,
      max: 360,
    },
    speed: {
      type: Number, // km/h
      min: 0,
    },
    serviceArea: {
      city: String,
      state: String,
      radius: {
        type: Number,
        default: 50, // km
      },
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    stats: {
      totalRescues: {
        type: Number,
        default: 0,
      },
      totalUtilityTasks: {
        type: Number,
        default: 0,
      },
      completionRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      cancellationRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      averageResponseTime: {
        type: Number,
        default: 0, // minutes
      },
      totalEarnings: {
        type: Number,
        default: 0,
      },
      totalActiveHours: {
        type: Number,
        default: 0, // hours
      },
    },
    preferences: {
      acceptRescues: {
        type: Boolean,
        default: true,
      },
      acceptUtilityTasks: {
        type: Boolean,
        default: true,
      },
      maxDistanceKm: {
        type: Number,
        default: 30,
      },
      autoAccept: {
        type: Boolean,
        default: false,
      },
      notifyBySMS: {
        type: Boolean,
        default: true,
      },
      notifyByPush: {
        type: Boolean,
        default: true,
      },
    },
    availability: {
      monday: { start: String, end: String, available: Boolean },
      tuesday: { start: String, end: String, available: Boolean },
      wednesday: { start: String, end: String, available: Boolean },
      thursday: { start: String, end: String, available: Boolean },
      friday: { start: String, end: String, available: Boolean },
      saturday: { start: String, end: String, available: Boolean },
      sunday: { start: String, end: String, available: Boolean },
    },
    onboardingCompletedAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    suspendedAt: {
      type: Date,
    },
    suspensionReason: {
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
driverProfileSchema.index({ userId: 1 });
driverProfileSchema.index({ isAvailable: 1 });
driverProfileSchema.index({ isOnline: 1 });
driverProfileSchema.index({ currentLocation: '2dsphere' });
driverProfileSchema.index({ 'rating.average': -1 });
driverProfileSchema.index({ backgroundCheckStatus: 1 });
driverProfileSchema.index({ lastLocationUpdate: -1 });

// Virtual for user
driverProfileSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for vehicle
driverProfileSchema.virtual('vehicle', {
  ref: 'Vehicle',
  localField: 'vehicleId',
  foreignField: '_id',
  justOne: true,
});

// Instance method to check if driver is approved
driverProfileSchema.methods.isApproved = function () {
  return (
    this.backgroundCheckStatus === 'approved' &&
    this.approvedAt &&
    !this.suspendedAt &&
    this.licenseExpiryDate > new Date()
  );
};

// Instance method to update location
driverProfileSchema.methods.updateLocation = function (longitude, latitude) {
  this.currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude],
  };
  this.lastLocationUpdate = new Date();
  return this.save();
};

// Instance method to calculate distance from point
driverProfileSchema.methods.distanceFrom = function (longitude, latitude) {
  const [driverLng, driverLat] = this.currentLocation.coordinates;
  const R = 6371; // Earth's radius in km

  const dLat = ((latitude - driverLat) * Math.PI) / 180;
  const dLng = ((longitude - driverLng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((driverLat * Math.PI) / 180) *
      Math.cos((latitude * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

// Static method to find available drivers near location
driverProfileSchema.statics.findNearby = function (longitude, latitude, maxDistanceKm = 50) {
  return this.find({
    isAvailable: true,
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistanceKm * 1000, // Convert km to meters
      },
    },
  }).populate('userId vehicleId');
};

// Static method to find top-rated drivers
driverProfileSchema.statics.findTopRated = function (limit = 10) {
  return this.find({ 'rating.count': { $gte: 5 } })
    .sort({ 'rating.average': -1 })
    .limit(limit)
    .populate('userId vehicleId');
};

const DriverProfile = mongoose.model('DriverProfile', driverProfileSchema);

export default DriverProfile;
