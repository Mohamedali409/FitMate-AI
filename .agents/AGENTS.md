# FitMate AI — Persistent Agent Guidelines

These rules apply universally to all agentic workflows, code modifications, and interactions within the FitMate AI repository.

## 1. Core Operating Principles

- **Do Not Invent Requirements**: Build strictly against confirmed user specifications, verified user stories, and approved product requirements. When a requirement is ambiguous or unspecified, ask for clarification instead of guessing.
- **Inspect Before Modifying**: Always read and analyze existing files, configurations, schemas, and tests before making edits or proposing architectural changes.
- **Explain Significant Decisions**: Provide clear rationale, trade-offs, and alternatives before proposing structural, architectural, or pattern shifts.
- **Prefer Small, Reviewable Changes**: Make atomic, focused edits that are easy to review, test, and revert if necessary. Avoid massive multi-concern refactors in a single step.
- **Never Expose Secrets**: Never hard-code or commit API keys, database credentials, authentication secrets, tokens, or private certificates. Use environment variables and verify `.gitignore` protections.
- **No Dependency Changes Without Explicit Approval**: Never install, upgrade, or remove npm packages or third-party dependencies without explaining why they are needed, evaluating lightweight alternatives, and obtaining explicit user confirmation.
- **Run Relevant Tests After Changes**: Execute relevant test suites after making code changes. Verify that tests run successfully and report actual command outputs.
- **Never Claim Tests Passed Without Execution**: Never fabricate, assume, or report test passage without running the test command and inspecting its actual output.
- **Keep Documentation Aligned**: Update relevant specifications, API documentation, and skill guides concurrently with implementation changes to prevent documentation drift.
- **Confirm Before Destructive Actions**: Obtain explicit confirmation before deleting files, dropping database collections, modifying schemas destructively, or replacing key architectural foundations.

## 2. FitMate AI Invariants & Ethical Boundaries

Every feature, screen, API, and prompt in this repository must uphold these non-negotiable product invariants:

1. **No Medical Claims**: The AI coach is an informational fitness and wellness companion. Never present the AI coach as a doctor, medical professional, or clinical diagnosis system. Always surface standard medical disclaimers where appropriate.
2. **Nutrition Values Are Estimates**: Always clearly label calorie, macro, and micronutrient calculations as estimates (`isEstimated: true`). Never present calculated nutritional information as guaranteed medical or laboratory data.
3. **Explicit Consent for Sensitive Data**: Require explicit user consent before accessing the camera, gym equipment recognition capabilities, pose analysis, or storing sensitive personal health indicators.
4. **Data Minimization & Privacy**: Collect and persist only the data strictly necessary for the requested user feature. Never store unnecessary PII or health details without purpose.
5. **Universal Personalization**: Never hard-code one individual's body measurements, dietary restrictions, fitness routines, or baseline preferences. Support diverse user goals: fat loss, muscle gain, body recomposition, weight maintenance, general fitness, and undecided/custom paths.
6. **Bilingual & Bi-Directional Ergonomics**: Design and preserve compatibility for both English (LTR) and Arabic (RTL) layouts, fonts, and interaction ergonomics.
7. **Multi-Unit Support**: Support seamless switching between Metric (kg, cm, ml) and Imperial (lbs, in, fl oz) measurement systems across all input and display surfaces.

## 3. Skill Collaboration & Delegation

When working on specialized tasks, refer to and leverage the project skills located in `.agents/skills/`:

- Feature discovery, user stories, MVP scoping -> `product-thinking`
- User experience, screen flows, accessibility, RTL/LTR -> `mobile-ui-ux`
- Design tokens, typography, colors, theme variables -> `design-system`
- Mobile client code, Expo Router, TanStack Query, forms -> `react-native-expo`
- Backend services, controllers, middleware, Modular Monolith -> `backend-node-typescript`
- REST contracts, endpoints, schemas, error formats -> `api-design`
- Mongoose schemas, relationships, indexes, migrations -> `mongodb-data-modeling`
- Auth, tokens, input sanitization, privacy, OWASP -> `app-security`
- Unit, integration, API tests, fixtures, test runners -> `testing-quality`
- Code reviews, PR audits, severity ratings -> `code-review`

