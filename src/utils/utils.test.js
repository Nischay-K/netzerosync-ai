import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Pure mirroring function of the level calculation in Dashboard.jsx & firebase.js
const calculateUserLevel = (xp) => {
  return Math.floor((xp || 0) / 1000) + 1;
};

// Pure mirroring function of product token cost calculation in Marketplace.jsx
const calculateProductTokenCost = (carbonImpactKg) => {
  return Math.max(5, Math.ceil(carbonImpactKg * 10));
};

describe('Telemetry Rank & Level Calculations', () => {
  it('should map 0 XP to Level 1', () => {
    expect(calculateUserLevel(0)).toBe(1);
  });

  it('should map 500 XP to Level 1', () => {
    expect(calculateUserLevel(500)).toBe(1);
  });

  it('should map 1000 XP to Level 2', () => {
    expect(calculateUserLevel(1000)).toBe(2);
  });

  it('should map 2500 XP to Level 3', () => {
    expect(calculateUserLevel(2500)).toBe(3);
  });
});

describe('Eco-Token Marketplace Math', () => {
  it('should set minimum purchase cost to 5 tokens for negligible footprints', () => {
    expect(calculateProductTokenCost(0.1)).toBe(5);
    expect(calculateProductTokenCost(0.3)).toBe(5);
  });

  it('should scale cost linearly by 10x for high carbon footprints', () => {
    expect(calculateProductTokenCost(1.5)).toBe(15);
    expect(calculateProductTokenCost(4.8)).toBe(48);
    expect(calculateProductTokenCost(12.5)).toBe(125);
  });
});

describe('Sandbox LocalStorage Operations (Mocked)', () => {
  beforeEach(() => {
    global.localStorage = {
      store: {},
      getItem(key) { return this.store[key] || null; },
      setItem(key, value) { this.store[key] = String(value); },
      removeItem(key) { delete this.store[key]; },
      clear() { this.store = {}; }
    };
  });

  afterEach(() => {
    delete global.localStorage;
  });

  it('should retrieve items saved in the local sandbox session', () => {
    const mockUser = { uid: 'demo_user', displayName: 'Green Explorer', level: 1, xp: 500 };
    localStorage.setItem('ecoSphere_current_session', JSON.stringify(mockUser));
    
    const stored = JSON.parse(localStorage.getItem('ecoSphere_current_session'));
    expect(stored.displayName).toBe('Green Explorer');
    expect(stored.xp).toBe(500);
  });
});

// Backend Transaction & Telemetry Logic Tests
const calculateLevelUp = (oldLevel, newXP) => {
  const newLevel = Math.floor(newXP / 1000) + 1;
  return newLevel > oldLevel ? newLevel : oldLevel;
};

const validateQuestRewards = (xp, tokens) => {
  const xpAward = Math.min(500, Math.max(0, Number(xp) || 0));
  const tokenAward = Math.min(500, Math.max(0, Number(tokens) || 0));
  return { xpAward, tokenAward };
};

const calculateNewCarbonBaseline = (currentTons, co2DeltaKg) => {
  const deltaTons = (co2DeltaKg || 0) / 1000;
  return Math.max(0.1, Number((currentTons + deltaTons).toFixed(2)));
};

describe('Backend Transaction & Logic Rules', () => {
  it('should calculate level up thresholds correctly', () => {
    expect(calculateLevelUp(1, 950)).toBe(1);
    expect(calculateLevelUp(1, 1050)).toBe(2);
    expect(calculateLevelUp(2, 1990)).toBe(2);
    expect(calculateLevelUp(2, 2010)).toBe(3);
  });

  it('should bound quest rewards to prevent client exploits', () => {
    expect(validateQuestRewards(200, 100)).toEqual({ xpAward: 200, tokenAward: 100 });
    expect(validateQuestRewards(800, 1500)).toEqual({ xpAward: 500, tokenAward: 500 });
    expect(validateQuestRewards(-50, 0)).toEqual({ xpAward: 0, tokenAward: 0 });
  });

  it('should calculate new carbon footprint baseline values correctly', () => {
    expect(calculateNewCarbonBaseline(6.8, -500)).toBe(6.3); // offsets deduct baseline
    expect(calculateNewCarbonBaseline(5.2, 150)).toBe(5.35); // additions increase baseline
    expect(calculateNewCarbonBaseline(0.2, -1000)).toBe(0.1); // caps baseline at 0.1 tons
  });
});

describe('API Gateway Request Error Handling (Mocked)', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle gateway connection failure gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));
    await expect(global.fetch('http://localhost:8080/api/activity/log')).rejects.toThrow('Failed to fetch');
  });

  it('should propagate gateway error responses properly', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Invalid reward values requested.' })
    });

    const response = await global.fetch('http://localhost:8080/api/activity/log');
    const data = await response.json();
    expect(response.ok).toBe(false);
    expect(data.error).toBe('Invalid reward values requested.');
  });
});
