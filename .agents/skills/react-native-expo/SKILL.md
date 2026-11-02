---
name: react-native-expo
description: Use this skill for implementing and architecting React Native mobile code, Expo Router navigation, TypeScript conventions, TanStack Query integration, form validation, and mobile performance.
---

# React Native & Expo Skill

## Skill Purpose
The `react-native-expo` skill standardizes frontend architecture, component engineering, file-based routing with Expo Router, server state management with TanStack Query, form validation with React Hook Form and Zod, and mobile performance optimizations for FitMate AI.

---

## When to Use This Skill
- Structuring mobile application directories and writing React Native TypeScript components.
- Configuring and creating file-based routes in Expo Router (`app/` directory).
- Implementing asynchronous data fetching, caching, and optimistic mutations with TanStack Query.
- Building complex forms (e.g., onboarding goal setup, workout customizer, manual meal entry) with React Hook Form and Zod schemas.
- Optimizing mobile rendering performance, list virtualization (FlashList/FlatList), and native gesture handling.
- Implementing RTL layout adjustments and safe area constraints.

---

## When NOT to Use This Skill
- Designing raw design tokens or component visual guidelines (delegate to `design-system`).
- Specifying high-level product personas or feature acceptance criteria (delegate to `product-thinking`).
- Writing Node.js Express backend services or database schemas (delegate to `backend-node-typescript` and `mongodb-data-modeling`).
- Designing backend REST API contracts (delegate to `api-design`).

---

## Required Context to Inspect Before Acting
Before executing React Native workflows, inspect:
1. Approved screen flows and UX state requirements from `mobile-ui-ux`.
2. Design token values and theme rules from `design-system`.
3. API endpoints and request/response contracts from `api-design`.
4. Existing Expo configuration (`app.json`, `package.json`, `tsconfig.json`).

---

## Step-by-Step Workflow

### Step 1: Expo Router Directory & Route Organization
Follow idiomatic Expo Router structure:
```text
app/
├── (auth)/             # Authentication stack (login, register, forgot-password)
│   ├── _layout.tsx
│   ├── login.tsx
│   └── register.tsx
├── (tabs)/             # Main app tab navigation
│   ├── _layout.tsx
│   ├── index.tsx       # Today / Dashboard tab
│   ├── workouts/       # Workouts stack
│   ├── nutrition/      # Nutrition stack
│   ├── coach/          # AI Coach tab
│   └── profile/        # Profile & settings
├── workout/            # Modal / fullscreen workout active session
│   ├── [id].tsx
│   └── active.tsx
├── +not-found.tsx
└── _layout.tsx         # Root layout (Providers: QueryClient, Theme, Auth, SafeArea)
```

### Step 2: Component Architecture & Separation of Concerns
Structure components into modular folders:
- `components/ui/`: Dumb/presentational design system components (Button, Input, Card, MacroRing, Text).
- `components/features/`: Feature-scoped composite components (e.g., `WorkoutSetRow`, `MealItemCard`, `CoachMessageBubble`).
- `hooks/`: Reusable custom hooks encapsulating business logic (e.g., `useActiveWorkout`, `useNutritionSummary`).
- `services/api/`: Typed API client wrappers.

### Step 3: Server State Management with TanStack Query
- **Query Key Factory**: Centralize all query keys to avoid cache invalidation bugs:
  ```typescript
  export const workoutKeys = {
    all: ['workouts'] as const,
    lists: () => [...workoutKeys.all, 'list'] as const,
    detail: (id: string) => [...workoutKeys.all, 'detail', id] as const,
    history: (userId: string) => [...workoutKeys.all, 'history', userId] as const,
  };
  ```
- **Optimistic Updates**: For active workout logging (e.g., logging a completed set), apply optimistic UI updates immediately, rolling back cleanly if the mutation fails.

### Step 4: Type-Safe Forms with React Hook Form & Zod
- Define Zod schemas that validate all inputs before network dispatch:
  ```typescript
  export const logMealSchema = z.object({
    name: z.string().min(1, 'Meal name is required'),
    calories: z.number().nonnegative('Calories cannot be negative'),
    protein: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fat: z.number().nonnegative(),
    unitSystem: z.enum(['metric', 'imperial']),
  });
  ```
- Connect schemas via `@hookform/resolvers/zod` with accessible error display.

### Step 5: Mobile Performance & Native Optimization
- **List Virtualization**: Use `@shopify/flash-list` or tuned `FlatList` with `getItemLayout` and `keyExtractor` for long lists (e.g., exercise catalog, meal logs).
- **Memoization**: Memoize complex calculation hooks (`useMemo`) and callback references (`useCallback`) in high-frequency logging screens.
- **Image Optimization**: Use `expo-image` with caching and blurhash placeholders for workout demonstrations and food imagery.
- **Haptics**: Trigger `expo-haptics` on key user completions (e.g., completed set, timer alert).

### Step 6: RTL & Multi-Unit Integration
- Support RTL via `I18nManager.isRTL` or localization libraries; never hard-code left/right paddings without using logical properties (`marginStart`, `marginEnd`, `paddingStart`, `paddingEnd`).
- Provide unit helper hooks (`useUnits`) to display values dynamically according to user preference without altering stored backend units.

---

## Project-Specific Standards
- **Strict TypeScript**: Never use `any`. Always type props, hook returns, and API responses.
- **Safe Area Inset**: Always wrap screens with `SafeAreaView` from `react-native-safe-area-context` or handle insets explicitly.
- **Estimated Nutrition & Coach Disclaimers**: Include persistent or contextual disclaimer components in screens displaying nutrition calculations or AI coach chats.

---

## Best Practices
- Keep components focused on presentation; extract data fetching and business calculations into dedicated hooks.
- Use `KeyboardAvoidingView` or `react-native-keyboard-controller` for smooth form entry.
- Clean up all intervals, timers, and listeners (e.g., rest timers, background audio) in `useEffect` cleanup blocks.

---

## Anti-Patterns and Mistakes to Avoid
- **Unvirtualized ScrollViews**: Rendering hundreds of exercise items inside a regular `ScrollView` causing memory spikes.
- **Hard-Coded Dimensions**: Using `Dimensions.get('window').width` statically without listening to orientation or window changes.
- **Inline Anonymous Functions in Lists**: Passing inline lambdas directly to `renderItem` causing full re-renders of list items.
- **Ignoring Safe Areas**: Drawing interactive buttons behind device camera notches, home indicators, or status bars.

---

## Quality Checklist
- [ ] Is TypeScript configured strictly with zero `any` usage?
- [ ] Are Expo Router routes properly nested with `_layout.tsx` wrappers?
- [ ] Are TanStack Query keys centralized in a factory?
- [ ] Do forms validate inputs with Zod schemas before submission?
- [ ] Are lists virtualized using FlatList or FlashList?
- [ ] Are logical spacing properties (`paddingStart`/`paddingEnd`) used for RTL compatibility?
- [ ] Are safe areas handled properly on iOS and Android?

---

## Expected Deliverables
- **Route & Component Hierarchy Blueprints**: File maps and container/presentation patterns.
- **Type Definitions & Zod Schemas**: Interfaces, DTO types, and validation schemas.
- **Custom Hook Templates**: Type-safe TanStack Query and state management hooks.
- **Implementation Guidelines**: Code patterns complying with performance and accessibility standards.

---

## Rules for Asking Clarification Instead of Making Assumptions
- Ask before choosing or installing any native library that requires a custom Expo development client or modifies `android/ios` native folders.
- Ask for clarification if a navigation deep-link or routing flow between tabs and nested stacks is ambiguous.

