import { useState, useEffect, lazy, Suspense } from 'react';
import { onAuthStateChanged, signOut } from './utils/firebase';
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
  const [user, setUser] = useState(null);
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

  const triggerToast = (msg) => {
    setToastNotify(msg);
    setTimeout(() => setToastNotify(''), 4000);
  };

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--glass-border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }} />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px' }}>Securing sandbox gateway...</p>
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
    return <Auth onAuthSuccess={(profile) => setUser(profile)} />;
  }

  // Gate 2: Check Onboarding (whether baseline is set)
  const hasOnboarded = user.carbonTarget !== undefined && user.twinState !== undefined;

  if (!hasOnboarded) {
    return (
      <Suspense fallback={
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2.5px solid var(--glass-border)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      }>
        <Onboarding 
          user={user} 
          onComplete={(completedProfile) => {
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
            <span style={{ fontSize: '13px', fontWeight: '500' }}>{toastNotify}</span>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-section">
          <Leaf size={24} color="#10b981" />
          <span>NetZeroSync AI</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <ul className="nav-links">
            <li>
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', padding: '12px 16px' }}
                aria-current={activeTab === 'dashboard' ? 'page' : undefined}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('ecotwin')} 
                className={`nav-item ${activeTab === 'ecotwin' ? 'active' : ''}`}
                style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', padding: '12px 16px' }}
                aria-current={activeTab === 'ecotwin' ? 'page' : undefined}
              >
                <Orbit size={18} />
                <span>EcoTwin</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('carbonlens')} 
                className={`nav-item ${activeTab === 'carbonlens' ? 'active' : ''}`}
                style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', padding: '12px 16px' }}
                aria-current={activeTab === 'carbonlens' ? 'page' : undefined}
              >
                <Scan size={18} />
                <span>Carbon Lens</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('carbonquest')} 
                className={`nav-item ${activeTab === 'carbonquest' ? 'active' : ''}`}
                style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', padding: '12px 16px' }}
                aria-current={activeTab === 'carbonquest' ? 'page' : undefined}
              >
                <ListTodo size={18} />
                <span>CarbonQuest</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('community')} 
                className={`nav-item ${activeTab === 'community' ? 'active' : ''}`}
                style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', padding: '12px 16px' }}
                aria-current={activeTab === 'community' ? 'page' : undefined}
              >
                <Users size={18} />
                <span>Community</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('marketplace')} 
                className={`nav-item ${activeTab === 'marketplace' ? 'active' : ''}`}
                style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', padding: '12px 16px' }}
                aria-current={activeTab === 'marketplace' ? 'page' : undefined}
              >
                <ShoppingCart size={18} />
                <span>Marketplace</span>
              </button>
            </li>
          </ul>

          {/* User Profile Badge at bottom of Sidebar */}
          <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={() => setAchievementsOpen(true)}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                transition: 'background 0.2s ease',
                background: 'transparent',
                border: 'none',
                width: '100%',
                textAlign: 'left'
              }}
              title="Click to view achievements"
              aria-label="View eco achievements drawer"
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700',
                color: 'var(--primary)'
              }}>
                {user.displayName?.charAt(0) || 'E'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {user.displayName}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span>Lvl {user.level || 1}</span>
                  <span>•</span>
                  <span style={{ color: 'var(--primary)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    <Coins size={10} />
                    {user.ecoTokens || 0}
                  </span>
                  <span>•</span>
                  <span style={{ color: 'var(--accent-amber)', display: 'inline-flex', alignItems: 'center' }}>
                    <Award size={11} />
                  </span>
                </div>
              </div>
            </button>

            <button 
              onClick={handleLogout}
              className="btn-ghost" 
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderColor: 'transparent',
                color: 'var(--text-secondary)'
              }}
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Panel Content Area */}
      <main className="main-content">
        <header className="header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <h2 style={{ fontSize: '22px', textTransform: 'capitalize' }}>
              {activeTab === 'carbonlens' ? 'Carbon Lens AI' : activeTab === 'ecotwin' ? 'EcoTwin Simulator' : activeTab === 'marketplace' ? 'Offset Marketplace' : activeTab}
            </h2>

            {/* Global Telemetry Carbon Ticker */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.18)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: 'var(--primary)',
              boxShadow: '0 0 10px rgba(16, 185, 129, 0.05)'
            }} className="hide-mobile" title="Simulated collective carbon offsets across the NetZeroSync network">
              <span style={{ 
                width: '6px', 
                height: '6px', 
                background: 'var(--primary)', 
                borderRadius: '50%', 
                display: 'inline-block', 
                boxShadow: '0 0 8px var(--primary)'
              }} />
              <span>Net-Zero Network Save: </span>
              <strong style={{ color: '#fff' }}>{globalSavings.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            
            {/* Toggle Settings Modal */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="btn-ghost"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
              aria-label="Open cloud connection settings"
            >
              <Settings size={16} />
            </button>

            {/* Toggle slide-out AI Copilot */}
            <button
              onClick={() => setCopilotOpen(true)}
              className="btn-secondary glow-indigo"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '13px'
              }}
            >
              <Bot size={14} />
              <span>Ask Copilot</span>
            </button>
          </div>
        </header>

        {/* Dynamic Inner Panel Page */}
        <div style={{ flexGrow: 1 }}>
          <Suspense fallback={
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '400px',
              color: 'var(--text-secondary)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '2.5px solid var(--glass-border)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '12px'
              }} />
              <p style={{ fontSize: '12.5px', fontFamily: 'var(--font-sans)' }}>Loading panel telemetry...</p>
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
