# 🚚 SupportCarr Platform

**Nation-scale on-demand rescue and utility vehicle platform for America's 30 million e-bikes and micromobility devices.**

## 🎯 Overview

SupportCarr is the "Uber for roadside rescue" - connecting stranded e-bike riders with nearby pickup truck drivers. It's also a "friend with a truck" platform for utility tasks like dump runs, Craigslist pickups, and hauling. The platform ships with a type-safe Node.js API, a Vite/React operations console, real-time dispatch over Socket.io, and a DevOps toolchain so you can run a production-like environment locally.

### Key Features

- **On-Demand Rescue**: Request a pickup truck to rescue you and your e-bike
- **Real-Time Tracking**: Live GPS tracking of driver and rider locations through Socket.io rooms
- **Smart Dispatch**: Automatic routing and surge controls encoded in `backend/src/services`
- **Flexible Tasks**: Schedule utility jobs (dump runs, pickups, hauling) via feature flags
- **Gig Economy**: Asset-light model using existing truck owners
- **Secure Payments**: Stripe Connect-style payments with BullMQ payout workers
- **SMS Notifications**: Twilio-powered updates and verification flows
- **Admin Dashboard**: React-based operations console with analytics and driver controls
- **GraphQL + REST**: Apollo Server runs alongside Express REST routes for richer queries

## 🏗️ Architecture

### Tech Stack

**Backend (`backend/`):**
- Node.js 20+, Express, and Apollo Server for the dual REST/GraphQL API
- MongoDB via Mongoose models plus Redis/ioredis for caching and queues
- BullMQ workers (`backend/src/workers`) for notifications, payments, and analytics pipelines
- Socket.io for realtime rider/driver updates and location streaming
- JWT authentication, request rate limiting, and field-level encryption for PII
- Stripe, Twilio, AWS S3, email, and Mapbox integrations controlled through `.env`

**Frontend (`frontend/`):**
- React 18 + Vite + Tailwind CSS UI kit
- Zustand stores for app state, React Router for navigation, Mapbox GL for dispatch views
- Axios + Socket.io-client for talking to the API in real time

**DevOps (`helm/`, `k8s/`, `monitoring/`):**
- Docker & Docker Compose for local orchestration
- Helm charts and raw Kubernetes manifests for cluster deployments
- GitHub Actions workflows, Prometheus/Grafana dashboards, and Sentry for telemetry

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

## 🗂 Repository Structure

```
SupportCarr-V2/
├── backend/            # Express/Apollo API, BullMQ workers, domain services
├── frontend/           # React + Vite console used by riders, drivers, and admins
├── docs/               # Architecture, API, deployment, runbook, and security guides
├── monitoring/         # Prometheus rules, Grafana dashboards, alerting configs
├── helm/ | k8s/        # Production deployment artefacts
├── tests/              # Black-box API tests that hit the running backend
└── docker-compose.yml  # Local orchestration for MongoDB, Redis, API, and web
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ / npm 10+
- MongoDB 6+
- Redis 7+
- Docker & Docker Compose (optional but recommended)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/PetrefiedThunder/SupportCarr-V2.git
cd SupportCarr-V2
```

2. **Install dependencies**
```bash
# Backend API
cd backend
npm install

# Frontend console
cd ../frontend
npm install
```

3. **Environment Setup**
```bash
# Backend
cd backend
cp .env.example .env
# Ships with realistic mock keys so the API boots immediately.
# Replace with real credentials before deploying to prod.

# Frontend
cd ../frontend
cp .env.example .env.local
# Update VITE_API_URL/VITE_WS_URL if the API uses a non-default host.
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
- See [Environment Variables](#⚙️-environment-variables) for the exhaustive list

4. **Start supporting services**
```bash
# Using Docker (recommended)
docker-compose up -d mongo redis

# Or install natively
# MongoDB: https://docs.mongodb.com/manual/installation/
# Redis: https://redis.io/download
```

5. **Seed sample data**
```bash
cd backend
npm run db:seed
```

6. **Run the platform**
```bash
# Terminal 1 - Backend REST/GraphQL API + Socket.io
cd backend
npm run dev

