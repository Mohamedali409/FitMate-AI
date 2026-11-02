---
name: api-design
description: Use this skill for RESTful API endpoint design, URL resource naming, request/response contracts, Zod/OpenAPI schemas, status codes, pagination, and error contract standardization.
---

# REST API Design Skill

## Skill Purpose
The `api-design` skill governs the architectural design, specification, and contract definitions for all FitMate AI RESTful APIs. It ensures consistent URL naming, predictable request/response envelopes, robust validation schemas, standardized pagination and filtering, and comprehensive OpenAPI documentation across client and backend boundaries.

---

## When to Use This Skill
- Designing new API resources and endpoints (e.g., `/api/v1/workouts`, `/api/v1/nutrition/meals`, `/api/v1/coach/chat`).
- Specifying JSON request payloads, query parameters, and response Data Transfer Objects (DTOs).
- Defining standardized pagination, sorting, and filtering query parameters for collections.
- Crafting machine-readable error response envelopes and domain error code taxonomies.
- Drafting or updating OpenAPI 3.0/3.1 contract specifications.
- Defining contract schemas for mobile-backend synchronization.

---

## When NOT to Use This Skill
- Implementing concrete Mongoose database queries (delegate to `mongodb-data-modeling`).
- Implementing Express controller/service code (delegate to `backend-node-typescript`).
- Writing frontend TanStack Query hooks or UI forms (delegate to `react-native-expo`).
- Formulating high-level product feature priorities (delegate to `product-thinking`).

---

## Required Context to Inspect Before Acting
Before executing API design workflows, inspect:
1. Product feature stories and acceptance criteria from `product-thinking`.
2. Mobile client consumption requirements and state needs from `mobile-ui-ux` and `react-native-expo`.
3. Database entities and index performance considerations from `mongodb-data-modeling`.
4. Authentication, authorization, and rate limit rules from `app-security`.

---

## Step-by-Step Workflow

### Step 1: Resource Identification & URL Naming Conventions
- Always use plural nouns for collections: `/api/v1/workouts`, `/api/v1/meals`, `/api/v1/users`.
- Use kebab-case for multi-word paths: `/api/v1/workout-sessions`, `/api/v1/exercise-library`.
- Express sub-resources hierarchically:
  - `GET /api/v1/workouts/:workoutId/sets`
  - `POST /api/v1/workouts/:workoutId/sets`
- Avoid verbs in URLs; express actions via standard HTTP verbs:
  - `GET`: Retrieve resource(s) (idempotent, safe).
  - `POST`: Create new resource or initiate non-idempotent action.
  - `PUT`: Completely replace existing resource (idempotent).
  - `PATCH`: Partially update existing resource.
  - `DELETE`: Remove resource (idempotent).

### Step 2: Standardized Response Envelope Contracts
All endpoints return a uniform JSON envelope to simplify mobile client parsing:

**Success Response (Single Resource)**:
```json
{
  "success": true,
  "data": {
    "id": "w_12345",
    "name": "Upper Body Hypertrophy",
    "totalVolumeKg": 4250,
    "createdAt": "2026-11-01T14:30:00Z"
  }
}
```

