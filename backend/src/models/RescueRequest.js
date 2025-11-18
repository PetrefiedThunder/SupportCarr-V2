import mongoose from 'mongoose';

const { Schema } = mongoose;

const rescueRequestSchema = new Schema(
  {
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
    status: {
      type: String,
      enum: [
        'pending', // Waiting for driver
        'accepted', // Driver accepted
        'driver_enroute', // Driver on the way
        'driver_arrived', // Driver at pickup location
        'in_progress', // E-bike loaded, heading to destination
        'completed', // Successfully delivered
        'cancelled_by_rider',
        'cancelled_by_driver',
        'cancelled_by_system',
        'failed',
      ],
      default: 'pending',
      index: true,
    },
    requestType: {
      type: String,
      enum: ['rescue', 'utility'],
      default: 'rescue',
    },
    pickupLocation: {
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
          index: '2dsphere',
        },
      },
      notes: String,
      photos: [String],
    },
    dropoffLocation: {
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
          type: [Number],
          required: true,
        },
      },
      notes: String,
    },
    ebike: {
      make: String,
      model: String,
      color: String,
      description: String,
      photos: [String],
      estimatedWeight: {
        type: Number, // pounds
        default: 60,
      },
    },
    issue: {
      type: {
        type: String,
        enum: [
          'flat_tire',
          'dead_battery',
          'mechanical_failure',
          'accident',
          'other',
          'utility_task',
        ],
        required: true,
      },
      description: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
    },
    pricing: {
      basePrice: {
        type: Number,
        required: true,
        default: 25,
      },
      distancePrice: {
        type: Number,
        default: 0,
      },
      surgeMultiplier: {
        type: Number,
        default: 1.0,
        min: 1.0,
        max: 5.0,
      },
      tip: {
        type: Number,
        default: 0,
      },
      discount: {
        type: Number,
        default: 0,
      },
      subtotal: {
        type: Number,
        required: true,
      },
      platformFee: {
        type: Number,
        required: true,
      },
      total: {
        type: Number,
        required: true,
      },
      driverPayout: {
        type: Number,
        required: true,
      },
    },
    distance: {
      estimated: {
        type: Number, // km
      },
      actual: {
        type: Number,
      },
    },
    duration: {
      estimated: {
        type: Number, // minutes
      },
      actual: {
        type: Number,
      },
    },
    timeline: [
      {
        status: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        location: {
          type: {
            type: String,
            enum: ['Point'],
          },
          coordinates: [Number],
        },
        notes: String,
      },
    ],
    driverRoute: {
      type: {
        type: String,
        enum: ['LineString'],
      },
      coordinates: [[Number]], // Array of [longitude, latitude]
    },
    scheduledFor: {
      type: Date,
    },
    acceptedAt: {
      type: Date,
    },
    pickedUpAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },
    rating: {
      byRider: {
        score: {
          type: Number,
          min: 1,
          max: 5,
        },
        feedback: String,
        createdAt: Date,
      },
      byDriver: {
        score: {
          type: Number,
          min: 1,
          max: 5,
        },
        feedback: String,
        createdAt: Date,
      },
    },
    notes: {
      rider: String,
      driver: String,
      admin: String,
    },
    flags: {
      isUrgent: {
        type: Boolean,
        default: false,
      },
      requiresSpecialEquipment: {
        type: Boolean,
        default: false,
      },
      isReported: {
        type: Boolean,
        default: false,
      },
      reportReason: String,
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
rescueRequestSchema.index({ riderId: 1, createdAt: -1 });
rescueRequestSchema.index({ driverId: 1, createdAt: -1 });
rescueRequestSchema.index({ status: 1, createdAt: -1 });
rescueRequestSchema.index({ 'pickupLocation.location': '2dsphere' });
rescueRequestSchema.index({ scheduledFor: 1 });

// Virtuals
rescueRequestSchema.virtual('rider', {
  ref: 'User',
  localField: 'riderId',
  foreignField: '_id',
  justOne: true,
});

rescueRequestSchema.virtual('driver', {
  ref: 'User',
  localField: 'driverId',
  foreignField: '_id',
  justOne: true,
});

// Instance methods
rescueRequestSchema.methods.canBeCancelled = function () {
  const cancellableStatuses = ['pending', 'accepted', 'driver_enroute'];
  return cancellableStatuses.includes(this.status);
};

rescueRequestSchema.methods.addTimelineEvent = function (status, notes, location) {
  this.timeline.push({
    status,
    notes,
    location,
    timestamp: new Date(),
  });
  return this.save();
};

rescueRequestSchema.methods.accept = function (driverId) {
  this.driverId = driverId;
  this.status = 'accepted';
  this.acceptedAt = new Date();
  this.timeline.push({
    status: 'accepted',
    timestamp: new Date(),
  });
  return this.save();
};

rescueRequestSchema.methods.cancel = function (cancelledBy, reason) {
  this.status = `cancelled_by_${cancelledBy}`;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.timeline.push({
    status: this.status,
    notes: reason,
    timestamp: new Date(),
  });
  return this.save();
};

rescueRequestSchema.methods.complete = function () {
  this.status = 'completed';
  this.completedAt = new Date();
  this.duration.actual = Math.round((this.completedAt - this.createdAt) / 1000 / 60); // minutes
  this.timeline.push({
    status: 'completed',
    timestamp: new Date(),
  });
  return this.save();
};

rescueRequestSchema.methods.updateStatus = function (newStatus, notes) {
  this.status = newStatus;
  this.timeline.push({
    status: newStatus,
    notes,
    timestamp: new Date(),
  });

  // Update specific timestamps
  if (newStatus === 'driver_arrived') {
    this.pickedUpAt = new Date();
  }

  return this.save();
};

// Static methods
rescueRequestSchema.statics.findPending = function () {
  return this.find({ status: 'pending' }).sort({ createdAt: 1 });
};

rescueRequestSchema.statics.findActive = function () {
  return this.find({
    status: { $in: ['pending', 'accepted', 'driver_enroute', 'driver_arrived', 'in_progress'] },
  }).sort({ createdAt: -1 });
};

rescueRequestSchema.statics.findByDriver = function (driverId, status = null) {
  const query = { driverId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

rescueRequestSchema.statics.findByRider = function (riderId, status = null) {
  const query = { riderId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

rescueRequestSchema.statics.findNearby = function (longitude, latitude, maxDistanceKm = 50) {
  return this.find({
    status: 'pending',
    'pickupLocation.location': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistanceKm * 1000,
      },
    },
  });
};

// Pre-save hook to add timeline event on status change
rescueRequestSchema.pre('save', function (next) {
  if (this.isModified('status') && !this.isNew) {
    const existingEvent = this.timeline.find(
      (event) => event.status === this.status && Date.now() - event.timestamp < 1000
    );
    if (!existingEvent) {
      this.timeline.push({
        status: this.status,
        timestamp: new Date(),
      });
    }
  }
  next();
});

const RescueRequest = mongoose.model('RescueRequest', rescueRequestSchema);

export default RescueRequest;
