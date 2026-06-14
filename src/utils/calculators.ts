/**
 * Centralized pure mathematical calculations for NetZeroSync AI
 */

export interface FootprintAnswers {
  distancePerWeek?: string | number;
  transportMode?: string;
  flightsPerYear?: string | number;
  dietType?: string;
  localFoodPct?: string | number;
  electricityBill?: string | number;
  energySource?: string;
  houseSize?: string;
  shoppingHabit?: string;
  recycleHabit?: string;
  vehicleType?: string;
  gridRegion?: string;
}

export interface FootprintResult {
  total: number;
  target: number;
  breakdown: {
    transport: number;
    food: number;
    energy: number;
    shopping: number;
  };
}

export interface QuestRewards {
  xpAward: number;
  tokenAward: number;
}

export interface SimulationMetrics {
  currentScore: number;
  simScore: number;
  calculatedCurrentCO2: number;
  calculatedSimCO2: number;
  co2Saved: number;
  treesEquivalent: number;
  financialSavings: number;
}

/**
 * Calculate user level based on accumulated XP
 */
export const calculateUserLevel = (xp: number): number => {
  return Math.floor((xp || 0) / 1000) + 1;
};

/**
 * Calculate token cost for purchasing offsets in the marketplace
 */
export const calculateProductTokenCost = (carbonImpactKg: number): number => {
  return Math.max(5, Math.ceil((carbonImpactKg || 0) * 10));
};

/**
 * Calculate baseline carbon footprint from onboarding answers
 */
export const calculateFootprint = (answers: FootprintAnswers): FootprintResult => {
  let transportEmissions = 0;
  let foodEmissions = 0;
  let energyEmissions: number;
  let shoppingEmissions: number;

  // Car size modifiers (dynamic vehicle classification)
  let vehicleMultiplier = 1.0;
  if (answers.vehicleType === 'suv') vehicleMultiplier = 1.35;
  else if (answers.vehicleType === 'hybrid') vehicleMultiplier = 0.7;
  else if (answers.vehicleType === 'compact') vehicleMultiplier = 0.8;

  // Grid/Regional coefficients (dynamic regional emission factors)
  let energyMultiplier = 1.0;
  if (answers.gridRegion === 'coal_heavy') energyMultiplier = 1.25;
  else if (answers.gridRegion === 'renewable_heavy') energyMultiplier = 0.35;

  // 1. Transport (tons CO2 per year)
  const weeklyKm = Number(answers.distancePerWeek) || 0;
  const yearlyKm = weeklyKm * 52;
  if (answers.transportMode === 'car_petrol') {
    transportEmissions = (yearlyKm * 0.18 * vehicleMultiplier) / 1000;
  } else if (answers.transportMode === 'car_electric') {
    // Electric cars also depend on regional grid charging mixes
    transportEmissions = (yearlyKm * 0.05 * energyMultiplier) / 1000;
  } else if (answers.transportMode === 'public') {
    transportEmissions = (yearlyKm * 0.04) / 1000;
  }
  
  // Flights
  transportEmissions += ((Number(answers.flightsPerYear) || 0) * 0.3);

  // 2. Food
  if (answers.dietType === 'meat_heavy') foodEmissions = 3.3;
  else if (answers.dietType === 'meat_average') foodEmissions = 2.5;
  else if (answers.dietType === 'vegetarian') foodEmissions = 1.7;
  else if (answers.dietType === 'vegan') foodEmissions = 1.4;
  
  // Sourcing offset
  foodEmissions -= ((Number(answers.localFoodPct) || 0) / 100) * 0.3;

  // 3. Home Energy
  const estimatedKwhYr = ((Number(answers.electricityBill) || 0) / 8) * 12;
  let factor = 0.8 * energyMultiplier; // Apply regional grid coefficient
  if (answers.energySource === 'solar') factor = 0.05;
  else if (answers.energySource === 'mixed') factor = 0.4 * energyMultiplier;
  energyEmissions = (estimatedKwhYr * factor) / 1000;
  
  // House size adjustment
  if (answers.houseSize === 'large') energyEmissions += 1.2;
  else if (answers.houseSize === 'small') energyEmissions -= 0.4;
  energyEmissions = Math.max(0.2, energyEmissions);

  // 4. Shopping & Waste
  if (answers.shoppingHabit === 'high') shoppingEmissions = 2.8;
  else if (answers.shoppingHabit === 'average') shoppingEmissions = 1.6;
  else shoppingEmissions = 0.8;

  if (answers.recycleHabit === 'active') shoppingEmissions -= 0.4;
  else if (answers.recycleHabit === 'none') shoppingEmissions += 0.2;

  const total = Number((transportEmissions + foodEmissions + energyEmissions + shoppingEmissions).toFixed(1));
  const target = Number((total * 0.6).toFixed(1));

  return { 
    total, 
    target, 
    breakdown: { 
      transport: Number(transportEmissions.toFixed(2)), 
      food: Number(foodEmissions.toFixed(2)), 
      energy: Number(energyEmissions.toFixed(2)), 
      shopping: Number(shoppingEmissions.toFixed(2)) 
    } 
  };
};

/**
 * Calculate the adjusted carbon baseline when logging habit additions or deductions (offsets)
 */
export const calculateNewCarbonBaseline = (currentTons: number, co2DeltaKg: number): number => {
  const deltaTons = (co2DeltaKg || 0) / 1000;
  return Math.max(0.1, Number((currentTons + deltaTons).toFixed(2)));
};

/**
 * Sanitize and validate quest rewards against exploit limits (max 500)
 */
export const validateQuestRewards = (xp: number | string, tokens: number | string): QuestRewards => {
  const xpAward = Math.min(500, Math.max(0, Number(xp) || 0));
  const tokenAward = Math.min(500, Math.max(0, Number(tokens) || 0));
  return { xpAward, tokenAward };
};

/**
 * Calculate carbon reductions, tree equivalents and financial gains for the simulation twin
 */
export const calculateSimulationMetrics = (
  simTransport: number,
  simDiet: number,
  simEnergy: number,
  simShopping: number,
  currentTransport: number,
  currentDiet: number,
  currentEnergy: number,
  currentShopping: number
): SimulationMetrics => {
  const currentScore = currentTransport + currentDiet + currentEnergy + currentShopping;
  const simScore = simTransport + simDiet + simEnergy + simShopping;

  const calculatedCurrentCO2 = Number((1.0 + (currentScore / 400) * 9.0).toFixed(2));
  const calculatedSimCO2 = Number((1.0 + (simScore / 400) * 9.0).toFixed(2));
  
  const co2Saved = Math.max(0, Number((calculatedCurrentCO2 - calculatedSimCO2).toFixed(2)));
  const treesEquivalent = Math.round(co2Saved * 45);
  const financialSavings = Math.round(co2Saved * 4200);

  return {
    currentScore,
    simScore,
    calculatedCurrentCO2,
    calculatedSimCO2,
    co2Saved,
    treesEquivalent,
    financialSavings
  };
};
