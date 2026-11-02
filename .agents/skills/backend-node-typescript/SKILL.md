---
name: backend-node-typescript
description: Use this skill for backend architectural design, Node.js and Express development with TypeScript, Modular Monolith structure, layered services/controllers/repositories, and error handling.
---

# Backend Node.js & TypeScript Skill

## Skill Purpose
The `backend-node-typescript` skill directs the architecture, code organization, layered design (routes, controllers, services, repositories), error handling, and server lifecycle for the FitMate AI backend using Node.js, Express, and TypeScript within a clean Modular Monolith architecture.

---

## When to Use This Skill
- Structuring backend modules (e.g., `auth`, `users`, `workouts`, `nutrition`, `coach`, `progress`).
- Implementing Express routing, controller request-handling, domain business services, and database repositories.
- Setting up centralized error handling, custom `AppError` hierarchies, and logging pipelines.
- Configuring middleware pipelines (authentication, CORS, security headers, rate limiting, request validation).
- Managing typed environment configurations and server bootstrap/graceful shutdown lifecycles.

---

## When NOT to Use This Skill
- Writing React Native or Expo mobile components (delegate to `react-native-expo`).
- Designing client-side UI/UX flows or state wireframes (delegate to `mobile-ui-ux`).
- Fine-tuning MongoDB indexes, compound query operators, or schema definitions (delegate to `mongodb-data-modeling`).
- Designing external REST URL structures and public HTTP contracts (delegate to `api-design`).

---

## Required Context to Inspect Before Acting
Before executing backend architecture workflows, inspect:
1. REST API endpoint contracts and specifications from `api-design`.
2. Mongoose schema definitions and data relationships from `mongodb-data-modeling`.
3. Security constraints, authentication protocols, and input validation requirements from `app-security`.
4. Existing backend configuration (`tsconfig.json`, `package.json`, environment files).

---

## Step-by-Step Workflow

### Step 1: Modular Monolith Module Boundaries
Organize the backend into cohesive, loosely-coupled domain modules under `src/modules/`:
```text
src/
├── config/             # Typed environment & configuration
├── middleware/         # Global middleware (auth, error, rate-limit, logging)
├── modules/
│   ├── auth/           # Login, register, token refresh, password reset
│   ├── users/          # Profile, fitness goals, unit preferences, consent
│   ├── workouts/       # Routines, exercises, active session logs, history
│   ├── nutrition/      # Meal logging, food items, macro calculators
│   ├── coach/          # AI coach prompt orchestration & chat history
│   └── progress/       # Body weight, measurement logs, progress trends
├── shared/             # Shared utilities, AppError class, logger, common types
├── app.ts              # Express application setup (middleware, routes)
└── server.ts           # Server bootstrap, DB connection, graceful shutdown
```

### Step 2: Layered Module Architecture
Each module enforces strict separation of concerns:
1. **Routes (`*.routes.ts`)**: Pure route definitions binding HTTP endpoints to middleware and controllers.
2. **Controllers (`*.controller.ts`)**: HTTP boundary layer. Extracts and validates request inputs (`params`, `query`, `body`), invokes service methods, and sends standard HTTP responses. Contains **no** business or database logic.
3. **Services (`*.service.ts`)**: Pure domain business logic. Calculates nutritional summaries, computes progressive overload metrics, enforces business rules, coordinates repositories. Independent of HTTP concepts (`req`, `res`).
4. **Repositories (`*.repository.ts`)**: Data access layer interfacing directly with Mongoose models. Encapsulates queries, projections, updates, and aggregation pipelines.

### Step 3: Centralized Error Handling & Operational Errors
- Define a structured `AppError` class:
  ```typescript
  export class AppError extends Error {
    constructor(
      public readonly message: string,
      public readonly statusCode: number = 500,
      public readonly errorCode: string = 'INTERNAL_ERROR',
      public readonly isOperational: boolean = true,
      public readonly details?: unknown
    ) {
      super(message);
      Object.setPrototypeOf(this, new.target.prototype);
      Error.captureStackTrace(this, this.constructor);
    }
  }
  ```
