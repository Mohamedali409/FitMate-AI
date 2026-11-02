# FitMate AI — Product Overview Consistency Review Report

**Document Version:** 1.0.0  
**Phase:** 2 — Product Discovery and Planning (Consistency Review & Quality Gate)  
**Status:** Complete — Pending User Review & Phase Approval  
**Author:** Antigravity Pair Programmer (Product Thinking, Mobile UI/UX & Code Review Agent Skills)  
**Date:** 2026-11-01  

---

## 1. Executive Summary

This report documents the consistency review, architectural reconciliation, and editorial alignment conducted on [PRODUCT_OVERVIEW.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/PRODUCT_OVERVIEW.md) (updating from Version 2.0.0 to Version 2.1.0) and its cross-document alignment across the entire **FitMate AI Phase 2: Product Discovery and Planning** documentation suite.

Using the authoritative strategic decisions recorded in [OPEN_QUESTIONS.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/OPEN_QUESTIONS.md) as the baseline, this review resolved five critical inconsistencies:
1. **Phase A / Phase B Dependency Deadlock**: Partitioned the minimum safe caloric/macronutrient estimation engine into Phase A (serving Onboarding Step 5 — Plan Reveal) while keeping the full nutrition tracking experience (local library, food search, Quick Add, daily diary) in Phase B.
2. **Barcode Scanner Roadmap Conflict**: Disentangled commercial food API barcode scanning (deferred candidate for v1.2) from camera-based computer vision (gym equipment recognition and pose analysis, deferred to v2.0 in Module H).
3. **Module Architecture vs. User Navigation Conflation**: Clarified the distinction between functional system module dependencies and actual user navigation journeys (New User onboarding vs. Returning User direct login).
4. **Custom Food Creation Scope Creep**: Aligned the MVP food logging strategy strictly to **Local Food Library + Quick Add** (per `DEC-001`), deferring persistent reusable custom food database creation to v1.1 evaluation under newly registered open question `Q-005`.
5. **Calorie Safety & Medical Disclaimer Rigor**: Enforced clear medical distinctions between Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE), framed safety floors (~1,200/1,500 kcal) as advisory warning triggers rather than medical guarantees, prohibited arbitrary 2,000 kcal defaults, and formalized a pre-release registered dietitian review requirement.

All ten specification and planning documents in `docs/product/` have been verified for 100% horizontal and vertical consistency.

---

