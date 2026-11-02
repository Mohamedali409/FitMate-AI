# FitMate AI — Strategic Product Decisions & Open Questions

**Document Version:** 2.1.0  
**Phase:** 2 — Product Discovery and Planning (Review & Consistency Update)  
**Status:** Approved Product Decisions Incorporated  
**Author:** Product Thinking Agent Skill  

---

## 1. Decision Management Framework

In accordance with our persistent agent rules ([`AGENTS.md`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/.agents/AGENTS.md)), significant architectural, product, and safety decisions are never decided silently or based on unverified assumptions.

This document serves as the authoritative decision record for FitMate AI. Strategic choices explicitly approved by the user are formally cataloged in Section 2, while remaining open technical/operational questions are tracked in Section 3.

---

## 2. Approved Product Decisions (Authoritative)

The following decisions have been formally approved and govern all specifications across Phase 2:

| Decision ID | Decision Title | Approved Choice | Status | Documents Affected |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-001** | Food Database Sourcing | **Local Food Library + Quick Add** (Curated baseline of ~150–200 regional & international foods; Quick-Add manual macro entry; zero external API dependency in MVP) | **APPROVED** | `PRODUCT_OVERVIEW`, `MVP_SCOPE`, `FUNCTIONAL_REQUIREMENTS`, `USER_FLOWS`, `SCREEN_INVENTORY` |
| **DEC-002** | Exercise Catalog Sourcing | **Curated Bundled Offline Catalog** (~100 foundational compound and isolation exercises with bilingual instructions) | **APPROVED** | `PRODUCT_OVERVIEW`, `MVP_SCOPE`, `FUNCTIONAL_REQUIREMENTS`, `SCREEN_INVENTORY` |
| **DEC-003** | AI Coach Architecture | **Provider-Agnostic Interface with Limited MVP Scope** (Strict abstraction layer; model selection deferred; zero medical claims; zero autonomous mutations) | **APPROVED** | `PRODUCT_OVERVIEW`, `MVP_SCOPE`, `FUNCTIONAL_REQUIREMENTS`, `NON_FUNCTIONAL_REQUIREMENTS`, `RISKS_AND_ASSUMPTIONS` |
| **DEC-004** | Authentication & Access Gate | **Mandatory Registration / Login Before Main Application** (Plan preview revealed on Step 5; account creation strictly required on Screen 6; no Guest Mode) | **APPROVED** | `PRODUCT_OVERVIEW`, `MVP_SCOPE`, `USER_FLOWS`, `SCREEN_INVENTORY`, `FUNCTIONAL_REQUIREMENTS` |
| **DEC-005** | Caloric Estimation Engine | **Mifflin-St Jeor Estimation with Appropriate Safety Controls** (BMR distinguished from TDEE; user-selected pace; no arbitrary 2,000 kcal fallback; estimates only) | **APPROVED** | `PRODUCT_OVERVIEW`, `MVP_SCOPE`, `FUNCTIONAL_REQUIREMENTS`, `RISKS_AND_ASSUMPTIONS` |
| **DEC-006** | Camera & Vision Features | **Strictly Deferred to Post-MVP (v2.0)** (No camera permissions or computer vision dependencies in MVP release) | **APPROVED** | `PRODUCT_OVERVIEW`, `MVP_SCOPE`, `SCREEN_INVENTORY` |
| **DEC-007** | Monetization & Pricing | **100% Free Core Alpha/MVP** (Zero subscription paywalls during initial validation phase) | **APPROVED** | `PRODUCT_OVERVIEW`, `MVP_SCOPE`, `OPEN_QUESTIONS` |
| **DEC-008** | MVP Delivery Phasing | **Phased MVP Delivery Sequence** (Phase A: Foundation, Auth & Safe Estimator $\rightarrow$ Phase B: Nutrition Tracking $\rightarrow$ Phase C: Workouts $\rightarrow$ Phase D: Progress $\rightarrow$ Phase E: Limited AI Coach) | **APPROVED** | `PRODUCT_OVERVIEW`, `MVP_SCOPE`, `PHASE_2_REVIEW_REPORT` |
| **DEC-009** | Internationalization Parity | **Bilingual First-Class Launch (Arabic RTL & English LTR)** from Day 1 with multi-unit engine (Metric & Imperial) | **APPROVED** | All Phase 2 Documents |
| **DEC-010** | Food Logging Boundary & Custom Foods | **Quick Add Only in MVP (Reusable Custom Food Collection Deferred to v1.1)** (Manual logging in MVP handled strictly via Quick Add; no persistent CustomFood collection in MVP architecture) | **APPROVED** | `PRODUCT_OVERVIEW`, `MVP_SCOPE`, `SCREEN_INVENTORY`, `OPEN_QUESTIONS` |