**Success Response (Paginated Collection)**:
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 85,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid input parameters",
    "details": [
      { "field": "calories", "message": "Calories must be a non-negative number" }
    ]
  }
}
```

### Step 3: Domain-Specific Contracts for FitMate AI
- **Estimated Nutrition Metadata**: Any response containing nutritional calculation or food breakdown must include an estimation indicator:
  ```json
  "nutrition": {
    "calories": 620,
    "proteinGrams": 45,
    "carbsGrams": 65,
    "fatGrams": 18,
    "isEstimated": true,
    "disclaimer": "Nutritional values are calculated estimates and should not be used as medical advice."
  }
  ```
- **Unit Preferences**: Endpoints must support specifying the requested unit system via query parameter or header (e.g., `?units=metric` or `?units=imperial`), returning normalized values with explicit unit indicators (`weightUnit: 'kg' | 'lbs'`).

### Step 4: Pagination, Sorting, and Filtering Standards
- Standard pagination parameters:
  - `page`: Integer >= 1 (default: 1).
  - `limit`: Integer between 1 and 100 (default: 20).
- Standard sorting:
  - `sortBy`: Field name (e.g., `createdAt`, `loggedAt`, `calories`).
  - `sortOrder`: `asc` | `desc` (default: `desc`).
- Standard filtering:
  - Clear query parameters (e.g., `?from=2026-11-01&to=2026-11-07&category=strength`).

### Step 5: HTTP Status Code Standardization
- `200 OK`: Successful retrieval or update.
- `201 Created`: Successful resource creation (accompanied by `Location` header where applicable).
- `204 No Content`: Successful deletion with empty response body.
- `400 Bad Request`: Malformed syntax or schema validation failure.
- `401 Unauthorized`: Missing or expired authentication token.
- `403 Forbidden`: Authenticated user lacks permission to access target resource (e.g., viewing another user's workout).
- `404 Not Found`: Resource URI does not exist.
- `409 Conflict`: Resource collision (e.g., duplicate email address).
- `422 Unprocessable Entity`: Syntactically valid request that violates domain business rules.
- `429 Too Many Requests`: Rate limit exceeded (accompanied by `Retry-After` header).
- `500 Internal Server Error`: Unhandled server exception.

---

## Project-Specific Standards
- **Case Conventions**: JSON bodies and query parameters use `camelCase`. URL path segments use `kebab-case`.
- **API Versioning**: Prefix all endpoints with `/api/v1/`. Breaking changes require a new version path (`/api/v2/`).
- **No Direct Entity Exposure**: Never expose internal MongoDB metadata like `__v` or password hashes in response DTOs. Transform `_id` to string `id`.

---

## Best Practices
- Every endpoint contract must be defined with a matching Zod schema for request validation.
- Maintain idempotent behavior for `PUT` and `DELETE` requests.
- Keep error codes stable, machine-readable, and documented in an enum (e.g., `WORKOUT_NOT_FOUND`, `EXERCISE_IN_USE`, `RATE_LIMIT_EXCEEDED`).

---

## Anti-Patterns and Mistakes to Avoid
- **Tunneling Actions via POST**: Creating endpoints like `POST /api/v1/getWorkouts` or `POST /api/v1/deleteMeal`.
- **Status 200 with In-Body Errors**: Returning HTTP 200 with `{ "status": "error", "message": "Failed" }`.
- **Unbounded Collections**: Omitting pagination limits, allowing mobile clients to request 10,000 workout logs at once.
- **Inconsistent Keys**: Mixing `snake_case` and `camelCase` across different module endpoints.

---

## Quality Checklist
- [ ] Are URLs formatted with plural kebab-case nouns without action verbs?
- [ ] Does the response follow the standardized `{ success, data, meta }` or `{ success: false, error }` envelope?
- [ ] Is `isEstimated: true` included in all nutrition response payloads?
- [ ] Are pagination parameters (`page`, `limit`) bounded and standardized?
- [ ] Are HTTP status codes strictly aligned with REST conventions?
- [ ] Are sensitive internal database fields stripped from output DTOs?

---

## Expected Deliverables
- **API Endpoint Specifications**: Detailed HTTP method, URL, headers, and request/response examples.
- **OpenAPI / Zod Contract Schemas**: Machine-readable schemas for payloads and DTOs.
- **Error Code Catalog**: Exhaustive list of domain error codes and corresponding HTTP statuses.

---

## Rules for Asking Clarification Instead of Making Assumptions
- If a client requirement could be served by either nested resources (`/users/:id/workouts`) or flat top-level resources (`/workouts?userId=:id`), confirm with the backend team before publishing the contract.
- If proposing a breaking change to an existing API payload contract, require explicit confirmation before finalizing the specification.

