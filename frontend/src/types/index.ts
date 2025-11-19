/**
 * Frontend TypeScript Types
 *
 * These types mirror the backend domain models but are optimized for frontend use
 */

export enum UserRole {
  RIDER = 'rider',
  DRIVER = 'driver',
  ADMIN = 'admin',
  SUPPORT = 'support',
}

export enum RescueStatus {
  REQUESTED = 'requested',
  MATCHED = 'matched',
  ACCEPTED = 'accepted',
  EN_ROUTE = 'en_route',
  ARRIVED = 'arrived',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum RescueType {
  FLAT_TIRE = 'flat_tire',
  DEAD_BATTERY = 'dead_battery',
  OUT_OF_CHARGE = 'out_of_charge',
  BREAKDOWN = 'breakdown',
  TRANSPORT = 'transport',
  OTHER = 'other',
}

export enum RescuePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum DriverStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// ============================================================================
// Common Types
// ============================================================================

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface Address {
  street?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Location {
  coordinates: GeoPoint;
  address: Address;
  formattedAddress: string;
}

export interface Money {
  amountInCents: number;
  currency: string;
}

export interface BikeDetails {
  make?: string;
  model?: string;
  type?: string;
}

// ============================================================================
// User & Profile Types
// ============================================================================

export interface User {
  _id: string;
  phoneNumber: string;
  role: UserRole;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RiderProfile {
  _id: string;
  userId: string;
  name: string;
  email?: string;
  stripeCustomerId?: string;
  savedLocations: SavedLocation[];
  preferences: UserPreferences;
  totalRescues: number;
  averageRating: number;
  createdAt: string;
  updatedAt: string;
}

export interface DriverProfile {
  _id: string;
  userId: string;
  name: string;
  email?: string;
  licenseNumber: string;
  licenseExpiry: string;
  stripeAccountId?: string;
  location: Location | null;
  isOnline: boolean;
  isAvailable: boolean;
  status: DriverStatus;
  rating: number;
  ratingCount: number;
  completedRescues: number;
  totalEarnings: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavedLocation {
  name: string;
  address: string;
  location: GeoPoint;
}

export interface UserPreferences {
  notifications: {
    sms: boolean;
    push: boolean;
    email: boolean;
  };
  language: string;
}

// ============================================================================
// Rescue Types
// ============================================================================

export interface RescueRequest {
  _id: string;
  riderId: string;
  status: RescueStatus;
  type: RescueType;
  pickupLocation: Location;
  dropoffLocation?: Location;
  description: string;
  photos: string[];
  estimatedPrice: Money;
  finalPrice?: Money;
  distance?: number;
  estimatedDuration?: number;
  bikeDetails: BikeDetails;
  priority: RescuePriority;
  cancellationReason?: string;
  cancelledBy?: string;
  requestedAt: string;
  matchedAt?: string;
  acceptedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RescueAssignment {
  _id: string;
  rescueId: string;
  driverId: string;
  status: RescueStatus;
  assignedAt: string;
  acceptedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  driverLocation: GeoPoint;
  estimatedArrivalTime?: number;
  locationHistory: LocationHistoryEntry[];
}

export interface LocationHistoryEntry {
  location: GeoPoint;
  timestamp: string;
}

// ============================================================================
// Payment Types
// ============================================================================

export interface Payment {
  _id: string;
  rescueId: string;
  riderId: string;
  driverId: string;
  amount: number;
  driverPayout: number;
  platformFee: number;
  status: PaymentStatus;
  stripePaymentIntentId: string;
  breakdown: PaymentBreakdown;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentBreakdown {
  basePrice: number;
  distanceFee: number;
  timeFee: number;
  surgeFee?: number;
  discount?: number;
  tax: number;
}

export interface PaymentMethod {
  _id: string;
  riderId: string;
  stripePaymentMethodId: string;
  type: 'card' | 'bank_account';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
  createdAt: string;
}

// ============================================================================
// Rating Types
// ============================================================================

export interface Rating {
  _id: string;
  rescueId: string;
  fromUserId: string;
  toUserId: string;
  type: 'rider_to_driver' | 'driver_to_rider';
  rating: number;
  comment?: string;
  tags: string[];
  createdAt: string;
}

// ============================================================================
// Vehicle Types
// ============================================================================

export interface Vehicle {
  _id: string;
  driverId: string;
  type: 'pickup_truck' | 'cargo_van' | 'flatbed' | 'box_truck';
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  capacity: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  features: string[];
  isActive: boolean;
  createdAt: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    context?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================================================
// Auth Types
// ============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  profile: RiderProfile | DriverProfile;
  tokens: AuthTokens;
}

export interface SignUpRequest {
  phoneNumber: string;
  role: UserRole;
  name: string;
  email?: string;
}

export interface SignInRequest {
  phoneNumber: string;
}

export interface VerifyOTPRequest {
  phoneNumber: string;
  code: string;
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

export interface WebSocketEvent<T = unknown> {
  event: string;
  data: T;
  timestamp: string;
}

export interface RescueStatusUpdateEvent {
  rescueId: string;
  status: RescueStatus;
  timestamp: string;
}

export interface DriverLocationUpdateEvent {
  rescueId: string;
  driverId: string;
  location: GeoPoint;
  speed?: number;
  heading?: number;
  estimatedArrivalTime?: number;
  timestamp: string;
}

// ============================================================================
// Form Types
// ============================================================================

export interface CreateRescueFormData {
  type: RescueType;
  pickupLocation: Location;
  dropoffLocation?: Location;
  description: string;
  bikeDetails: BikeDetails;
  photos?: File[];
}

export interface UpdateProfileFormData {
  name?: string;
  email?: string;
  preferences?: UserPreferences;
}

// ============================================================================
// Map Types
// ============================================================================

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export interface SelectOption<T = string> {
  label: string;
  value: T;
}
