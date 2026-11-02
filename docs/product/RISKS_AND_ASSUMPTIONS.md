# FitMate AI — Risks, Assumptions & Safety Safeguards

**Document Version:** 2.0.0  
**Phase:** 2 — Product Discovery and Planning (Revised & Approved)  
**Status:** Approved Product Decisions Incorporated  
**Author:** Product Thinking, App Security & Testing Quality Agent Skills  

---

## 1. Risk Management Framework

Every software platform operating at the intersection of **human health, physical training, nutrition, and generative AI** carries inherent physical, legal, technical, and psychological risks.

FitMate AI systematically categorizes risks across four operational domains:
- **Product & Behavioral Risks (`RSK-PRD-xxx`)**: User churn, tracking fatigue, dietary obsession, onboarding abandonment.
- **Technical & Architectural Risks (`RSK-TEC-xxx`)**: Offline synchronization conflicts, mobile frame drops, API cost spikes.
- **Safety, Clinical & Legal Risks (`RSK-SAF-xxx`)**: Medical overreach, injury liability, dangerous starvation diets, lack of dietitian sign-off.
- **Privacy & Regulatory Risks (`RSK-PRV-xxx`)**: PII leaks, health data breaches, non-compliance with privacy standards.

Each risk is evaluated using:
$$\text{Risk Score} = \text{Probability (1-5)} \times \text{Impact (1-5)}$$

---

## 2. Comprehensive Risk Matrix

| Risk ID | Risk Title | Category | Prob. (1-5) | Impact (1-5) | Score | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-SAF-001** | AI Coach Hallucinates Medical Advice | Safety / Legal | 3 | 5 | **15** | Two-tier architecture: deterministic regex filter + strict system prompt boundaries; zero medical claims. |
| **RSK-SAF-002** | User Enforces Dangerous Caloric Deficit | Safety / Health| 4 | 4 | **16** | Conservative floor guidelines (~1,200/1,500 kcal) trigger advisory banners; user-selected deficit pacing. |
| **RSK-SAF-003** | User Injury During Workout Execution | Safety / Legal | 2 | 5 | **10** | Prominent exercise form disclaimers; non-medical advisory framing across all workout screens. |
| **RSK-SAF-004** | Nutrition Rules Lack Clinical Dietitian Review | Safety / Clinical| 3 | 4 | **12** | Formally schedule a registered dietitian / certified nutritionist audit prior to public MVP release. |
| **RSK-PRD-001** | User Drops Out Due to Logging Friction | Product | 4 | 4 | **16** | Under-4-second set logging, pre-populated previous weights, single-tap checkmarks, and Quick-Add food logging. |
| **RSK-PRD-002** | User Anxiety Over Exact Calorie Numbers| Product | 4 | 3 | **12** | Mandatory `isEstimated: true` badges + educational copy on natural daily metabolic variance. |
| **RSK-PRD-003** | Registration Gate Drop-Off at Screen 6 | Product | 3 | 4 | **12** | Reveal high-value personalized plan on Step 5 first ("The Aha! Moment"); 1-tap Apple/Google auth on Screen 6. |
| **RSK-TEC-001** | Gym Basement Network Dropouts Cause Data Loss | Technical | 5 | 4 | **20** | Local-first architecture: all sets committed synchronously to local storage before network sync. |
| **RSK-TEC-002** | LLM API Token Cost Runaway | Technical | 3 | 4 | **12** | Strict rate limiting ($20\text{ msg/hr}$) + context window minimization + provider-agnostic adapter. |
| **RSK-TEC-003** | RTL Layout Glitches & Typographic Clipping | Technical | 3 | 3 | **9** | Automated $+25\%$ line-height for Arabic + visual regression test suite across LTR and RTL. |
| **RSK-PRV-001** | Sensitive Health Metrics Leaked in Logs | Privacy | 2 | 5 | **10** | Automated logger sanitization masking email, passwords, and health identifiers in production. |
| **RSK-PRV-002** | Device Token Compromise on Jailbroken Phones | Privacy | 2 | 4 | **8** | Hardware Keystore/Keychain encryption via `expo-secure-store`; zero plain `AsyncStorage` tokens. |

---

## 3. In-Depth Risk Analysis & Mitigation Strategies