---

## 3. Detailed Decision Summaries

### DEC-001: Food Database Sourcing Strategy for MVP
- **Approved Choice**: **Local Food Library + Quick Add**.
- **Rationale**: An embedded, locally cached food dataset containing both common international staples and regional Middle Eastern / Egyptian staples (e.g., foul mudammas, koshari, taameya, molokhia, lentils, dates, chicken breast, rice, eggs) eliminates recurring SaaS API fees, guarantees sub-50ms search latency, works 100% offline, and prevents reliance on unverified crowd-sourced data. Quick Add provides a 5-second manual fallback for packaged or unlisted foods.
- **Future Horizon**: Commercial food APIs (Nutritionix, Edamam, FatSecret) and barcode scanning are deferred to v1.2 as potential enhancements requiring separate evaluation.

### DEC-002: Exercise Library Curation Strategy
- **Approved Choice**: **Curated Bundled Offline Catalog**.
- **Rationale**: Bundling ~100 core compound and isolation exercises directly within the application guarantees zero-latency, offline reliability in subterranean gyms, verified anatomical tagging, and authentic bilingual Arabic/English instructions.

### DEC-003: AI Coach Architecture & MVP Capability Boundaries
- **Approved Choice**: **Provider-Agnostic Adapter with Limited MVP Scope**.
- **Rationale**: The AI Coach must be architected behind a strict server-side interface (`AICoachAdapter`), decoupling the application from any specific vendor (e.g., Google Gemini, OpenAI, Anthropic, or self-hosted models). Model selection is deferred to Phase E.
- **MVP Capabilities Limited To**:
  1. General fitness and exercise education.
  2. Basic workout form and execution explanations.
  3. Safe exercise alternatives (e.g., substituting dumbbell goblet squats for barbell squats).
  4. General nutrition education and macro concepts.
  5. Clarification of the user's logged fitness data.
  6. Simple recommendations based strictly on authorized user context.
- **Strictly Excluded**:
  1. Medical diagnoses, injury assessments, and clinical treatment plans.
  2. Medication or pharmaceutical recommendations.
  3. Extreme crash dieting or starvation plans.
  4. Guarantees of physical results.
  5. **Autonomous mutations**: The AI Coach cannot autonomously alter the user's profile, change caloric/macro targets, or overwrite workout routines without explicit user confirmation.

### DEC-004: Authentication & Onboarding Architecture
- **Approved Choice**: **Mandatory Registration / Login Before Main Application Access**.
- **Rationale**: Ensures every user in the main app has a cloud-persisted identity, eliminating complex guest-to-user data migration and data loss risks.
- **Onboarding Architecture**:
  - **Five Onboarding Steps**:
    1. Step 1: Welcome & Locale/Units Selection (`SCR-001`). Direct login link for returning users.
    2. Step 2: Fitness Goal Discovery (`SCR-005`).
    3. Step 3: Body Metrics & Activity Profile (`SCR-006`).
    4. Step 4: Health Consent & Non-Medical Disclaimer (`SCR-007A`).
    5. Step 5: Instant Personalized Plan Reveal (`SCR-007B`), powered by the Phase A baseline safe estimation engine.
  - **Registration Gate**:
    - Screen 6: Mandatory Registration / Login (`SCR-004` / `SCR-002`).
  - **Registration API Contract & Lifecycle**:
    - The registration endpoint (`POST /api/v1/auth/register` or `POST /api/v1/auth/oauth/register`) is an unauthenticated public endpoint that does not require an existing access token.
    - Pre-registration onboarding state (goal, body metrics, language, units, and consent) is held strictly in transient runtime client memory during the onboarding wizard. Under no circumstances is pre-registration data written to disk, SQLite, unencrypted `AsyncStorage`, or persistent guest accounts in the cloud.
    - When the user registers on Screen 6, the mobile client submits credentials along with the onboarding profile payload.
    - The backend atomically creates the user document and commits the onboarding metrics in MongoDB, returning a fresh short-lived access JWT (15-min) and refresh token.
    - Upon token receipt, client stores tokens in `expo-secure-store` and immediately purges all transient onboarding memory.
    - If the app is closed, terminated, or onboarding is cancelled, runtime memory is immediately discarded by the OS.
  - **Returning Users**: Screen 1 features a direct "I already have an account" button routing to `SCR-002` (Login), bypassing onboarding completely.