- Catch operational errors (e.g., `404 Not Found`, `400 Bad Request`, `403 Forbidden`) and format them uniformly.
- Catch unexpected programmer errors (`500`), log full stack traces internally, and return sanitized error messages in production.

### Step 4: Robust Middleware Pipeline
Assemble the Express pipeline in `app.ts` in order:
1. Security headers (`helmet()`).
2. CORS configuration with explicit origin whitelisting.
3. JSON body parser with size limits (`express.json({ limit: '1mb' })`).
4. Request correlation ID middleware (for distributed tracing/logging).
5. Rate limiting on sensitive routes.
6. Domain module route mounting under `/api/v1/`.
7. 404 Fallback handler for unmapped routes.
8. Centralized error handling middleware `(err, req, res, next)`.

### Step 5: Type-Safe Configuration & Environment Validation
- Validate all environment variables at startup using a Zod or Envalid schema:
  ```typescript
  export const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.coerce.number().default(5000),
    MONGODB_URI: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
  });
  ```
- Prevent application bootstrap if any required environment variable is invalid or missing.

### Step 6: Server Lifecycle & Graceful Shutdown
- Listen for termination signals (`SIGTERM`, `SIGINT`).
- Stop accepting new HTTP requests, drain in-flight connections, close Mongoose database connections cleanly, and exit with code 0.

---

## Project-Specific Standards
- **Strict Separation**: Services must never access Express `req` or `res` objects directly. Controllers must never invoke Mongoose queries directly.
- **Async Handling**: Wrap all async controller functions or use `express-async-errors` to ensure rejections are routed to the central error middleware.
- **Nutrition & Coach Disclaimer Enforcement**: Ensure responses containing nutritional estimates or AI guidance inject appropriate metadata flags (`isEstimated: true`, `isMedicalAdvice: false`).

---

## Best Practices
- Keep module directories self-contained; cross-module dependencies should occur via service interfaces, not direct internal repository imports.
- Use structured JSON logging (e.g., Pino or Winston) with request IDs.
- Keep controllers thin (typically < 30 lines per handler).

---

## Anti-Patterns and Mistakes to Avoid
- **God Controllers**: Writing database queries, validation, third-party calls, and response formatting inside a single Express handler.
- **Circular Module Dependencies**: Having `nutrition` directly import `workouts` and `workouts` directly import `nutrition`.
- **Silent Failures**: Catching errors with empty `catch {}` blocks or failing to call `next(err)`.
- **Hard-Coded Environment Fallbacks**: Defaulting production secrets or database URIs to insecure local fallbacks.

---

## Quality Checklist
- [ ] Is the Modular Monolith structure preserved with clean module boundaries?
- [ ] Are controllers strictly separated from services and repositories?
- [ ] Are all environment variables validated at boot with a strict schema?
- [ ] Does `AppError` distinguish operational errors from programmer bugs?
- [ ] Are async errors safely captured and forwarded to the central error middleware?
- [ ] Is graceful shutdown implemented for SIGTERM/SIGINT?

---

## Expected Deliverables
- **Module Architecture Blueprints**: Folder structure, dependency diagrams, and interface definitions.
- **Layered Code Patterns**: Canonical Controller, Service, and Repository templates.
- **Middleware Specifications**: Error handling, authentication guard, and validation pipelines.
- **Configuration & Bootstrap Schemas**: Typed environment validation and server lifecycle hooks.

---

## Rules for Asking Clarification Instead of Making Assumptions
- If the boundary between two domains is unclear (e.g., whether workout recovery metrics belong to `workouts` or `progress`), ask the lead architect before creating overlapping module files.
- Ask for confirmation before introducing new third-party backend packages or background job queues.

