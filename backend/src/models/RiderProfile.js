import mongoose from 'mongoose';

const { Schema } = mongoose;

const riderProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    preferredPaymentMethod: {
      type: String,
      enum: ['card', 'cash', 'account_balance'],
      default: 'card',
    },
    savedLocations: [
      {
        label: {
          type: String,
          enum: ['home', 'work', 'other'],
          required: true,
        },
        address: {
          type: String,
          required: true,
        },
        location: {
          type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
          },
          coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
          },
        },
        notes: String,
      },
    ],
    ebikes: [
      {
        make: String,
        model: String,
        color: String,
        photo: String,
        isPrimary: {
          type: Boolean,
          default: false,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    emergencyContact: {
      name: String,
      phoneNumber: String,
      relationship: String,
    },
    preferences: {
      autoTipPercent: {
        type: Number,
        default: 15,
        min: 0,
        max: 100,
      },
      allowSharedRides: {
        type: Boolean,
        default: false,
      },
      notifyBySMS: {
        type: Boolean,
        default: true,
      },
      notifyByEmail: {
        type: Boolean,
        default: true,
      },
      notifyByPush: {
        type: Boolean,
        default: true,
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
      totalSpent: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
      },
      cancellationRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    memberSince: {
      type: Date,
      default: Date.now,
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
riderProfileSchema.index({ userId: 1 });
riderProfileSchema.index({ 'savedLocations.location': '2dsphere' });

// Virtual for user
riderProfileSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Instance method to get primary e-bike
riderProfileSchema.methods.getPrimaryEbike = function () {
  const primary = this.ebikes.find((bike) => bike.isPrimary);
  return primary || this.ebikes[0] || null;
};

// Instance method to add saved location
riderProfileSchema.methods.addSavedLocation = function (label, address, longitude, latitude, notes) {
  // Remove existing location with same label
  this.savedLocations = this.savedLocations.filter((loc) => loc.label !== label);

  // Add new location
  this.savedLocations.push({
    label,
    address,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    notes,
  });

  return this.save();
};

// Instance method to add loyalty points
riderProfileSchema.methods.addLoyaltyPoints = function (points) {
  this.loyaltyPoints += points;
  return this.save();
};

// Instance method to redeem loyalty points
riderProfileSchema.methods.redeemLoyaltyPoints = function (points) {
  if (this.loyaltyPoints < points) {
    throw new Error('Insufficient loyalty points');
  }
  this.loyaltyPoints -= points;
  return this.save();
};

// Pre-save hook to ensure only one primary e-bike
riderProfileSchema.pre('save', function (next) {
  if (this.isModified('ebikes')) {
    const primaryBikes = this.ebikes.filter((bike) => bike.isPrimary);
    if (primaryBikes.length > 1) {
      // Keep only the first one as primary
      this.ebikes.forEach((bike, index) => {
        bike.isPrimary = index === 0;
      });
    } else if (primaryBikes.length === 0 && this.ebikes.length > 0) {
      // Set first bike as primary if none selected
      this.ebikes[0].isPrimary = true;
    }
  }
  next();
});

const RiderProfile = mongoose.model('RiderProfile', riderProfileSchema);

export default RiderProfile;
