import type { NutritionValues } from '../inventory/types';

const round = (value: number, digits: number) => Number(value.toFixed(digits));
export function calculateNutrition(per100g: NutritionValues, weightGrams: number): NutritionValues {
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) throw new Error('实际克数必须大于 0');
  const factor = weightGrams / 100;
  return {
    caloriesKcal: round(per100g.caloriesKcal * factor, 1),
    proteinGrams: round(per100g.proteinGrams * factor, 1),
    fatGrams: round(per100g.fatGrams * factor, 1),
    carbohydrateGrams: round(per100g.carbohydrateGrams * factor, 1),
    sodiumMilligrams: round(per100g.sodiumMilligrams * factor, 0),
  };
}