## 2. Issues Identified During the Review

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CONSISTENCY REVIEW ISSUES MATRIX                                      │
├────┬─────────────────────────────┬──────────┬───────────────────────────────────────────────────────────┤
│ ID │ Issue Description           │ Severity │ Root Cause & Product Impact                               │
├────┼─────────────────────────────┼──────────┼───────────────────────────────────────────────────────────┤
│ I1 │ Phase A/B Dependency        │ HIGH     │ Onboarding Step 5 requires calorie preview, but v2.0.0    │
│    │ Deadlock                    │          │ placed all nutrition engines in Phase B. Phase A was      │
│    │                             │          │ blocked or forced to duplicate Phase B functionality.     │
├────┼─────────────────────────────┼──────────┼───────────────────────────────────────────────────────────┤
│ I2 │ Barcode Scanner Roadmap     │ MEDIUM   │ Barcode scanning was listed under Module H (v2.0 Vision)  │
│    │ Version Conflict            │          │ while DEC-001 designated it as a v1.2 commercial API      │
│    │                             │          │ candidate, conflating optical barcodes with ML vision.    │
├────┼─────────────────────────────┼──────────┼───────────────────────────────────────────────────────────┤
│ I3 │ Module Dependency vs. User  │ MEDIUM   │ Module diagram showed Auth preceding Onboarding, while    │
│    │ Navigation Conflation       │          │ user journey requires Onboarding Steps 1–5 before the     │
│    │                             │          │ mandatory registration gate on Screen 6.                  │
├────┼─────────────────────────────┼──────────┼───────────────────────────────────────────────────────────┤
│ I4 │ Custom Food Creation Scope  │ MEDIUM   │ Product Overview implied custom food creation in MVP,     │
│    │ Inconsistency               │          │ contradicting DEC-001 (Local Library + Quick Add).       │
│    │                             │          │ Reusable custom food CRUD adds unapproved DB complexity.  │
├────┼─────────────────────────────┼──────────┼───────────────────────────────────────────────────────────┤
│ I5 │ Calorie Safety Language &   │ HIGH     │ Floor guidelines (~1,200/1,500 kcal) lacked clear advisory│
│    │ Medical Framing Gaps        │          │ framing, BMR vs TDEE was blurred, and dietitian review    │
│    │                             │          │ was not codified as a pre-release launch invariant.       │
└────┴─────────────────────────────┴──────────┴───────────────────────────────────────────────────────────┘
```

### Issue 1: Phase A / Phase B Implementation Dependency Deadlock
- **Location**: `PRODUCT_OVERVIEW.md` §5 (Module B & Module C), §6 (Phased Implementation Sequence).
- **Analysis**: The approved onboarding user journey includes a **Personalized Plan Reveal** (Step 5 / `SCR-007B`), which calculates and displays estimated daily calories and macronutrient targets before the user reaches the mandatory registration gate on Screen 6 (`SCR-004`). However, the implementation sequence in `PRODUCT_OVERVIEW.md` v2.0.0 allocated the entire Mifflin-St Jeor calculation engine and nutrition logic to Phase B (Nutrition Tracking Core). This created a structural engineering deadlock:
  - If Phase A cannot calculate targets, Step 5 cannot render estimated metrics during onboarding.
  - If Phase A implements the full nutrition module, Phase A scope balloons and invalidates the phased delivery model.
- **Resolution**: Separated the mathematical calculation capability from the food diary and tracking data model:
  - **Phase A**: Implements the lightweight, client-side/utility **Baseline Safe Caloric & Macro Estimation Engine** (Mifflin-St Jeor formula, activity multipliers, safety floor advisory warnings, and `isEstimated: true` flags) strictly to power Onboarding Step 5.
  - **Phase B**: Implements the complete **Nutrition Tracking Core** (Local Food Library of ~150–200 items, food search, portion scaling, manual Quick-Add macro logging, 4-slot daily food diary, and historical nutrition summaries).
  - This cleanly resolves the dependency without duplicating work or prematurely expanding Phase A scope.

### Issue 2: Barcode Scanner Roadmap Version Conflict
- **Location**: `PRODUCT_OVERVIEW.md` §5 (Module C & Module H).
- **Analysis**: In `PRODUCT_OVERVIEW.md` v2.0.0, packaged food barcode scanning was categorized under **Module H: Future Camera & Computer Vision Features (Post-MVP v2.0)**. However, the authoritative decision `DEC-001` and `OPEN_QUESTIONS.md` defined barcode scanning and commercial food APIs (Nutritionix, Edamam, FatSecret) as candidate enhancements for **v1.2**, while reserving **v2.0** strictly for advanced computer vision and machine learning (camera-based gym equipment recognition and real-time exercise pose analysis).
- **Resolution**:
  - Re-allocated external commercial food database APIs and packaged food barcode scanning as **deferred candidate enhancements for v1.2** under Module C.
  - Restricted **Module H** strictly to **post-MVP v2.0 computer vision capabilities** (gym equipment recognition and real-time pose estimation).
  - Confirmed that zero camera hardware permissions or computer vision dependencies exist in the MVP or v1.1.

### Issue 3: Module Architecture vs. User Navigation Conflation
- **Location**: `PRODUCT_OVERVIEW.md` §5.1 & §5.2.
- **Analysis**: The architectural diagram in v2.0.0 showed *Module A (Auth & Profile)* with a hard dependency arrow pointing into *Module B (Onboarding)*. This led reviewers to conclude that users must register before beginning onboarding, contradicting the approved user flow where new users experience onboarding Steps 1 through 5, preview their plan, and only then encounter the mandatory registration gate on Screen 6.
- **Resolution**:
  - Re-structured Section 5 into two explicit subsections with dedicated Mermaid diagrams:
    1. **§5.1 Functional Module Dependencies**: Shows service and data relationships (transient onboarding state committed to user profile service upon registration; authenticated context injected into tracking modules).
    2. **§5.2 User Navigation Journeys**: Explicitly illustrates both user entry paths:
       - **New User**: Screen 1 (Welcome) $\rightarrow$ Screen 2 (Goal) $\rightarrow$ Screen 3 (Metrics) $\rightarrow$ Screen 4 (Consent) $\rightarrow$ Screen 5 (Plan Reveal) $\rightarrow$ Screen 6 (Mandatory Registration Gate) $\rightarrow$ Today Dashboard.
       - **Returning User**: Screen 1 (Welcome) $\rightarrow$ Screen 2 (Login via *"I already have an account"*) $\rightarrow$ Today Dashboard.
  - Reaffirmed that no unauthenticated Guest Mode is permitted in the main application.

### Issue 4: Unapproved Custom Food Creation Scope Creep
- **Location**: `PRODUCT_OVERVIEW.md` §5 (Module C); `USER_FLOWS.md` line 147.
- **Analysis**: Text in Module C mentioned "custom food creation" as an active MVP capability, and `USER_FLOWS.md` suggested users could "create a custom food item" when search yielded zero results. However, the approved strategic decision `DEC-001` established that the MVP food strategy is strictly **Local Food Library + Quick Add**. Building a dedicated personal custom food database schema, CRUD management UI, and search index union (`SCR-013`) represents unapproved scope creep.
- **Resolution**:
  - Clarified Module C in `PRODUCT_OVERVIEW.md`: Manual logging in MVP is handled strictly via **Quick Add** (5-second entry of Calories and optional macros into that day's diary document).
  - Re-classified `SCR-013` (Custom Food Creator) in `SCREEN_INVENTORY.md` as a **Candidate v1.1 enhancement**.
  - Formally recorded this architectural decision as an active open question in `OPEN_QUESTIONS.md` under **`Q-005` (Reusable Custom Food Creation vs. Quick Add Only for MVP)**.
  - Updated `USER_FLOWS.md` empty state prompt to route directly to Quick Add (`SCR-012`).

### Issue 5: Calorie Calculation Safety Language & Medical Framing Gaps
- **Location**: `PRODUCT_OVERVIEW.md` §4 (`INV-003`), §2.2, §3 (`PRB-004`).
- **Analysis**: Prior phrasing regarding caloric safety floors (~1,200 kcal for females, ~1,500 kcal for males) could be misinterpreted as guaranteeing clinical or medical safety as long as a target remained above those numbers. Furthermore, the distinction between resting metabolic rate (BMR) and daily expenditure (TDEE) required scientific rigor, the handling of missing inputs needed explicit prohibition of arbitrary fallbacks, and the registered dietitian review gate needed formal codification.
- **Resolution**:
  - Overhauled Invariant `INV-003`: Explicitly documented that the Mifflin-St Jeor equation estimates **Basal Metabolic Rate (BMR)** at complete rest, while **Total Daily Energy Expenditure (TDEE)** relies on activity multipliers that are **statistical population estimates**, not measured facts.
  - Clarified that floor guidelines (~1,200 kcal/day for adult females and ~1,500 kcal/day for adult males) serve strictly as **conservative advisory warning thresholds to trigger prominent health notice banners**, not universal guarantees of medical safety.
  - Mandated that calculated nutritional values carry the persistent `isEstimated: true` indicator.
  - Prohibited arbitrary fallbacks (such as defaulting to 2,000 kcal). If required inputs are missing or declined, the user is prompted to configure manual targets or select an unpersonalized baseline.
  - Mandated that all caloric formulas, deficit rules, and safety warning banners must undergo professional review by a registered dietitian or licensed health professional prior to public release.

---

## 3. Detailed Modifications Applied to PRODUCT_OVERVIEW.md

| Section | Change Summary |
| :--- | :--- |
| **Document Metadata** | Bumped version to `2.1.0`; updated status to *Approved Product Decisions Incorporated*. |
| **§2.2 Value Pillars** | Aligned Pillar 1 with Local Food Library + Quick-Add macros; emphasized explicit nutrition estimation disclaimers in Pillar 3. |
| **§3 Problem Statements** | Refined `PRB-004` to address misleading nutritional guarantees and highlight mandatory `isEstimated: true` labels. |
| **§4 Invariants (`INV-003`)** | Overhauled to provide complete medical distinction between BMR and TDEE, clarify advisory warning floor thresholds, ban arbitrary 2,000 kcal fallbacks, and mandate registered dietitian review. |
| **§5.1 Module Dependencies** | Replaced confusing single diagram with a dedicated functional architecture diagram showing service dependencies, context injection into AI Coach, and post-onboarding registration commitment. |
| **§5.2 Navigation Journeys** | Added a separate user navigation diagram clearly delineating the New User onboarding path (6 screens) from the Returning User direct login path. |
| **Module B (Onboarding)** | Clarified that Step 5 (Personalized Plan Reveal) is powered by the Phase A baseline safe estimation engine; affirmed mandatory registration gate on Screen 6; noted secure transient memory storage for pre-registration state. |
| **Module C (Nutrition)** | Aligned scope with `DEC-001`: Local Food Library (~150–200 items) + Quick Add; removed custom food creation from MVP scope; deferred commercial food APIs and barcode scanning to v1.2 candidate enhancements. |
| **Module H (Vision)** | Restricted Module H strictly to post-MVP v2.0 computer vision capabilities (gym equipment recognition and real-time pose estimation); removed barcode scanning. |
| **§6 Implementation Sequence** | Updated Phase A title to *"Product Foundation, Authentication & Safe Estimator"*, explicitly incorporating the Mifflin-St Jeor utility for Step 5; updated Phase B title to *"Nutrition Tracking Core"*, maintaining clean separation of concerns. |

---

## 4. Cross-Document Alignment Matrix

To ensure that the corrections made to `PRODUCT_OVERVIEW.md` (v2.1.0) are horizontally and vertically consistent across the repository, the following companion documents were audited and updated:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CROSS-DOCUMENT ALIGNMENT AUDIT                                       │
├──────────────────────────────┬───────────────┬─────────────────────────────────────────────────────────┤
│ Document Path                │ Status        │ Key Harmonization Edits Applied                         │
├──────────────────────────────┼───────────────┼─────────────────────────────────────────────────────────┤
│ docs/product/                │ UPDATED       │ Added Q-005 (Custom Food Creation vs. Quick Add);       │
│ OPEN_QUESTIONS.md            │ (v2.1.0)      │ aligned DEC-008 delivery phases with Phase A estimator. │
├──────────────────────────────┼───────────────┼─────────────────────────────────────────────────────────┤
│ docs/product/                │ UPDATED       │ Updated Phase A definition to include safe estimator;   │
│ MVP_SCOPE.md                 │ (v2.1.0)      │ updated FEAT-010 to Phase A (Engine) / Phase B (Diary). │
├──────────────────────────────┼───────────────┼─────────────────────────────────────────────────────────┤
│ docs/product/                │ UPDATED       │ Reclassified SCR-013 (Custom Food Creator) as           │
│ SCREEN_INVENTORY.md          │ (v2.1.0)      │ Candidate v1.1 evaluated under Q-005.                   │
├──────────────────────────────┼───────────────┼─────────────────────────────────────────────────────────┤
│ docs/product/                │ UPDATED       │ Updated FR-NUTR-001 delivery phase to Phase A (Engine)  │
│ FUNCTIONAL_REQUIREMENTS.md   │               │ / Phase B (Diary Integration).                          │
├──────────────────────────────┼───────────────┼─────────────────────────────────────────────────────────┤
│ docs/product/                │ UPDATED       │ Updated UJ-005 (line 147) empty state prompt to route   │
│ USER_FLOWS.md                │               │ directly to Quick-Add SCR-012 instead of custom food.   │
├──────────────────────────────┼───────────────┼─────────────────────────────────────────────────────────┤
│ docs/product/                │ UPDATED       │ Updated ASM-004 validation metric to analyze Quick-Add  │
│ RISKS_AND_ASSUMPTIONS.md     │               │ usage vs. curated food library selections.              │
├──────────────────────────────┼───────────────┼─────────────────────────────────────────────────────────┤
│ docs/product/                │ VERIFIED      │ Personas already align with regional staples, honest    │
│ USER_PERSONAS.md             │ CONSISTENT    │ weight graphs, and deficit pacing options.              │
├──────────────────────────────┼───────────────┼─────────────────────────────────────────────────────────┤
│ docs/product/                │ VERIFIED      │ Performance budgets, security encryption (NFR-SEC-002), │
│ NON_FUNCTIONAL_REQ.md        │ CONSISTENT    │ and locale parity already comply with updated scope.    │
└──────────────────────────────┴───────────────┴─────────────────────────────────────────────────────────┘
```

