---
name: product-thinking
description: Use this skill during product discovery, scoping, feature planning, user story definition, MVP prioritization, and acceptance criteria design for FitMate AI.
---

# Product Thinking Skill

## Skill Purpose
The `product-thinking` skill guides product discovery, feature scoping, persona modeling, and user story formulation for FitMate AI. It ensures that every capability built aligns with user fitness goals, adheres to strict health and privacy constraints, avoids scope bloat, and delivers measurable value in an MVP-first framework.

---

## When to Use This Skill
- Scoping new feature requests (e.g., onboarding flow, workout logging, meal tracking, AI coach interactions, progress analytics).
- Breaking down high-level user goals into structured user personas, user stories, and acceptance criteria.
- Prioritizing features for the MVP phase versus post-MVP enhancements (e.g., distinguishing basic workout logging from computer-vision pose analysis).
- Resolving ambiguous requirements and defining crisp edge cases before technical architecture or coding begins.
- Defining success metrics and feature boundaries.

---

## When NOT to Use This Skill
- Designing visual UI components, color palettes, or layout grids (delegate to `design-system` or `mobile-ui-ux`).
- Writing React Native or Expo screen implementations (delegate to `react-native-expo`).
- Designing backend REST endpoints or database schemas (delegate to `api-design` and `mongodb-data-modeling`).
- Performing code reviews or security vulnerability assessments (delegate to `code-review` and `app-security`).

---

## Required Context to Inspect Before Acting
Before executing product-thinking workflows, inspect:
1. `.agents/AGENTS.md` for persistent project invariants and non-negotiable boundaries.
2. Existing PRD documents, product briefs, or feature specs in the repository.
3. Relevant user personas, feedback logs, or requirement tickets.
4. Active skill descriptions to know which downstream skills will consume the deliverables.

---

## Step-by-Step Workflow

### Step 1: Goal Alignment & Persona Identification
Identify which FitMate AI user archetype is targeted:
- **Beginner / Weight Management**: Needs simple guidance, gentle habit-building, estimated calories, clear explanations without fitness jargon.
- **Hypertrophy / Muscle Gain**: Needs progressive overload tracking, set/rep/RPE logs, macro-focused nutrition (protein targets).
- **Body Recomposition / Fat Loss**: Needs calorie deficit management, consistent adherence tracking, weekly average trends over daily weight spikes.
- **General Fitness / Busy Professional**: Needs time-efficient workouts, minimal friction logging, flexible scheduling.
- **Custom / Undecided Goal**: Needs exploratory onboarding that recommends an initial baseline without locking the user into a rigid path.

### Step 2: Problem Definition & Value Proposition
- Formulate the exact problem statement: *Who is experiencing the problem, under what circumstances, and what is the friction?*
- Define the desired outcome and how it impacts retention, engagement, or health habit consistency.

### Step 3: MVP Scoping & MoSCoW Prioritization
Classify features into strict prioritization buckets:
- **Must Have (MVP Core)**: Essential for core user journeys (e.g., manual workout logging, daily estimated calorie/macro tracker, profile goal setup).
- **Should Have**: Important enhancements for usability (e.g., rest timer between sets, favorite meals, basic progress charts).
- **Could Have**: Valuable but non-blocking (e.g., barcode scanning, basic streak badges).
- **Won't Have (Post-MVP / Future)**: Explicitly deferred (e.g., camera-based gym equipment recognition, real-time pose estimation, social feeds).

### Step 4: User Story Formulation with Given-When-Then Acceptance Criteria
Draft testable user stories following the standard format:
```text
As a <user persona>,
I want to <perform an action>,
So that <achieve a specific fitness/nutrition outcome>.
```

Accompany each story with Gherkin-style acceptance criteria covering:
- Happy path.
- Boundary/edge cases (e.g., zero weights, network drop during workout, custom meal with unknown macros).
- Error path (e.g., invalid data, missing permissions).

### Step 5: Constraint & Compliance Review
Verify that the feature strictly honors:
- **Medical Disclaimer**: No diagnostic, medical, or clinical claims made by the system or AI coach.
- **Estimated Nutrition**: Nutrition numbers are explicitly communicated as estimates.
- **Data Minimization**: Only collect metrics needed for this specific feature.
- **Unit & Language Invariance**: Feature must work identically in Metric (kg/cm) and Imperial (lbs/in), as well as English (LTR) and Arabic (RTL).

---

## Project-Specific Standards
- **Tone & Voice**: Supportive, evidence-based, encouraging, non-judgmental.
- **No Single-User Bias**: Never assume a 70kg male eating 2,500 kcal; stories must support all body types, genders, age ranges, and dietary preferences (vegan, keto, halal, standard, etc.).
- **Consent Gates**: Any feature touching the camera, health sensors, or AI coach personalization must include a clear, revokable consent step in the user journey.

---

## Best Practices
- Keep user stories small, independent, and vertically sliceable.
- Explicitly document what is **out of scope** to prevent scope creep during engineering sprints.
- Validate feasibility with technical skills (`react-native-expo`, `backend-node-typescript`) before finalizing product commitments.

---

## Anti-Patterns and Mistakes to Avoid
- **Scope Creep**: Bundling complex machine learning or camera vision features into the initial workout logging MVP.
- **Vague Acceptance Criteria**: Using phrases like "The screen should look clean and fast" instead of "The workout summary must render within 200ms with total volume calculated."
- **Medical Prescription**: Specifying prescriptive medical advice (e.g., "The coach tells the user to take 500mg magnesium") rather than general nutritional guidance.
- **Rigid Goal Assumptions**: Forcing users to choose either extreme bodybuilder or strict runner, leaving general wellness seekers unsupported.

---

## Quality Checklist
- [ ] Is the primary user persona and fitness goal explicitly defined?
- [ ] Is the MVP boundary strictly defined with a "Won't Have (Deferred)" list?
- [ ] Are user stories accompanied by testable Given-When-Then criteria?
- [ ] Is the nutrition estimation disclaimer accounted for in the feature flow?
- [ ] Is the non-medical status of the AI coach preserved?
- [ ] Are Arabic RTL, English LTR, Metric, and Imperial considerations addressed?

---

## Expected Deliverables
- **Feature Brief / PRD Section**: Problem statement, target personas, user value, and success metrics.
- **User Story Catalog**: Formatted user stories with comprehensive Given-When-Then criteria.
- **MVP Scope Boundary Table**: Categorized Must/Should/Could/Won't breakdown.

---

## Rules for Asking Clarification Instead of Making Assumptions
- If the target user cohort, subscription tier, or regulatory boundary for a proposed feature is unspecified, stop and present clear options to the user before proceeding.
- If a feature requirement borders on medical advice (e.g., managing diabetes, rehabilitating acute injuries), pause immediately and ask the product owner for medical disclaimer parameters and escalation paths.