### DEC-005: Caloric Estimation Engine & Safety Controls
- **Approved Choice**: **Mifflin-St Jeor Estimation with Appropriate Safety Controls**.
- **Key Specifications**:
  1. **BMR vs. TDEE**: Basal Metabolic Rate (BMR) is strictly distinguished from Total Daily Energy Expenditure (TDEE). Activity multipliers are labeled as population-level statistical estimates.
  2. **Estimation Transparency**: All values carry `isEstimated: true`.
  3. **No Arbitrary Fallbacks**: No universal 2,000 kcal fallback is used if data is missing or declined. The system prompts the user to configure targets manually or select an unpersonalized baseline.
  4. **Conservative Floor Guidelines**: Floor values (~1,200 kcal female / ~1,500 kcal male) are treated as conservative safety guidelines triggering health warning banners, not universal medical guarantees. No value is described as medically safe merely because it exceeds a threshold.
  5. **User-Selected Deficit Pace**: Fat loss users choose their target deficit pace (e.g., mild 10%, moderate 15–20%, or custom) rather than having a fixed 20% deficit forced upon them.
  6. **Gender Neutrality**: Users selecting "Prefer not to say" for biological sex are handled via a neutral baseline calculation ($s = -78$) or manual input without silent assumptions.
  7. **Professional Review**: Caloric formula boundaries and safety copy require review by a registered dietitian prior to public release.

### DEC-006: Camera Feature Timing
- **Approved Choice**: **Strictly Deferred to Post-MVP (v2.0)**. Zero camera permissions or vision dependencies are included in the MVP release. Barcode food scanning is deferred to v1.2 as a candidate commercial API enhancement.

### DEC-007: Monetization Strategy
- **Approved Choice**: **100% Free Core MVP during Alpha/Validation Phase**. Payment gateways and paywalls are deferred to v1.2.

### DEC-008: Phased MVP Delivery Sequence
- **Approved Choice**: **Phased Implementation (Phases A through E)**:
  - **Phase A**: Product Foundation, Authentication & Safe Estimator (includes project scaffolding, auth, profile, 5-step onboarding, health consent, mandatory registration gate, and the baseline safe Mifflin-St Jeor calculation utility required to power Step 5 Plan Reveal).
  - **Phase B**: Nutrition Tracking Core (Local Food Library, food search, portion scaling, Quick Add manual macro entry, 4-slot daily diary, daily nutrition summaries).
  - **Phase C**: Workout Tracking Core (exercise catalog, active logger, rest timer, local-first offline persistence, workout summary).
  - **Phase D**: Progress Tracking (body weight logger, honest 7-day moving average curve, workout history calendar).
  - **Phase E**: Limited AI Coach Companion (provider-agnostic adapter, context injection, safety guardrails, mobile chat).

### DEC-009: Bilingual First-Class Launch (Arabic & English)
- **Approved Choice**: Full native bilingual parity from Day 1, including RTL layout mirroring, Cairo typography (+25% line height), and dual-unit support (Metric & Imperial).

### DEC-010: Food Logging Boundary & Custom Foods
- **Approved Choice**: **Quick Add Only in MVP (Reusable Custom Food Collection Deferred to v1.1)**.
- **Rationale**: The approved MVP strategy (`DEC-001`) specifies Local Food Library + Quick Add. Quick Add satisfies 100% of manual logging requirements for unlisted meals without introducing the schema overhead, CRUD endpoints, and search union complexities of a personal custom food database collection (`SCR-013`). Reusable custom food creation is deferred to v1.1. No `CustomFood` collection shall be introduced into the MVP architecture.

---

## 4. Active Open Technical & Product Questions

The following operational questions remain genuinely open and will be evaluated during their respective implementation phases:

| Question ID | Question Title | Relevance Phase | Context & Evaluation Plan | User Approval Required? |
| :--- | :--- | :--- | :--- | :--- |
| **Q-001** | LLM Provider Evaluation for Phase E | Phase E (AI Coach) | Benchmark candidate models (Google Gemini Flash, OpenAI GPT-4o-mini, Anthropic Claude 3.5 Haiku) against Arabic fluency, response latency, prompt injection resilience, and token cost before final selection. | Yes (prior to Phase E) |
| **Q-002** | Qualified Professional Review of Nutritional Rules | Pre-Release Audit | Engage a registered dietitian or licensed medical professional to review the metabolic formula boundaries, disclaimer copy, and regional food nutritional values prior to public release. | Yes (audit sign-off) |
| **Q-003** | Additional Regional Food Additions | Phase B (Nutrition) | Solicit user feedback during early alpha testing to expand the local food library with specific regional dishes from North Africa, the Levant, and the Gulf. | No (content enhancement) |
| **Q-004** | Commercial Food API Evaluation for v1.2 | Phase v1.2 (Post-MVP)| Evaluate Nutritionix, Edamam, or FatSecret APIs for branded barcode scanning feasibility once core retention is proven. | Yes (budget & contract) |
