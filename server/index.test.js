import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createRequire } from 'module';

// Use createRequire to get the real Node.js native require and cache
const requireShim = createRequire(import.meta.url);
const firebaseAdminPath = requireShim.resolve('firebase-admin');
const generativeAiPath = requireShim.resolve('@google/generative-ai');

// Setup Mocks
const mockUserDoc = {
  exists: true,
  data: () => ({
    xp: 1500,
    ecoTokens: 400,
    level: 2,
    carbonCurrent: 6.8,
    completedMissions: [],
    joinedChallenges: []
  })
};

const mockChallengeDoc = {
  exists: true,
  data: () => ({
    title: 'Cycle to Work Challenge',
    co2SavedPerMember: 12.0
  })
};

const mockTransaction = {
  get: vi.fn().mockImplementation(async (ref) => {
    if (ref.path.startsWith('users/')) {
      return mockUserDoc;
    }
    if (ref.path.includes('/shards/')) {
      return {
        exists: true,
        data: () => ({ participantCount: 5, current: 60.0 })
      };
    }
    if (ref.path.startsWith('challenges/')) {
      return mockChallengeDoc;
    }
    return { exists: false };
  }),
  update: vi.fn(),
  set: vi.fn()
};

const createMockRef = (collectionName, id) => {
  return {
    path: `${collectionName}/${id}`,
    get: vi.fn().mockResolvedValue(collectionName === 'challenges' ? mockChallengeDoc : mockUserDoc),
    collection: vi.fn().mockImplementation((sub) => createMockRef(`${collectionName}/${id}/${sub}`, '')),
    doc: vi.fn().mockImplementation((docId) => createMockRef(`${collectionName}/${id}`, docId))
  };
};

const mockFirestore = {
  collection: vi.fn().mockImplementation((col) => {
    return {
      doc: vi.fn().mockImplementation((id) => createMockRef(col, id))
    };
  }),
  runTransaction: vi.fn().mockImplementation(async (callback) => {
    return callback(mockTransaction);
  })
};

const mockAuth = {
  verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-user-123' })
};

const mockFirebaseAdmin = {
  initializeApp: vi.fn(),
  firestore: vi.fn(() => mockFirestore),
  auth: vi.fn(() => {
    return mockAuth;
  }),
  apps: []
};

const mockGenerativeAi = {
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockImplementation(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => "This is a helpful sustainability AI response."
        }
      })
    }))
  }))
};

// Inject mocks directly into native Node require.cache
requireShim.cache[firebaseAdminPath] = {
  id: firebaseAdminPath,
  filename: firebaseAdminPath,
  loaded: true,
  exports: mockFirebaseAdmin
};

requireShim.cache[generativeAiPath] = {
  id: generativeAiPath,
  filename: generativeAiPath,
  loaded: true,
  exports: mockGenerativeAi
};

// Set environment variables before loading the server dynamically
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

// Import express app dynamically AFTER require cache injection to avoid ES import hoisting bypasses
const { default: app } = await import('./index');

describe('Secure API Gateway Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthorized requests with 401', async () => {
    const res = await request(app)
      .post('/api/copilot/chat')
      .send({ message: 'Hello' });
    
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('handles chatbot copilot securely for authenticated users', async () => {
    const res = await request(app)
      .post('/api/copilot/chat')
      .set('Authorization', 'Bearer valid-test-token')
      .send({ message: 'How do I save energy?' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('This is a helpful sustainability AI response.');
    expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('valid-test-token');
  });

  it('supports activity logging, updating database transactionally', async () => {
    const res = await request(app)
      .post('/api/activity/log')
      .set('Authorization', 'Bearer valid-test-token')
      .send({
        entry: { co2Value: 1200, name: 'Commute via Petrol Car' },
        logType: 'activity',
        xpReward: 100,
        tokenReward: 50
      });

    expect(res.status).toBe(200);
    expect(res.body.xp).toBe(1600); // 1500 + 100
    expect(res.body.ecoTokens).toBe(450); // 400 + 50
    expect(res.body.level).toBe(2);
    expect(mockTransaction.update).toHaveBeenCalled();
    expect(mockTransaction.set).toHaveBeenCalled();
  });

  it('supports joining community challenges with counter sharding logic', async () => {
    const res = await request(app)
      .post('/api/challenge/join')
      .set('Authorization', 'Bearer valid-test-token')
      .send({ challengeId: 'test-challenge' });

    expect(res.status).toBe(200);
    expect(res.body.xp).toBe(1550); // 1500 + 50
    expect(mockTransaction.update).toHaveBeenCalled();
    expect(mockTransaction.set).toHaveBeenCalled();
  });
});
