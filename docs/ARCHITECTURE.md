# SupportCarr Platform Architecture

## Overview

SupportCarr is built as a modern, cloud-native application designed to scale to millions of users while maintaining high availability and performance.

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: MongoDB 6+ with Mongoose ORM
- **Cache/Queue**: Redis 7+
- **Real-time**: Socket.io
- **Job Processing**: BullMQ
- **Authentication**: JWT with refresh tokens
- **File Storage**: AWS S3
- **Payments**: Stripe
- **SMS/Voice**: Twilio

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Maps**: Mapbox GL
- **HTTP Client**: Axios
- **Real-time**: Socket.io-client

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **Package Manager**: Helm
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Error Tracking**: Sentry
- **Logging**: Winston

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Rider     │  │   Driver    │  │    Admin    │            │
│  │     App     │  │     App     │  │  Dashboard  │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
└─────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                    HTTPS / WebSocket
                            │
┌───────────────────────────┼────────────────────────────────────┐
│                  Load Balancer (ALB)                            │
└───────────────────────────┼────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                                   │
┌─────────▼──────────┐              ┌─────────▼──────────┐
│   API Gateway      │              │   Socket.io Server │
│   (Express)        │◄────Redis────┤   (Real-time)      │
└─────────┬──────────┘              └─────────┬──────────┘
          │                                   │
          ├───────────────┬───────────────────┤
          │               │                   │
┌─────────▼─────┐  ┌──────▼──────┐  ┌────────▼────────┐
│  Auth Service │  │   Rescue    │  │    Payment      │
│               │  │   Service   │  │    Service      │
└───────────────┘  └─────────────┘  └─────────────────┘
          │               │                   │
          └───────────────┼───────────────────┘
                          │
              ┌───────────┼───────────┐
              │                       │
       ┌──────▼──────┐        ┌──────▼──────┐
       │   MongoDB   │        │    Redis    │
       │  (Primary)  │        │   (Cache)   │
       │ + Replicas  │        │   BullMQ    │
       └─────────────┘        └─────────────┘
```

## Data Architecture

### MongoDB Collections

1. **users** - User accounts and authentication
2. **driverprofiles** - Driver-specific data
3. **vehicles** - Vehicle information
4. **riderprofiles** - Rider preferences and history
5. **rescuerequests** - Rescue requests and status
6. **paymentrecords** - Payment transactions
7. **ratings** - User ratings and feedback
8. **notifications** - In-app notifications
9. **apikeys** - API keys for partners

### Redis Usage

1. **Session Store** - User session data
2. **Cache Layer** - Hot data caching
3. **Job Queue** - BullMQ job processing
4. **Pub/Sub** - Real-time event broadcasting
5. **Rate Limiting** - API rate limit tracking
6. **Token Blacklist** - Revoked JWT tokens

## Security Architecture

### Authentication Flow

```
1. User Sign Up
   └─> Create account
   └─> Send verification SMS
   └─> Return JWT access + refresh tokens

2. User Sign In
   └─> Validate credentials
   └─> Generate tokens
   └─> Return user data + tokens

3. API Request
   └─> Verify JWT token
   └─> Check token blacklist
   └─> Validate user permissions
   └─> Execute request

4. Token Refresh
   └─> Validate refresh token
   └─> Check token blacklist
   └─> Generate new access token
```

### Data Security

- **Encryption at Rest**: PII fields encrypted using mongoose-encryption
- **Encryption in Transit**: TLS 1.3 for all connections
- **Password Hashing**: bcrypt with salt rounds of 12
- **JWT Signing**: HS256 algorithm with rotating secrets
- **API Keys**: Hashed and stored securely
- **Rate Limiting**: Per-IP and per-user limits

## Scalability Strategy

### Horizontal Scaling

- **API Servers**: Stateless design allows unlimited horizontal scaling
- **Socket.io**: Redis adapter enables multi-node WebSocket
- **BullMQ Workers**: Independent worker processes scale separately
- **Database**: MongoDB replica set with sharding

### Caching Strategy

1. **Application Cache** (Redis)
   - User sessions: 24 hours
   - API responses: 5 minutes
   - Driver locations: 30 seconds

2. **CDN Cache** (CloudFront)
   - Static assets: 1 year
   - API responses: 1 minute (for public endpoints)

### Database Optimization

- **Indexing**: All frequently queried fields indexed
- **Sharding**: Shard by geographic region for rescues
- **Read Replicas**: Separate replicas for analytics
- **Connection Pooling**: Max pool size of 100 connections

## Deployment Architecture

### Kubernetes Cluster

```
┌─────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Ingress    │  │   API Pods   │  │  Socket Pods │ │
│  │  Controller  │  │  (3 replicas)│  │  (2 replicas)│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Worker Pods │  │  MongoDB     │  │    Redis     │ │
│  │  (2 replicas)│  │  StatefulSet │  │  StatefulSet │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Environments

1. **Development** - Local Docker Compose
2. **Staging** - Kubernetes cluster (minimal resources)
3. **Production** - Multi-zone Kubernetes cluster

## Monitoring & Observability

### Metrics (Prometheus)

- Request rate, latency, error rate
- Database connection pool stats
- Cache hit/miss ratio
- Queue job processing times
- Business metrics (rescues/hour, revenue, etc.)

### Logging (Winston)

- Structured JSON logs
- Log levels: error, warn, info, debug
- Daily log rotation
- Centralized log aggregation

### Error Tracking (Sentry)

- Real-time error reporting
- Stack traces and context
- User impact tracking
- Performance monitoring

## API Design

### RESTful Principles

- Resource-based URLs
- HTTP verbs for actions
- JSON request/response
- Standard status codes
- Pagination for lists
- Filtering and sorting

### Real-time Events (Socket.io)

- `rescue:status_update` - Rescue status changed
- `driver:location_update` - Driver location updated
- `notification:new` - New notification received
- `payment:processed` - Payment completed

## Future Enhancements

1. **Microservices Split** - Separate services for auth, rescue, payment
2. **Event Sourcing** - CQRS pattern for complex queries
3. **GraphQL API** - Alternative to REST for flexible querying
4. **Machine Learning** - Demand prediction, dynamic pricing
5. **Multi-region** - Global deployment across regions
6. **Mobile Apps** - Native iOS and Android applications

## Performance Targets

- **API Response Time**: < 200ms (p95)
- **Real-time Latency**: < 100ms
- **Database Queries**: < 50ms (p95)
- **Uptime**: 99.9%
- **Throughput**: 10,000 req/sec per node
