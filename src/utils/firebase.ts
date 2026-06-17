import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  Auth,
  User,
  connectAuthEmulator
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Firestore,
  connectFirestoreEmulator
} from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  level: number;
  xp: number;
  ecoTokens: number;
  carbonTarget: number;
  carbonCurrent: number;
  twinState: {
    transportSlider: number;
    dietSlider: number;
    energySlider: number;
    shoppingSlider: number;
  };
  completedMissions: string[];
  joinedChallenges: string[];
}

export interface CarbonEntry {
  co2Value: number;
  timestamp?: string;
  userId?: string;
  [key: string]: any;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  goal: number;
  current: number;
  rewardXP: number;
  participantCount: number;
  co2SavedPerMember: number;
}

export interface LeaderboardUser {
  uid: string;
  displayName: string;
  xp: number;
  level: number;
  carbonCurrent: number;
}

let auth: Auth | null = null;
let db: Firestore | null = null;
let isFirebaseConnected = false;

// Attempt to load Firebase config from localStorage or env
const getFirebaseConfig = () => {
  const localConfig = localStorage.getItem('ecoSphere_firebaseConfig');
  if (localConfig) {
    try {
      return JSON.parse(localConfig);
    } catch {
      return null;
    }
  }
  // Try fallback to Vite env variables
  if (import.meta.env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
  }
  return null;
};

const config = getFirebaseConfig();

if (config && config.apiKey && config.projectId) {
  try {
    const app: FirebaseApp = getApps().length === 0 ? initializeApp(config) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    
    if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log("EcoSphere: Connected to Local Firebase Emulators.");
    }
    
    isFirebaseConnected = true;
    console.log("EcoSphere: Connected to live Firebase backend.");
  } catch (e) {
    console.error("EcoSphere: Failed to initialize live Firebase.", e);
  }
} else {
  console.log("EcoSphere: No Firebase config found. Running in Local Demo Mode.");
}

// -------------------------------------------------------------
// LOCAL DEMO ENGINE (FALLBACK)
// -------------------------------------------------------------
const getLocalUsers = (): Record<string, any> => JSON.parse(localStorage.getItem('ecoSphere_users') || '{}');
const saveLocalUsers = (users: Record<string, any>) => localStorage.setItem('ecoSphere_users', JSON.stringify(users));

const getLocalLogs = (): any[] => JSON.parse(localStorage.getItem('ecoSphere_logs') || '[]');
const saveLocalLogs = (logs: any[]) => localStorage.setItem('ecoSphere_logs', JSON.stringify(logs));

const getLocalChallenges = (): Challenge[] => {
  const defaultChallenges: Challenge[] = [
    { id: 'comm_1', title: 'Park the Car Weekend', description: 'Swap driving for cycling or walking this weekend.', goal: 1000, current: 480, rewardXP: 250, participantCount: 12, co2SavedPerMember: 15 },
    { id: 'comm_2', title: 'Veggie Power Week', description: 'Eat plant-based dinners for 7 days consecutive.', goal: 2500, current: 1820, rewardXP: 400, participantCount: 28, co2SavedPerMember: 22 },
    { id: 'comm_3', title: 'Digital Carbon Cleanse', description: 'Turn off non-essential screen time for 2 hours daily.', goal: 500, current: 120, rewardXP: 150, participantCount: 8, co2SavedPerMember: 4 }
  ];
  const local = localStorage.getItem('ecoSphere_challenges');
  if (!local) {
    localStorage.setItem('ecoSphere_challenges', JSON.stringify(defaultChallenges));
    return defaultChallenges;
  }
  return JSON.parse(local);
};
const saveLocalChallenges = (ch: Challenge[]) => localStorage.setItem('ecoSphere_challenges', JSON.stringify(ch));

// Mock authentication listeners
const demoAuthListeners = new Set<(user: any) => void>();
let demoCurrentUser: UserProfile | null = null;

// Load stored demo session
const storedDemoUser = localStorage.getItem('ecoSphere_current_session');
if (storedDemoUser) {
  try {
    demoCurrentUser = JSON.parse(storedDemoUser);
  } catch {
    demoCurrentUser = null;
  }
}

// -------------------------------------------------------------
// EXPORTED API WRAPPER
// -------------------------------------------------------------

export { isFirebaseConnected };

