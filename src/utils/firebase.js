import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
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
  limit
} from 'firebase/firestore';

let auth = null;
let db = null;
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
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
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
const getLocalUsers = () => JSON.parse(localStorage.getItem('ecoSphere_users') || '{}');
const saveLocalUsers = (users) => localStorage.setItem('ecoSphere_users', JSON.stringify(users));

const getLocalLogs = () => JSON.parse(localStorage.getItem('ecoSphere_logs') || '[]');
const saveLocalLogs = (logs) => localStorage.setItem('ecoSphere_logs', JSON.stringify(logs));

const getLocalChallenges = () => {
  const defaultChallenges = [
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
const saveLocalChallenges = (ch) => localStorage.setItem('ecoSphere_challenges', JSON.stringify(ch));

// Mock authentication listeners
const demoAuthListeners = new Set();
let demoCurrentUser = null;

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
export const signUp = async (email, password, displayName) => {
  if (isFirebaseConnected) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    
    // Set up default Firestore user profile
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const initialProfile = {
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
    const newProfile = {
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

export const signIn = async (email, password) => {
  if (isFirebaseConnected) {
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

export const signInWithGoogle = async () => {
  if (isFirebaseConnected) {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    
    // Set up or retrieve profile in Firestore
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      const initialProfile = {
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

export const signOut = async () => {
  if (isFirebaseConnected) {
    await firebaseSignOut(auth);
  } else {
    demoCurrentUser = null;
    localStorage.removeItem('ecoSphere_current_session');
    demoAuthListeners.forEach(cb => cb(null));
  }
};

export const onAuthStateChanged = (callback) => {
  if (isFirebaseConnected) {
    return firebaseOnAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          // Fetch full profile from Firestore
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const profile = userDoc.data();
            if (profile.ecoTokens === undefined) {
              profile.ecoTokens = 500;
            }
            callback({ ...fbUser, ...profile });
          } else {
            // If Firestore profile doesn't exist, create one
            const defaultProfile = {
              uid: fbUser.uid,
              displayName: fbUser.displayName || 'Eco Warrior',
              email: fbUser.email,
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
export const getUserProfile = async (uid) => {
  if (isFirebaseConnected) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } else {
    const users = getLocalUsers();
    return users[uid] ? users[uid].profile : null;
  }
};

export const updateUserProfile = async (uid, data) => {
  if (isFirebaseConnected) {
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
export const addXP = async (uid, amount) => {
  if (isFirebaseConnected) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const currentData = docSnap.data();
      const newXP = (currentData.xp || 0) + amount;
      const newLevel = Math.floor(newXP / 1000) + 1; // 1000 XP per level
      const updates = { xp: newXP };
      if (newLevel > (currentData.level || 1)) {
        updates.level = newLevel;
      }
      await updateDoc(docRef, updates);
    }
  } else {
    const users = getLocalUsers();
    if (users[uid]) {
      const profile = users[uid].profile;
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
export const fetchWithRetry = async (url, options = {}, retries = 3, delay = 1000) => {
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
};

// Log Carbon Activities
export const logCarbonEntry = async (uid, entry, options = {}) => {
  const newEntry = {
    ...entry,
    userId: uid,
    timestamp: new Date().toISOString()
  };

  if (isFirebaseConnected) {
    try {
      const authInstance = getAuth();
      if (authInstance.currentUser) {
        const idToken = await authInstance.currentUser.getIdToken(true);
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
      const profile = users[uid].profile;
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

export const getCarbonLogs = async (uid) => {
  if (isFirebaseConnected) {
    const logsCol = collection(db, 'carbonLogs');
    const q = query(logsCol, where('userId', '==', uid), orderBy('timestamp', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);
    const logs = [];
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
let communityChallengesCache = null;
let communityChallengesCacheTime = 0;

let leaderboardCache = null;
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
export const getCommunityChallenges = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && communityChallengesCache && (now - communityChallengesCacheTime < CACHE_EXPIRY_MS)) {
    return communityChallengesCache;
  }

  if (isFirebaseConnected) {
    const colSnap = await getDocs(collection(db, 'challenges'));
    const ch = [];
    colSnap.forEach(d => {
      ch.push({ id: d.id, ...d.data() });
    });
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

export const joinCommunityChallenge = async (uid, challengeId) => {
  invalidateCommunityChallengesCache();
  
  if (isFirebaseConnected) {
    try {
      const authInstance = getAuth();
      if (authInstance.currentUser) {
        const idToken = await authInstance.currentUser.getIdToken(true);
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
      const profile = users[uid].profile;
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
export const getLeaderboard = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && leaderboardCache && (now - leaderboardCacheTime < CACHE_EXPIRY_MS)) {
    return leaderboardCache;
  }

  if (isFirebaseConnected) {
    const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(10));
    const snap = await getDocs(q);
    const leaders = [];
    snap.forEach(d => {
      const data = d.data();
      leaders.push({
        uid: d.id,
        displayName: data.displayName,
        xp: data.xp,
        level: data.level,
        carbonCurrent: data.carbonCurrent
      });
    });
    leaderboardCache = leaders;
    leaderboardCacheTime = now;
    return leaders;
  } else {
    const users = getLocalUsers();
    const leaders = [];
    Object.keys(users).forEach(key => {
      // Skip strings that map emails to uids
      if (typeof users[key] === 'object') {
        const profile = users[key].profile;
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
