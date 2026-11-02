import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../../../infrastructure/database.js';
import { nutritionRepository } from '../nutrition.repository.js';
import { logger } from '../../../shared/logger/logger.js';
import { IFoodItem } from '../models/foodItem.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SeedResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ catalogId: string; error: string }>;
}

/**
 * Seeds or updates the food catalog in MongoDB from foods.seed.json.
 * This operation is fully idempotent: running it multiple times will update existing
 * items and insert new ones without creating duplicates.
 */
export async function seedFoodCatalog(options: { closeConnectionOnFinish?: boolean } = {}): Promise<SeedResult> {
  const seedFilePath = path.join(__dirname, 'foods.seed.json');

  if (!fs.existsSync(seedFilePath)) {
    throw new Error(`Food seed file not found at ${seedFilePath}`);
  }

  const rawData = fs.readFileSync(seedFilePath, 'utf-8');
  const foods: Array<Partial<IFoodItem> & { catalogId: string }> = JSON.parse(rawData);

  // Ensure DB connection is active
  if (mongoose.connection.readyState !== 1) {
    await connectDatabase();
  }

  const result: SeedResult = {
    total: foods.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  logger.info({ total: foods.length }, '[FoodSeeder] Starting food catalog seeding');

  for (const food of foods) {
    try {
      if (!food.catalogId) {
        result.skipped++;
        result.errors.push({ catalogId: 'UNKNOWN', error: 'Missing catalogId on seed item' });
        continue;
      }

      const { isNew } = await nutritionRepository.upsertFoodItem(food);
      if (isNew) {
        result.inserted++;
      } else {
        result.updated++;
      }
    } catch (err: any) {
      result.errors.push({
        catalogId: food.catalogId || 'UNKNOWN',
        error: err?.message || 'Unknown database error',
      });
      logger.error({ err, catalogId: food.catalogId }, '[FoodSeeder] Failed to upsert food item');
    }
  }

  logger.info(
    {
      total: result.total,
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      errorCount: result.errors.length,
    },
    '[FoodSeeder] Food catalog seeding finished'
  );

  if (options.closeConnectionOnFinish) {
    await disconnectDatabase();
  }

  return result;
}

// Direct CLI execution handler
const isDirectExecution = process.argv[1] && (
  process.argv[1].endsWith('seedFoods.ts') || 
  process.argv[1].endsWith('seedFoods.js')
);

if (isDirectExecution) {
  seedFoodCatalog({ closeConnectionOnFinish: true })
    .then((stats) => {
      // eslint-disable-next-line no-console
      console.log('✅ Food catalog seeding completed successfully:', JSON.stringify(stats, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('❌ Food catalog seeding failed:', err);
      process.exit(1);
    });
}

