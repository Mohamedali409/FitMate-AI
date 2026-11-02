---
name: testing-quality
description: Use this skill for defining testing strategies, writing unit/integration/E2E test suites, configuring test runners (Vitest/Jest, Supertest), test fixtures, and quality gates.
---

# Testing & Quality Assurance Skill

## Skill Purpose
The `testing-quality` skill governs test engineering, automated test suites (unit, integration, API, and component), mock data generation, and verification pipelines for FitMate AI. It guarantees that calculations, business logic, security guards, and mobile interactions function flawlessly across platforms.

---

## When to Use This Skill
- Formulating test strategies, test plans, and coverage goals for new features.
- Writing unit tests for critical fitness and nutrition business logic (calorie estimation, BMR/TDEE calculations, 1RM formulas, volume aggregators, unit converters).
- Writing API integration tests using Vitest/Jest and Supertest against ephemeral database instances (`mongodb-memory-server`).
- Writing component and hook tests for React Native with `@testing-library/react-native`.
- Creating deterministic test data factories and mock fixtures.
- Executing test suites and analyzing test output to verify bug fixes and regression protection.

---

## When NOT to Use This Skill
- Performing manual visual design audits (delegate to `mobile-ui-ux` or `design-system`).
- Writing production backend business code from scratch (delegate to `backend-node-typescript`).
- Conducting high-level peer reviews of general PR code style (delegate to `code-review`).
- Defining business user stories or acceptance criteria (delegate to `product-thinking`).

---

## Required Context to Inspect Before Acting
Before executing testing workflows, inspect:
1. Product acceptance criteria (Given-When-Then criteria) from `product-thinking`.
2. Existing test configuration files (`vitest.config.ts`, `jest.config.js`).
3. Existing test utilities, factories, and mocks in `test/` or `__tests__/`.
4. Domain models and validation schemas from `mongodb-data-modeling` and `api-design`.

---

## Step-by-Step Workflow

### Step 1: Test Strategy & Pyramid Allocation
Allocate testing effort according to the testing pyramid:
- **Unit Tests (70%)**: Pure mathematical algorithms (calorie formulas, macro calculations, 1RM estimations, volume accumulation, unit conversion utilities). Fast, isolated, zero I/O.
- **Integration & API Tests (20%)**: Express route controllers, services, repositories, and Mongoose database interactions tested end-to-end via Supertest and an in-memory MongoDB runner.
- **Mobile Component / Hook Tests (10%)**: Key React Native UI interactions (workout logger set increment, meal submission, form error rendering) using React Native Testing Library.

### Step 2: Domain Logic Unit Testing
Test domain algorithms thoroughly against boundary values:
- **Calorie & Macro Calculations**: Test zero values, upper boundary limits, fractional grams, and unknown food items.
- **Volume & 1RM Algorithms**: Test edge cases such as bodyweight-only exercises (weight = 0), high-rep sets (reps > 30), and partial sets.
- **Unit Conversions**: Ensure round-trip conversions between Metric (kg/cm) and Imperial (lbs/in) do not accumulate precision drift.

### Step 3: API Integration Testing with Supertest
Structure API tests around clean database states:
```typescript
import request from 'supertest';
import app from '../src/app';
import { clearDatabase, generateAuthToken } from './helpers';

describe('POST /api/v1/workouts', () => {
  let authToken: string;

  beforeEach(async () => {
    await clearDatabase();
    authToken = await generateAuthToken({ userId: 'u_test_123' });
  });

  it('should create a new workout session and return 201 with data envelope', async () => {
    const payload = {
      name: 'Leg Day Push',
      startedAt: new Date().toISOString(),
      sets: [{ setNumber: 1, weightKg: 100, reps: 5, isCompleted: true }],
    };

    const res = await request(app)
      .post('/api/v1/workouts')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Leg Day Push');
    expect(res.body.data.sets).toHaveLength(1);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const res = await request(app).post('/api/v1/workouts').send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
```

### Step 4: Mobile Component & Hook Testing
- Use `@testing-library/react-native` to test user behavior rather than implementation details:
  - Render components wrapped in necessary providers (QueryClientProvider, ThemeProvider, NavigationContainer).
  - Simulate user events with `fireEvent.press` or `userEvent`.
  - Assert that expected UI text, error banners, or callbacks fire.
- Test RTL rendering behavior: Verify that components render correctly when `I18nManager.isRTL` is active.

### Step 5: Test Execution & Real Output Verification
- **Cardinal Rule**: Execute the test runner via the terminal tool and inspect the actual command output.
- **Never claim tests pass without real execution**: If a test suite fails, report the exact failure message and stack trace, diagnose the root cause, and fix it.

---

## Project-Specific Standards
- **Nutrition Estimate Assertions**: In all API tests verifying nutritional endpoints, assert that `isEstimated: true` is present in the response envelope.
- **No Mocking of the Subject Under Test**: Mock only external boundaries (e.g., third-party AI LLM endpoints, external email/push services). Never mock the service or controller under test.
- **Fixture Factories**: Use factory functions (e.g., `buildWorkout()`, `buildMeal()`) with sensible defaults rather than duplicating hard-coded mock payloads across test files.

---

## Best Practices
- Structure every test with the **Arrange, Act, Assert (AAA)** pattern.
- Ensure all tests are deterministic: mock system clocks (`vi.useFakeTimers()`) when testing time-dependent features like workout rest timers.
- Clean database collections between integration tests to avoid state leakage.

---

## Anti-Patterns and Mistakes to Avoid
- **Fabricating Test Runs**: Claiming "all 14 tests passed" without executing the test command.
- **Testing Implementation Details**: Asserting internal component state variables rather than what the user sees on screen.
- **Flaky Tests**: Writing tests that rely on external live network APIs or unmocked real clocks.
- **Shared Mutable State**: Modifying a shared global mock object across concurrent test cases.

---

## Quality Checklist
- [ ] Are unit tests written for all mathematical calculators and conversion utilities?
- [ ] Are happy paths, edge cases, and failure scenarios covered for API endpoints?
- [ ] Are test data fixtures isolated, deterministic, and self-cleaning?
- [ ] Are external services (AI API, push notifications) mocked at the network boundary?
- [ ] Was the test runner actually executed with logs inspected before marking the task complete?
- [ ] Are nutrition estimation flags and disclaimer outputs verified in test assertions?

---

## Expected Deliverables
- **Test Strategy Documents**: Coverage targets, test matrix, and scope breakdown.
- **Automated Test Suites**: Unit, integration, and component test files (`*.test.ts`, `*.spec.tsx`).
- **Fixture & Mock Factories**: Deterministic test helper libraries.
- **Verified Execution Logs**: Actual CLI terminal output proving test results.

---

## Rules for Asking Clarification Instead of Making Assumptions
- If the mathematical formula variant for a metric (e.g., Mifflin-St Jeor vs. Katch-McArdle for BMR) is not specified in the PRD, ask the product owner for the exact formula before writing test assertions.
- If an existing test fails after a requirement change, ask whether the requirement change was intentional before rewriting the test assertion.

