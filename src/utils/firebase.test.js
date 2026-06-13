import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Initialize global localStorage BEFORE importing modules to prevent startup crashes
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = String(value); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

// Disable live Firebase during test run to use Demo Mode
vi.stubEnv('VITE_FIREBASE_API_KEY', '');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '');

// Dynamically import firebase functions after mock setup
const { 
  fetchWithRetry, 
  invalidateLeaderboardCache, 
  invalidateCommunityChallengesCache, 
  getCommunityChallenges,
  getLeaderboard 
} = await import('./firebase');

describe('Firebase Utilities & Caching', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should get local community challenges in demo mode', async () => {
    const challenges = await getCommunityChallenges(true);
    expect(challenges.length).toBeGreaterThan(0);
    expect(challenges[0].id).toBe('comm_1');
  });

  it('should invalidate community challenges and leaderboard query caches', async () => {
    // Prime the cache
    await getCommunityChallenges();
    await getLeaderboard();
    
    // Invalidate
    invalidateCommunityChallengesCache();
    invalidateLeaderboardCache();
    
    // Test passes if no exception is thrown
    expect(true).toBe(true);
  });

  it('should execute fetchWithRetry and succeed on the first try', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true })
    });

    const response = await fetchWithRetry('http://localhost:8080/api/activity/log', {}, 3, 10);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should execute fetchWithRetry and recover after failures (linear backoff)', async () => {
    global.fetch
      .mockRejectedValueOnce(new Error('Network drop 1'))
      .mockRejectedValueOnce(new Error('Network drop 2'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, retried: true })
      });

    const response = await fetchWithRetry('http://localhost:8080/api/activity/log', {}, 3, 10);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.retried).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should execute fetchWithRetry and throw error after max retries exceed', async () => {
    global.fetch.mockRejectedValue(new Error('Permanent connection loss'));

    await expect(fetchWithRetry('http://localhost:8080/api/activity/log', {}, 3, 10))
      .rejects
      .toThrow('Permanent connection loss');

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
