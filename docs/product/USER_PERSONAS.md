# FitMate AI — Target User Personas & Jobs to Be Done

**Document Version:** 2.0.0  
**Phase:** 2 — Product Discovery and Planning (Revised & Approved)  
**Status:** Approved Product Decisions Incorporated  
**Author:** Product Thinking Agent Skill  

---

## 1. Persona Framework & Anti-Bias Principles

To prevent designing FitMate AI around an artificial, single-user archetype (e.g., an advanced 25-year-old male bodybuilder), this document establishes **five comprehensive user personas** representing diverse fitness stages, body types, cultural contexts, languages, unit preferences, and lifestyle constraints.

Every persona is mapped using the **Jobs to Be Done (JTBD)** framework:
$$\text{When } [\text{Situation}], \text{ I want to } [\text{Motivation/Action}], \text{ so I can } [\text{Desired Outcome}].$$

---

## 2. Master Persona Roster

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FITMATE AI USER PERSONAS                         │
├───────────────────┬───────────────────┬─────────────────────────────────────┤
│ Persona Name      │ Archetype Goal    │ Key Defining Attribute              │
├───────────────────┼───────────────────┼─────────────────────────────────────┤
│ 1. Sarah Al-Mansoor│ Fat Loss          │ Beginner, Arabic RTL, Metric,       │
│                   │                   │ Intimidated by complex gym routines │
├───────────────────┼───────────────────┼─────────────────────────────────────┤
│ 2. Marcus Chen    │ Muscle Gain       │ Intermediate Lifter, English LTR,   │
│                   │                   │ Imperial, Progressive Overload focus│
├───────────────────┼───────────────────┼─────────────────────────────────────┤
│ 3. Tariq Mahmoud  │ Body Recomposition│ Athletic, Bilingual, Metric,        │
│                   │                   │ Seeks macro precision without crash │
├───────────────────┼───────────────────┼─────────────────────────────────────┤
│ 4. Elena Rostova  │ Maintenance &     │ Busy Professional, English LTR,     │
│                   │ General Fitness   │ Metric, Time-constrained (<45 mins) │
├───────────────────┼───────────────────┼─────────────────────────────────────┤
│ 5. Zayd Al-Harbi  │ Undecided /       │ Novice, Arabic RTL, Metric,         │
│                   │ Habit Discovery   │ Needs empathetic guidance, no jargon│
└───────────────────┴───────────────────┴─────────────────────────────────────┘
```

---

## 3. Detailed Persona Profiles

### Persona 1: Sarah Al-Mansoor — The Lifestyle Transformer
*“I want to get healthier and lose weight sustainably, but every fitness app makes me feel stupid with technical jargon and extreme calorie restrictions.”*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Demographics                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Age: 34           │ Occupation: Marketing Manager  │ Location: Riyadh, KSA  │
│ Language: Arabic  │ Units: Metric (kg, cm)         │ Tech Literacy: High    │
│ Fitness Level: Beginner │ Primary Goal: Sustainable Fat Loss (-12 kg)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Motivations & Behavioral Context
- Sarah has attempted multiple extreme fad diets (keto, juice cleanses) in the past, resulting in rebound weight gain and burnout.
- She recently joined a gym with a women's fitness area but feels intimidated by heavy barbells and complex exercise names.
- She primarily tracks her life in Arabic and expects a natural, beautifully formatted RTL experience with authentic Arabic typography.
- She eats traditional home-cooked meals alongside standard healthy foods and needs local food items (e.g., lentils, grilled chicken, rice, dates) in the app.

#### Critical Pain Points
- **Calorie Guilt**: Previous apps turned red and showed alarming warning icons whenever she ate 50 calories over target, inducing stress.
- **Gym Confusion**: She doesn't know what exercises to perform or how many sets/reps are effective for fat loss.
- **Poor Arabic Support**: Global apps frequently display broken reversed Arabic text (`ﺪﺣﺍﻭ`) and awkward English-oriented layouts.

#### Jobs to Be Done (JTBD)
- **Primary JTBD**: *When I start my day, I want to see a clear, estimated caloric budget and a simple meal logger with regional foods, so I can stay mindful of my food without feeling obsessive or guilty.*
- **Secondary JTBD**: *When I enter the gym, I want a simple, step-by-step workout routine with clear muscle illustrations, so I can exercise with confidence and leave in 45 minutes.*

#### Key Product Requirements for Sarah
- Prominent `isEstimated: true` disclaimers that reduce dietary anxiety.
- Conservative floor guidelines (~1,200 kcal for adult females) triggering supportive health advisory notices rather than rigid algorithmic punishment.
- User-selected deficit pacing (she chooses a gentle 10–15% deficit rather than an aggressive 25% cut).
- Local Food Library with regional Middle Eastern staples alongside international foods, plus Quick Add.
- Full native Arabic (RTL) interface with warm, supportive AI Coach educational responses in Arabic.

---

### Persona 2: Marcus Chen — The Goal-Driven Lifter
*“If I don't write down the weight and reps I did last week, I'm just guessing in the gym. I need lightning-fast set tracking.”*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Demographics                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Age: 26           │ Occupation: Software Engineer  │ Location: Toronto, CAN │
│ Language: English │ Units: Imperial (lbs, in)      │ Tech Literacy: Very High│
│ Fitness Level: Intermediate Lifter │ Primary Goal: Hypertrophy & Strength   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Motivations & Behavioral Context
- Marcus trains 4 to 5 days a week using an Upper/Lower barbell and dumbbell split.
- He understands progressive overload and tracks his working sets to ensure he adds weight or repetitions over time.
- He works out in a busy downtown gym where cell service in the free-weight basement drops constantly.

#### Critical Pain Points
- **Friction in the Gym**: Apps that take more than 5 seconds to log a set interrupt his mental focus and workout momentum.
- **Offline Data Loss**: He has uninstalled previous apps because they crashed or lost his workout logs when gym Wi-Fi disconnected.
- **Ad Bloat & Clutter**: Frustrated by apps that show video advertisements or upsell premium subscriptions during active workouts.

#### Jobs to Be Done (JTBD)
- **Primary JTBD**: *When I finish a heavy set of squats, I want to tap a single checkmark that pre-fills my last session's weight and starts my rest timer, so I can recover without fiddling with my phone.*
- **Secondary JTBD**: *When I look at my weekly progress, I want to see total volume lifted per muscle group, so I can verify whether I achieved progressive overload.*

#### Key Product Requirements for Marcus
- Single-tap set completion with pre-populated values from the previous session.
- Sub-4-second set logging cycle with $\ge 48\times 48\,\text{dp}$ touch targets for sweaty hands.
- 100% reliable local-first offline storage that synchronizes automatically when online.
- Mandatory 1-tap registration on Screen 6 ensuring his data is permanently backed up to the cloud.

---

### Persona 3: Tariq Mahmoud — The Body Recomposition Athlete
*“I'm not trying to be a massive bodybuilder, and I'm not overweight. I want to build muscle and drop body fat simultaneously.”*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Demographics                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Age: 29           │ Occupation: Architect          │ Location: Cairo, Egypt │
│ Language: Bilingual (EN/AR) │ Units: Metric (kg, cm) │ Tech Literacy: High   │
│ Fitness Level: Intermediate │ Primary Goal: Body Recomposition             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Motivations & Behavioral Context
- Tariq has been exercising intermittently for 3 years. He has a decent muscular base but carries stubborn abdominal fat.
- He is conscious of his protein intake to preserve lean muscle while maintaining a modest caloric deficit.
- He eats Egyptian staples (foul mudammas, koshari, taameya, grilled meats) and switches between English for gym terminology and Arabic for daily life.

#### Critical Pain Points
- **Binary App Goals**: Apps force him to choose either "Lose 1 kg/week (Cut)" or "Gain 1 kg/month (Bulk)", offering no sensible midpoint for body recomposition.
- **Macro Imbalance**: Most apps calculate generic carb-heavy splits that don't support optimal protein targets for body recomposition.
- **Weight Scale Fixation & Fake Curves**: Frustrated by apps that fabricate missing weight entries or judge progress solely on daily scale fluctuations.

#### Jobs to Be Done (JTBD)
- **Primary JTBD**: *When I log my food throughout the day, I want to track my protein target with a dedicated macro ring and search Egyptian staples locally, so I can ensure sufficient amino acids without commercial API latency.*
- **Secondary JTBD**: *When my scale weight fluctuates, I want to see a smoothed 7-day moving average calculated only from my real weigh-ins, so I understand the true trend.*

#### Key Product Requirements for Tariq
- Explicit "Body Recomposition" goal configuration with automated high-protein / mild-deficit caloric formulas.
- Local Food Library containing common Egyptian foods (foul mudammas, koshari, molokhia) alongside international foods.
- Honest weight tracking: no fabricated or interpolated data points for missing days; 7-day moving average curve shown only when $\ge 3$ real entries exist.
- Macro rings with standardized color coding (Protein = Coral Red, Carbs = Amber Yellow, Fats = Emerald Green).

---

### Persona 4: Elena Rostova — The Busy Professional
*“I have a demanding executive job and two kids. If a workout takes more than 40 minutes, I cannot do it. Fitness must fit into my life, not run it.”*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Demographics                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Age: 41           │ Occupation: Financial Director │ Location: London, UK   │
│ Language: English │ Units: Metric (kg, cm)         │ Tech Literacy: Moderate│
│ Fitness Level: Returning Trainee │ Primary Goal: General Health & Energy   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Motivations & Behavioral Context
- Elena exercises for mental clarity, cardiovascular health, and bone density rather than aesthetic bodybuilding.
- She has exactly 40 minutes at lunchtime, 3 days a week, to complete a workout.
- She eats meals prepared at home and needs a rapid way to log lunch without measuring every single lettuce leaf.

#### Critical Pain Points
- **Unrealistic Workout Durations**: Apps offer 90-minute bodybuilding workouts with 7 different exercises and 5 sets each, which she cannot complete.
- **Tedious Food Logging**: Searching through 50 brands of olive oil to log a salad makes her abandon food tracking within 3 days.
- **Intrusive Push Notifications**: Annoyed by guilt-inducing notifications ("You haven't logged your workout today! Are you giving up?") during boardroom meetings.

#### Jobs to Be Done (JTBD)
- **Primary JTBD**: *When I have a 40-minute lunch break, I want a concise full-body workout routine with a rest timer, so I can get in, train efficiently, and get back to work.*
- **Secondary JTBD**: *When I eat lunch, I want a "Quick-Add" macro entry to log my estimated calories in 5 seconds, so I can maintain dietary mindfulness without wasting time.*

#### Key Product Requirements for Elena
- Concise 3-day full-body workout templates optimized for sub-45-minute gym sessions.
- Quick-Add manual calorie and macro logging on the main nutrition screen.
- Respectful notification settings with user-configurable quiet hours (in v1.1).

---

### Persona 5: Zayd Al-Harbi — The Undecided Novice
*“I know I need to be healthier, but I don't know where to begin. Everyone online gives conflicting advice, and it's completely overwhelming.”*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Demographics                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Age: 21           │ Occupation: University Student │ Location: Dubai, UAE   │
│ Language: Arabic  │ Units: Metric (kg, cm)         │ Tech Literacy: Very High│
│ Fitness Level: Complete Beginner │ Primary Goal: Undecided / Healthy Habits │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Motivations & Behavioral Context
- Zayd has never lifted weights or tracked a meal before. He spends long hours sitting at university lectures and playing video games.
- He feels overwhelmed by online fitness influencers debating "optimal hypertrophy" vs. "carnivore vs. vegan" diets.
- He wants someone knowledgeable and patient to answer basic questions without mocking his lack of knowledge or pushing extreme restrictions.

#### Critical Pain Points
- **Intimidating Setup**: Being forced during onboarding to pick between "Powerlifting", "Hypertrophy", or "Caloric Cycling" makes him abandon apps on screen 2.
- **Fear of Bad Form**: Worried about looking foolish in the gym or injuring himself on complex exercises.
- **Lack of Personal Dialogue**: Traditional fitness apps are static databases that cannot answer conversational questions like *"What should I eat before my first workout?"*.

#### Jobs to Be Done (JTBD)
- **Primary JTBD**: *When I launch the app, I want to select "Undecided" and receive an encouraging, balanced habit baseline, so I can start without being forced into an extreme fitness regimen.*
- **Secondary JTBD**: *When I feel uncertain about gym etiquette or exercise safety, I want to ask the AI Coach in conversational Arabic, so I can get clear, reassuring, evidence-based guidance.*

#### Key Product Requirements for Zayd
- Dedicated "Custom / Undecided" goal flow during onboarding that sets a comfortable, non-intimidating baseline.
- AI Coach conversational prompt tuned for empathetic, beginner-friendly explanations in natural Arabic within limited educational scope (no medical claims, no autonomous plan mutations).
- Curated exercise catalog with clear visual instructions and common beginner form mistakes highlighted.

---

## 4. Persona Comparison & Design Implications

| Product Attribute | Sarah (Fat Loss) | Marcus (Muscle Gain) | Tariq (Recomposition) | Elena (Maintenance) | Zayd (Undecided) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Language Preference** | Arabic (RTL) | English (LTR) | Bilingual (EN/AR) | English (LTR) | Arabic (RTL) |
| **Unit System** | Metric (kg) | Imperial (lbs) | Metric (kg) | Metric (kg) | Metric (kg) |
| **Calorie Model** | User-selected deficit (~15%) | Mild Surplus (+10%) | Maintenance / Mild Deficit | Neutral Maintenance | Neutral Maintenance / Guided |
| **Macro Focus** | Caloric boundary & fiber | Protein ($2.0\,\text{g/kg}$) & carbs | High protein ($2.2\,\text{g/kg}$) | Balanced distribution | Balanced baseline |
| **Food Sourcing** | Local Library + Quick Add | Local Library + Quick Add | Local (Egyptian/Regional) + Quick Add | Quick Add | Local Library + Quick Add |
| **Workout Style** | 3-Day Dumbbell / Machine | 4-Day Upper/Lower Barbell | 4-Day Push/Pull/Legs | 3-Day Full Body (<40m) | 2-3 Day Introduction |
| **AI Coach Tone** | Gentle, reassuring, educational | Analytical, performance cues | Strategic, macro-focused | Concise, time-efficient | Patient, welcoming, educational |
| **Auth Requirement** | Mandatory on Screen 6 | Mandatory on Screen 6 | Mandatory on Screen 6 | Mandatory on Screen 6 | Mandatory on Screen 6 |
| **Offline Need** | Moderate (gym Wi-Fi) | Critical (basement gym) | High (intermittent 4G) | Low (office gym Wi-Fi) | Moderate (university campus) |
