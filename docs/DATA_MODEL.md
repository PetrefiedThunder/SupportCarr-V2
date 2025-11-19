# SupportCarr v2 Data Model & ERD

## Overview

This document provides a comprehensive view of SupportCarr's data model, including:
- Complete Entity-Relationship Diagram (ERD)
- Detailed schema definitions for all collections
- Indexing strategy for performance
- Data encryption approach for PII
- Sharding and partitioning strategy

---

## Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o| RiderProfile : has
    User ||--o| DriverProfile : has
    User ||--o{ APIKey : owns
    User ||--o{ Notification : receives
    User ||--o{ AuditLog : generates

    User {
        ObjectId _id PK
        string phoneNumber UK "encrypted"
        string hashedPassword
        enum role "rider, driver, admin, support"
        boolean phoneVerified
        string phoneVerificationCode
        date phoneVerificationExpiry
        string refreshToken
        date lastLoginAt
        date createdAt
        date updatedAt
    }

    RiderProfile ||--o{ RescueRequest : creates
    RiderProfile ||--o{ Rating : gives
    RiderProfile ||--o{ PaymentMethod : has

    RiderProfile {
        ObjectId _id PK
        ObjectId userId FK UK
        string name "encrypted"
        string email "encrypted"
        string stripeCustomerId
        array savedLocations
        object preferences
        number totalRescues
        number averageRating
        date createdAt
        date updatedAt
    }

    DriverProfile ||--o{ Vehicle : owns
    DriverProfile ||--o{ RescueAssignment : accepts
    DriverProfile ||--o{ Payout : receives
    DriverProfile ||--o{ DriverAvailabilityLog : tracks
    DriverProfile ||--o| DriverStats : has

    DriverProfile {
        ObjectId _id PK
        ObjectId userId FK UK
        string name "encrypted"
        string email "encrypted"
        string licenseNumber "encrypted"
        date licenseExpiry
        string vehicleInsuranceNumber
        date insuranceExpiry
        string stripeAccountId
        object location "GeoJSON Point"
        boolean isOnline
        boolean isAvailable
        enum status "pending, approved, suspended, rejected"
        number rating
        number ratingCount
        number completedRescues
        number totalEarnings
        object bankDetails "encrypted"
        date backgroundCheckDate
        date lastLocationUpdate
        date createdAt
        date updatedAt
    }

    Vehicle {
        ObjectId _id PK
        ObjectId driverId FK
        enum type "pickup_truck, cargo_van, flatbed, box_truck"
        string make
        string model
        number year
        string plateNumber "encrypted"
        string vin "encrypted"
        number capacity "weight in lbs"
        object dimensions
        array features
        boolean isActive
        date createdAt
        date updatedAt
    }

    RescueRequest ||--o| RescueAssignment : has
    RescueRequest ||--o{ Payment : has
    RescueRequest ||--o{ Rating : receives
    RescueRequest ||--o{ RescueStatusHistory : tracks

    RescueRequest {
        ObjectId _id PK
        ObjectId riderId FK
        enum status "requested, matched, accepted, en_route, arrived, in_progress, completed, cancelled"
        enum type "flat_tire, dead_battery, out_of_charge, breakdown, transport, other"
        object pickupLocation "GeoJSON Point + address"
        object dropoffLocation "GeoJSON Point + address"
        string description
        array photos
        number estimatedPrice
        number finalPrice
        number distance "in miles"
        number estimatedDuration "in minutes"
        object bikeDetails
        enum priority "low, normal, high, urgent"
        string cancellationReason
        ObjectId cancelledBy
        date requestedAt
        date matchedAt
        date acceptedAt
        date arrivedAt
        date completedAt
        date cancelledAt
        date createdAt
        date updatedAt
    }

    RescueAssignment {
        ObjectId _id PK UK
        ObjectId rescueId FK UK
        ObjectId driverId FK
        enum status "assigned, accepted, rejected, en_route, arrived, in_progress, completed, cancelled"
        date assignedAt
        date acceptedAt
        date rejectedAt
        date arrivedAt
        date completedAt
        date cancelledAt
        object driverLocation "GeoJSON Point"
        number estimatedArrivalTime "in minutes"
        array locationHistory
        string rejectionReason
        date createdAt
        date updatedAt
    }

    Payment {
        ObjectId _id PK
        ObjectId rescueId FK UK
        ObjectId riderId FK
        ObjectId driverId FK
        number amount "in cents"
        number driverPayout "in cents"
        number platformFee "in cents"
        enum status "pending, processing, succeeded, failed, refunded"
        string stripePaymentIntentId UK
        string stripeChargeId
        string paymentMethodId
        object breakdown
        string failureReason
        date processedAt
        date refundedAt
        number refundAmount
        date createdAt
        date updatedAt
    }

    Payout {
        ObjectId _id PK
        ObjectId driverId FK
        number amount "in cents"
        enum status "pending, processing, paid, failed"
        string stripePayoutId
        string stripeTransferId
        array rescueIds
        date periodStart
        date periodEnd
        string failureReason
        date processedAt
        date createdAt
        date updatedAt
    }

    Rating {
        ObjectId _id PK
        ObjectId rescueId FK
        ObjectId fromUserId FK "rider or driver"
        ObjectId toUserId FK "driver or rider"
        enum type "rider_to_driver, driver_to_rider"
        number rating "1-5"
        string comment
        array tags
        boolean isAnonymous
        date createdAt
    }

    PaymentMethod {
        ObjectId _id PK
        ObjectId riderId FK
        string stripePaymentMethodId
        enum type "card, bank_account"
        object card
        boolean isDefault
        date createdAt
        date updatedAt
    }

    APIKey {
        ObjectId _id PK
        ObjectId userId FK
        string key UK "hashed"
        string name
        array permissions
        boolean isActive
        number requestCount
        date lastUsedAt
        date expiresAt
        date createdAt
        date updatedAt
    }

    Notification {
        ObjectId _id PK
        ObjectId userId FK
        enum type "rescue, payment, system, marketing"
        enum channel "sms, push, email, in_app"
        string title
        string body
        object data
        boolean read
        date readAt
        date sentAt
        date createdAt
    }

    AuditLog {
        ObjectId _id PK
        ObjectId userId FK
        string action
        string entity
        ObjectId entityId
        object changes
        string ipAddress
        string userAgent
        date createdAt
    }

    DriverStats {
        ObjectId _id PK
        ObjectId driverId FK UK
        number totalRescues
        number completedRescues
        number cancelledRescues
        number totalEarnings
        number totalDistance
        number totalTime
        number averageRating
        number acceptanceRate
        number completionRate
        object performanceMetrics
        date lastUpdated
    }

    DriverAvailabilityLog {
        ObjectId _id PK
        ObjectId driverId FK
        boolean wasOnline
        boolean isOnline
        date timestamp
        string reason
    }

    RescueStatusHistory {
        ObjectId _id PK
        ObjectId rescueId FK
        enum fromStatus
        enum toStatus
        ObjectId changedBy
        string reason
        date timestamp
    }

    TwilioEventLog {
        ObjectId _id PK
        string messageSid UK
        enum type "sms, voice, verify"
        string to
        string from
        string body
        enum status "queued, sending, sent, failed, delivered"
        string errorCode
        string errorMessage
        object rawEvent
        date createdAt
    }
```

---

## Collection Schemas

### User Collection

```typescript
{
  _id: ObjectId,
  phoneNumber: string,           // Encrypted, Unique Index
  hashedPassword: string,         // bcrypt hash
  role: enum ['rider', 'driver', 'admin', 'support'],
  phoneVerified: boolean,
  phoneVerificationCode: string?,
  phoneVerificationExpiry: Date?,
  refreshToken: string?,          // For JWT refresh
  lastLoginAt: Date?,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ phoneNumber: 1 }` UNIQUE
- `{ role: 1, createdAt: -1 }`
- `{ refreshToken: 1 }` SPARSE

**Encryption:**
- `phoneNumber`: AES-256-GCM

**Notes:**
- Passwords hashed with bcrypt (salt rounds: 12)
- Phone verification code expires after 10 minutes
- Refresh tokens rotated on each use

---

### RiderProfile Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,               // FK to User, Unique Index
  name: string,                   // Encrypted
  email: string?,                 // Encrypted, Sparse Unique Index
  stripeCustomerId: string?,
  savedLocations: [
    {
      name: string,
      address: string,
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    }
  ],
  preferences: {
    notifications: {
      sms: boolean,
      push: boolean,
      email: boolean
    },
    language: string
  },
  totalRescues: number,
  averageRating: number,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ userId: 1 }` UNIQUE
- `{ stripeCustomerId: 1 }` SPARSE
- `{ 'savedLocations.location': '2dsphere' }`

**Encryption:**
- `name`: AES-256-GCM
- `email`: AES-256-GCM

---

### DriverProfile Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,               // FK to User, Unique Index
  name: string,                   // Encrypted
  email: string?,                 // Encrypted
  licenseNumber: string,          // Encrypted
  licenseExpiry: Date,
  vehicleInsuranceNumber: string?, // Encrypted
  insuranceExpiry: Date?,
  stripeAccountId: string?,       // Stripe Connect account
  location: {
    type: 'Point',
    coordinates: [lng, lat]
  },
  isOnline: boolean,
  isAvailable: boolean,
  status: enum ['pending', 'approved', 'suspended', 'rejected'],
  rating: number,
  ratingCount: number,
  completedRescues: number,
  totalEarnings: number,          // in cents
  bankDetails: {                  // Encrypted
    accountNumber: string,
    routingNumber: string,
    accountHolderName: string
  }?,
  backgroundCheckDate: Date?,
  lastLocationUpdate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ userId: 1 }` UNIQUE
- `{ location: '2dsphere' }`
- `{ isOnline: 1, isAvailable: 1, location: '2dsphere' }` COMPOUND (for driver matching)
- `{ status: 1 }`
- `{ stripeAccountId: 1 }` SPARSE

**Encryption:**
- `name`, `email`, `licenseNumber`, `vehicleInsuranceNumber`: AES-256-GCM
- `bankDetails`: Full object encrypted

**Notes:**
- `location` updated every 30 seconds when driver is online
- Geospatial index enables efficient radius searches for driver matching

---

### Vehicle Collection

```typescript
{
  _id: ObjectId,
  driverId: ObjectId,             // FK to DriverProfile
  type: enum ['pickup_truck', 'cargo_van', 'flatbed', 'box_truck'],
  make: string,
  model: string,
  year: number,
  plateNumber: string,            // Encrypted
  vin: string,                    // Encrypted
  capacity: number,               // Weight capacity in lbs
  dimensions: {
    length: number,               // in inches
    width: number,
    height: number
  },
  features: string[],             // e.g., 'lift_gate', 'tie_downs', 'ramps'
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ driverId: 1 }`
- `{ plateNumber: 1 }` UNIQUE
- `{ driverId: 1, isActive: 1 }`

**Encryption:**
- `plateNumber`, `vin`: AES-256-GCM

---

### RescueRequest Collection

```typescript
{
  _id: ObjectId,
  riderId: ObjectId,              // FK to RiderProfile
  status: enum [
    'requested', 'matched', 'accepted', 'en_route',
    'arrived', 'in_progress', 'completed', 'cancelled'
  ],
  type: enum [
    'flat_tire', 'dead_battery', 'out_of_charge',
    'breakdown', 'transport', 'other'
  ],
  pickupLocation: {
    type: 'Point',
    coordinates: [lng, lat],
    address: string,
    city: string,
    state: string,
    zipCode: string
  },
  dropoffLocation: {
    type: 'Point',
    coordinates: [lng, lat],
    address: string,
    city: string,
    state: string,
    zipCode: string
  }?,
  description: string,
  photos: string[],               // S3 URLs
  estimatedPrice: number,         // in cents
  finalPrice: number?,            // in cents
  distance: number?,              // in miles
  estimatedDuration: number?,     // in minutes
  bikeDetails: {
    make: string?,
    model: string?,
    type: string?
  },
  priority: enum ['low', 'normal', 'high', 'urgent'],
  cancellationReason: string?,
  cancelledBy: ObjectId?,         // FK to User
  requestedAt: Date,
  matchedAt: Date?,
  acceptedAt: Date?,
  arrivedAt: Date?,
  completedAt: Date?,
  cancelledAt: Date?,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ riderId: 1, createdAt: -1 }`
- `{ status: 1, createdAt: -1 }`
- `{ 'pickupLocation.coordinates': '2dsphere' }`
- `{ requestedAt: 1 }`
- `{ status: 1, requestedAt: 1 }` COMPOUND

**Notes:**
- Status transitions logged in `RescueStatusHistory`
- Photos uploaded to S3 with signed URLs
- Price calculated based on distance, time of day, and surge pricing

---

### RescueAssignment Collection

```typescript
{
  _id: ObjectId,
  rescueId: ObjectId,             // FK to RescueRequest, Unique
  driverId: ObjectId,             // FK to DriverProfile
  status: enum [
    'assigned', 'accepted', 'rejected', 'en_route',
    'arrived', 'in_progress', 'completed', 'cancelled'
  ],
  assignedAt: Date,
  acceptedAt: Date?,
  rejectedAt: Date?,
  arrivedAt: Date?,
  completedAt: Date?,
  cancelledAt: Date?,
  driverLocation: {
    type: 'Point',
    coordinates: [lng, lat]
  },
  estimatedArrivalTime: number?,  // in minutes
  locationHistory: [
    {
      location: { type: 'Point', coordinates: [lng, lat] },
      timestamp: Date
    }
  ],
  rejectionReason: string?,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ rescueId: 1 }` UNIQUE
- `{ driverId: 1, status: 1 }`
- `{ driverId: 1, createdAt: -1 }`

**Notes:**
- One assignment per rescue (one-to-one relationship)
- Driver location updated every 10-30 seconds during active rescue
- Location history capped at last 100 points

---

### Payment Collection

```typescript
{
  _id: ObjectId,
  rescueId: ObjectId,             // FK to RescueRequest, Unique
  riderId: ObjectId,              // FK to RiderProfile
  driverId: ObjectId,             // FK to DriverProfile
  amount: number,                 // Total charge in cents
  driverPayout: number,           // Driver's share in cents
  platformFee: number,            // SupportCarr's fee in cents
  status: enum ['pending', 'processing', 'succeeded', 'failed', 'refunded'],
  stripePaymentIntentId: string,  // Unique
  stripeChargeId: string?,
  paymentMethodId: string?,
  breakdown: {
    basePrice: number,
    distanceFee: number,
    timeFee: number,
    surgeFee: number?,
    discount: number?,
    tax: number
  },
  failureReason: string?,
  processedAt: Date?,
  refundedAt: Date?,
  refundAmount: number?,          // in cents
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ rescueId: 1 }` UNIQUE
- `{ riderId: 1, createdAt: -1 }`
- `{ driverId: 1, createdAt: -1 }`
- `{ stripePaymentIntentId: 1 }` UNIQUE SPARSE
- `{ status: 1, createdAt: -1 }`

**Notes:**
- Platform fee typically 20% of total
- Webhook events from Stripe update status
- Idempotency key used for payment creation

---

### Payout Collection

```typescript
{
  _id: ObjectId,
  driverId: ObjectId,             // FK to DriverProfile
  amount: number,                 // Total payout in cents
  status: enum ['pending', 'processing', 'paid', 'failed'],
  stripePayoutId: string?,
  stripeTransferId: string?,
  rescueIds: ObjectId[],          // FKs to RescueRequest
  periodStart: Date,              // Payout period
  periodEnd: Date,
  failureReason: string?,
  processedAt: Date?,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ driverId: 1, periodStart: 1 }`
- `{ status: 1, createdAt: -1 }`
- `{ stripePayoutId: 1 }` SPARSE

**Notes:**
- Payouts processed weekly (every Monday)
- Requires Stripe Connect account setup for driver

---

### Rating Collection

```typescript
{
  _id: ObjectId,
  rescueId: ObjectId,             // FK to RescueRequest
  fromUserId: ObjectId,           // FK to User (rider or driver)
  toUserId: ObjectId,             // FK to User (driver or rider)
  type: enum ['rider_to_driver', 'driver_to_rider'],
  rating: number,                 // 1-5
  comment: string?,
  tags: string[],                 // e.g., ['professional', 'fast', 'friendly']
  isAnonymous: boolean,
  createdAt: Date
}
```

**Indexes:**
- `{ rescueId: 1, type: 1 }` UNIQUE COMPOUND (one rating per type per rescue)
- `{ toUserId: 1, createdAt: -1 }`
- `{ fromUserId: 1, createdAt: -1 }`

**Notes:**
- Ratings immutable after creation
- Average rating calculated and cached on profile

---

## Indexing Strategy

### Performance-Critical Indexes

1. **Driver Matching** (most critical query):
   ```javascript
   DriverProfile.createIndex({
     location: '2dsphere',
     isOnline: 1,
     isAvailable: 1,
     status: 1
   });
   ```
   - Enables efficient geospatial queries with availability filtering
   - Used in real-time driver matching algorithm

2. **Rescue Lookups**:
   ```javascript
   RescueRequest.createIndex({ riderId: 1, createdAt: -1 });
   RescueRequest.createIndex({ status: 1, requestedAt: 1 });
   ```

3. **Payment Queries**:
   ```javascript
   Payment.createIndex({ riderId: 1, createdAt: -1 });
   Payment.createIndex({ driverId: 1, createdAt: -1 });
   ```

### Index Monitoring

- Use `explain()` for all production queries
- Monitor slow query log (> 100ms)
- Quarterly index review and optimization

---

## Data Encryption

### Field-Level Encryption

**Encrypted Fields:**
- `User.phoneNumber`
- `RiderProfile.name`, `RiderProfile.email`
- `DriverProfile.name`, `DriverProfile.email`, `DriverProfile.licenseNumber`
- `DriverProfile.bankDetails` (entire object)
- `Vehicle.plateNumber`, `Vehicle.vin`

**Encryption Method:**
- Algorithm: AES-256-GCM
- Key derivation: PBKDF2 with 100,000 iterations
- Encryption keys stored in environment variables or HashiCorp Vault
- Key rotation every 90 days with backward compatibility

**Implementation:**
```typescript
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

## Sharding Strategy

### Current: Replica Set

For initial deployment (< 1M rescues):
- 1 Primary + 2 Secondaries
- Read preference: `primaryPreferred` for most queries
- Write concern: `majority`

### Future: Sharding

When scaling beyond single replica set (> 10M rescues):

**Shard Key Selection:**

1. **RescueRequest Collection**:
   - Shard key: `{ riderId: 1, requestedAt: 1 }`
   - Rationale: Distributes rescues evenly, enables rider-specific queries

2. **Payment Collection**:
   - Shard key: `{ rescueId: 1 }`
   - Rationale: Co-locates payments with rescues

3. **DriverProfile Collection**:
   - Shard key: `{ userId: 1 }`
   - Rationale: Even distribution, enables driver-specific queries

**Shard Distribution:**
- Geographic sharding possible with `location` prefix
- Enables multi-region deployment with data locality

---

## Data Retention & Archival

### Retention Policies

| Collection | Hot Data | Warm Data | Cold Data | Archive |
|------------|----------|-----------|-----------|---------|
| RescueRequest | 90 days | 1 year | 3 years | 7 years |
| Payment | 90 days | 1 year | 7 years | Forever |
| Rating | Forever | - | - | - |
| AuditLog | 30 days | 90 days | 1 year | 7 years |
| Notification | 30 days | - | - | Delete |

**Implementation:**
- TTL indexes for automatic deletion
- Monthly archival job to S3 Glacier
- Compliance with financial regulations (7-year retention for payments)

---

## Query Patterns & Optimization

### Top 10 Critical Queries

1. **Find Available Drivers Nearby**
   ```javascript
   DriverProfile.find({
     location: {
       $near: {
         $geometry: { type: 'Point', coordinates: [lng, lat] },
         $maxDistance: 5000 // 5km
       }
     },
     isOnline: true,
     isAvailable: true,
     status: 'approved'
   }).limit(20);
   ```
   - Uses: `{ location: '2dsphere', isOnline: 1, isAvailable: 1, status: 1 }` index
   - Expected latency: < 20ms

2. **Get Rider's Rescue History**
   ```javascript
   RescueRequest.find({ riderId })
     .sort({ createdAt: -1 })
     .limit(20);
   ```
   - Uses: `{ riderId: 1, createdAt: -1 }` index
   - Expected latency: < 10ms

3. **Get Driver's Active Rescue**
   ```javascript
   RescueAssignment.findOne({
     driverId,
     status: { $in: ['accepted', 'en_route', 'arrived', 'in_progress'] }
   });
   ```
   - Uses: `{ driverId: 1, status: 1 }` index
   - Expected latency: < 5ms

---

## Migration Strategy

### Schema Evolution

**Versioning:**
- Add `schemaVersion` field to all documents
- Incremental migrations via change streams
- No downtime deployments

**Migration Process:**
1. Add new field with default value
2. Background job migrates existing documents
3. Once complete, make field required in schema
4. Deploy code using new field
5. Remove old field after validation period

**Example Migration:**
```javascript
// Migration: Add 'priority' field to RescueRequest
db.rescuerequests.updateMany(
  { priority: { $exists: false } },
  { $set: { priority: 'normal', schemaVersion: 2 } }
);
```

---

## Backup & Disaster Recovery

### Backup Strategy

**Automated Backups:**
- Continuous backup via MongoDB Atlas or Ops Manager
- Point-in-time recovery (PITR) enabled
- Snapshots every 6 hours
- Retention: 7 days (recent), 4 weeks (weekly), 12 months (monthly)

**Backup Verification:**
- Monthly restore tests to staging environment
- Automated validation of backup integrity

**Geographic Redundancy:**
- Replica set members across 3 availability zones
- Cross-region backup replication for DR

---

## Compliance & Privacy

### GDPR/CCPA Compliance

**Data Subject Rights:**

1. **Right to Access**: Export all user data via API endpoint
2. **Right to Erasure**: Anonymize or delete user data
3. **Right to Portability**: JSON export of user data

**Implementation:**
```typescript
// Anonymize user data (for GDPR erasure)
async function anonymizeUser(userId: string) {
  await User.updateOne({ _id: userId }, {
    phoneNumber: encrypt('ANONYMIZED'),
    hashedPassword: 'DELETED',
    phoneVerified: false
  });

  await RiderProfile.updateOne({ userId }, {
    name: encrypt('Anonymous User'),
    email: encrypt('deleted@example.com')
  });

  // Keep rescue/payment records for compliance, but anonymize PII
}
```

**Data Processing Records:**
- Audit log tracks all data access and modifications
- Retention per legal requirements

---

**Document Version:** 2.0
**Last Updated:** 2025-11-18
**Author:** SupportCarr Data Team
