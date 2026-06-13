import { useState } from 'react';
import { isFirebaseConnected } from '../utils/firebase';
import { isGeminiConfigured } from '../utils/gemini';
import { Settings, X, Key, Database, RefreshCw, Check } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose }) {
  const getFbConfigValue = (keyName) => {
    const stored = localStorage.getItem('ecoSphere_firebaseConfig');
    if (stored) {
      try {
        const config = JSON.parse(stored);
        return config[keyName] || '';
      } catch {
        return '';
      }
    }
    return '';
  };

  // Read current local values
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('ecoSphere_geminiApiKey') || '');
  
  // Firebase configuration elements
  const [fbApiKey, setFbApiKey] = useState(() => getFbConfigValue('apiKey'));
  const [fbAuthDomain, setFbAuthDomain] = useState(() => getFbConfigValue('authDomain'));
  const [fbProjectId, setFbProjectId] = useState(() => getFbConfigValue('projectId'));
  const [fbStorageBucket, setFbStorageBucket] = useState(() => getFbConfigValue('storageBucket'));
  const [fbSenderId, setFbSenderId] = useState(() => getFbConfigValue('messagingSenderId'));
  const [fbAppId, setFbAppId] = useState(() => getFbConfigValue('appId'));

  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    
    // Save Gemini Key
    localStorage.setItem('ecoSphere_geminiApiKey', geminiKey.trim());
    
    // Save Firebase Config if filled
    if (fbApiKey && fbProjectId) {
      const fbConfig = {
        apiKey: fbApiKey.trim(),
        authDomain: fbAuthDomain.trim(),
        projectId: fbProjectId.trim(),
        storageBucket: fbStorageBucket.trim(),
        messagingSenderId: fbSenderId.trim(),
        appId: fbAppId.trim()
      };
      localStorage.setItem('ecoSphere_firebaseConfig', JSON.stringify(fbConfig));
    } else if (!fbApiKey && !fbProjectId) {
      // Clear configuration to run in Demo Mode again
      localStorage.removeItem('ecoSphere_firebaseConfig');
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      // Reload page to re-initialize firebase and gemini
      window.location.reload();
    }, 1500);
  };

  const handleClear = () => {
    localStorage.removeItem('ecoSphere_geminiApiKey');
    localStorage.removeItem('ecoSphere_firebaseConfig');
    setGeminiKey('');
    setFbApiKey('');
    setFbAuthDomain('');
    setFbProjectId('');
    setFbStorageBucket('');
    setFbSenderId('');
    setFbAppId('');
    window.location.reload();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100
    }}>
      <div className="glass-panel glow-indigo fade-in" style={{
        maxWidth: '520px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} color="var(--secondary)" />
            <h2 style={{ fontSize: '18px' }}>Integrations & Settings</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {saved && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: 'var(--primary)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            textAlign: 'center',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <Check size={16} /> Saved! Reloading page to apply updates...
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Gemini API Box */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
              <Key size={16} color="var(--secondary)" />
              Google Gemini API Key
            </div>
            
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Used to process physical bills/receipt files (Carbon Lens) and chat with your Sustainability Coach (Carbon Copilot). 
              Get a free developer key at <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--secondary)' }}>Google AI Studio</a>.
            </p>

            <label htmlFor="settings-gemini-key" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Gemini API Key</label>
            <input
              id="settings-gemini-key"
              type="password"
              placeholder="Paste Gemini API Key here"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />

            <div style={{ fontSize: '10px', color: isGeminiConfigured() ? 'var(--primary)' : 'var(--accent-amber)' }}>
              Status: {isGeminiConfigured() ? '● Live API Activated' : '○ Missing key (Running Sandbox Mock)'}
            </div>
          </div>

          {/* Firebase API Box */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
              <Database size={16} color="var(--primary)" />
              Firebase Config Parameters
            </div>
            
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Connect your own Firebase Authentication and Firestore Database. Enable "Email/Password" in Auth console and create Firestore database first.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label htmlFor="settings-fb-api-key" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>API Key</label>
                <input
                  id="settings-fb-api-key"
                  type="text"
                  placeholder="apiKey"
                  value={fbApiKey}
                  onChange={(e) => setFbApiKey(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="settings-fb-project-id" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Project ID</label>
                <input
                  id="settings-fb-project-id"
                  type="text"
                  placeholder="projectId"
                  value={fbProjectId}
                  onChange={(e) => setFbProjectId(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="settings-fb-auth-domain" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Auth Domain</label>
                <input
                  id="settings-fb-auth-domain"
                  type="text"
                  placeholder="authDomain"
                  value={fbAuthDomain}
                  onChange={(e) => setFbAuthDomain(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="settings-fb-storage-bucket" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Storage Bucket</label>
                <input
                  id="settings-fb-storage-bucket"
                  type="text"
                  placeholder="storageBucket"
                  value={fbStorageBucket}
                  onChange={(e) => setFbStorageBucket(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="settings-fb-sender-id" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Sender ID</label>
                <input
                  id="settings-fb-sender-id"
                  type="text"
                  placeholder="messagingSenderId"
                  value={fbSenderId}
                  onChange={(e) => setFbSenderId(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="settings-fb-app-id" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>App ID</label>
                <input
                  id="settings-fb-app-id"
                  type="text"
                  placeholder="appId"
                  value={fbAppId}
                  onChange={(e) => setFbAppId(e.target.value)}
                />
              </div>
            </div>

            <div style={{ fontSize: '10px', color: isFirebaseConnected ? 'var(--primary)' : 'var(--accent-amber)', marginTop: '4px' }}>
              Status: {isFirebaseConnected ? '● Connected to Cloud DB' : '○ Running Sandbox LocalStorage DB'}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={handleClear}
              className="btn-danger"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Reset All configs
            </button>
            <div style={{ flexGrow: 1 }} />
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Close
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '8px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} /> Save & Reload
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
