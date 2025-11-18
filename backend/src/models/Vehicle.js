import mongoose from 'mongoose';

const { Schema } = mongoose;

const vehicleSchema = new Schema(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'DriverProfile',
      required: true,
    },
    make: {
      type: String,
      required: [true, 'Vehicle make is required'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Vehicle year is required'],
      min: [1990, 'Vehicle must be 1990 or newer'],
      max: [new Date().getFullYear() + 1, 'Invalid vehicle year'],
    },
    color: {
      type: String,
      trim: true,
    },
    licensePlate: {
      type: String,
      required: [true, 'License plate is required'],
      trim: true,
      uppercase: true,
    },
    licensePlateState: {
      type: String,
      required: [true, 'License plate state is required'],
      uppercase: true,
      minlength: 2,
      maxlength: 2,
    },
    vin: {
      type: String,
      trim: true,
      uppercase: true,
      minlength: 17,
      maxlength: 17,
    },
    type: {
      type: String,
      enum: ['pickup_truck', 'cargo_van', 'box_truck', 'flatbed'],
      default: 'pickup_truck',
    },
    bedLength: {
      type: Number, // inches
      min: 0,
    },
    capacity: {
      weight: {
        type: Number, // pounds
        default: 1000,
      },
      volume: {
        type: Number, // cubic feet
      },
    },
    features: {
      hasTieDowns: {
        type: Boolean,
        default: false,
      },
      hasCover: {
        type: Boolean,
        default: false,
      },
      hasRamp: {
        type: Boolean,
        default: false,
      },
      hasToolbox: {
        type: Boolean,
        default: false,
      },
    },
    photos: [
      {
        url: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ['exterior', 'interior', 'bed', 'license_plate'],
          default: 'exterior',
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    registration: {
      number: String,
      expiryDate: Date,
      documentUrl: String,
    },
    inspection: {
      lastInspectionDate: Date,
      nextInspectionDate: Date,
      documentUrl: String,
      status: {
        type: String,
        enum: ['pending', 'passed', 'failed', 'expired'],
        default: 'pending',
      },
    },
    insurance: {
      provider: String,
      policyNumber: String,
      expiryDate: Date,
      documentUrl: String,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    retiredAt: {
      type: Date,
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
vehicleSchema.index({ driverId: 1 });
vehicleSchema.index({ licensePlate: 1, licensePlateState: 1 });
vehicleSchema.index({ isActive: 1 });
vehicleSchema.index({ verificationStatus: 1 });

// Virtual for driver
vehicleSchema.virtual('driver', {
  ref: 'DriverProfile',
  localField: 'driverId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for display name
vehicleSchema.virtual('displayName').get(function () {
  return `${this.year} ${this.make} ${this.model}`;
});

// Instance method to check if vehicle is verified
vehicleSchema.methods.isVerified = function () {
  return this.verificationStatus === 'verified' && this.isActive;
};

// Instance method to check if documents are current
vehicleSchema.methods.hasCurrentDocuments = function () {
  const now = new Date();
  return (
    (!this.registration.expiryDate || this.registration.expiryDate > now) &&
    (!this.insurance.expiryDate || this.insurance.expiryDate > now) &&
    (!this.inspection.nextInspectionDate || this.inspection.nextInspectionDate > now)
  );
};

// Instance method to get primary photo
vehicleSchema.methods.getPrimaryPhoto = function () {
  const primary = this.photos.find((photo) => photo.isPrimary);
  return primary ? primary.url : this.photos[0]?.url || null;
};

// Pre-save hook to ensure only one primary photo
vehicleSchema.pre('save', function (next) {
  if (this.isModified('photos')) {
    const primaryPhotos = this.photos.filter((photo) => photo.isPrimary);
    if (primaryPhotos.length > 1) {
      // Keep only the first one as primary
      this.photos.forEach((photo, index) => {
        photo.isPrimary = index === 0;
      });
    } else if (primaryPhotos.length === 0 && this.photos.length > 0) {
      // Set first photo as primary if none selected
      this.photos[0].isPrimary = true;
    }
  }
  next();
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
