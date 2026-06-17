import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import admin from 'firebase-admin';

// Hoist trackers so they can be referenced inside vi.mock factory and assertions
const mockTrackers = vi.hoisted(() => {
  return {
    updateCalled: 0,
    setCalled: 0,
    verifyIdTokenCalled: 0
  };
});

vi.mock('firebase-admin', async (importOriginal) => {
  const useEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  if (useEmulator) {
    const original = await importOriginal<any>();
    return {
      default: {
        ...original.default,
        auth: vi.fn(() => ({
          verifyIdToken: vi.fn().mockImplementation(async () => {
            mockTrackers.verifyIdTokenCalled++;
            return { uid: 'test-user-123' };
          })
        }))
      }
    };
  }

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
    get: vi.fn().mockImplementation(async (ref: any) => {
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
    update: vi.fn().mockImplementation(() => {
      mockTrackers.updateCalled++;
    }),
    set: vi.fn().mockImplementation(() => {
      mockTrackers.setCalled++;
    })
  };

  const createMockRef = (collectionName: string, id: string): any => {
    return {
      path: `${collectionName}/${id}`,
      get: vi.fn().mockResolvedValue(collectionName === 'challenges' ? mockChallengeDoc : mockUserDoc),
      collection: vi.fn().mockImplementation((sub: string) => createMockRef(`${collectionName}/${id}/${sub}`, '')),
      doc: vi.fn().mockImplementation((docId: string) => createMockRef(`${collectionName}/${id}`, docId))
    };
  };

  const mockFirestore = {
    collection: vi.fn().mockImplementation((col: string) => {
      return {
        doc: vi.fn().mockImplementation((id: string) => createMockRef(col, id))
      };
    }),
    runTransaction: vi.fn().mockImplementation(async (callback: any) => {
      return callback(mockTransaction);
    })
  };

  const mockAuth = {
    verifyIdToken: vi.fn().mockImplementation(async () => {
      mockTrackers.verifyIdTokenCalled++;
      return { uid: 'test-user-123' };
    })
  };

  const mockFirebaseAdmin = {
    initializeApp: vi.fn(),
    firestore: vi.fn(() => mockFirestore),
    auth: vi.fn(() => mockAuth),
    apps: []
  };

  return {
    default: mockFirebaseAdmin
  };
});

const mockGenerativeModel = {
  generateContent: vi.fn().mockResolvedValue({
    response: {
      text: () => "This is a helpful sustainability AI response.",
      candidates: [
        {
          content: {
            parts: [
              { text: "This is a helpful sustainability AI response." }
            ]
          }
        }
      ]
    }
  })
};

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockImplementation(() => mockGenerativeModel)
  }))
}));

vi.mock('@google-cloud/vertexai', () => ({
  VertexAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockImplementation(() => mockGenerativeModel)
  }))
}));

// Set environment variables before loading the server dynamically
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

// Load server dynamically to ensure mock environment takes effect
const { default: app } = await import('./index');

describe('Secure API Gateway Integration Tests', () => {
  beforeAll(async () => {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const db = admin.firestore();
      await db.collection('users').doc('test-user-123').set({
        xp: 1500,
        ecoTokens: 400,
        level: 2,
        carbonCurrent: 6.8,
        completedMissions: [],
        joinedChallenges: []
      });
      await db.collection('challenges').doc('test-challenge').set({
        title: 'Cycle to Work Challenge',
        co2SavedPerMember: 12.0
      });
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockTrackers.updateCalled = 0;
    mockTrackers.setCalled = 0;
    mockTrackers.verifyIdTokenCalled = 0;
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
    expect(mockTrackers.verifyIdTokenCalled).toBeGreaterThan(0);
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
    expect(mockTrackers.updateCalled).toBeGreaterThan(0);
    expect(mockTrackers.setCalled).toBeGreaterThan(0);
  });

  it('supports joining community challenges with counter sharding logic', async () => {
    const res = await request(app)
      .post('/api/challenge/join')
      .set('Authorization', 'Bearer valid-test-token')
      .send({ challengeId: 'test-challenge' });

    expect(res.status).toBe(200);
    expect(res.body.xp).toBe(1550); // 1500 + 50
    expect(mockTrackers.updateCalled).toBeGreaterThan(0);
    expect(mockTrackers.setCalled).toBeGreaterThan(0);
  });
});

