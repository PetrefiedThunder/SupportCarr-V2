# SupportCarr v2 Architecture Documentation

## Executive Summary

SupportCarr v2 is a production-grade, event-driven platform for on-demand e-bike rescue and utility services. This document describes the system architecture, design principles, and technical decisions that enable SupportCarr to scale from a single city to a multi-region, multi-million rescue operation.

**Key Architecture Principles:**

1. **Hexagonal Architecture (Ports & Adapters)**: Domain logic is isolated from infrastructure concerns
2. **Domain-Driven Design**: Rich domain models with clear bounded contexts
3. **Event-Driven**: Async processing via events and job queues for resilience
4. **Type Safety**: Full TypeScript with strict mode, no runtime type surprises
5. **Defense in Depth**: Security at every layer (auth, validation, encryption, rate limiting)
6. **Observability First**: Logging, metrics, and tracing built in from day one
7. **Eventual Microservices**: Designed as a modular monolith with clear service boundaries

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Bounded Contexts](#bounded-contexts)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Data Architecture](#data-architecture)
7. [Infrastructure Architecture](#infrastructure-architecture)
8. [Security Architecture](#security-architecture)
9. [Scalability & Performance](#scalability--performance)
10. [Disaster Recovery](#disaster-recovery)

---

## 1. System Overview

### High-Level Context Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          SUPPORTCARR PLATFORM                             │
│                                                                           │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐              │
│  │   Rider     │      │   Driver    │      │    Admin    │              │
│  │  Mobile App │      │  Mobile App │      │  Dashboard  │              │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘              │
│         │                    │                     │                     │
│         └────────────────────┼─────────────────────┘                     │
│                              │                                           │
│                   ┌──────────▼──────────┐                                │
│                   │   API Gateway /      │                                │
│                   │   Load Balancer      │                                │
│                   └──────────┬───────────┘                                │
│                              │                                           │
│         ┌────────────────────┼────────────────────┐                      │
│         │                    │                    │                      │
│   ┌─────▼─────┐       ┌──────▼──────┐      ┌─────▼──────┐               │
│   │   Web     │       │  WebSocket  │      │   REST     │               │
│   │  Server   │       │   Server    │      │    API     │               │
│   └─────┬─────┘       └──────┬──────┘      └─────┬──────┘               │
│         │                    │                    │                      │
│         └────────────────────┼────────────────────┘                      │
│                              │                                           │
│                   ┌──────────▼──────────┐                                │
│                   │  Application Core   │                                │
│                   │  (Domain + Services)│                                │
│                   └──────────┬───────────┘                                │
│                              │                                           │
│         ┌────────────────────┼────────────────────┐                      │
│         │                    │                    │                      │
│   ┌─────▼─────┐       ┌──────▼──────┐      ┌─────▼──────┐               │
│   │ MongoDB   │       │    Redis    │      │  BullMQ    │               │
│   │ (Primary) │       │   (Cache)   │      │  (Jobs)    │               │
│   └───────────┘       └─────────────┘      └─────┬──────┘               │
│                                                   │                      │
│                                            ┌──────▼──────┐               │
│                                            │   Workers   │               │
│                                            └──────┬──────┘               │
│                                                   │                      │
└───────────────────────────────────────────────────┼───────────────────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────┐
                    │       EXTERNAL SERVICES       │                   │
                    │                               │                   │
              ┌─────▼─────┐    ┌─────▼─────┐   ┌───▼──────┐            │
              │  Twilio   │    │  Stripe   │   │  Mapbox  │            │
              │   (SMS)   │    │ (Payment) │   │   (Map)  │            │
              └───────────┘    └───────────┘   └──────────┘            │
                                                                        │
              ┌─────────────┐    ┌─────────────┐                       │
              │ Prometheus  │    │   Sentry    │                       │
              │ (Metrics)   │    │  (Errors)   │                       │
              └─────────────┘    └─────────────┘                       │
                                                                        │
                                                                        └
```

### Request Flow Example: Rescue Request

```
Rider App → API → Controller → Service → Domain → Repository → Database
                                  ↓
                              Event Bus
                                  ↓
                            ┌─────┴─────┐
                            │           │
                        SMS Queue   Matching Queue
                            │           │
                        Worker      Worker
                            │           │
                        Twilio     Find Driver
```

---

## 2. Architecture Patterns

### 2.1 Hexagonal Architecture (Ports & Adapters)

We implement hexagonal architecture to keep domain logic pure and infrastructure concerns at the edges.

```
┌───────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE LAYER                        │
│                                                                    │
│  HTTP     WebSocket    CLI       Event       Scheduled            │
│  ▼            ▼         ▼         ▼             ▼                 │
│ ┌──────────────────────────────────────────────────────────┐      │
│ │               ADAPTERS (Input Ports)                     │      │
│ │  Controllers │ Socket Handlers │ CLI Commands            │      │
│ └────────────────────────┬───────────────────────────────┬─┘      │
│                          │                               │        │
└──────────────────────────┼───────────────────────────────┼────────┘
                           ▼                               │
┌───────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                           │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │            APPLICATION SERVICES                          │     │
│  │  - RescueApplicationService                              │     │
│  │  - DriverApplicationService                              │     │
│  │  - PaymentApplicationService                             │     │
│  │  (Orchestrate use cases, transactions)                   │     │
│  └────────────────────────┬─────────────────────────────────┘     │
│                           │                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                         DOMAIN LAYER                              │
│                     (Pure Business Logic)                         │
│                                                                    │
│  ┌─────────────────────┐  ┌─────────────────────┐                 │
│  │   DOMAIN SERVICES   │  │     ENTITIES        │                 │
│  │  - RescueService    │  │  - Rescue           │                 │
│  │  - MatchingService  │  │  - Driver           │                 │
│  │  - PricingService   │  │  - Rider            │                 │
│  └─────────────────────┘  │  - Vehicle          │                 │
│                           │  - Payment          │                 │
│  ┌─────────────────────┐  └─────────────────────┘                 │
│  │   VALUE OBJECTS     │                                          │
│  │  - Location         │  ┌─────────────────────┐                 │
│  │  - Money            │  │  DOMAIN EVENTS      │                 │
│  │  - PhoneNumber      │  │  - RescueRequested  │                 │
│  │  - VehicleType      │  │  - DriverAssigned   │                 │
│  └─────────────────────┘  │  - PaymentCompleted │                 │
│                           └─────────────────────┘                 │
│  ┌──────────────────────────────────────────────────────┐         │
│  │         DOMAIN INTERFACES (Output Ports)             │         │
│  │  - IRescueRepository                                 │         │
│  │  - IDriverRepository                                 │         │
│  │  - IPaymentGateway                                   │         │
│  │  - INotificationService                              │         │
│  └────────────────────────┬─────────────────────────────┘         │
│                           │                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                           │
│                  (Adapters - Output Ports)                        │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │              IMPLEMENTATIONS                             │     │
│  │  - MongoRescueRepository  (implements IRescueRepository) │     │
│  │  - MongoDriverRepository  (implements IDriverRepository) │     │
│  │  - StripePaymentGateway   (implements IPaymentGateway)   │     │
│  │  - TwilioNotificationSvc  (implements INotificationSvc)  │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                    │
│  External: MongoDB │ Redis │ Twilio │ Stripe │ Mapbox             │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Domain logic is testable without infrastructure dependencies
- Easy to swap implementations (e.g., switch from Twilio to AWS SNS)
- Clear separation of concerns
- Infrastructure changes don't affect business rules

### 2.2 Domain-Driven Design (DDD)

We organize code around business domains, not technical layers.

**Bounded Contexts:**
1. **Rescue Management** - rescue requests, lifecycle, matching
2. **Driver Management** - driver profiles, availability, vehicles
3. **Rider Management** - rider profiles, payment methods
4. **Payment Processing** - charges, payouts, reconciliation
5. **Notification** - SMS, push, email, webhooks
6. **Identity & Access** - authentication, authorization

Each bounded context has:
- **Entities**: Objects with identity (e.g., `Rescue`, `Driver`)
- **Value Objects**: Immutable objects defined by values (e.g., `Location`, `Money`)
- **Aggregates**: Cluster of entities with a root (e.g., `RescueRequest` aggregate)
- **Domain Services**: Business logic that doesn't belong to a single entity
- **Repositories**: Interfaces for persistence
- **Domain Events**: Record of something that happened

### 2.3 Event-Driven Architecture

SupportCarr uses events for decoupling and async processing.

**Event Flow:**

```
Domain Event → Event Bus → Multiple Handlers
                            ├─ Send SMS (Twilio)
                            ├─ Update Analytics
                            ├─ Trigger Matching
                            └─ Log Audit Trail
```

**Event Types:**

| Event | Triggered When | Handlers |
|-------|----------------|----------|
| `RescueRequested` | Rider creates rescue | SMS notification, Driver matching, Analytics |
| `DriverAssigned` | Driver accepts rescue | SMS to rider, Update rescue status, Start tracking |
| `RescueCompleted` | Rescue is finished | Process payment, Send rating request, Update driver availability |
| `PaymentFailed` | Payment processing fails | Retry queue, Alert admin, Notify rider |
| `DriverLocationUpdated` | Driver moves | Broadcast to rider via WebSocket, Update ETA |

**Implementation:**
- In-memory event bus for synchronous events (same process)
- BullMQ for async events (cross-process, retryable)
- Event schema versioning for backward compatibility

---

## 3. Bounded Contexts

### 3.1 Context Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESCUE MANAGEMENT (Core)                      │
│                                                                  │
│  Entities: RescueRequest, RescueAssignment                       │
│  Value Objects: Location, RescueType, RescueStatus              │
│  Aggregates: RescueRequest (root)                               │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Create    │  │  Assign    │  │  Complete  │                │
│  │  Rescue    │→ │  Driver    │→ │  Rescue    │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└───────┬───────────────────────────────────┬──────────────────────┘
        │                                   │
        │ Depends on                        │ Depends on
        ▼                                   ▼
┌───────────────────┐             ┌─────────────────────┐
│ DRIVER MANAGEMENT │             │ PAYMENT PROCESSING  │
│                   │             │                     │
│ Entities: Driver, │             │ Entities: Payment,  │
│   Vehicle         │             │   Payout            │
│ Value Objects:    │             │ Value Objects:      │
│   Availability,   │             │   Money, Currency   │
│   Rating          │             │                     │
└───────┬───────────┘             └─────────────────────┘
        │
        │ Shares
        ▼
┌───────────────────┐             ┌─────────────────────┐
│ RIDER MANAGEMENT  │             │   NOTIFICATION      │
│                   │             │                     │
│ Entities: Rider   │────────────▶│ Services: SMS,      │
│ Value Objects:    │  Uses       │   Push, Email       │
│   PaymentMethod   │             │                     │
└───────────────────┘             └─────────────────────┘
```

### 3.2 Anti-Corruption Layers

When integrating with external services (Twilio, Stripe), we use **Anti-Corruption Layers** to:
1. Translate external models to our domain models
2. Isolate domain from external API changes
3. Provide clean interfaces for testing (mocking)

Example:
```typescript
// Domain interface (what our domain needs)
interface IPaymentGateway {
  charge(amount: Money, paymentMethod: PaymentMethodId): Promise<PaymentResult>;
  refund(chargeId: string, amount: Money): Promise<RefundResult>;
}

// Infrastructure adapter (translates Stripe to our domain)
class StripePaymentGateway implements IPaymentGateway {
  async charge(amount: Money, paymentMethod: PaymentMethodId): Promise<PaymentResult> {
    // Translate our Money to Stripe's amount format
    const stripeAmount = amount.toCents();

    // Call Stripe API
    const stripeResult = await stripe.paymentIntents.create({...});

    // Translate Stripe result back to our domain model
    return PaymentResult.fromStripe(stripeResult);
  }
}
```

---

## 4. Backend Architecture

### 4.1 Directory Structure

```
backend/
├── src/
│   ├── app/                          # Application layer (ports)
│   │   ├── http/                     # HTTP adapter
│   │   │   ├── routes/               # Express routes
│   │   │   ├── controllers/          # HTTP controllers
│   │   │   ├── middleware/           # Express middleware
│   │   │   └── dto/                  # Data Transfer Objects
│   │   ├── websocket/                # WebSocket adapter
│   │   │   ├── handlers/             # Socket event handlers
│   │   │   └── rooms/                # Socket room management
│   │   ├── jobs/                     # BullMQ job handlers
│   │   │   ├── handlers/             # Job processors
│   │   │   └── schedules/            # Scheduled jobs
│   │   └── cli/                      # CLI commands
│   │
│   ├── domain/                       # Domain layer (core business logic)
│   │   ├── rescues/                  # Rescue bounded context
│   │   │   ├── entities/             # Rescue, Assignment
│   │   │   ├── value-objects/        # Location, RescueType, Status
│   │   │   ├── services/             # RescueService, MatchingService
│   │   │   ├── repositories/         # IRescueRepository (interface)
│   │   │   ├── events/               # Domain events
│   │   │   └── errors/               # Domain-specific errors
│   │   ├── drivers/                  # Driver bounded context
│   │   │   ├── entities/             # Driver, Vehicle
│   │   │   ├── value-objects/        # Availability, Rating
│   │   │   ├── services/             # DriverService
│   │   │   └── repositories/         # IDriverRepository
│   │   ├── riders/                   # Rider bounded context
│   │   │   ├── entities/             # Rider
│   │   │   ├── value-objects/        # PaymentMethod
│   │   │   ├── services/             # RiderService
│   │   │   └── repositories/         # IRiderRepository
│   │   ├── payments/                 # Payment bounded context
│   │   │   ├── entities/             # Payment, Payout
│   │   │   ├── value-objects/        # Money, Currency
│   │   │   ├── services/             # PaymentService, PricingService
│   │   │   └── gateways/             # IPaymentGateway (interface)
│   │   ├── notifications/            # Notification bounded context
│   │   │   ├── services/             # INotificationService
│   │   │   └── templates/            # Message templates
│   │   └── shared/                   # Shared kernel
│   │       ├── value-objects/        # Id, PhoneNumber, Email
│   │       ├── events/               # Event bus interface
│   │       ├── errors/               # Base error classes
│   │       └── types/                # Shared types
│   │
│   ├── infrastructure/               # Infrastructure layer (adapters)
│   │   ├── database/                 # Database implementations
│   │   │   ├── mongoose/             # Mongoose schemas & models
│   │   │   │   ├── schemas/          # Schema definitions
│   │   │   │   └── encryption/       # Field encryption
│   │   │   └── repositories/         # Repository implementations
│   │   │       ├── MongoRescueRepository.ts
│   │   │       ├── MongoDriverRepository.ts
│   │   │       └── ...
│   │   ├── cache/                    # Redis cache
│   │   │   ├── RedisClient.ts
│   │   │   └── CacheService.ts
│   │   ├── messaging/                # Message queue
│   │   │   ├── BullMQService.ts
│   │   │   └── EventBus.ts
│   │   ├── external/                 # External service adapters
│   │   │   ├── twilio/               # Twilio adapter
│   │   │   │   ├── TwilioClient.ts
│   │   │   │   ├── TwilioNotificationService.ts
│   │   │   │   └── webhooks/         # Twilio webhook handlers
│   │   │   ├── stripe/               # Stripe adapter
│   │   │   │   ├── StripeClient.ts
│   │   │   │   ├── StripePaymentGateway.ts
│   │   │   │   └── webhooks/         # Stripe webhook handlers
│   │   │   └── mapbox/               # Mapbox adapter
│   │   │       └── MapboxClient.ts
│   │   ├── observability/            # Monitoring & logging
│   │   │   ├── logger/               # Winston logger
│   │   │   ├── metrics/              # Prometheus metrics
│   │   │   ├── tracing/              # Distributed tracing
│   │   │   └── sentry/               # Error tracking
│   │   └── security/                 # Security infrastructure
│   │       ├── encryption/           # Encryption utilities
│   │       ├── jwt/                  # JWT handling
│   │       └── hashing/              # Password hashing
│   │
│   ├── config/                       # Configuration
│   │   ├── env.ts                    # Environment variables
│   │   ├── database.ts               # Database config
│   │   ├── redis.ts                  # Redis config
│   │   └── ...
│   │
│   ├── server.ts                     # HTTP server entry point
│   ├── worker.ts                     # Background worker entry point
│   └── websocket.ts                  # WebSocket server entry point
│
├── tests/                            # Tests
│   ├── unit/                         # Unit tests (domain logic)
│   ├── integration/                  # Integration tests (with DB, etc.)
│   ├── e2e/                          # End-to-end tests
│   ├── fixtures/                     # Test data
│   └── helpers/                      # Test utilities
│
├── scripts/                          # Utility scripts
│   ├── seed.ts                       # Database seeding
│   ├── migrate.ts                    # Data migrations
│   └── admin-cli.ts                  # Admin CLI tool
│
├── tsconfig.json                     # TypeScript config (strict mode)
├── package.json
└── README.md
```

### 4.2 Dependency Flow

```
HTTP/WebSocket/CLI (Adapters)
        ↓
  Controllers
        ↓
  Application Services  ← orchestrate use cases
        ↓
  Domain Services      ← business logic
        ↓
  Repositories (interfaces)
        ↓
  Infrastructure Implementations
        ↓
  External Services (DB, APIs)
```

**Rules:**
- Domain layer has NO dependencies on infrastructure
- Application services coordinate domain services and repositories
- Infrastructure implements domain interfaces
- Dependency injection for loose coupling

### 4.3 Request/Response Flow

**Example: Create Rescue Request**

1. **HTTP Request** arrives at `POST /api/v1/rescues`
2. **Auth Middleware** validates JWT, attaches user to request
3. **Validation Middleware** validates request body with Zod schema
4. **Controller** (`RescueController.createRescue`)
   - Extracts DTO from request
   - Calls Application Service
5. **Application Service** (`RescueApplicationService.createRescue`)
   - Begins transaction
   - Calls Domain Service
   - Publishes domain events
   - Commits transaction
6. **Domain Service** (`RescueService.requestRescue`)
   - Creates `RescueRequest` entity
   - Applies business rules
   - Returns entity
7. **Repository** (`MongoRescueRepository.save`)
   - Persists to MongoDB
8. **Event Bus** dispatches `RescueRequested` event
9. **Event Handlers** (async):
   - Send SMS to rider (via Twilio)
   - Trigger driver matching (via BullMQ job)
   - Log analytics event
10. **Controller** returns HTTP 201 with rescue ID

---

## 5. Frontend Architecture

See full architecture documentation for complete frontend details including:
- React 18 + TypeScript structure
- Zustand state management architecture
- Mapbox integration patterns
- WebSocket real-time update flows

---

## 6. Data Architecture

See ERD section in data modeling documentation for comprehensive entity relationships and indexing strategy.

---

## 7-10. Additional Sections

See full sections in document above for:
- Infrastructure Architecture (Kubernetes, CI/CD)
- Security Architecture (STRIDE analysis, defense in depth)
- Scalability & Performance targets
- Disaster Recovery planning

---

**Document Version:** 2.0
**Last Updated:** 2025-11-18
**Author:** SupportCarr Engineering Team
