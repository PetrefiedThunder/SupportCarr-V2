import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcrypt';
import { UserRole } from '@shared/types';
import { fieldEncryption } from '../../../security/encryption/FieldEncryption';

/**
 * User Document Interface
 */
export interface IUserDocument extends mongoose.Document {
  phoneNumber: string; // Will be encrypted
  hashedPassword: string;
  role: UserRole;
  phoneVerified: boolean;
  phoneVerificationCode?: string;
  phoneVerificationExpiry?: Date;
  refreshToken?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Virtual for decrypted phone
  decryptedPhoneNumber?: string;

  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLastLogin(): Promise<void>;
}

/**
 * User Model Interface
 */
export interface IUserModel extends Model<IUserDocument> {
  // Static methods
  findByPhoneNumber(phoneNumber: string): Promise<IUserDocument | null>;
  findByPhoneNumberOrFail(phoneNumber: string): Promise<IUserDocument>;
}

/**
 * User Schema
 *
 * Stores user authentication data
 * Phone numbers are encrypted at rest
 */
const UserSchema = new Schema<IUserDocument, IUserModel>(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      // NOTE: This will be encrypted before save
    },
    hashedPassword: {
      type: String,
      required: true,
      select: false, // Don't include in queries by default
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      default: UserRole.RIDER,
      index: true,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerificationCode: {
      type: String,
      select: false,
    },
    phoneVerificationExpiry: {
      type: Date,
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
      sparse: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ============================================================================
// INDEXES
// ============================================================================

UserSchema.index({ role: 1, createdAt: -1 });
UserSchema.index({ phoneVerified: 1 });

// ============================================================================
// PRE-SAVE HOOKS
// ============================================================================

/**
 * Pre-save hook: Encrypt phone number
 */
UserSchema.pre('save', function (next) {
  // Only encrypt if phone number is modified
  if (this.isModified('phoneNumber')) {
    try {
      // Store original for later retrieval
      const originalPhone = this.phoneNumber;

      // Encrypt
      this.phoneNumber = fieldEncryption.encrypt(originalPhone);

      // Store decrypted version in virtual (for this session only)
      this.decryptedPhoneNumber = originalPhone;
    } catch (error) {
      return next(error as Error);
    }
  }

  next();
});

/**
 * Pre-save hook: Hash password if modified
 */
UserSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (this.isModified('hashedPassword')) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.hashedPassword = await bcrypt.hash(this.hashedPassword, salt);
    } catch (error) {
      return next(error as Error);
    }
  }

  next();
});

// ============================================================================
// POST-FIND HOOKS (Decrypt phone numbers)
// ============================================================================

/**
 * Post-find hook: Decrypt phone numbers
 */
function decryptPhoneNumbers(doc: IUserDocument | IUserDocument[]): void {
  if (Array.isArray(doc)) {
    doc.forEach((d) => {
      if (d.phoneNumber) {
        try {
          d.decryptedPhoneNumber = fieldEncryption.decrypt(d.phoneNumber);
        } catch {
          // If decryption fails, leave as is (might already be decrypted)
        }
      }
    });
  } else if (doc && doc.phoneNumber) {
    try {
      doc.decryptedPhoneNumber = fieldEncryption.decrypt(doc.phoneNumber);
    } catch {
      // If decryption fails, leave as is
    }
  }
}

UserSchema.post('find', decryptPhoneNumbers);
UserSchema.post('findOne', decryptPhoneNumbers);
UserSchema.post('findOneAndUpdate', decryptPhoneNumbers);

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Compare password with hashed password
 */
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.hashedPassword);
  } catch {
    return false;
  }
};

/**
 * Update last login timestamp
 */
UserSchema.methods.updateLastLogin = async function (): Promise<void> {
  this.lastLoginAt = new Date();
  await this.save();
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find user by phone number (handles encryption)
 */
UserSchema.statics.findByPhoneNumber = async function (
  phoneNumber: string,
): Promise<IUserDocument | null> {
  // Encrypt the phone number to search
  const encryptedPhone = fieldEncryption.encrypt(phoneNumber);

  const user = await this.findOne({ phoneNumber: encryptedPhone });

  // Decrypt phone number in result
  if (user && user.phoneNumber) {
    user.decryptedPhoneNumber = phoneNumber;
  }

  return user;
};

/**
 * Find user by phone number or throw
 */
UserSchema.statics.findByPhoneNumberOrFail = async function (
  phoneNumber: string,
): Promise<IUserDocument> {
  const user = await this.findByPhoneNumber(phoneNumber);

  if (!user) {
    throw new Error(`User with phone number ${phoneNumber} not found`);
  }

  return user;
};

// ============================================================================
// VIRTUALS
// ============================================================================

/**
 * Virtual for getting decrypted phone number
 */
UserSchema.virtual('phone').get(function () {
  return this.decryptedPhoneNumber ?? fieldEncryption.decrypt(this.phoneNumber);
});

/**
 * Transform toJSON to include decrypted phone
 */
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    // Use decrypted phone if available
    if (ret.decryptedPhoneNumber) {
      ret.phoneNumber = ret.decryptedPhoneNumber;
      delete ret.decryptedPhoneNumber;
    }

    // Remove sensitive fields
    delete ret.hashedPassword;
    delete ret.phoneVerificationCode;
    delete ret.phoneVerificationExpiry;
    delete ret.refreshToken;

    return ret;
  },
});

/**
 * User Model
 */
export const User = mongoose.model<IUserDocument, IUserModel>('User', UserSchema);
