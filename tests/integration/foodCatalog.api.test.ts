import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from '../helpers/db.helper.js';
import { resetRateLimits } from '../../src/middleware/rateLimiter.js';
import { seedFoodCatalog } from '../../src/modules/nutrition/seeds/seedFoods.js';
import { FoodItemModel } from '../../src/modules/nutrition/models/foodItem.model.js';

describe('Food Catalog REST Endpoints (Integration)', () => {
  const app = createApp();
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await resetRateLimits();

    // Register a test user to obtain auth token
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'nutrition.tester@example.com',
        password: 'P@ssword12345!',
        displayName: 'Nutrition Tester',
        onboarding: {
          goal: 'general_fitness',
          biologicalSex: 'female',
          birthDate: '1995-06-20',
          heightCm: 168.0,
          weightKg: 62.0,
          activityMultiplier: 1.375,
          trainingExperience: 'beginner',
          dietaryPreference: 'halal',
          unitSystem: 'metric',
          preferredLanguage: 'ar',
          hasAcceptedHealthDisclaimer: true,
          hasAcceptedTerms: true,
        },
      });

    authToken = regRes.body.data.tokens.accessToken;

    // Seed the food catalog
    await seedFoodCatalog();
  });

  describe('Authentication Enforcement', () => {
    it('should return 401 UNAUTHORIZED when calling search without a Bearer token', async () => {
      const res = await request(app).get('/api/v1/nutrition/foods/search?q=chicken');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 UNAUTHORIZED when calling details by ID without a Bearer token', async () => {
      const food = await FoodItemModel.findOne().lean();
      const res = await request(app).get(`/api/v1/nutrition/foods/${food!._id}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('EP-NUTR-005: Search Curated Food Catalog', () => {
    it('should return 400 VALIDATION_ERROR when neither q nor category is provided', async () => {
      const res = await request(app)
        .get('/api/v1/nutrition/foods/search')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when q has less than 2 characters and no category', async () => {
      const res = await request(app)
        .get('/api/v1/nutrition/foods/search?q=a')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should successfully search by English keyword (e.g. "chicken")', async () => {
      const res = await request(app)
        .get('/api/v1/nutrition/foods/search?q=chicken')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.pagination.totalItems).toBeGreaterThan(0);

      // Verify returned item shape
      const item = res.body.data[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('catalogId');
      expect(item).toHaveProperty('nameEn');
      expect(item).toHaveProperty('nameAr');
      expect(item).toHaveProperty('caloriesPer100g');
      expect(item).toHaveProperty('proteinPer100g');
      expect(item).toHaveProperty('carbsPer100g');
      expect(item).toHaveProperty('fatPer100g');
      expect(item.isEstimated).toBe(true);
      expect(item.defaultPortion).toBeDefined();
    });

    it('should successfully search by Arabic keyword (e.g. "كشري")', async () => {
      const res = await request(app)
        .get('/api/v1/nutrition/foods/search?q=كشري')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const koshari = res.body.data.find((f: any) => f.catalogId === 'food_eg_koshari_001');
      expect(koshari).toBeDefined();
      expect(koshari.nameEn).toBe('Egyptian Koshari');
      expect(koshari.nameAr).toBe('كشري مصري');
      expect(koshari.caloriesPer100g).toBe(165);
      expect(koshari.proteinPer100g).toBe(5.2);
    });

    it('should normalize Arabic Tashkeel in search queries (e.g. "كُشَرِيّ" -> matches "كشري")', async () => {
      const res = await request(app)
        .get('/api/v1/nutrition/foods/search')
        .query({ q: 'كُشَرِيّ' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const koshari = res.body.data.find((f: any) => f.catalogId === 'food_eg_koshari_001');
      expect(koshari).toBeDefined();
      expect(koshari.nameEn).toBe('Egyptian Koshari');
    });

    it('should normalize Arabic Alef variants in search queries (e.g. "أرز" -> matches "ارز")', async () => {
      const res = await request(app)
        .get('/api/v1/nutrition/foods/search')
        .query({ q: 'أرز' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const riceItem = res.body.data.find((f: any) => f.nameEn.toLowerCase().includes('rice'));
      expect(riceItem).toBeDefined();
    });

    it('should search by alias transliterations (e.g. "kushari" matches "Egyptian Koshari")', async () => {
      const res = await request(app)
        .get('/api/v1/nutrition/foods/search?q=kushari')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].catalogId).toBe('food_eg_koshari_001');
    });

    it('should support category-only browsing without requiring query q (Condition AUD-004)', async () => {
      const res = await request(app)
        .get('/api/v1/nutrition/foods/search?category=legumes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify all returned items belong to the requested category
      for (const item of res.body.data) {
        expect(item.category).toBe('legumes');
      }
    });

    it('should combine category filtering and keyword search', async () => {
      const res = await request(app)
        .get('/api/v1/nutrition/foods/search?q=egg&category=dairy_eggs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      for (const item of res.body.data) {
        expect(item.category).toBe('dairy_eggs');
      }
    });

    it('should respect pagination parameters (page, limit)', async () => {
      const res = await request(app)
        .get('/api/v1/nutrition/foods/search?category=protein&page=1&limit=3')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.meta.pagination.page).toBe(1);
      expect(res.body.meta.pagination.limit).toBe(3);
      expect(res.body.meta.pagination.hasNextPage).toBe(true);
    });

    it('should exclude archived foods from search results', async () => {
      // Archive one food item
      const itemToArchive = await FoodItemModel.findOne({ catalogId: 'food_eg_koshari_001' });
      itemToArchive!.isArchived = true;
      await itemToArchive!.save();

      const res = await request(app)
        .get('/api/v1/nutrition/foods/search?q=koshari')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const koshari = res.body.data.find((f: any) => f.catalogId === 'food_eg_koshari_001');
      expect(koshari).toBeUndefined();
    });
  });

  describe('EP-NUTR-006: Get Food Item Details & Provenance', () => {
    it('should return 400 VALIDATION_ERROR when ID format is not a 24-character hexadecimal ObjectId', async () => {
      const res = await request(app)
        .get('/api/v1/nutrition/foods/invalid-id-123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 NOT_FOUND when food item does not exist', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/v1/nutrition/foods/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 NOT_FOUND when food item is archived', async () => {
      const item = await FoodItemModel.findOne({ catalogId: 'food_eg_foul_mudammas_001' });
      item!.isArchived = true;
      await item!.save();

      const res = await request(app)
        .get(`/api/v1/nutrition/foods/${item!._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return complete food details, portions, and provenance for a valid food item', async () => {
      const food = await FoodItemModel.findOne({ catalogId: 'food_eg_koshari_001' }).lean();

      const res = await request(app)
        .get(`/api/v1/nutrition/foods/${food!._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.id).toBe(food!._id.toString());
      expect(data.catalogId).toBe('food_eg_koshari_001');
      expect(data.nameEn).toBe('Egyptian Koshari');
      expect(data.nameAr).toBe('كشري مصري');
      expect(data.category).toBe('middle_eastern_dishes');
      expect(data.servingSizeGrams).toBe(100.0);
      expect(data.caloriesPer100g).toBe(165);
      expect(data.proteinPer100g).toBe(5.2);
      expect(data.carbsPer100g).toBe(31.0);
      expect(data.fatPer100g).toBe(2.5);
      expect(data.fiberPer100g).toBe(3.8);

      // Standard portions
      expect(Array.isArray(data.standardPortions)).toBe(true);
      expect(data.standardPortions.length).toBeGreaterThan(0);
      const smallPlate = data.standardPortions.find(
        (p: any) => p.portionId === 'portion_koshari_small_plate'
      );
      expect(smallPlate).toBeDefined();
      expect(smallPlate.gramWeight).toBe(250.0);
      expect(smallPlate.unitNameEn).toBe('Small Plate');
      expect(smallPlate.unitNameAr).toBe('طبق صغير');

      // Provenance block
      expect(data.provenance).toBeDefined();
      expect(data.provenance.sourceOrganization).toBe('National Nutrition Institute (NNI) Egypt');
      expect(data.provenance.sourceDataset).toBe('Food Composition Tables for Egypt (2006)');
      expect(data.provenance.sourceRecordId).toBeNull(); // Condition AUD-001
      expect(data.provenance.preparationState).toBe('cooked');
      expect(data.provenance.confidenceLevel).toBe('medium');
      expect(data.provenance.isVerified).toBe(false);
      expect(data.provenance.isEstimated).toBe(true); // Core Invariant 2
    });

    it('should return verified laboratory provenance with USDA FDC ID for international staples', async () => {
      const chicken = await FoodItemModel.findOne({ catalogId: 'food_intl_chicken_breast_raw_001' }).lean();

      const res = await request(app)
        .get(`/api/v1/nutrition/foods/${chicken!._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.provenance.sourceOrganization).toBe('USDA FoodData Central');
      expect(data.provenance.sourceRecordId).toBe('171077');
      expect(data.provenance.isVerified).toBe(true);
      expect(data.provenance.isEstimated).toBe(true);
      expect(data.provenance.confidenceLevel).toBe('high');
    });
  });
});
