import { Router } from 'express';
import { nutritionController } from './nutrition.controller.js';
import { validateQuery, validateParams } from '../../shared/validation/validate.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { searchRateLimiter } from '../../middleware/rateLimiter.js';
import { searchFoodsQuerySchema, foodIdParamSchema } from './dto/nutrition.dto.js';

const router = Router();

// All nutrition routes require an authenticated user session
router.use(authMiddleware);

// EP-NUTR-005: Search Curated Food Catalog
router.get(
  '/foods/search',
  searchRateLimiter,
  validateQuery(searchFoodsQuerySchema),
  nutritionController.searchFoods
);

// EP-NUTR-006: Get Food Item Details & Provenance
router.get(
  '/foods/:id',
  validateParams(foodIdParamSchema),
  nutritionController.getFoodById
);

export const nutritionRoutes = router;