// Authentication Functions
export const signUp = async (email: string, password: string, displayName: string): Promise<any> => {
  if (isFirebaseConnected && auth && db) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    
    // Set up default Firestore user profile
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const initialProfile: UserProfile = {
      uid: userCredential.user.uid,
      displayName,
      email,
      level: 1,
      xp: 0,
      ecoTokens: 500, // Virtual carbon credits currency
      carbonTarget: 3.5, // tons per year target
      carbonCurrent: 6.8, // average baseline
      twinState: {
        transportSlider: 50,
        dietSlider: 50,
        energySlider: 50,
        shoppingSlider: 50
      },
      completedMissions: [],
      joinedChallenges: []
    };
    await setDoc(userDocRef, initialProfile);
    return userCredential.user;
  } else {
    // Demo implementation
    const users = getLocalUsers();
    if (users[email]) {
      throw new Error("User already exists.");
    }
    const uid = 'demo_' + Math.random().toString(36).substr(2, 9);
    const newProfile: UserProfile = {
      uid,
      displayName,
      email,
      level: 1,
      xp: 0,
      ecoTokens: 500,
      carbonTarget: 3.5,
      carbonCurrent: 6.8,
      twinState: {
        transportSlider: 50,
        dietSlider: 50,
        energySlider: 50,
        shoppingSlider: 50
      },
      completedMissions: [],
      joinedChallenges: []
    };
    users[uid] = { email, password, profile: newProfile };
    users[email] = uid; // mapping email to uid
    saveLocalUsers(users);
    
    demoCurrentUser = newProfile;
    localStorage.setItem('ecoSphere_current_session', JSON.stringify(demoCurrentUser));
    demoAuthListeners.forEach(cb => cb(demoCurrentUser));
    return demoCurrentUser;
  }
};

export const signIn = async (email: string, password: string): Promise<any> => {
  if (isFirebaseConnected && auth) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } else {
    const users = getLocalUsers();
    const uid = users[email];
    if (!uid || users[uid].password !== password) {
      throw new Error("Invalid email or password.");
    }
    demoCurrentUser = users[uid].profile;
    localStorage.setItem('ecoSphere_current_session', JSON.stringify(demoCurrentUser));
    demoAuthListeners.forEach(cb => cb(demoCurrentUser));
    return demoCurrentUser;
  }
};

export const signInWithGoogle = async (): Promise<any> => {
  if (isFirebaseConnected && auth && db) {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    
    // Set up or retrieve profile in Firestore
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      const initialProfile: UserProfile = {
        uid: userCredential.user.uid,
        displayName: userCredential.user.displayName || 'Eco Explorer',
        email: userCredential.user.email || '',
        level: 1,
        xp: 0,
        ecoTokens: 500,
        carbonTarget: 3.5,
        carbonCurrent: 6.8,
        twinState: {
          transportSlider: 50,
          dietSlider: 50,
          energySlider: 50,
          shoppingSlider: 50
        },
        completedMissions: [],
        joinedChallenges: []
      };
      await setDoc(userDocRef, initialProfile);
      return { ...userCredential.user, ...initialProfile };
    }
    return { ...userCredential.user, ...userDoc.data() };
  } else {
    // Sandbox Google Login
    demoCurrentUser = {
      uid: 'demo_google_123',
      displayName: 'Google Explorer',
      email: 'explorer@gmail.com',
      level: 1,
      xp: 0,
      ecoTokens: 500,
      carbonTarget: 3.5,
      carbonCurrent: 6.8,
      twinState: {
        transportSlider: 50,
        dietSlider: 50,
        energySlider: 50,
        shoppingSlider: 50
      },
      completedMissions: [],
      joinedChallenges: []
    };
    localStorage.setItem('ecoSphere_current_session', JSON.stringify(demoCurrentUser));
    demoAuthListeners.forEach(cb => cb(demoCurrentUser));
    return demoCurrentUser;
  }
};

export const signOut = async (): Promise<void> => {
  if (isFirebaseConnected && auth) {
    await firebaseSignOut(auth);
  } else {
    demoCurrentUser = null;
    localStorage.removeItem('ecoSphere_current_session');
    demoAuthListeners.forEach(cb => cb(null));
  }
};

