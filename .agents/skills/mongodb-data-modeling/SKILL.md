---
name: mongodb-data-modeling
description: Use this skill for MongoDB schema design with Mongoose, data relationship strategy (embedding vs referencing), index optimization, query performance, and data evolution.
---

# MongoDB & Data Modeling Skill

## Skill Purpose
The `mongodb-data-modeling` skill guides the schema architecture, relationship strategies (embedding vs. referencing), index optimization (ESR rule), data integrity enforcement, and schema evolution for FitMate AI using MongoDB and Mongoose. It ensures robust query performance, bounded document sizes, and strict user data privacy.

---

## When to Use This Skill
- Designing or modifying Mongoose schemas (`User`, `WorkoutPlan`, `WorkoutSession`, `Exercise`, `NutritionLog`, `FoodItem`, `CoachConversation`).
- Deciding whether to embed subdocuments (e.g., workout sets inside an active session) or create separate referenced collections (e.g., historical workout sessions belonging to a user).
- Creating compound indexes to optimize high-frequency mobile queries (e.g., fetching a user's workout history sorted by date).
- Planning data migration scripts and schema versioning strategies.
- Enforcing schema-level validations, defaults, and sanitization hooks.

---

## When NOT to Use This Skill
- Writing Express routes, middleware, or HTTP controllers (delegate to `backend-node-typescript`).
- Designing public REST API envelopes or status codes (delegate to `api-design`).
- Managing client-side local caching or TanStack Query state (delegate to `react-native-expo`).
- Implementing raw password hashing algorithms or token generation (delegate to `app-security`).

---

## Required Context to Inspect Before Acting
Before executing data modeling workflows, inspect:
1. Product domain models and user stories from `product-thinking`.
2. REST API contract requirements from `api-design`.
3. Application read-to-write ratios and anticipated query patterns.
4. Security and privacy constraints (PII handling, data minimization) from `app-security`.

---

## Step-by-Step Workflow

### Step 1: Query Access Pattern Analysis
Analyze how data will be queried by the FitMate AI mobile client before designing schemas:
- *What data is read together on the primary dashboard?* (e.g., Today's workout + today's calories consumed).
- *What data is written in high frequency?* (e.g., Logging workout sets during an active session).
- *What data is static and globally shared?* (e.g., Standard exercise library with movement instructions).

### Step 2: Embedding vs. Referencing Decision Matrix
Follow MongoDB architectural guidelines:
- **Embed Subdocuments when**:
  - Data is 1-to-few and bounded (e.g., `sets` inside a single `WorkoutSession` [typically 10-30 sets], macro breakdown within a `FoodItem`).
  - Child data is always queried, displayed, and updated together with the parent document.
  - The embedded array has a strict upper limit that will never approach the 16MB BSON cap.
- **Reference Separate Collections (`ObjectId`) when**:
  - Data is 1-to-many and unbounded (e.g., a user having hundreds of historical `WorkoutSession` documents over years).
  - Entities are shared across multiple users or routines (e.g., `Exercise` catalog).
  - Standalone queries and pagination are required (e.g., paginating meal logs over a 6-month period).

### Step 3: Mongoose Schema Design Standards
Structure every Mongoose schema with:
1. **Strict Typing**: Explicit types, required fields, and validation boundaries.
2. **Timestamps**: `{ timestamps: true }` enabled on all persistent collections.
3. **JSON Transforms**: Strip internal fields (`__v`) and map `_id` to `id`.
```typescript
import { Schema, model, Document, Types } from 'mongoose';

export interface IWorkoutSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number; // Rate of Perceived Exertion (1-10)
  isCompleted: boolean;
  completedAt?: Date;
}

export interface IWorkoutSession extends Document {
  userId: Types.ObjectId;
  workoutPlanId?: Types.ObjectId;
  name: string;
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;
  sets: IWorkoutSet[];
  notes?: string;
  schemaVersion: number;
}
```

### Step 4: Index Strategy & The ESR Rule
Design compound indexes following the **Equality, Sort, Range (ESR)** rule:
1. **Equality fields first**: Fields matched by exact value (e.g., `userId: 1`).
2. **Sort fields second**: Fields used in `.sort()` operations (e.g., `startedAt: -1`).
3. **Range fields last**: Fields filtered with `$gte`, `$lte`, or `$in` (e.g., `durationSeconds`).

*Example*: To efficiently query a user's recent workout sessions:
```typescript
WorkoutSessionSchema.index({ userId: 1, startedAt: -1 });
```

*Nutrition Log Query*:
```typescript
NutritionLogSchema.index({ userId: 1, date: -1 });
```

### Step 5: Data Evolution & Migration Strategy
- Include a `schemaVersion: { type: Number, default: 1 }` field on root documents.
- When changing schema structures (e.g., moving from a flat weight field to a unit-aware subdocument), write backward-compatible read hooks or a dedicated migration script.

---

## Project-Specific Standards
- **Flexible Profiles**: Support customizable user profile metrics without rigid assumptions. Store unit preferences (`metric` vs. `imperial`) explicitly in `UserSettings`.
- **Nutritional Integrity**: Nutrition schemas must preserve the `isEstimated: Boolean` flag on calculated food/meal entries.
- **Immutability of Historical Logs**: Once a workout session or daily meal log is marked as completed/closed, treat historical data as immutable snapshots to prevent retroactive metric skew.

---

## Best Practices
- Never use `$lookup` joins as a substitute for proper document design; denormalize frequently-read static data (e.g., snapshotting `exerciseName` inside a workout set).
- Always specify indexes explicitly in Mongoose schemas rather than creating ad-hoc indexes in production.
- Use Mongoose lean queries (`.lean().exec()`) for read-only endpoints to bypass hydration overhead.

---

## Anti-Patterns and Mistakes to Avoid
- **Unbounded Arrays (The 16MB Bomb)**: Storing all completed workouts or meals inside an array in the `User` document.
- **Relational Over-Normalization**: Creating separate collections for `Set`, `Rep`, `MealItem`, and `Nutrient`, requiring 5 joins per screen query.
- **Missing Indexes on Foreign Keys**: Forgetting to index `{ userId: 1 }` on collections queried per user, triggering catastrophic full collection scans.
- **Dynamic Field Names as Keys**: Using dates or user IDs as JSON object keys (e.g., `{ "2026-11-01": { calories: 2000 } }`) which prevents indexing.

---

## Quality Checklist
- [ ] Are unbounded relationships modeled using references rather than embedded arrays?
- [ ] Are compound indexes constructed in accordance with the ESR rule?
- [ ] Does every root schema include `{ timestamps: true }` and `schemaVersion`?
- [ ] Are Mongoose schemas strictly typed without `Schema.Types.Mixed` where avoidable?
- [ ] Is `isEstimated: true` supported in nutrition document models?
- [ ] Are foreign keys (`userId`, `exerciseId`) properly indexed?

---

## Expected Deliverables
- **Mongoose Schema & Interface Files**: Complete TypeScript interfaces and Mongoose schema definitions.
- **Index Specification**: Detailed index rationale, compound keys, and performance justifications.
- **Data Entity-Relationship Diagrams**: Visual or markdown maps of embedded vs. referenced collections.

---

## Rules for Asking Clarification Instead of Making Assumptions
- If the expected data retention policy (e.g., retaining granular set logs for 1 year vs. indefinitely) is unspecified, confirm with the project owner before designing schema archival rules.
- Clarify whether user profile updates should retroactively recompute past workout statistics or preserve historic snapshot values.

