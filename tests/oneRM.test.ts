// Pure 1RM calculation helpers — no React, no IndexedDB, fully testable.
// Formulas return finite numbers only; never NaN or Infinity.

import {
  estimateOneRMEpley,
  estimateOneRMBrzycki,
  estimateOneRM,
  calculateWeightFromOneRM,
  roundWeightToIncrement,
  calculatePlatesForWeight,
  formatWeight,
  formatPlates,
  STANDARD_PLATES_KG,
  STANDARD_BAR_WEIGHTS_KG,
  WEIGHT_INCREMENTS_KG,
  type PlateCalculation,
  type PlateCount,
} from '../src/utilsOneRM';

describe('1RM Calculations — Epley', () => {
  test('estimateOneRMEpley with normal values', () => {
    // 80 kg × (1 + 8/30) = 80 × 1.2667 = 101.333...
    expect(estimateOneRMEpley(80, 8)).toBeCloseTo(101.333, 3);
  });

  test('estimateOneRMEpley with 0 weight returns 0', () => {
    expect(estimateOneRMEpley(0, 8)).toBe(0);
  });

  test('estimateOneRMEpley with 0 reps returns 0', () => {
    expect(estimateOneRMEpley(80, 0)).toBe(0);
  });

  test('estimateOneRMEpley with negative weight returns 0', () => {
    expect(estimateOneRMEpley(-80, 8)).toBe(0);
  });

  test('estimateOneRMEpley with negative reps returns 0', () => {
    expect(estimateOneRMEpley(80, -8)).toBe(0);
  });
});

describe('1RM Calculations — Brzycki', () => {
  test('estimateOneRMBrzycki with normal values', () => {
    // 80 kg × 36 / (37 - 8) = 80 × 36 / 29 = 99.310...
    expect(estimateOneRMBrzycki(80, 8)).toBeCloseTo(99.31, 2);
  });

  test('estimateOneRMBrzycki with reps >= 37 returns 0', () => {
    expect(estimateOneRMBrzycki(80, 37)).toBe(0);
  });

  test('estimateOneRMBrzycki with reps > 37 returns 0', () => {
    expect(estimateOneRMBrzycki(80, 50)).toBe(0);
  });

  test('estimateOneRMBrzycki with 0 weight returns 0', () => {
    expect(estimateOneRMBrzycki(0, 8)).toBe(0);
  });

  test('estimateOneRMBrzycki with 0 reps returns 0', () => {
    expect(estimateOneRMBrzycki(80, 0)).toBe(0);
  });
});

describe('1RM Calculations — estimateOneRM', () => {
  test('returns both formulas + conservative (min) value', () => {
    const result = estimateOneRM(80, 8);
    expect(result).toHaveProperty('epley');
    expect(result).toHaveProperty('brzycki');
    expect(result).toHaveProperty('conservative');
    // conservative should be the min of epley and brzycki
    expect(result.conservative).toBeLessThanOrEqual(result.epley);
    expect(result.conservative).toBeLessThanOrEqual(result.brzycki);
  });

  test('returns 0 when weight or reps invalid', () => {
    expect(estimateOneRM(0, 8)).toEqual({ epley: 0, brzycki: 0, conservative: 0 });
    expect(estimateOneRM(80, 0)).toEqual({ epley: 0, brzycki: 0, conservative: 0 });
  });
});

describe('Weight from 1RM', () => {
  test('calculateWeightFromOneRM with valid inputs', () => {
    // 100 × 0.8 = 80
    expect(calculateWeightFromOneRM(100, 80)).toBe(80);
  });

  test('calculateWeightFromOneRM with invalid oneRM returns 0', () => {
    expect(calculateWeightFromOneRM(0, 80)).toBe(0);
  });

  test('calculateWeightFromOneRM with percentage outside [0,100] returns 0', () => {
    expect(calculateWeightFromOneRM(100, 150)).toBe(0);
    expect(calculateWeightFromOneRM(100, -10)).toBe(0);
  });
});

