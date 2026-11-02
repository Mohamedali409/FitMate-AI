---
name: code-review
description: Use this skill for systematic code reviews, pull request evaluations, identifying bugs, security vulnerabilities, performance regressions, and architectural inconsistencies.
---

# Code Review Skill

## Skill Purpose
The `code-review` skill conducts structured, objective, and multi-dimensional code reviews for FitMate AI codebases. It audits pull requests and file modifications for correctness, security, data privacy, performance, architectural consistency, error handling, and test completeness, providing categorized findings with actionable code diffs.

---

## When to Use This Skill
- Reviewing newly written or refactored code before merging to main branches.
- Auditing pull requests for compliance with FitMate AI architectural and privacy invariants.
- Evaluating code changes for potential performance bottlenecks, memory leaks, or unindexed database queries.
- Verifying that proper error handling, logging, and test coverage accompany every feature modification.

---

## When NOT to Use This Skill
- Writing initial feature implementations or scaffolding boilerplate (delegate to `backend-node-typescript` or `react-native-expo`).
- Creating raw UI design tokens or design systems (delegate to `design-system`).
- Formulating initial product requirements or user stories (delegate to `product-thinking`).
- Running or authoring full test suites (delegate to `testing-quality`).

---

## Required Context to Inspect Before Acting
Before executing a code review, inspect:
1. `.agents/AGENTS.md` for non-negotiable project invariants and safety boundaries.
2. The Git diff or modified file contents, plus surrounding context files.
3. The pull request description or user prompt stating the intended change.
4. Active test suites and automated linter/typecheck results.

---

## Step-by-Step Workflow

### Step 1: Scope & Intent Understanding
- Read the feature specification, issue description, or PR summary.
- Map the list of changed files and determine the primary domains impacted (e.g., `workouts`, `nutrition`, `auth`, `ui`).

### Step 2: Automated Quality Gate Verification
- Confirm that TypeScript type-checking (`tsc --noEmit`) passes with zero errors.
- Confirm that linting passes without disabled rules.
- Confirm that automated test suites have executed and passed.

### Step 3: Multi-Dimensional Code Inspection
Examine the diff across six primary dimensions:

1. **Correctness & Logic**:
   - Does the implementation satisfy all acceptance criteria?
   - Are edge cases (null/undefined values, empty arrays, zero divisors) safely handled?
   - Are mathematical formulas (calories, 1RM, volume) accurate and unit-resilient?
2. **Security & Privacy**:
   - Are there any hardcoded credentials, API keys, or secrets?
   - Is object-level authorization (IDOR / BOLA) enforced on every user endpoint?
   - Is user input sanitized against NoSQL injection, XSS, and AI prompt injection?
   - Are sensitive tokens stored only in `expo-secure-store`?
   - Is explicit user consent validated before camera or health data access?
3. **Architecture & Modular Boundaries**:
   - Does the backend code respect the Modular Monolith pattern (Controllers -> Services -> Repositories)?
   - Are there circular dependencies or cross-module leaks?
   - Does frontend code separate presentational UI from data fetching hooks?
4. **Performance & Scalability**:
   - Are MongoDB queries indexed? Are there any collection scans?
   - Are mobile lists virtualized (FlashList/FlatList)?
   - Are re-renders minimized in React Native workout and nutrition tracking screens?
   - Are timers and event subscriptions cleaned up properly?
5. **Internationalization & Accessibility**:
   - Are layout margins and alignments compatible with Arabic (RTL) and English (LTR)?
   - Are touch targets at least 48 x 48 dp for gym ergonomics?
   - Are accessibility labels present on interactive elements?
6. **Error Handling & Observability**:
   - Are operational errors distinguished using `AppError`?
   - Are promises and async rejections safely caught?
   - Are nutrition estimates flagged with `isEstimated: true`?
   - Is the AI coach presented with appropriate non-medical disclaimers?

### Step 4: Findings Synthesis & Severity Categorization
Tag each review finding with an unambiguous severity level:
- 🔴 **Critical (Blocker)**: Severe security vulnerability, data loss risk, hard-coded secret, unhandled fatal crash, or violation of core medical/privacy invariants. Must be resolved before merge.
- 🟠 **Major (Must Fix)**: Logic error, missing authorization check, unindexed high-frequency query, broken state transition, or lack of unit tests for complex logic.
- 🟡 **Minor (Should Fix)**: Code smell, missing TypeScript typing, suboptimal component decomposition, or unclear naming.
- 💡 **Suggestion / Nit (Optional)**: Minor stylistic polish, micro-optimization, or non-blocking documentation improvement.

### Step 5: Actionable Feedback Delivery
Provide concrete code diffs or replacement snippets for every identified issue:
```markdown
### 🟠 Major: Missing Object-Level Authorization Check
**File**: `src/modules/workouts/workout.service.ts#L42-L46`

**Problem**: The workout session is fetched by `id` without verifying that it belongs to the requesting user, introducing a BOLA/IDOR vulnerability.

**Recommended Fix**:
```diff
- const session = await workoutRepository.findById(workoutId);
+ const session = await workoutRepository.findOne({ _id: workoutId, userId });
+ if (!session) {
+   throw new AppError('Workout not found or access denied', 404, 'NOT_FOUND');
+ }
```
```

---

## Project-Specific Standards
- **Enforce FitMate AI Core Invariants**: Flag any code presenting the AI coach as a doctor, omitting the `isEstimated: true` flag on nutrition calculations, or hard-coding individual user metrics.
- **Verify Test Evidence**: Reject reviews that claim tests passed without showing actual test command execution logs.
- **Constructive Tone**: Keep critiques objective, respectful, and focused on code quality and user safety.

---

## Best Practices
- Praise exceptionally clean patterns, modular solutions, and thorough test cases.
- Group review comments logically by file and component rather than scattering them randomly.
- Conclude with a clear verdict: **Approve**, **Request Changes**, or **Comment**.

---

## Anti-Patterns and Mistakes to Avoid
- **Vague Hand-Waving**: Writing "This looks messy" without explaining what is wrong and how to fix it.
- **Linter Bikeshedding**: Spending review time arguing about formatting issues that automated formatters (Prettier) should enforce.
- **Rubber-Stamping**: Approving pull requests without checking database indexing, security implications, or edge cases.
- **Ignoring FitMate Invariants**: Overlooking missing nutrition estimation disclaimers or missing RTL accommodations.

---

## Quality Checklist
- [ ] Are all findings prioritized using standard severity badges (🔴, 🟠, 🟡, 💡)?
- [ ] Are concrete code diffs or snippets provided for fixes?
- [ ] Were security, privacy, and IDOR vulnerabilities thoroughly evaluated?
- [ ] Were FitMate AI core invariants (medical disclaimer, nutrition estimate, consent) verified?
- [ ] Was test coverage and test execution confirmed?
- [ ] Is a clear final verdict (Approve / Request Changes) issued?

---

## Expected Deliverables
- **Structured Code Review Report**: Summary, categorized findings table, and final verdict.
- **Actionable Remediation Diffs**: Line-by-line before/after code corrections.
- **Verification Plan**: Steps required to re-validate after changes are applied.

---

## Rules for Asking Clarification Instead of Making Assumptions
- If an unfamiliar architectural pattern or deliberate workaround is found in the diff, ask the author for their rationale before labeling it a defect.
- If the business logic for an edge case is unclear from the PR description, clarify intended behavior before requesting modifications.