export const onAuthStateChanged = (callback: (user: any) => void): (() => void) => {
  if (isFirebaseConnected && auth && db) {
    return firebaseOnAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          // Fetch full profile from Firestore
          const userDocRef = doc(db as Firestore, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const profile = userDoc.data() as UserProfile;
            if (profile.ecoTokens === undefined) {
              profile.ecoTokens = 500;
            }
            callback({ ...fbUser, ...profile });
          } else {
            // If Firestore profile doesn't exist, create one
            const defaultProfile: UserProfile = {
              uid: fbUser.uid,
              displayName: fbUser.displayName || 'Eco Warrior',
              email: fbUser.email || '',
              level: 1,
              xp: 0,
              ecoTokens: 500,
              carbonTarget: 3.5,
              carbonCurrent: 6.8,
              twinState: {
                transportSlider: 50,
                dietSlider: 50,
                energySlider: 50,
                shoppingSlider: 50
              },
              completedMissions: [],
              joinedChallenges: []
            };
            await setDoc(userDocRef, defaultProfile);
            callback({ ...fbUser, ...defaultProfile });
          }
        } else {
          callback(null);
        }
      } catch (err) {
        console.error("EcoSphere onAuthStateChanged error:", err);
        // Fail gracefully to the login console instead of loading forever
        callback(null);
      }
    });
  } else {
    demoAuthListeners.add(callback);
    // Call immediately with current state
    if (demoCurrentUser && demoCurrentUser.ecoTokens === undefined) {
      demoCurrentUser.ecoTokens = 500;
    }
    callback(demoCurrentUser);
    return () => {
      demoAuthListeners.delete(callback);
    };
  }
};

// Database Profile operations
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (isFirebaseConnected && db) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
  } else {
    const users = getLocalUsers();
    return users[uid] ? (users[uid].profile as UserProfile) : null;
  }
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  if (isFirebaseConnected && db) {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, data);
  } else {
    const users = getLocalUsers();
    if (users[uid]) {
      users[uid].profile = { ...users[uid].profile, ...data };
      saveLocalUsers(users);
      if (demoCurrentUser && demoCurrentUser.uid === uid) {
        demoCurrentUser = users[uid].profile;
        localStorage.setItem('ecoSphere_current_session', JSON.stringify(demoCurrentUser));
      }
    }
  }
};

// Add XP Helper
export const addXP = async (uid: string, amount: number): Promise<void> => {
  if (isFirebaseConnected && db) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const currentData = docSnap.data() as UserProfile;
      const newXP = (currentData.xp || 0) + amount;
      const newLevel = Math.floor(newXP / 1000) + 1; // 1000 XP per level
      const updates: Partial<UserProfile> = { xp: newXP };
      if (newLevel > (currentData.level || 1)) {
        updates.level = newLevel;
      }
      await updateDoc(docRef, updates);
    }
  } else {
    const users = getLocalUsers();
    if (users[uid]) {
      const profile = users[uid].profile as UserProfile;
      profile.xp = (profile.xp || 0) + amount;
      const newLevel = Math.floor(profile.xp / 1000) + 1;
      if (newLevel > (profile.level || 1)) {
        profile.level = newLevel;
      }
      users[uid].profile = profile;
      saveLocalUsers(users);
      if (demoCurrentUser && demoCurrentUser.uid === uid) {
        demoCurrentUser = profile;
        localStorage.setItem('ecoSphere_current_session', JSON.stringify(demoCurrentUser));
      }
    }
  }
};

