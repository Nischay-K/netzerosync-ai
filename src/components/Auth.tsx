import React, { useState, useEffect } from 'react';
import { signUp, signIn, signInWithGoogle, UserProfile } from '../utils/firebase';
import { Leaf, User, ChevronRight, Shield, Eye, EyeOff, Bot, ArrowLeft, Zap } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: (profile: UserProfile) => void;
}

const staticParticles = Array.from({ length: 25 }).map((_, i) => ({
  id: i,
  left: `${(i * 4) + Math.random() * 3}%`,
  delay: `${Math.random() * 8}s`,
  duration: `${15 + Math.random() * 20}s`,
  size: `${1.5 + Math.random() * 3.5}px`
}));

const validatePasswordStrength = (pass: string) => {
  return {
    length: pass.length >= 8,
    hasUpper: /[A-Z]/.test(pass),
    hasLower: /[a-z]/.test(pass),
    hasNumber: /[0-9]/.test(pass),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pass)
  };
};

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [viewState, setViewState] = useState<'features' | 'auth'>('features'); // 'features' or 'auth'
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 1. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address (e.g. name@example.com).');
      setLoading(false);
      return;
    }

    // 2. Password security validation
    if (isRegister) {
      if (!displayName.trim()) {
        setError('Display Name is required.');
        setLoading(false);
        return;
      }
      const strength = validatePasswordStrength(password);
      if (!strength.length || !strength.hasUpper || !strength.hasLower || !strength.hasNumber || !strength.hasSpecial) {
        setError('Password does not meet the security requirements listed below.');
        setLoading(false);
        return;
      }
    } else {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }
    }

    try {
      if (isRegister) {
        const userProfile = await signUp(email.trim(), password, displayName.trim());
        onAuthSuccess(userProfile);
      } else {
        const userProfile = await signIn(email.trim(), password);
        onAuthSuccess(userProfile);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const userProfile = await signInWithGoogle();
      onAuthSuccess(userProfile);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="auth-style-1"
    >
      {/* Floating Background Particles */}
      <div className="auth-style-2">
        {staticParticles.map(p => (
          <div
            key={p.id}
            className="auth-style-3" style={{ left: p.left, width: p.size, height: p.size, animation: `floatParticle ${p.duration} linear infinite`, animationDelay: p.delay }}
          />
        ))}
      </div>

      {/* Background Interactive Cursor Glow */}
      <div className="auth-style-4" style={{ top: mousePos.y - 200, left: mousePos.x - 200 }} />
      {/* Background Neon Glows */}
      <div className="auth-style-5" />
      <div className="auth-style-6" />

      {/* VIEW STATE 1: INTERACTIVE PRODUCT TOUR CARD GRID */}
      {viewState === 'features' && (
        <div className="auth-style-7 fade-in">
          
          {/* Header */}
          <div className="auth-style-8">
            <div className="auth-style-9">
              <Leaf size={28} color="#00ff88" />
            </div>

            <div className="auth-style-10">
              <Zap size={12} /> Carbon Footprint Telemetry
            </div>

            <h1 className="auth-style-11">
              Take Control of Emissions with NetZeroSync AI
            </h1>

            <p className="auth-style-12">
              Simulate lifestyle parameters, track carbon costs using Vision OCR, and achieve Net-Zero milestones through gamified community challenges.
            </p>
          </div>

          {/* Interactive Feature Cards Grid */}
          <div className="auth-style-13">
            {[
              { 
                icon: <Leaf size={24} color="#00ff88" />, 
                title: 'EcoTwin Simulation', 
                desc: 'An interactive lifestyle twin that dynamically morphs your local SVG ecosystem (windmill speeds, factory smoke, trees) in real-time as you tweak habits.', 
                color: 'rgba(11, 33, 26, 0.6)',
                borderColor: 'rgba(0, 255, 136, 0.12)',
                glowColor: 'rgba(0, 255, 136, 0.45)',
                shadowGlow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 136, 0.15)'
              },
              { 
                icon: <Eye size={24} color="#00f0ff" />, 
                title: 'Carbon Lens AI', 
                desc: 'Query Gemini Multimodal OCR client-side to automatically parse invoices, flight tickets, or grocery store receipts to log carbon units.', 
                color: 'rgba(11, 33, 26, 0.6)',
                borderColor: 'rgba(0, 240, 255, 0.12)',
                glowColor: 'rgba(0, 240, 255, 0.45)',
                shadowGlow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 240, 255, 0.15)'
              },
              { 
                icon: <Shield size={24} color="#ffaa00" />, 
                title: 'Quest Photo Proof', 
                desc: 'Submit camera snapshots (e.g. your salad or bike dial) to verify daily quest completion. Gemini inspects the photo to unlock a +100 XP photo bonus.', 
                color: 'rgba(11, 33, 26, 0.6)',
                borderColor: 'rgba(255, 170, 0, 0.12)',
                glowColor: 'rgba(255, 170, 0, 0.45)',
                shadowGlow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 170, 0, 0.15)'
              },
              { 
                icon: <Bot size={24} color="#8b5cf6" />, 
                title: 'Sustainability Copilot', 
                desc: 'A contextual chatbot assistant that audits your telemetry statistics to deliver actionable daily energy and currency saving tips.', 
                color: 'rgba(11, 33, 26, 0.6)',
                borderColor: 'rgba(139, 92, 246, 0.12)',
                glowColor: 'rgba(139, 92, 246, 0.45)',
                shadowGlow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.15)'
              }
            ].map((card, idx) => (
              <div 
                key={idx} 
                className="glass-panel auth-style-14"
                onMouseEnter={() => setHoveredCard(idx)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{ background: card.color, borderColor: hoveredCard === idx ? card.glowColor : card.borderColor, boxShadow: hoveredCard === idx ? card.shadowGlow : '0 8px 32px rgba(0,0,0,0.4)', transform: hoveredCard === idx ? 'translateY(-6px)' : 'translateY(0)' }}
              >
                <div className="auth-style-15">
                  {card.icon}
                </div>
                <div>
                  <h3 className="auth-style-16">{card.title}</h3>
                  <p className="auth-style-17">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Action button to proceed */}
          <button
            onClick={() => setViewState('auth')}
            className="btn-primary auth-style-18"
          >
            Access Telemetry Console <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* VIEW STATE 2: SPLIT-SCREEN AUTHENTICATION PANEL */}
      {viewState === 'auth' && (
        <div className="auth-style-19">
          {/* Left features sidebar */}
          <div className="auth-style-20 hide-mobile">
            {/* Back to Tour Button */}
            <button
              onClick={() => setViewState('features')}
              className="auth-style-21"
            >
              <ArrowLeft size={16} /> Back to Feature Tour
            </button>

            <div className="auth-style-22">
              <div className="auth-style-23">
                <Leaf size={24} color="var(--primary)" />
                <span className="auth-style-24">
                  NETZEROSYNC AI
                </span>
              </div>
              <h2 className="auth-style-25">
                Climate intelligence, at your node.
              </h2>
              <p className="auth-style-26">
                Configure parameters directly in the settings drawer to connect your real Firebase Auth, Firestore, and Gemini models. Local Sandbox fallback allows instant evaluation checks.
              </p>

              {/* Animated Technical Terminal */}
              <div className="auth-style-27">
                <div className="auth-style-28">
                  <div className="auth-style-29" />
                  <div className="auth-style-30" />
                  <div className="auth-style-31" />
                </div>
                <ConsoleTerminal />
              </div>
            </div>

            <div className="auth-style-32">
              NODE ID STATUS: SECURE CONNECTION ACTIVE
            </div>
          </div>

          {/* Right login container */}
          <div className="auth-style-33">
            {/* Back to features (mobile-only display helper) */}
            <button
              onClick={() => setViewState('features')}
              className="show-mobile-only auth-style-34"
            >
              <ArrowLeft size={14} /> View Features
            </button>

            <div className="glass-panel glow-emerald fade-in auth-style-35">
              
              <h2 className="auth-style-36">
                {isRegister ? 'Create Node Account' : 'Console Sign In'}
              </h2>
              <p className="auth-style-37">
                {isRegister ? 'Setup your target parameters.' : 'Connect to dashboard telemetry.'}
              </p>

              {/* Tabs */}
              <div className="auth-style-38">
                <button
                  onClick={() => { setIsRegister(false); setError(''); }}
                  className="auth-style-39" style={{ borderBottom: !isRegister ? '2px solid var(--primary)' : '2px solid transparent', color: !isRegister ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setIsRegister(true); setError(''); }}
                  className="auth-style-40" style={{ borderBottom: isRegister ? '2px solid var(--primary)' : '2px solid transparent', color: isRegister ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  Sign Up
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="auth-style-41">
                  {error}
                </div>
              )}

              {/* Form elements */}
              <form onSubmit={handleSubmit} className="auth-style-42">
                {isRegister && (
                  <div>
                    <label htmlFor="auth-explorer-name" className="auth-style-43">Explorer Name</label>
                    <div className="auth-style-44">
                      <User size={13} color="var(--text-muted)" className="auth-style-45" />
                      <input
                        id="auth-explorer-name"
                        type="text"
                        placeholder="e.g. John Doe"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        className="auth-style-46"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" className="auth-style-47">Email Address</label>
                  <div className="auth-style-48">
                    <input
                      id="auth-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="auth-style-49" style={{ borderColor: !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'var(--glass-border)' : 'rgba(239, 68, 68, 0.5)' }}
                    />
                  </div>
                </div>

                 <div>
                  <label htmlFor="auth-password" className="auth-style-50">Password</label>
                  <div className="auth-style-51">
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="auth-style-52" style={{ borderColor: !password || (isRegister ? (validatePasswordStrength(password).length && validatePasswordStrength(password).hasUpper && validatePasswordStrength(password).hasLower && validatePasswordStrength(password).hasNumber && validatePasswordStrength(password).hasSpecial) : password.length >= 6) ? 'var(--glass-border)' : 'rgba(239, 68, 68, 0.5)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="auth-style-53"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  
                  {isRegister && password.length > 0 && (
                    <div className="auth-style-54">
                      <span className="auth-style-55">Password Security Checklist:</span>
                      <div className="auth-style-56" style={{ color: validatePasswordStrength(password).length ? '#00ff88' : 'var(--text-muted)' }}>
                        <div className="auth-style-57" style={{ background: validatePasswordStrength(password).length ? '#00ff88' : 'var(--text-muted)' }} />
                        <span>At least 8 characters</span>
                      </div>
                      <div className="auth-style-58" style={{ color: (validatePasswordStrength(password).hasUpper && validatePasswordStrength(password).hasLower) ? '#00ff88' : 'var(--text-muted)' }}>
                        <div className="auth-style-59" style={{ background: (validatePasswordStrength(password).hasUpper && validatePasswordStrength(password).hasLower) ? '#00ff88' : 'var(--text-muted)' }} />
                        <span>Uppercase & lowercase letters</span>
                      </div>
                      <div className="auth-style-60" style={{ color: validatePasswordStrength(password).hasNumber ? '#00ff88' : 'var(--text-muted)' }}>
                        <div className="auth-style-61" style={{ background: validatePasswordStrength(password).hasNumber ? '#00ff88' : 'var(--text-muted)' }} />
                        <span>At least one number (0-9)</span>
                      </div>
                      <div className="auth-style-62" style={{ color: validatePasswordStrength(password).hasSpecial ? '#00ff88' : 'var(--text-muted)' }}>
                        <div className="auth-style-63" style={{ background: validatePasswordStrength(password).hasSpecial ? '#00ff88' : 'var(--text-muted)' }} />
                        <span>At least one special character (!@#$%)</span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn-primary auth-style-64"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : isRegister ? 'Establish Node Account' : 'Authenticate Console'}
                  <ChevronRight size={14} />
                </button>
              </form>

              {/* Divider */}
              <div className="auth-style-65">
                <div className="auth-style-66"></div>
                <span className="auth-style-67">OR</span>
                <div className="auth-style-68"></div>
              </div>

              {/* Google Sign-in button */}
              <div className="auth-style-69">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="btn-ghost auth-style-70"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="auth-style-71">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google Node
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Responsive Styles */}
      <style>{`
        @keyframes floatParticle {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-110vh) translateX(30px) scale(0.5);
            opacity: 0;
          }
        }
        @media (max-width: 768px) {
          .hide-mobile {
            display: none !important;
          }
          .show-mobile-only {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .show-mobile-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

const DIAGNOSTIC_LOGS = [
  "> netzerosync --status: operational",
  "[OK] Sandbox authentication gateway online",
  "[OK] EcoTwin rendering modules loaded",
  "[OK] Gemini multi-modal Vision API active",
  "[READY] Node client ready on port 5174"
];

// Subcomponent: Simulated technical terminal diagnostics logger
function ConsoleTerminal() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < DIAGNOSTIC_LOGS.length) {
        setLines(prev => [...prev, DIAGNOSTIC_LOGS[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="auth-style-72">
      {lines.map((line, idx) => {
        let lineColor = 'var(--text-secondary)';
        if (line.startsWith('[OK]')) lineColor = '#00ff88';
        if (line.startsWith('[READY]')) lineColor = '#00f0ff';
        return (
          <div key={idx} style={{ color: lineColor }}>
            {line}
          </div>
        );
      })}
      {lines.length < DIAGNOSTIC_LOGS.length && (
        <span className="auth-style-73" />
      )}
      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
