// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useRef } from 'react';
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
  const closeButtonRef = useRef(null);

  // Trap Escape key and manage focus for A11y
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 50);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
    <div className="settings-modal-style-1">
      <div className="glass-panel glow-indigo fade-in settings-modal-style-2">
        {/* Header */}
        <div className="settings-modal-style-3">
          <div className="settings-modal-style-4">
            <Settings size={20} color="var(--secondary)" />
            <h2 className="settings-modal-style-5">Integrations & Settings</h2>
          </div>
          <button 
            onClick={onClose} 
            ref={closeButtonRef}
            aria-label="Close settings modal"
            className="settings-modal-style-6"
          >
            <X size={20} />
          </button>
        </div>

        {saved && (
          <div className="settings-modal-style-7">
            <Check size={16} /> Saved! Reloading page to apply updates...
          </div>
        )}

        <form onSubmit={handleSave} className="settings-modal-style-8">
          
          {/* Gemini API Box */}
          <div className="glass-card settings-modal-style-9">
            <div className="settings-modal-style-10">
              <Key size={16} color="var(--secondary)" />
              Google Gemini API Key
            </div>
            
            <p className="settings-modal-style-11">
              Used to process physical bills/receipt files (Carbon Lens) and chat with your Sustainability Coach (Carbon Copilot). 
              Get a free developer key at <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="settings-modal-style-12">Google AI Studio</a>.
            </p>

            <label htmlFor="settings-gemini-key" className="settings-modal-style-13">Gemini API Key</label>
            <input
              id="settings-gemini-key"
              type="password"
              placeholder="Paste Gemini API Key here"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />

            <div className="settings-modal-style-14" style={{ color: isGeminiConfigured() ? 'var(--primary)' : 'var(--accent-amber)' }}>
              Status: {isGeminiConfigured() ? '● Live API Activated' : '○ Missing key (Running Sandbox Mock)'}
            </div>
          </div>

          {/* Firebase API Box */}
          <div className="glass-card settings-modal-style-15">
            <div className="settings-modal-style-16">
              <Database size={16} color="var(--primary)" />
              Firebase Config Parameters
            </div>
            
            <p className="settings-modal-style-17">
              Connect your own Firebase Authentication and Firestore Database. Enable "Email/Password" in Auth console and create Firestore database first.
            </p>

            <div className="settings-modal-style-18">
              <div>
                <label htmlFor="settings-fb-api-key" className="settings-modal-style-19">API Key</label>
                <input
                  id="settings-fb-api-key"
                  type="text"
                  placeholder="apiKey"
                  value={fbApiKey}
                  onChange={(e) => setFbApiKey(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="settings-fb-project-id" className="settings-modal-style-20">Project ID</label>
                <input
                  id="settings-fb-project-id"
                  type="text"
                  placeholder="projectId"
                  value={fbProjectId}
                  onChange={(e) => setFbProjectId(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="settings-fb-auth-domain" className="settings-modal-style-21">Auth Domain</label>
                <input
                  id="settings-fb-auth-domain"
                  type="text"
                  placeholder="authDomain"
                  value={fbAuthDomain}
                  onChange={(e) => setFbAuthDomain(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="settings-fb-storage-bucket" className="settings-modal-style-22">Storage Bucket</label>
                <input
                  id="settings-fb-storage-bucket"
                  type="text"
                  placeholder="storageBucket"
                  value={fbStorageBucket}
                  onChange={(e) => setFbStorageBucket(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="settings-fb-sender-id" className="settings-modal-style-23">Sender ID</label>
                <input
                  id="settings-fb-sender-id"
                  type="text"
                  placeholder="messagingSenderId"
                  value={fbSenderId}
                  onChange={(e) => setFbSenderId(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="settings-fb-app-id" className="settings-modal-style-24">App ID</label>
                <input
                  id="settings-fb-app-id"
                  type="text"
                  placeholder="appId"
                  value={fbAppId}
                  onChange={(e) => setFbAppId(e.target.value)}
                />
              </div>
            </div>

            <div className="settings-modal-style-25" style={{ color: isFirebaseConnected ? 'var(--primary)' : 'var(--accent-amber)' }}>
              Status: {isFirebaseConnected ? '● Connected to Cloud DB' : '○ Running Sandbox LocalStorage DB'}
            </div>
          </div>

          {/* Action buttons */}
          <div className="settings-modal-style-26">
            <button
              type="button"
              onClick={handleClear}
              className="btn-danger settings-modal-style-27"
            >
              Reset All configs
            </button>
            <div className="settings-modal-style-28" />
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost settings-modal-style-29"
            >
              Close
            </button>
            <button
              type="submit"
              className="btn-primary settings-modal-style-30"
            >
              <RefreshCw size={14} /> Save & Reload
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