describe('Weight Rounding', () => {
  const testRounding = (
    weightKg: number,
    incrementKg: number,
    expectedKg: number,
    testName: string
  ) => {
    test(`roundWeightToIncrement(${weightKg}, ${incrementKg}) = ${expectedKg} ${testName}`, () => {
      expect(roundWeightToIncrement(weightKg, incrementKg)).toBe(expectedKg);
    });
  };

  testRounding(87.3, 0.5, 87.5, '0.5 kg increment');
  testRounding(87.3, 1, 87, '1 kg increment');
  testRounding(87.3, 2.5, 87.5, '2.5 kg increment');
  testRounding(87.3, 5, 85, '5 kg increment');
  testRounding(80, 0.5, 80, '0.5 kg increment exact');
  testRounding(80, 1, 80, '1 kg increment exact');
  testRounding(80, 2.5, 80, '2.5 kg increment exact');
  testRounding(80, 5, 80, '5 kg increment exact');
  testRounding(-1, 0.5, 0, 'negative weight returns 0');
  testRounding(10, 0, 10, 'zero increment rounds to Math.round');
});

describe('Plate Calculation', () => {
  const testPlateCalc = (
    targetWeightKg: number,
    barWeightKg: number,
    testName: string
  ) => {
    test(`calculatePlatesForWeight(${targetWeightKg}, ${barWeightKg}) ${testName}`, () => {
      const result = calculatePlatesForWeight(targetWeightKg, barWeightKg);
      expect(result).toBeInstanceOf(Object);
      expect(result).toHaveProperty('achievable');
      expect(result).toHaveProperty('totalWeightKg');
      expect(result).toHaveProperty('perSideKg');
      expect(result).toHaveProperty('plates');
      expect(result).toHaveProperty('barWeightKg', barWeightKg);
    });
  };

  test('plate calc with bar 20kg, target 20kg (just the bar)', () => {
    testPlateCalc(20, 20, 'just the bar');
  });

  test('plate calc with bar 20kg, target 0 returns achievable true', () => {
    const result = calculatePlatesForWeight(0, 20);
    expect(result.achievable).toBe(true);
    expect(result.totalWeightKg).toBe(20);
  });

  test('plate calc with bar 20kg, target 45kg', () => {
    const result = calculatePlatesForWeight(45, 20);
    expect(result.achievable).toBe(true);
    expect(result.totalWeightKg).toBeGreaterThan(40);
    expect(result.totalWeightKg).toBeLessThanOrEqual(50);
  });

  test('plate calc with bar 15kg, target 15kg', () => {
    const result = calculatePlatesForWeight(15, 15);
    expect(result.barWeightKg).toBe(15);
    expect(result.achievable).toBe(true);
  });

  test('formatPlates with empty array returns dash', () => {
    expect(formatPlates([])).toBe('—');
  });

  test('formatPlates with one plate pair displays correctly', () => {
    const plates: PlateCount[] = [{ weightKg: 2.5, count: 2 }];
    expect(formatPlates(plates)).toBe('2 × 2.5 kg');
  });

  test('formatPlates with multiple plates displays correctly', () => {
    const plates: PlateCount[] = [
      { weightKg: 25, count: 1 },
      { weightKg: 10, count: 2 },
      { weightKg: 2.5, count: 4 },
    ];
    expect(formatPlates(plates)).toContain('25 kg');
    expect(formatPlates(plates)).toContain('10 kg');
    expect(formatPlates(plates)).toContain('2.5 kg');
  });
});

describe('Standard Constants', () => {
  test('STANDARD_PLATES_KG contains expected values', () => {
    expect(STANDARD_PLATES_KG).toEqual([
      0.5, 1, 1.25, 2.5, 5, 10, 15, 20, 25,
    ]);
  });

  test('STANDARD_BAR_WEIGHTS_KG contains expected values', () => {
    expect(STANDARD_BAR_WEIGHTS_KG).toEqual([15, 20]);
  });

  test('WEIGHT_INCREMENTS_KG contains expected values', () => {
    expect(WEIGHT_INCREMENTS_KG).toEqual([0.5, 1, 2.5, 5]);
  });
});

describe('formatWeight', () => {
  test('formatWeight with integer returns whole number', () => {
    expect(formatWeight(80)).toBe('80 kg');
  });

  test('formatWeight with decimal returns one decimal', () => {
    expect(formatWeight(80.5)).toBe('80.5 kg');
  });

  test('formatWeight with NaN returns dash', () => {
    expect(formatWeight(NaN)).toBe('—');
  });

  test('formatWeight with zero returns 0 kg', () => {
    expect(formatWeight(0)).toBe('0 kg');
  });
});