# Terminal 2 - BullMQ workers
cd backend
npm run worker

# Terminal 3 - Frontend console
cd frontend
npm run dev
```

7. **Access the application**
- Frontend: http://localhost:5173
- Backend API (REST): http://localhost:3000/api/v1
- GraphQL endpoint: http://localhost:3000/graphql
- Health & metrics: http://localhost:3000/health and http://localhost:3000/metrics

### Docker-Compose All-In-One

`docker-compose.yml` already wires MongoDB, Redis, the backend (with hot reload), and the frontend together.

```bash
# Boot everything
docker-compose up --build

# Tail API logs
docker-compose logs -f api

# Tear everything down
docker-compose down
```

Hot reloading works because both the `backend/` and `frontend/` directories are bind-mounted into their respective containers.

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Security Model](./docs/SECURITY.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Operational Runbook](./docs/RUNBOOK.md)
- [Monitoring configs](./monitoring) for Prometheus/Grafana wiring

The docs folder contains the canonical source of truth for payload formats, SLAs, and operational runbooks referenced by the
console and workers.

## 🔧 Development Workflow

### Backend scripts (`backend/package.json`)

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Express + Apollo API with Nodemon |
| `npm run worker` | Boots BullMQ workers defined in `backend/src/workers` |
| `npm run db:seed` | Seeds Mongo with deterministic demo data |
| `npm test` / `npm run test:*` | Runs Jest suites (unit, integration, e2e, coverage) |
| `npm run lint` / `npm run format` | Ensures code-style consistency |

### Frontend scripts (`frontend/package.json`)

| Command | Description |
| --- | --- |
| `npm run dev` | Runs Vite dev server with hot module reload |
| `npm run build` | Builds a production bundle |
| `npm run preview` | Serves the production bundle locally |
| `npm run lint` / `npm run format` | ESLint + Prettier across `src/` |

### Tests directory (`tests/`)

End-to-end suites under `tests/` assume the API is running at `http://localhost:3000`. Bring the stack up (Docker or manual) and
then run `npm test` from the `backend/` folder to exercise authentication, rescues, payments, analytics, and worker jobs.

## ⚙️ Environment Variables

- `backend/.env.example` documents every integration key used by `backend/src/config/index.js` (Stripe, Twilio, AWS, Mapbox,
  feature flags, etc.). Copy it to `.env` and tweak values for your environment.
- `frontend/.env.example` lists the Vite variables (`VITE_API_URL`, `VITE_WS_URL`, `VITE_MAPBOX_TOKEN`) consumed by the React app.
- The API exposes `/health` and `/ready` endpoints so Kubernetes and Docker can perform readiness/liveness checks using those
  values.

## 📡 Observability & Ops

- `backend/src/services/metricsService.js` publishes Prometheus metrics at `/metrics` and instruments every request.
- `monitoring/` ships alert rules and dashboards you can import into Grafana.
- `helm/` and `k8s/` contain the manifests that wire probes, secrets, and config maps around the API, workers, and frontend.
- `docs/RUNBOOK.md` outlines the on-call playbook for incidents, while `docs/DEPLOYMENT.md` covers CI/CD using GitHub Actions.

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

See [📡 Observability & Ops](#📡-observability--ops) for the files that configure telemetry. At runtime:

- **Application Metrics**: `backend/src/services/metricsService.js` exports Prometheus metrics scraped by Grafana dashboards in
  `monitoring/`
- **Error Tracking**: Sentry SDK is initialized in `backend/src/server.js`
- **Logging**: Structured Winston logs stream to stdout and files for shipping to your log stack
- **Health Checks**: `/health`, `/ready`, and `/metrics` endpoints drive load balancer probes and alerting rules

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

See [⚙️ Environment Variables](#⚙️-environment-variables) for the complete list of required configuration.

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
