import { describe, expect, it } from 'vitest';
import { calculateNutrition } from './calculate';

describe('calculateNutrition', () => {
  it('returns nutrition for the actual weight rather than per 100g', () => {
    expect(calculateNutrition({ caloriesKcal: 500, proteinGrams: 10, fatGrams: 20, carbohydrateGrams: 60, sodiumMilligrams: 800 }, 15)).toEqual({ caloriesKcal: 75, proteinGrams: 1.5, fatGrams: 3, carbohydrateGrams: 9, sodiumMilligrams: 120 });
  });
  it('rejects missing actual weight', () => expect(() => calculateNutrition({ caloriesKcal: 1, proteinGrams: 1, fatGrams: 1, carbohydrateGrams: 1, sodiumMilligrams: 1 }, 0)).toThrow());
});

