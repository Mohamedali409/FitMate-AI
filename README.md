# FitMate AI — Backend Foundation (Phase 4)

Welcome to the backend service of **FitMate AI** — a premium, mobile-first fitness and nutrition application.
The backend is structured as a robust **Modular Monolith** in **Node.js** and **TypeScript** backed by **MongoDB Replica Set** and **Redis**.

---

## 1. Prerequisites

Ensure your development environment meets the following baseline requirements:
- **Node.js**: `v20.x` or `v22.x` (LTS recommended; tested on `v22.23.2`)
- **Package Manager**: `npm` (`v10.x` or `v11.x`)
- **Docker & Docker Compose**: (Optional but recommended for running local MongoDB Replica Set and Redis)
- **MongoDB**: MongoDB 7.0+ (Must be initialized as a replica set `rs0` to support multi-document ACID transactions)
- **Redis**: Redis 7.x+

---

## 2. Quickstart & Local Setup

### Step 1: Environment Variables Setup
Copy the template configuration to your local `.env`:
```bash
cp .env.example .env
```
Inspect `.env` and verify the `MONGODB_URI` and `JWT_ACCESS_SECRET`.

### Step 2: Start Infrastructure (Docker)
Launch MongoDB Replica Set and Redis in the background:
```bash
docker compose up -d
```
*Note*: The Docker Compose file automatically initiates a single-node replica set (`rs0`) required for multi-document transactions.

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Run in Development Mode
Starts the server with TypeScript hot-reloading:
```bash
npm run dev
```
The server will boot and listen on `http://localhost:3000`. Test the health check endpoint:
```bash
curl http://localhost:3000/api/v1/health
```

---

## 3. Available Developer Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts server in watch mode via `tsx` |
| `npm run build` | Compiles TypeScript to `dist/` |
| `npm start` | Runs compiled production server from `dist/server.js` |
| `npm test` | Runs automated test suite via Vitest |
| `npm run test:watch` | Runs tests in interactive watch mode |
| `npm run test:coverage` | Generates test coverage report |
| `npm run typecheck` | Validates TypeScript types (`tsc --noEmit`) |
| `npm run lint` | Runs ESLint over codebase |
| `npm run format` | Auto-formats code with Prettier |

---

## 4. Architecture & Directory Layout

```
FitMate-AI/
├── src/
│   ├── config/                  # Validated environment configuration (env.ts via Zod)
│   ├── infrastructure/          # Centralized database & cache connection managers
│   │   ├── database.ts          # Mongoose connection lifecycle & replica set detection
│   │   └── redis.ts             # ioredis client with auto-reconnection & degraded fallback
│   ├── middleware/              # Reusable Express middleware
│   │   ├── correlationId.ts     # X-Correlation-ID injection & tracking
│   │   ├── error.middleware.ts  # Centralized error handler with production masking
│   │   ├── notFound.middleware.ts # 404 handler returning standard error envelope
│   │   └── securityHeaders.ts   # Helmet & CORS configuration
│   ├── modules/                 # Cohesive domain modules (Modular Monolith)
│   │   └── health/              # Liveness, readiness & dependency diagnostics
│   ├── shared/                  # Cross-cutting utilities & domain abstractions
│   │   ├── errors/              # AppError base class & ErrorCode dictionary
│   │   ├── logger/              # Structured Pino logger with PII & secret redaction
│   │   ├── types/               # Standard API envelopes & pagination interfaces
│   │   └── validation/          # Reusable Zod validation middleware (body, query, params)
│   ├── app.ts                   # Express app assembly & middleware pipeline
│   └── server.ts                # Bootstrap, database connections & graceful shutdown
├── tests/                       # Automated test suites
│   ├── integration/             # Endpoints & middleware integration tests (Supertest)
│   ├── unit/                    # Config, error & validation unit tests
│   └── setup.ts                 # Global Vitest configuration & environment setup
├── docs/                        # Canonical architecture & product documentation
├── docker-compose.yml           # Local MongoDB replica set & Redis configuration
├── package.json                 # Dependency manifests & developer scripts
├── tsconfig.json                # Strict TypeScript configuration
└── vitest.config.ts             # Vitest test runner configuration
```

---

## 5. Security Invariants
- **PII & Secrets Redaction**: Passwords, tokens, refresh tokens, and authentication cookies are automatically redacted (`[REDACTED]`) from application logs.
- **Payload Size Limits**: Request bodies are restricted to `100KB` to prevent denial-of-service memory exhaustion.
- **Graceful Shutdown**: Intercepts `SIGTERM` / `SIGINT` to safely drain active requests, close database connections, and disconnect Redis cleanly.

