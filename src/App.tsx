import { useState, useEffect, lazy, Suspense } from 'react';
import { onAuthStateChanged, signOut, UserProfile } from './utils/firebase';
import Auth from './components/Auth';
import './App.css';

// Lazy loaded page components
const Onboarding = lazy(() => import('./components/Onboarding'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const EcoTwin = lazy(() => import('./components/EcoTwin'));
const CarbonLens = lazy(() => import('./components/CarbonLens'));
const CarbonQuest = lazy(() => import('./components/CarbonQuest'));
const Community = lazy(() => import('./components/Community'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const CarbonCopilot = lazy(() => import('./components/CarbonCopilot'));
const Marketplace = lazy(() => import('./components/Marketplace'));
const AchievementsDrawer = lazy(() => import('./components/AchievementsDrawer'));

import { 
  LayoutDashboard, 
  Orbit, 
  Scan, 
  ListTodo, 
  Users, 
  LogOut, 
  Settings, 
  Bot, 
  Leaf, 
  ShoppingCart,
  Coins,
  Award
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [toastNotify, setToastNotify] = useState('');
  const [globalSavings, setGlobalSavings] = useState(1284562.82);

  // Global ticker timer
  useEffect(() => {
    const timer = setInterval(() => {
      setGlobalSavings(prev => prev + 0.017); // increment by 17 grams every 500ms
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to Auth state shifts
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((profile) => {
      setUser(profile);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastNotify(msg);
    setTimeout(() => setToastNotify(''), 4000);
  };

  if (authLoading) {
    return (
      <div className="app-style-1">
        <div className="app-style-2" />
        <p className="app-style-3">Securing sandbox gateway...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Gate 1: Check Auth
  if (!user) {
    return <Auth onAuthSuccess={(profile: UserProfile) => setUser(profile)} />;
  }

  // Gate 2: Check Onboarding (whether baseline is set)
  const hasOnboarded = user.carbonTarget !== undefined && user.twinState !== undefined;

  if (!hasOnboarded) {
    return (
      <Suspense fallback={
        <div className="app-style-4">
          <div className="app-style-5" />
        </div>
      }>
        <Onboarding 
          user={user} 
          onComplete={(completedProfile: UserProfile) => {
            setUser(completedProfile);
            triggerToast('Initial ecological parameters initialized!');
          }} 
        />
      </Suspense>
    );
  }

  // Render Page Selection
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard key={user.uid} user={user} onProfileUpdate={(p) => setUser(p)} onOpenAchievements={() => setAchievementsOpen(true)} />;
      case 'ecotwin':
        return <EcoTwin key={user.uid} user={user} onProfileUpdate={(p) => setUser(p)} />;
      case 'carbonlens':
        return (
          <CarbonLens 
            key={user.uid}
            user={user} 
            onProfileUpdate={(p) => setUser(p)} 
            addLogNotify={() => triggerToast('Purchase logged successfully! Carbon footprint updated.')} 
          />
        );
      case 'carbonquest':
        return <CarbonQuest key={user.uid} user={user} onProfileUpdate={(p) => setUser(p)} />;
      case 'community':
        return <Community key={user.uid} user={user} onProfileUpdate={(p) => setUser(p)} />;
      case 'marketplace':
        return <Marketplace key={user.uid} user={user} onProfileUpdate={(p) => setUser(p)} />;
      default:
        return <Dashboard key={user.uid} user={user} onProfileUpdate={(p) => setUser(p)} />;
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <div className="app-container">
      
      {/* Toast Notification Container */}
      {toastNotify && (
        <div className="toast-container">
          <div className="toast success">
            <Leaf size={16} color="var(--primary)" />
            <span className="app-style-6">{toastNotify}</span>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-section">
          <Leaf size={24} color="#10b981" />
          <span>NetZeroSync AI</span>
        </div>

        <nav className="app-style-7">
          <ul className="nav-links">
            <li>
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''} app-style-8`}
                aria-current={activeTab === 'dashboard' ? 'page' : undefined}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('ecotwin')} 
                className={`nav-item ${activeTab === 'ecotwin' ? 'active' : ''} app-style-9`}
                aria-current={activeTab === 'ecotwin' ? 'page' : undefined}
              >
                <Orbit size={18} />
                <span>EcoTwin</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('carbonlens')} 
                className={`nav-item ${activeTab === 'carbonlens' ? 'active' : ''} app-style-10`}
                aria-current={activeTab === 'carbonlens' ? 'page' : undefined}
              >
                <Scan size={18} />
                <span>Carbon Lens</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('carbonquest')} 
                className={`nav-item ${activeTab === 'carbonquest' ? 'active' : ''} app-style-11`}
                aria-current={activeTab === 'carbonquest' ? 'page' : undefined}
              >
                <ListTodo size={18} />
                <span>CarbonQuest</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('community')} 
                className={`nav-item ${activeTab === 'community' ? 'active' : ''} app-style-12`}
                aria-current={activeTab === 'community' ? 'page' : undefined}
              >
                <Users size={18} />
                <span>Community</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('marketplace')} 
                className={`nav-item ${activeTab === 'marketplace' ? 'active' : ''} app-style-13`}
                aria-current={activeTab === 'marketplace' ? 'page' : undefined}
              >
                <ShoppingCart size={18} />
                <span>Marketplace</span>
              </button>
            </li>
          </ul>

          {/* User Profile Badge at bottom of Sidebar */}
          <div className="sidebar-footer app-style-14">
            <button 
              onClick={() => setAchievementsOpen(true)}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              className="app-style-15"
              title="Click to view achievements"
              aria-label="View eco achievements drawer"
            >
              <div className="app-style-16">
                {user.displayName?.charAt(0) || 'E'}
              </div>
              <div className="app-style-17">
                <div className="app-style-18">
                  {user.displayName}
                </div>
                <div className="app-style-19">
                  <span>Lvl {user.level || 1}</span>
                  <span>•</span>
                  <span className="app-style-20">
                    <Coins size={10} />
                    {user.ecoTokens || 0}
                  </span>
                  <span>•</span>
                  <span className="app-style-21">
                    <Award size={11} />
                  </span>
                </div>
              </div>
            </button>

            <button 
              onClick={handleLogout}
              className="btn-ghost app-style-22"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Panel Content Area */}
      <main className="main-content">
        <header className="header-bar app-style-23">
          <div className="app-style-24">
            <h2 className="app-style-25">
              {activeTab === 'carbonlens' ? 'Carbon Lens AI' : activeTab === 'ecotwin' ? 'EcoTwin Simulator' : activeTab === 'marketplace' ? 'Offset Marketplace' : activeTab}
            </h2>

            {/* Global Telemetry Carbon Ticker */}
            <div className="app-style-26 hide-mobile" title="Simulated collective carbon offsets across the NetZeroSync network">
              <span className="app-style-27" />
              <span>Net-Zero Network Save: </span>
              <strong className="app-style-28">{globalSavings.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg</strong>
            </div>
          </div>

          <div className="app-style-29">
            
            {/* Toggle Settings Modal */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="btn-ghost app-style-30"
              aria-label="Open cloud connection settings"
            >
              <Settings size={16} />
            </button>

            {/* Toggle slide-out AI Copilot */}
            <button
              onClick={() => setCopilotOpen(true)}
              className="btn-secondary glow-indigo app-style-31"
            >
              <Bot size={14} />
              <span>Ask Copilot</span>
            </button>
          </div>
        </header>

        {/* Dynamic Inner Panel Page */}
        <div className="app-style-32">
          <Suspense fallback={
            <div className="app-style-33">
              <div className="app-style-34" />
              <p className="app-style-35">Loading panel telemetry...</p>
            </div>
          }>
            {renderContent()}
          </Suspense>
        </div>
      </main>

      {/* Sliding AI Copilot Chat Drawer */}
      <Suspense fallback={null}>
        {copilotOpen && (
          <CarbonCopilot 
            user={user} 
            isOpen={copilotOpen} 
            onClose={() => setCopilotOpen(false)} 
          />
        )}
      </Suspense>

      {/* Achievements Drawer */}
      <Suspense fallback={null}>
        {achievementsOpen && (
          <AchievementsDrawer
            user={user}
            isOpen={achievementsOpen}
            onClose={() => setAchievementsOpen(false)}
          />
        )}
      </Suspense>

      {/* Integrations Modal */}
      <Suspense fallback={null}>
        {settingsOpen && (
          <SettingsModal 
            isOpen={settingsOpen} 
            onClose={() => setSettingsOpen(false)} 
          />
        )}
      </Suspense>
    </div>
  );
}