// Generic fetch retry helper with linear backoff (max 3 retries, starting at 1000ms delay)
export const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3, delay = 1000): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (i < retries - 1) {
        console.warn(`Gateway connection failed. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay += 1000;
        continue;
      }
      throw error;
    }
  }
  throw new Error("fetchWithRetry maximum retries exceeded");
};

// Log Carbon Activities
export const logCarbonEntry = async (uid: string, entry: CarbonEntry, options: any = {}): Promise<any> => {
  const newEntry = {
    ...entry,
    userId: uid,
    timestamp: new Date().toISOString()
  };

  if (isFirebaseConnected && auth) {
    try {
      if (auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken(true);
        const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080';
        
        const response = await fetchWithRetry(`${gatewayUrl}/api/activity/log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            entry,
            ...options
          })
        });

        if (response.ok) {
          const updatedStats = await response.json();
          console.log("Activity logged securely via API Gateway:", updatedStats);
          invalidateLeaderboardCache();
          return updatedStats;
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Gateway returned an error.');
        }
      }
    } catch (error) {
      console.error("API Gateway carbon logging failed:", error);
      throw error;
    }
  } else {
    const logs = getLocalLogs();
    logs.push(newEntry);
    saveLocalLogs(logs);

    // Update local profile
    const users = getLocalUsers();
    if (users[uid]) {
      const profile = users[uid].profile as UserProfile;
      const totalDaily = profile.carbonCurrent || 6.8;
      const carbonDelta = (entry.co2Value || 0) / 1000;
      profile.carbonCurrent = Math.max(0.1, Number((totalDaily + carbonDelta).toFixed(2)));

      // Perform local sandbox rewards/deductions
      if (options.logType === 'quest') {
        profile.xp = (profile.xp || 0) + (options.questXP || 0);
        profile.ecoTokens = (profile.ecoTokens || 0) + (options.questTokens || 0);
        if (options.questId && !profile.completedMissions.includes(options.questId)) {
          profile.completedMissions.push(options.questId);
        }
      } else if (options.logType === 'offset') {
        profile.ecoTokens = Math.max(0, (profile.ecoTokens || 0) - (options.tokenCost || 0));
      } else {
        const xpAward = options.xpReward !== undefined ? Number(options.xpReward) : 100;
        const tokenAward = options.tokenReward !== undefined ? Number(options.tokenReward) : 50;
        profile.xp = (profile.xp || 0) + xpAward;
        profile.ecoTokens = (profile.ecoTokens || 0) + tokenAward;
      }

      const newLevel = Math.floor(profile.xp / 1000) + 1;
      if (newLevel > (profile.level || 1)) {
        profile.level = newLevel;
      }

      users[uid].profile = profile;
      saveLocalUsers(users);
      if (demoCurrentUser && demoCurrentUser.uid === uid) {
        demoCurrentUser = profile;
        localStorage.setItem('ecoSphere_current_session', JSON.stringify(demoCurrentUser));
      }
      return profile;
    }
  }
};

export const getCarbonLogs = async (uid: string): Promise<any[]> => {
  if (isFirebaseConnected && db) {
    const logsCol = collection(db, 'carbonLogs');
    const q = query(logsCol, where('userId', '==', uid), orderBy('timestamp', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);
    const logs: any[] = [];
    querySnapshot.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() });
    });
    return logs;
  } else {
    const logs = getLocalLogs();
    return logs.filter(l => l.userId === uid).reverse();
  }
};

// In-memory cache for community and leaderboard queries (expires after 30 seconds)
let communityChallengesCache: Challenge[] | null = null;
let communityChallengesCacheTime = 0;

let leaderboardCache: LeaderboardUser[] | null = null;
let leaderboardCacheTime = 0;

const CACHE_EXPIRY_MS = 30000; // 30 seconds cache TTL

export const invalidateLeaderboardCache = () => {
  leaderboardCache = null;
};

export const invalidateCommunityChallengesCache = () => {
  communityChallengesCache = null;
  leaderboardCache = null;
};

// Global Community Challenges Operations
export const getCommunityChallenges = async (forceRefresh = false): Promise<Challenge[]> => {
  const now = Date.now();
  if (!forceRefresh && communityChallengesCache && (now - communityChallengesCacheTime < CACHE_EXPIRY_MS)) {
    return communityChallengesCache;
  }

  if (isFirebaseConnected && db) {
    const colSnap = await getDocs(collection(db, 'challenges'));
    const ch: Challenge[] = [];
    for (const d of colSnap.docs) {
      const challengeData = d.data();
      const shardsCol = collection(db, 'challenges', d.id, 'shards');
      const shardsSnap = await getDocs(shardsCol);
      let participantCount = 0;
      let current = 0;
      shardsSnap.forEach(s => {
        const sData = s.data();
        participantCount += (sData.participantCount || 0);
        current += (sData.current || 0);
      });
      ch.push({
        id: d.id,
        title: challengeData.title || '',
        description: challengeData.description || '',
        goal: challengeData.goal || 0,
        rewardXP: challengeData.rewardXP || 0,
        co2SavedPerMember: challengeData.co2SavedPerMember || 0,
        participantCount: participantCount || challengeData.participantCount || 0,
        current: current || challengeData.current || 0
      });
    }
    communityChallengesCache = ch;
    communityChallengesCacheTime = now;
    return ch;
  } else {
    const ch = getLocalChallenges();
    communityChallengesCache = ch;
    communityChallengesCacheTime = now;
    return ch;
  }
};

