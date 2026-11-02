import { describe, it, expect } from 'vitest';
import { MockAuthAdapter, RealAuthAdapter } from '../src/lib/api/auth.adapter';
import { MockNutritionAdapter, RealNutritionAdapter } from '../src/lib/api/nutrition.adapter';

describe('Frontend API Adapters (Isolation & Boundaries)', () => {
  it('should strictly isolate MockAuthAdapter and RealAuthAdapter', async () => {
    const mockAuth = new MockAuthAdapter();
    const realAuth = new RealAuthAdapter();

    expect(mockAuth.isMock).toBe(true);
    expect(realAuth.isMock).toBe(false);

    const loginRes = await mockAuth.login('demo@fitmate.ai', 'Secret123!');
    expect(loginRes.user.email).toBe('demo@fitmate.ai');
    expect(loginRes.tokens.tokenType).toBe('Bearer');
    expect(loginRes.profile.dailyCalorieTarget).toBe(2150);
    expect(loginRes.profile.isEstimated).toBe(true);
  });

  it('should strictly isolate MockNutritionAdapter and return Core Invariant 2 isEstimated: true', async () => {
    const mockNutr = new MockNutritionAdapter();
    const realNutr = new RealNutritionAdapter();

    expect(mockNutr.isMock).toBe(true);
    expect(realNutr.isMock).toBe(false);

    // Search Egyptian dishes
    const searchRes = await mockNutr.searchFoods({ category: 'egyptian_dishes' });
    expect(searchRes.items.length).toBeGreaterThan(0);

    const koshari = searchRes.items.find((f) => f.catalogId === 'food_eg_koshari_001');
    expect(koshari).toBeDefined();
    expect(koshari?.isEstimated).toBe(true);
    expect(koshari?.nameAr).toBe('كشري مصري');

    // Detail lookup
    const detail = await mockNutr.getFoodById(koshari!.id);
    expect(detail.provenance.sourceOrganization).toContain('National Nutrition Institute');
    expect(detail.provenance.isEstimated).toBe(true);
    expect(detail.standardPortions.length).toBeGreaterThan(0);
  });

  it('should return 4-slot daily nutrition summary with realistic demo macros', async () => {
    const mockNutr = new MockNutritionAdapter();
    const summary = await mockNutr.getDailySummary('2026-11-02');

    expect(summary.dailyCalorieTarget).toBe(2150);
    expect(summary.caloriesConsumed).toBe(1680);
    expect(summary.remainingCalories).toBe(470);
    expect(summary.isEstimated).toBe(true);

    expect(summary.slots.breakfast.items.length).toBeGreaterThan(0);
    expect(summary.slots.lunch.items.length).toBeGreaterThan(0);
    expect(summary.slots.dinner.items.length).toBeGreaterThan(0);
    expect(summary.slots.snack.items.length).toBeGreaterThan(0);
  });
});