### RSK-SAF-001: AI Coach Hallucinates Medical Advice or Injury Diagnosis
- **Description**: A user asks about an acute gym injury (e.g., sharp shoulder pain, numbness, joint clicking) or asks for medication recommendations, and an unconstrained LLM generates dangerous medical diagnoses or drug advice.
- **Severity & Impact**: Critical (Score: 15). Physical harm to user; severe legal and regulatory liability.
- **Mitigation Strategy**:
  1. **Layered Safety Architecture**:
     - *Tier 1 (Deterministic Filter)*: Pre-prompt regex scanning for clinical trigger words (`pain`, `swelling`, `numbness`, `ibuprofen`, `pill`, `dose`, `diagnose`, `prescription`, `injury`). Triggering queries automatically return a hard-coded medical refusal response without invoking the LLM.
     - *Tier 2 (System Prompt Role Boundary)*: System prompt explicitly commands: *"You are an informational fitness companion, NOT a doctor or clinical provider. You must refuse to diagnose injuries, recommend medications, or evaluate symptoms. Always advise consulting a qualified physician or physical therapist."*
     - *Tier 3 (Measurable Safety Testing)*: Curated benchmark suites of adversarial clinical prompts must achieve a measurable $\ge 99\%$ refusal rate across automated test runs.
  2. **Prohibition of Autonomous Mutations**: The AI Coach cannot autonomously alter user profiles, targets, or workout routines.
  3. **Contingency Plan**: If an unsafe response is reported via user feedback, the session is flagged for immediate audit, and the specific prompt pattern is added to the deterministic blocklist within 1 hour.

---

### RSK-SAF-002: User Enforces Dangerous Caloric Deficit or Disordered Eating
- **Description**: An aggressive user attempts to force an extreme deficit (e.g., 600 kcal/day) to lose weight rapidly, leading to metabolic damage, malnutrition, or eating disorder reinforcement.
- **Severity & Impact**: High (Score: 16). Severe health detriment to user; ethical failure.
- **Mitigation Strategy**:
  1. **Conservative Floor Guidelines**: Conservative baseline floor guidelines (~1,200 kcal/day for adult females and ~1,500 kcal/day for adult males) trigger prominent, caring health advisory banners emphasizing that severe caloric restriction impairs metabolic function and muscle retention.
  2. **User-Selected Deficit Pacing**: Rather than forcing a rigid 20% deficit, users select their target pace (Mild ~10%, Moderate ~15–20%, or custom), with explicit safety guardrails against severe deficits exceeding 25% of TDEE.
  3. **No Red Shaming Alerts**: Overeating is never displayed with harsh red "FAIL" graphics; overages are displayed neutrally to prevent binge-restrict cycles.

---

### RSK-SAF-004: Nutrition Rules Lack Clinical Dietitian Review Prior to Release
- **Description**: While the Mifflin-St Jeor formula is widely recognized, edge cases (youth under 18, extreme BMI, metabolic conditions) could yield unsuitable advice if not vetted by a licensed professional.
- **Severity & Impact**: Moderate (Score: 12).
- **Mitigation Strategy**: Formally schedule a clinical review audit with a registered dietitian or certified nutritionist prior to public release to review formula boundary handling, disclaimer copy, and regional food dataset accuracy.

---

### RSK-PRD-001: User Abandonment Due to In-Workout Logging Friction
- **Description**: Trainee finds entering weights and navigating menus between sets too slow or cumbersome, resulting in abandoned tracking within the first week.
- **Severity & Impact**: High (Score: 16). Kills core app retention.
- **Mitigation Strategy**:
  1. **Sub-4-Second Logging**:
     - Tapping the active workout screen opens directly to the current exercise.
     - Previous session weight and reps are pre-populated in subtle placeholder text.
     - A single tap on the large ($\ge 48\times 48\,\text{dp}$) circular checkmark logs the set, increments volume, and starts the rest timer.
  2. **One-Thumb Zone**: All primary buttons are placed in the lower third of the mobile screen.

---

### RSK-PRD-003: Registration Gate Drop-Off at Screen 6
- **Description**: Users completing onboarding might abandon when confronted with mandatory account creation on Screen 6.
- **Severity & Impact**: Moderate (Score: 12).
- **Mitigation Strategy**: Reveal the high-value personalized plan on Step 5 first ("The Aha! Moment"), creating psychological ownership before presenting 1-tap Apple/Google registration on Screen 6.

---

