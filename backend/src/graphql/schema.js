import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  type User {
    id: ID!
    phoneNumber: String!
    firstName: String!
    lastName: String!
    email: String
    role: UserRole!
    isPhoneVerified: Boolean!
    profilePicture: String
    createdAt: DateTime!
    updatedAt: DateTime!
    riderProfile: RiderProfile
    driverProfile: DriverProfile
  }

  enum UserRole {
    rider
    driver
    admin
    support
  }

  type RiderProfile {
    id: ID!
    userId: ID!
    user: User!
    preferredPaymentMethod: String
    savedLocations: [SavedLocation!]!
    stats: RiderStats!
    createdAt: DateTime!
  }

  type RiderStats {
    totalRescues: Int!
    totalSpent: Float!
    averageRating: Float!
  }

  type SavedLocation {
    name: String!
    address: String!
    latitude: Float!
    longitude: Float!
  }

  type DriverProfile {
    id: ID!
    userId: ID!
    user: User!
    availability: DriverAvailability!
    isOnline: Boolean!
    currentLocation: Location
    vehicle: Vehicle
    stats: DriverStats!
    rating: Rating!
    createdAt: DateTime!
  }

  enum DriverAvailability {
    available
    busy
    offline
  }

  type Location {
    type: String!
    coordinates: [Float!]!
  }

  type Vehicle {
    make: String!
    model: String!
    year: Int!
    licensePlate: String!
    color: String!
    type: VehicleType!
  }

  enum VehicleType {
    van
    truck
    motorcycle
    car
  }

  type DriverStats {
    totalRescues: Int!
    totalEarnings: Float!
    completionRate: Float!
    averageResponseTime: Float!
    totalActiveHours: Float!
  }

  type Rating {
    average: Float!
    count: Int!
  }

  type RescueRequest {
    id: ID!
    riderId: ID!
    rider: User!
    driverId: ID
    driver: User
    status: RescueStatus!
    pickupLocation: RescueLocation!
    dropoffLocation: RescueLocation!
    issue: Issue!
    ebike: Ebike
    pricing: Pricing!
    payment: Payment
    ratings: [RescueRating!]!
    timeline: [TimelineEvent!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    completedAt: DateTime
    estimatedArrival: DateTime
  }

  enum RescueStatus {
    pending
    accepted
    driver_enroute
    driver_arrived
    in_progress
    completed
    cancelled_by_rider
    cancelled_by_driver
    cancelled_by_system
  }

  type RescueLocation {
    address: String!
    location: Location!
    landmark: String
  }

  type Issue {
    type: IssueType!
    description: String!
    images: [String!]
  }

  enum IssueType {
    flat_tire
    battery_dead
    mechanical_issue
    accident
    stuck
    other
  }

  type Ebike {
    make: String
    model: String
    color: String
    serialNumber: String
  }

  type Pricing {
    basePrice: Float!
    distance: Float!
    surgeMultiplier: Float!
    discount: Float!
    tax: Float!
    total: Float!
    driverPayout: Float!
  }

  type Payment {
    status: PaymentStatus!
    method: String!
    transactionId: String
  }

  enum PaymentStatus {
    pending
    processing
    succeeded
    failed
    refunded
  }

  type RescueRating {
    id: ID!
    userId: ID!
    user: User!
    rating: Int!
    review: String
    createdAt: DateTime!
  }

  type TimelineEvent {
    status: String!
    timestamp: DateTime!
    message: String
  }

  type PaymentRecord {
    id: ID!
    rescueId: ID!
    rescue: RescueRequest
    userId: ID!
    user: User!
    amount: Float!
    currency: String!
    status: PaymentStatus!
    paymentMethod: String!
    stripePaymentIntentId: String
    createdAt: DateTime!
  }

  type AnalyticsDashboard {
    rescues: RescueMetrics!
    drivers: DriverMetrics!
    riders: RiderMetrics!
    revenue: RevenueMetrics!
    rating: RatingMetrics!
    timestamp: DateTime!
  }

  type RescueMetrics {
    total: Int!
    active: Int!
    completedToday: Int!
    completionRate: Float!
  }

  type DriverMetrics {
    total: Int!
    online: Int!
    activeRate: Float!
  }

  type RiderMetrics {
    total: Int!
  }

  type RevenueMetrics {
    total: Float!
    today: Float!
  }

  type RatingMetrics {
    average: Float!
  }

  type RescueTrend {
    date: DateTime!
    total: Int!
    completed: Int!
    cancelled: Int!
    revenue: Float!
  }

  type Notification {
    id: ID!
    userId: ID!
    user: User
    type: NotificationType!
    title: String!
    message: String!
    data: JSON
    isRead: Boolean!
    createdAt: DateTime!
  }

  enum NotificationType {
    rescue_request
    rescue_accepted
    driver_enroute
    driver_arrived
    rescue_completed
    payment_processed
    rating_received
    promo_available
    system_announcement
  }

  # Inputs
  input CreateRescueInput {
    pickupLocation: LocationInput!
    dropoffLocation: LocationInput!
    issue: IssueInput!
    ebike: EbikeInput
  }

  input LocationInput {
    address: String!
    latitude: Float!
    longitude: Float!
    landmark: String
  }

  input IssueInput {
    type: IssueType!
    description: String!
    images: [String!]
  }

  input EbikeInput {
    make: String
    model: String
    color: String
    serialNumber: String
  }

  input UpdateDriverLocationInput {
    latitude: Float!
    longitude: Float!
    heading: Float
    speed: Float
  }

  input RateRescueInput {
    rating: Int!
    review: String
  }

  input RescueFilterInput {
    status: RescueStatus
    riderId: ID
    driverId: ID
    startDate: DateTime
    endDate: DateTime
  }

  input PaginationInput {
    page: Int = 1
    limit: Int = 20
    sortBy: String
    sortOrder: String
  }

  type PaginatedRescues {
    rescues: [RescueRequest!]!
    total: Int!
    page: Int!
    pages: Int!
  }

  # Queries
  type Query {
    # User queries
    me: User!
    user(id: ID!): User
    users(role: UserRole, limit: Int, page: Int): [User!]!

    # Rescue queries
    rescue(id: ID!): RescueRequest
    rescues(filter: RescueFilterInput, pagination: PaginationInput): PaginatedRescues!
    myRescues(status: RescueStatus, limit: Int): [RescueRequest!]!
    activeRescues: [RescueRequest!]!

    # Driver queries
    driver(id: ID!): DriverProfile
    nearbyDrivers(latitude: Float!, longitude: Float!, radius: Float): [DriverProfile!]!
    driverLeaderboard(limit: Int): [DriverProfile!]!

    # Analytics queries (admin only)
    analyticsDashboard: AnalyticsDashboard!
    rescueTrends(days: Int): [RescueTrend!]!
    revenueAnalytics(days: Int): JSON!

    # Notification queries
    notifications(limit: Int, unreadOnly: Boolean): [Notification!]!
    unreadNotificationCount: Int!

    # Payment queries
    payments(limit: Int): [PaymentRecord!]!
    payment(id: ID!): PaymentRecord
  }

  # Mutations
  type Mutation {
    # Auth mutations
    signup(phoneNumber: String!, password: String!, firstName: String!, lastName: String!, role: UserRole!): AuthPayload!
    signin(phoneNumber: String!, password: String!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!

    # Rescue mutations
    createRescue(input: CreateRescueInput!): RescueRequest!
    acceptRescue(rescueId: ID!): RescueRequest!
    updateRescueStatus(rescueId: ID!, status: RescueStatus!): RescueRequest!
    cancelRescue(rescueId: ID!, reason: String): RescueRequest!
    rateRescue(rescueId: ID!, input: RateRescueInput!): RescueRequest!

    # Driver mutations
    updateDriverLocation(input: UpdateDriverLocationInput!): DriverProfile!
    updateDriverAvailability(availability: DriverAvailability!): DriverProfile!
    toggleDriverOnline: DriverProfile!

    # Notification mutations
    markNotificationRead(notificationId: ID!): Notification!
    markAllNotificationsRead: Boolean!
    deleteNotification(notificationId: ID!): Boolean!

    # User mutations
    updateProfile(firstName: String, lastName: String, email: String): User!
    uploadProfilePicture(file: Upload!): User!
  }

  # Subscriptions
  type Subscription {
    rescueUpdated(rescueId: ID!): RescueRequest!
    driverLocationUpdated(driverId: ID!): DriverProfile!
    notificationReceived: Notification!
    rescueRequestCreated: RescueRequest!
  }

  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    user: User!
  }

  scalar Upload
`;