export const joinCommunityChallenge = async (uid: string, challengeId: string): Promise<any> => {
  invalidateCommunityChallengesCache();
  
  if (isFirebaseConnected && auth) {
    try {
      if (auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken(true);
        const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080';
        
        const response = await fetchWithRetry(`${gatewayUrl}/api/challenge/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ challengeId })
        });

        if (response.ok) {
          const updatedUser = await response.json();
          console.log("Challenge joined securely via API Gateway:", updatedUser);
          return updatedUser;
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Gateway returned an error while joining challenge.');
        }
      }
    } catch (error) {
      console.error("API Gateway challenge joining failed:", error);
      throw error;
    }
  } else {
    const users = getLocalUsers();
    if (users[uid]) {
      const profile = users[uid].profile as UserProfile;
      if (!profile.joinedChallenges.includes(challengeId)) {
        profile.joinedChallenges.push(challengeId);
        
        // Award joining bonus of 50 XP
        profile.xp = (profile.xp || 0) + 50;
        const newLevel = Math.floor(profile.xp / 1000) + 1;
        if (newLevel > (profile.level || 1)) {
          profile.level = newLevel;
        }

        users[uid].profile = profile;
        saveLocalUsers(users);
        
        // Update challenge lists
        const challenges = getLocalChallenges();
        const chIdx = challenges.findIndex(c => c.id === challengeId);
        if (chIdx !== -1) {
          challenges[chIdx].participantCount += 1;
          challenges[chIdx].current = Math.min(challenges[chIdx].goal, challenges[chIdx].current + challenges[chIdx].co2SavedPerMember);
          saveLocalChallenges(challenges);
        }
        
        if (demoCurrentUser && demoCurrentUser.uid === uid) {
          demoCurrentUser = profile;
          localStorage.setItem('ecoSphere_current_session', JSON.stringify(demoCurrentUser));
        }
        return profile;
      }
    }
  }
};

// Global Leaderboards
export const getLeaderboard = async (forceRefresh = false): Promise<LeaderboardUser[]> => {
  const now = Date.now();
  if (!forceRefresh && leaderboardCache && (now - leaderboardCacheTime < CACHE_EXPIRY_MS)) {
    return leaderboardCache;
  }

  if (isFirebaseConnected && db) {
    const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(10));
    const snap = await getDocs(q);
    const leaders: LeaderboardUser[] = [];
    snap.forEach(d => {
      const data = d.data();
      leaders.push({
        uid: d.id,
        displayName: data.displayName || 'Eco Explorer',
        xp: data.xp || 0,
        level: data.level || 1,
        carbonCurrent: data.carbonCurrent || 6.8
      });
    });
    leaderboardCache = leaders;
    leaderboardCacheTime = now;
    return leaders;
  } else {
    const users = getLocalUsers();
    const leaders: LeaderboardUser[] = [];
    Object.keys(users).forEach(key => {
      // Skip strings that map emails to uids
      if (typeof users[key] === 'object') {
        const profile = users[key].profile as UserProfile;
        leaders.push({
          uid: profile.uid,
          displayName: profile.displayName,
          xp: profile.xp,
          level: profile.level,
          carbonCurrent: profile.carbonCurrent
        });
      }
    });
    // Add some realistic mock profiles if leaderboard is too empty
    if (leaders.length < 3) {
      leaders.push(
        { uid: 'mock_1', displayName: 'Aria Green', xp: 4200, level: 5, carbonCurrent: 2.1 },
        { uid: 'mock_2', displayName: 'Liam Forrester', xp: 2850, level: 3, carbonCurrent: 3.4 },
        { uid: 'mock_3', displayName: 'Sophie Sun', xp: 1900, level: 2, carbonCurrent: 4.8 }
      );
    }
    const sortedLeaders = leaders.sort((a, b) => b.xp - a.xp);
    leaderboardCache = sortedLeaders;
    leaderboardCacheTime = now;
    return sortedLeaders;
  }
};