### RSK-TEC-001: Subterranean Gym Network Blackouts Cause Data Loss
- **Description**: Free-weight rooms located in basements frequently have zero cellular or Wi-Fi connectivity. An app requiring active API pings will freeze, drop sets, or fail to load routines.
- **Severity & Impact**: Maximum (Score: 20). Losing a 60-minute workout causes immediate uninstalls.
- **Mitigation Strategy**:
  1. **Local-First Architecture**:
     - Active workout session state is committed synchronously to local device storage before any HTTP request is dispatched.
     - Network requests are placed in a persistent queue (`syncStatus: "pending"`).
     - When the OS signals restored connectivity, a background worker pushes pending payloads to MongoDB with exponential backoff retry.
  2. **Zero Blocking Spinners**: The UI never blocks user input waiting for an API response.

---

### RSK-TEC-002: AI Coach API Token Cost Runaway & Vendor Lock-In
- **Description**: High volume or abusive user queries to the LLM backend lead to massive recurring cloud API bills, while coupling to a single provider prevents architectural agility.
- **Severity & Impact**: Moderate (Score: 12).
- **Mitigation Strategy**:
  1. **Strict Rate Limiting**: Limit free MVP tier to a maximum of **20 messages per hour per user**.
  2. **Context Compression**: Injected user context (recent workouts, daily macros) is bounded to a lightweight structured JSON summary ($\le 300$ tokens).
  3. **Provider-Agnostic Adapter**: Wrap AI Coach behind `AICoachAdapter` interface, allowing dynamic model evaluation (Gemini Flash, GPT-4o-mini, Claude 3.5 Haiku) in Phase E without refactoring application logic.

---

## 4. Master Project Assumptions Catalog

The following assumptions underpin the product requirements and technical architecture. If any of these assumptions are invalidated, the affected specifications must be re-evaluated:

| Assumption ID | Category | Assumption Statement | Validation Method |
| :--- | :--- | :--- | :--- |
| **ASM-001** | User Behavior | Users value rapid logging speed over exhaustive micro-nutrient tracking (Vitamins, Zinc, etc.) in early stages. | Track usage ratio of Quick-Add vs. deep food search during MVP testing. |
| **ASM-002** | User Behavior | Gym-goers prefer a single integrated rest timer over switching between the fitness app and the native iOS/Android clock app. | Measure rest timer activation frequency during active workouts. |
| **ASM-003** | User Diversity | A substantial portion of users ($\ge 20\%$) do not have a standard "cut or bulk" goal and require dedicated recomposition or undecided baselines. | Measure distribution of goal archetype selections on Screen 2. |
| **ASM-004** | Technical | A curated Local Food Library of ~150–200 foods (with Egyptian & regional staples) + Quick-Add covers $\ge 80\%$ of initial daily logging needs without an expensive commercial API. | Analyze frequency of Quick-Add usage vs. curated food library selections. |
| **ASM-005** | Technical | Local-first optimistic state management paired with idempotent background synchronization is sufficient to prevent in-gym data loss and duplicate records. Specific local storage and sync technologies are evaluated in Phase 3 architecture. | Monitor client-side sync telemetry and duplicate rejection under simulated offline tests. |
| **ASM-006** | Internationalization | Arabic-speaking users expect native bi-directional layout mirroring (RTL) and authentic typography rather than mere machine-translated text from day 1. | Gather feedback from Arabic-native test cohorts in Saudi Arabia, Egypt, and UAE. |
| **ASM-007** | Regulatory / Safety | Disclaiming medical advice (`INV-001`), labeling nutrition as estimates (`INV-002`), and obtaining qualified dietitian review satisfies consumer health app standards. | Legal review of Terms of Service and Medical Disclaimer wording + dietitian sign-off. |
| **ASM-008** | Technical | Implementing a provider-agnostic AI adapter enables selecting the optimal LLM backend during Phase E based on empirical speed, Arabic proficiency, and cost benchmarks. | Benchmark test suite evaluating candidate models in Phase E. |
| **ASM-009** | Hardware | Modern iOS and Android devices provide hardware-backed Keystore/Keychain encryption via standard Expo modules without native code ejection. | Verify `expo-secure-store` compatibility across target Expo SDK version. |
| **ASM-010** | Business | Validating organic retention and user habit formation during MVP is more valuable than introducing premature subscription paywalls. | Measure 30-day user retention cohorts before implementing in-app billing. |
