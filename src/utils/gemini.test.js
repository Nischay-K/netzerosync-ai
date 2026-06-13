import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Initialize global localStorage BEFORE importing modules to prevent startup crashes
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = String(value); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

// Dynamically import gemini functions after mock setup
const { isGeminiConfigured, chatWithCoach, scanReceipt, verifyQuestPhoto, scanProductCarbon } = await import('./gemini');

describe('Gemini AI Configurations & Mocks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should detect when Gemini is configured via localStorage', () => {
    expect(isGeminiConfigured()).toBe(false);
    localStorage.setItem('ecoSphere_geminiApiKey', 'test-key-xyz');
    expect(isGeminiConfigured()).toBe(true);
  });

  it('should return appropriate mock chat responses when not configured', async () => {
    const userProfile = { displayName: 'Alice', carbonCurrent: 5.4, carbonTarget: 2.5 };
    
    const helloResponse = await chatWithCoach('hello copilot', [], userProfile);
    expect(helloResponse).toContain('Alice');
    expect(helloResponse).toContain('5.4');

    const foodResponse = await chatWithCoach('tell me about food emissions', [], userProfile);
    expect(foodResponse).toContain('emissions');
    expect(foodResponse).toContain('diet');

    const travelResponse = await chatWithCoach('how do i travel green?', [], userProfile);
    expect(travelResponse).toContain('vehicle');
    expect(travelResponse).toContain('emissions');

    const energyResponse = await chatWithCoach('energy usage suggestions', [], userProfile);
    expect(energyResponse).toContain('insulated');
    expect(energyResponse).toContain('vampire');
  });

  it('should return appropriate mock receipt scans when not configured', async () => {
    const groceryResult = await scanReceipt({ name: 'grocery_receipt.jpg' });
    expect(groceryResult.totalCo2).toBe(20.1);
    expect(groceryResult.items.length).toBe(5);

    const energyResult = await scanReceipt({ name: 'electricity_bill.pdf' });
    expect(energyResult.totalCo2).toBe(206.0);
    expect(energyResult.items[0].name).toContain('Electricity');

    const genericResult = await scanReceipt({ name: 'travel_ticket.jpg' });
    expect(genericResult.totalCo2).toBe(12.7);
    expect(genericResult.items[0].name).toContain('Uber');
  });

  it('should return sandbox quest verification successfully', async () => {
    const questResult = await verifyQuestPhoto(null, 'Meat-Free Day');
    expect(questResult.verified).toBe(true);
    expect(questResult.explanation).toContain('Meat-Free Day');
  });

  it('should return sandbox product carbon scans correctly', async () => {
    const plasticResult = await scanProductCarbon({ name: 'water bottle.jpg' });
    expect(plasticResult.productName).toContain('Plastic Bottle');
    expect(plasticResult.carbonImpact).toBe(0.15);
    expect(plasticResult.recommendedOffsetCategory).toBe('Forestry');

    const foodResult = await scanProductCarbon({ name: 'burger.jpg' });
    expect(foodResult.productName).toContain('Burger');
    expect(foodResult.carbonImpact).toBe(4.8);
    expect(foodResult.recommendedOffsetCategory).toBe('Efficiency');

    const boxResult = await scanProductCarbon({ name: 'cardboard box.jpg' });
    expect(boxResult.productName).toContain('Cardboard');
    expect(boxResult.carbonImpact).toBe(0.85);

    const defaultResult = await scanProductCarbon(null);
    expect(defaultResult.carbonImpact).toBe(12.5);
  });
});
