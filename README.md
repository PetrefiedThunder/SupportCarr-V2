# 🚚 SupportCarr Platform

**Nation-scale on-demand rescue and utility vehicle platform for America's 30 million e-bikes and micromobility devices.**

## 🎯 Overview

SupportCarr is the "Uber for roadside rescue" - connecting stranded e-bike riders with nearby pickup truck drivers. It's also a "friend with a truck" platform for utility tasks like dump runs, Craigslist pickups, and hauling.

### Key Features

- **On-Demand Rescue**: Request a pickup truck to rescue you and your e-bike
- **Real-Time Tracking**: Live GPS tracking of driver location
- **Smart Dispatch**: Automatic routing to nearest available driver
- **Flexible Tasks**: Schedule utility jobs (dump runs, pickups, hauling)
- **Gig Economy**: Asset-light model using existing truck owners
- **Secure Payments**: Stripe integration for seamless transactions
- **SMS Notifications**: Twilio-powered updates and verification
- **Admin Dashboard**: Complete operational oversight

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js 20+ with Express
- MongoDB with Mongoose
- Redis for caching and job queues
- BullMQ for background processing
- Socket.io for real-time updates
- JWT authentication
- Twilio for SMS/voice
- Stripe for payments

**Frontend:**
- React 18 with Vite
- Tailwind CSS
- Zustand state management
- Mapbox for maps
- Axios for API calls
- Socket.io-client for real-time

**DevOps:**
- Docker & Docker Compose
- Kubernetes with Helm
- GitHub Actions CI/CD
- Prometheus & Grafana monitoring
- Sentry error tracking

### System Architecture

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│  Rider  │    │ Driver  │    │  Admin  │
└────┬────┘    └────┬────┘    └────┬────┘
     │              │              │
     └──────────────┼──────────────┘
                    │
              Load Balancer
                    │
     ┌──────────────┼──────────────┐
     │                             │
 API Server                  Socket.io
     │                             │
     ├─────────────┬───────────────┤
     │             │               │
  Auth         Rescue          Payment
  Service      Service         Service
     │             │               │
     └─────────────┼───────────────┘
                   │
        ┌──────────┼──────────┐
        │                     │
    MongoDB                Redis
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- MongoDB 6+
- Redis 7+
- Docker & Docker Compose (optional)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/PetrefiedThunder/SupportCarr-V2.git
cd SupportCarr-V2
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Environment Setup**
```bash
# Backend
cd backend
cp .env.example .env
# The .env.example contains MOCK API keys for demo/development
# For production, replace with real credentials

# Frontend
cd ../frontend
cp .env.example .env.local
# Update VITE_MAPBOX_TOKEN with real token for maps to work
```

**Note**: The `.env.example` files include realistic-looking **mock API keys** that allow you to:
- Start the application immediately without configuring external services
- Run demos and development without exposing real credentials
- Understand the required format for each service's credentials

**For full functionality**, replace mock values with real credentials:
- **Stripe**: Get test keys from https://dashboard.stripe.com/test/apikeys
- **Twilio**: Get credentials from https://console.twilio.com/
- **Mapbox**: Get access token from https://account.mapbox.com/
- **AWS S3**: Create IAM user with S3 access
- **Sentry**: Create project at https://sentry.io/
- See [Environment Variables](#environment-variables) section for complete list

4. **Start MongoDB and Redis**
```bash
# Using Docker
docker-compose up -d mongo redis

# Or install locally
# MongoDB: https://docs.mongodb.com/manual/installation/
# Redis: https://redis.io/download
```

5. **Run migrations and seed data**
```bash
cd backend
npm run db:seed
```

6. **Start development servers**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Background workers
cd backend
npm run worker
```

7. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs

### Docker Development

```bash
# Start all services
docker-compose up

# Run with hot reload
docker-compose -f docker-compose.dev.yml up

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down
```

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Security Model](./docs/SECURITY.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Operational Runbook](./docs/RUNBOOK.md)

## 🔐 Security

- All passwords hashed with bcrypt
- JWT tokens with refresh mechanism
- Phone number verification via Twilio
- Encrypted PII fields in database
- Rate limiting on all endpoints
- CORS protection
- Helmet security headers
- SQL injection prevention
- XSS protection
- CSRF tokens for mutations

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test                 # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
npm run test:coverage   # Coverage report

# Frontend tests
cd frontend
npm test
npm run test:coverage
```

## 📊 Monitoring

- **Application Metrics**: Prometheus + Grafana
- **Error Tracking**: Sentry
- **Logging**: Winston with structured JSON logs
- **APM**: Built-in performance monitoring
- **Health Checks**: `/health` and `/ready` endpoints

## 🚀 Deployment

### Production Deployment

```bash
# Build containers
docker build -t supportcarr/api:latest -f backend/Dockerfile .
docker build -t supportcarr/frontend:latest -f frontend/Dockerfile .

# Push to registry
docker push supportcarr/api:latest
docker push supportcarr/frontend:latest

# Deploy to Kubernetes
helm upgrade --install supportcarr ./helm/supportcarr \
  --namespace production \
  --values helm/values.production.yaml
```

### Environment Variables

See `.env.example` files in backend and frontend directories for required configuration.

## 📈 Scaling

The platform is designed to scale to 10M annual rescues:

- **Horizontal Scaling**: Stateless API servers behind load balancer
- **Database Sharding**: MongoDB sharded by geographic region
- **Caching Strategy**: Redis for hot data, CDN for static assets
- **Queue Processing**: BullMQ workers scale independently
- **Real-time**: Socket.io with Redis adapter for multi-node

## 🛣️ Roadmap

### Phase 1: MVP (Current)
- ✅ Core rescue request flow
- ✅ Driver/rider authentication
- ✅ Real-time tracking
- ✅ Payment processing
- ✅ SMS notifications

### Phase 2: Enhanced Features
- [ ] In-app chat
- [ ] Driver shift scheduling
- [ ] Dynamic pricing/surge
- [ ] Promo codes
- [ ] Referral system

### Phase 3: Scale
- [ ] Multi-city launch
- [ ] Fleet management
- [ ] Corporate accounts
- [ ] Analytics dashboard
- [ ] Mobile apps (iOS/Android)

### Phase 4: Platform
- [ ] Partner API
- [ ] White-label solution
- [ ] Insurance integration
- [ ] Predictive demand modeling
- [ ] International expansion

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

Copyright © 2025 SupportCarr. All rights reserved.

## 🆘 Support

- **Documentation**: https://docs.supportcarr.com
- **Issues**: https://github.com/PetrefiedThunder/SupportCarr-V2/issues
- **Email**: support@supportcarr.com
- **Slack**: [Join our community](https://supportcarr.slack.com)

## 👥 Team

Built with ❤️ by the SupportCarr team.

---

**SupportCarr - Never stranded again.** 🚚⚡
