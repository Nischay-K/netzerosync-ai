import { describe, it, expect } from 'vitest';
import {
  calculateUserLevel,
  calculateProductTokenCost,
  calculateFootprint,
  calculateNewCarbonBaseline,
  validateQuestRewards,
  calculateSimulationMetrics,
  FootprintAnswers
} from './calculators';

describe('Centralized Calculators', () => {
  describe('calculateUserLevel', () => {
    it('should calculate levels correctly based on 1000 XP intervals', () => {
      expect(calculateUserLevel(0)).toBe(1);
      expect(calculateUserLevel(500)).toBe(1);
      expect(calculateUserLevel(1000)).toBe(2);
      expect(calculateUserLevel(2500)).toBe(3);
      expect(calculateUserLevel(10000)).toBe(11);
    });
  });

  describe('calculateProductTokenCost', () => {
    it('should calculate token cost with a minimum cap of 5', () => {
      expect(calculateProductTokenCost(0)).toBe(5);
      expect(calculateProductTokenCost(0.2)).toBe(5);
      expect(calculateProductTokenCost(0.5)).toBe(5);
      expect(calculateProductTokenCost(1.2)).toBe(12);
      expect(calculateProductTokenCost(8.55)).toBe(86);
    });
  });

  describe('calculateFootprint', () => {
    it('should calculate standard baseline and target footprints from onboarding answers', () => {
      const answers: FootprintAnswers = {
        transportMode: 'car_petrol',
        distancePerWeek: 100, // 100 * 52 = 5200 km/yr * 0.18 = 936 kg = 0.936 tons
        flightsPerYear: 3, // 3 * 0.3 = 0.9 tons
        // transport: 0.936 + 0.9 = 1.836 tons
        
        dietType: 'meat_heavy', // 3.3 tons
        localFoodPct: 40, // 0.40 * 0.3 = 0.12 reduction
        // food: 3.3 - 0.12 = 3.18 tons
        
        electricityBill: 1600, // 1600 / 8 = 200 kWh/month = 2400 kWh/yr * 0.8 = 1.92 tons
        energySource: 'grid', // factor 0.8
        houseSize: 'medium', // no size adjustment
        // energy: 1.92 tons
        
        shoppingHabit: 'average', // 1.6 tons
        recycleHabit: 'some' // no adjustment
        // shopping: 1.6 tons
      };

      const result = calculateFootprint(answers);
      // Expected total: 1.836 + 3.18 + 1.92 + 1.6 = 8.536 => rounded to 1 decimal = 8.5
      expect(result.total).toBe(8.5);
      expect(result.target).toBe(5.1); // 8.5 * 0.6 = 5.1
      expect(result.breakdown.transport).toBe(1.84);
      expect(result.breakdown.food).toBe(3.18);
      expect(result.breakdown.energy).toBe(1.92);
      expect(result.breakdown.shopping).toBe(1.6);
    });

    it('should adjust energy factors based on energy source and house size', () => {
      const answers: FootprintAnswers = {
        transportMode: 'cycle_walk',
        distancePerWeek: 0,
        flightsPerYear: 0,
        dietType: 'vegan', // 1.4 tons
        localFoodPct: 0,
        electricityBill: 800, // 800/8 = 100 kWh/month = 1200 kWh/yr * 0.05 = 0.06 tons
        energySource: 'solar', // factor 0.05
        houseSize: 'small', // -0.4 tons. Total energy = 0.06 - 0.4 = -0.34, capped at 0.2 tons
        shoppingHabit: 'low', // 0.8 tons
        recycleHabit: 'active' // -0.4 tons. Total shopping = 0.4 tons
      };

      const result = calculateFootprint(answers);
      // Expected total: 0 + 1.4 + 0.2 (energy capped) + 0.4 = 2.0
      expect(result.total).toBe(2.0);
      expect(result.target).toBe(1.2);
    });
  });

  describe('calculateNewCarbonBaseline', () => {
    it('should add/deduct carbon value and cap at 0.1 tons', () => {
      expect(calculateNewCarbonBaseline(6.8, -500)).toBe(6.3);
      expect(calculateNewCarbonBaseline(5.2, 150)).toBe(5.35);
      expect(calculateNewCarbonBaseline(0.2, -1000)).toBe(0.1);
    });
  });

  describe('validateQuestRewards', () => {
    it('should enforce boundary limits on XP and token awards', () => {
      expect(validateQuestRewards(100, 50)).toEqual({ xpAward: 100, tokenAward: 50 });
      expect(validateQuestRewards(600, 1000)).toEqual({ xpAward: 500, tokenAward: 500 });
      expect(validateQuestRewards(-20, -100)).toEqual({ xpAward: 0, tokenAward: 0 });
    });
  });

  describe('calculateSimulationMetrics', () => {
    it('should compute scores and twin metrics accurately', () => {
      const metrics = calculateSimulationMetrics(20, 30, 40, 50, 50, 60, 70, 80);
      
      // currentScore = 50 + 60 + 70 + 80 = 260
      // simScore = 20 + 30 + 40 + 50 = 140
      // calculatedCurrentCO2 = 1.0 + (260 / 400) * 9.0 = 1.0 + 5.85 = 6.85
      // calculatedSimCO2 = 1.0 + (140 / 400) * 9.0 = 1.0 + 3.15 = 4.15
      // co2Saved = 6.85 - 4.15 = 2.70
      // trees = 2.70 * 45 = 121.5 => 122
      // savings = 2.70 * 4200 = 11340
      
      expect(metrics.currentScore).toBe(260);
      expect(metrics.simScore).toBe(140);
      expect(metrics.calculatedCurrentCO2).toBe(6.85);
      expect(metrics.calculatedSimCO2).toBe(4.15);
      expect(metrics.co2Saved).toBe(2.70);
      expect(metrics.treesEquivalent).toBe(122);
      expect(metrics.financialSavings).toBe(11340);
    });
  });
});