---

## 5. Complete Inventory of Active Open Questions

Following the incorporation of all approved strategic decisions (`DEC-001` through `DEC-009`), exactly **five active open questions** remain in [OPEN_QUESTIONS.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/OPEN_QUESTIONS.md). None of these block the approval of Phase 2 or the commencement of Phase 3 architecture:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       ACTIVE OPEN QUESTIONS LOG                                        │
├────────┬──────────────────────────────────────────┬──────────────┬──────────────────┬──────────────────┤
│ ID     │ Question Title                           │ Target Phase │ Impacted Modules │ MVP Blocker?     │
├────────┼──────────────────────────────────────────┼──────────────┼──────────────────┼──────────────────┤
│ Q-001  │ LLM Provider Evaluation for Phase E      │ Phase E      │ F. AI Coach      │ No (Adapter      │
│        │ (Gemini Flash vs GPT-4o-mini vs Claude)  │ (Coach)      │                  │ pattern ready)   │
├────────┼──────────────────────────────────────────┼──────────────┼──────────────────┼──────────────────┤
│ Q-002  │ Qualified Professional Review of Rules   │ Pre-Release  │ B. Onboarding,   │ No (Launch gate, │
│        │ (Registered dietitian / clinical review) │ Audit        │ C. Nutrition     │ not dev blocker) │
├────────┼──────────────────────────────────────────┼──────────────┼──────────────────┼──────────────────┤
│ Q-003  │ Additional Regional Food Additions       │ Phase B      │ C. Nutrition     │ No (Catalog      │
│        │ (North Africa, Levant, Gulf staples)     │ (Nutrition)  │                  │ expandable)      │
├────────┼──────────────────────────────────────────┼──────────────┼──────────────────┼──────────────────┤
│ Q-004  │ Commercial Food API & Barcode Evaluation │ Phase v1.2   │ C. Nutrition     │ No (Strictly     │
│        │ (Nutritionix vs. Edamam vs. FatSecret)   │ (Post-MVP)   │                  │ Post-MVP v1.2)   │
├────────┼──────────────────────────────────────────┼──────────────┼──────────────────┼──────────────────┤
│ Q-005  │ Reusable Custom Food Creation vs.        │ Phase B      │ C. Nutrition     │ No (Quick Add    │
│        │ Quick Add Only for MVP                   │ (Nutrition)  │                  │ covers all MVP)  │
└────────┴──────────────────────────────────────────┴──────────────┴──────────────────┴──────────────────┘
```

### Summary of Active Open Questions:
1. **`Q-001` (LLM Provider Evaluation for Phase E)**: Benchmark candidate models (Google Gemini Flash, OpenAI GPT-4o-mini, Anthropic Claude 3.5 Haiku) against Arabic fluency, response latency, prompt injection resilience, and token cost before final selection in Phase E.
2. **`Q-002` (Qualified Professional Review of Nutritional Rules)**: Engage a registered dietitian or licensed medical professional to review metabolic formula boundaries, disclaimer copy, and regional food nutritional values prior to public release.
3. **`Q-003` (Additional Regional Food Additions)**: Solicit user feedback during early alpha testing to expand the local food library with specific regional dishes from North Africa, the Levant, and the Gulf.
4. **`Q-004` (Commercial Food API Evaluation for v1.2)**: Evaluate commercial API costs and licensing for barcode scanning during post-MVP planning.
5. **`Q-005` (Reusable Custom Food Creation vs. Quick Add Only for MVP)**: Decide whether to build a persistent custom food collection (`SCR-013`) in MVP or rely exclusively on Quick Add (`SCR-012`). *Recommendation: Quick Add only in MVP; defer reusable custom food CRUD to v1.1.*

*(Note on Body Composition Metrics: In alignment with MVP Scope and screen specifications, baseline onboarding metrics are strictly Age, Sex, Height, Weight, and Activity Level. Visual body-fat estimation and photo recognition are strictly excluded from MVP).*

---

## 6. Verification Checklist & Invariant Compliance

The reviewed documentation suite has been verified against all project invariants defined in `.agents/AGENTS.md`:

- [x] **No Medical Claims (`INV-001`)**: Rigorously maintained. AI coach is strictly an educational wellness companion. No diagnosis, injury treatment, or prescription advice is permitted.
- [x] **Nutrition Values Are Estimates (`INV-002`)**: System-wide `isEstimated: true` flag enforced across all calculation engines, previews, diaries, and exports.
- [x] **Calorie Safety Safeguards (`INV-003`)**: BMR vs. TDEE distinction codified; conservative floors (~1,200/1,500 kcal) clearly framed as advisory warning triggers; arbitrary 2,000 kcal defaults banned; dietitian review mandated.
- [x] **Explicit Consent for Sensitive Data (`INV-004`)**: Separate, mandatory health consent step on Onboarding Screen 4 (`SCR-007A`).
- [x] **Data Minimization & Privacy (`INV-005`)**: Pre-registration onboarding state stored in secure transient client memory and committed only upon account creation on Screen 6 (`NFR-SEC-002`).
- [x] **Universal Personalization (`INV-006`)**: Zero hard-coded user assumptions. 6 distinct goal paths supported.
- [x] **Bilingual & Bi-Directional Parity (`INV-007`)**: Native Arabic RTL and English LTR parity across all screen specifications, navigation paths, and typography tokens.
- [x] **Multi-Unit Coexistence (`INV-008`)**: Full Metric and Imperial support normalized to standard base units internally.
- [x] **Data Honesty in Progress Tracking (`INV-009`)**: Strict prohibition of fabricated or interpolated weight data points; moving averages require $\ge 3$ real entries.
- [x] **Prohibition of AI Autonomous Mutations (`INV-010`)**: AI Coach cannot alter user profiles, targets, or workout routines without explicit manual user confirmation.

---

## 7. Conclusion & Next Steps

With the completion of this consistency review and the publication of **Version 2.1.0** of [PRODUCT_OVERVIEW.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/PRODUCT_OVERVIEW.md):

1. **All Phase A / Phase B dependency deadlocks are resolved.**
2. **Barcode scanning and computer vision roadmap horizons are cleanly separated (v1.2 vs. v2.0).**
3. **Module dependencies and user navigation flows are visually and architecturally distinguished.**
4. **Custom food behavior is aligned with approved decision `DEC-001` (Quick Add only in MVP; persistent custom food creation logged under `Q-005`).**
5. **Caloric safety language and non-medical disclaimers adhere to professional and ethical standards.**
6. **All Phase 2 specifications under `docs/product/` are in 100% agreement.**

### Phase 2 Sign-Off Status
Phase 2 (Product Discovery and Planning) documentation is now **complete, coherent, and verified**. No application code, UI screens, or dependencies have been generated.

Upon explicit user confirmation and approval of the Phase 2 deliverables, the team may advance to **Phase 3: System Architecture, Technology Stack Validation, and API Contracts**.

