import { useState, useEffect } from 'react';
import { signUp, signIn, signInWithGoogle } from '../utils/firebase';
import { Leaf, User, ChevronRight, Shield, Eye, EyeOff, Bot, ArrowLeft, Zap } from 'lucide-react';

const staticParticles = Array.from({ length: 25 }).map((_, i) => ({
  id: i,
  left: `${(i * 4) + Math.random() * 3}%`,
  delay: `${Math.random() * 8}s`,
  duration: `${15 + Math.random() * 20}s`,
  size: `${1.5 + Math.random() * 3.5}px`
}));

const validatePasswordStrength = (pass) => {
  return {
    length: pass.length >= 8,
    hasUpper: /[A-Z]/.test(pass),
    hasLower: /[a-z]/.test(pass),
    hasNumber: /[0-9]/.test(pass),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pass)
  };
};

export default function Auth({ onAuthSuccess }) {
  const [viewState, setViewState] = useState('features'); // 'features' or 'auth'
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState(null);

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleSubmit = async (e) => {
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
        const user = await signUp(email.trim(), password, displayName.trim());
        onAuthSuccess(user);
      } else {
        const user = await signIn(email.trim(), password);
        onAuthSuccess(user);
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };



  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      onAuthSuccess(user);
    } catch (err) {
      setError(err.message || 'Failed to authenticate with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      style={{
        minHeight: '100vh',
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), url("/hero-bg.png")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        color: '#ffffff',
        fontFamily: 'var(--font-sans)',
        position: 'relative',
        overflowX: 'hidden'
      }}
    >
      {/* Floating Background Particles */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
        {staticParticles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: p.left,
              width: p.size,
              height: p.size,
              background: 'rgba(0, 255, 136, 0.4)',
              borderRadius: '50%',
              boxShadow: '0 0 6px rgba(0, 255, 136, 0.5)',
              animation: `floatParticle ${p.duration} linear infinite`,
              animationDelay: p.delay,
              bottom: '-15px'
            }}
          />
        ))}
      </div>

      {/* Background Interactive Cursor Glow */}
      <div style={{
        position: 'fixed',
        top: mousePos.y - 200,
        left: mousePos.x - 200,
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(0, 255, 136, 0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 1,
        transition: 'transform 0.08s ease-out'
      }} />
      {/* Background Neon Glows */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: '400px',
        height: '400px',
        background: 'rgba(0, 255, 136, 0.04)',
        filter: 'blur(150px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '20%',
        width: '400px',
        height: '400px',
        background: 'rgba(16, 185, 129, 0.04)',
        filter: 'blur(150px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* VIEW STATE 1: INTERACTIVE PRODUCT TOUR CARD GRID */}
      {viewState === 'features' && (
        <div style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '80px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '40px',
          minHeight: '100vh',
          justifyContent: 'center'
        }} className="fade-in">
          
          {/* Header */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(0, 255, 136, 0.1)',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              boxShadow: '0 0 20px rgba(0, 255, 136, 0.15)',
              marginBottom: '8px'
            }}>
              <Leaf size={28} color="#00ff88" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '3px' }}>
              <Zap size={12} /> Carbon Footprint Telemetry
            </div>

            <h1 style={{
              fontSize: '44px',
              fontWeight: '800',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff 40%, #00ff88 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: '1.15',
              maxWidth: '680px'
            }}>
              Take Control of Emissions with NetZeroSync AI
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '540px', lineHeight: '1.6' }}>
              Simulate lifestyle parameters, track carbon costs using Vision OCR, and achieve Net-Zero milestones through gamified community challenges.
            </p>
          </div>

          {/* Interactive Feature Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px',
            width: '100%',
            marginTop: '16px'
          }}>
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
                className="glass-panel"
                onMouseEnter={() => setHoveredCard(idx)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: card.color,
                  borderColor: hoveredCard === idx ? card.glowColor : card.borderColor,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  padding: '24px',
                  boxShadow: hoveredCard === idx ? card.shadowGlow : '0 8px 32px rgba(0,0,0,0.4)',
                  transform: hoveredCard === idx ? 'translateY(-6px)' : 'translateY(0)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--glass-border)',
                  color: '#fff'
                }}>
                  {card.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{card.title}</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Action button to proceed */}
          <button
            onClick={() => setViewState('auth')}
            className="btn-primary"
            style={{
              padding: '16px 36px',
              fontSize: '15px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '30px',
              boxShadow: '0 0 30px rgba(0, 255, 136, 0.25)',
              marginTop: '12px'
            }}
          >
            Access Telemetry Console <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* VIEW STATE 2: SPLIT-SCREEN AUTHENTICATION PANEL */}
      {viewState === 'auth' && (
        <div style={{
          display: 'flex',
          minHeight: '100vh',
          animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          {/* Left features sidebar */}
          <div style={{
            flex: '1',
            background: 'linear-gradient(135deg, #041a13 0%, #020b08 100%)',
            borderRight: '1px solid var(--glass-border)',
            padding: '50px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 2
          }} className="hide-mobile">
            {/* Back to Tour Button */}
            <button
              onClick={() => setViewState('features')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={16} /> Back to Feature Tour
            </button>

            <div style={{ maxWidth: '440px', marginTop: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <Leaf size={24} color="var(--primary)" />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '800', letterSpacing: '1px' }}>
                  NETZEROSYNC AI
                </span>
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'var(--font-display)', lineHeight: '1.2', color: '#fff', marginBottom: '16px' }}>
                Climate intelligence, at your node.
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: '1.6', marginBottom: '20px' }}>
                Configure parameters directly in the settings drawer to connect your real Firebase Auth, Firestore, and Gemini models. Local Sandbox fallback allows instant evaluation checks.
              </p>

              {/* Animated Technical Terminal */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(0, 255, 136, 0.1)',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                color: 'var(--primary)',
                borderRadius: '8px',
                textAlign: 'left',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56' }} />
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffbd2e' }} />
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }} />
                </div>
                <ConsoleTerminal />
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              NODE ID STATUS: SECURE CONNECTION ACTIVE
            </div>
          </div>

          {/* Right login container */}
          <div style={{
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px 20px',
            position: 'relative'
          }}>
            {/* Back to features (mobile-only display helper) */}
            <button
              onClick={() => setViewState('features')}
              className="show-mobile-only"
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px'
              }}
            >
              <ArrowLeft size={14} /> View Features
            </button>

            <div className="glass-panel glow-emerald fade-in" style={{
              maxWidth: '380px',
              width: '100%',
              position: 'relative',
              zIndex: 5,
              background: 'rgba(8, 20, 16, 0.95)',
              border: '1px solid rgba(0, 255, 136, 0.15)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
              padding: '24px'
            }}>
              
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '4px', textAlign: 'center' }}>
                {isRegister ? 'Create Node Account' : 'Console Sign In'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '20px', textAlign: 'center' }}>
                {isRegister ? 'Setup your target parameters.' : 'Connect to dashboard telemetry.'}
              </p>

              {/* Tabs */}
              <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--glass-border)',
                marginBottom: '20px'
              }}>
                <button
                  onClick={() => { setIsRegister(false); setError(''); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: !isRegister ? '2px solid var(--primary)' : '2px solid transparent',
                    color: !isRegister ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setIsRegister(true); setError(''); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isRegister ? '2px solid var(--primary)' : '2px solid transparent',
                    color: isRegister ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  Sign Up
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div style={{
                  background: 'rgba(255, 42, 95, 0.08)',
                  border: '1px solid rgba(255, 42, 95, 0.2)',
                  color: 'var(--accent-rose)',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  {error}
                </div>
              )}

              {/* Form elements */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {isRegister && (
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Explorer Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        style={{ paddingLeft: '38px', fontSize: '12.5px', padding: '10px' }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{
                        paddingLeft: '14px',
                        fontSize: '12.5px',
                        padding: '10px',
                        borderColor: !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'var(--glass-border)' : 'rgba(239, 68, 68, 0.5)'
                      }}
                    />
                  </div>
                </div>

                 <div>
                  <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{
                        paddingLeft: '14px',
                        paddingRight: '38px',
                        fontSize: '12.5px',
                        padding: '10px',
                        borderColor: !password || (isRegister ? (validatePasswordStrength(password).length && validatePasswordStrength(password).hasUpper && validatePasswordStrength(password).hasLower && validatePasswordStrength(password).hasNumber && validatePasswordStrength(password).hasSpecial) : password.length >= 6) ? 'var(--glass-border)' : 'rgba(239, 68, 68, 0.5)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '12.5px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0
                      }}
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  
                  {isRegister && password.length > 0 && (
                    <div style={{
                      fontSize: '11px',
                      marginTop: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      padding: '10px',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '2px' }}>Password Security Checklist:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: validatePasswordStrength(password).length ? '#00ff88' : 'var(--text-muted)' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: validatePasswordStrength(password).length ? '#00ff88' : 'var(--text-muted)' }} />
                        <span>At least 8 characters</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: (validatePasswordStrength(password).hasUpper && validatePasswordStrength(password).hasLower) ? '#00ff88' : 'var(--text-muted)' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: (validatePasswordStrength(password).hasUpper && validatePasswordStrength(password).hasLower) ? '#00ff88' : 'var(--text-muted)' }} />
                        <span>Uppercase & lowercase letters</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: validatePasswordStrength(password).hasNumber ? '#00ff88' : 'var(--text-muted)' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: validatePasswordStrength(password).hasNumber ? '#00ff88' : 'var(--text-muted)' }} />
                        <span>At least one number (0-9)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: validatePasswordStrength(password).hasSpecial ? '#00ff88' : 'var(--text-muted)' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: validatePasswordStrength(password).hasSpecial ? '#00ff88' : 'var(--text-muted)' }} />
                        <span>At least one special character (!@#$%)</span>
                      </div>
                    </div>
                  )}
                </div>



                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '11px',
                    fontSize: '12.5px'
                  }}
                >
                  {loading ? 'Processing...' : isRegister ? 'Establish Node Account' : 'Authenticate Console'}
                  <ChevronRight size={14} />
                </button>
              </form>

              {/* Divider */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '10.5px',
                margin: '16px 0'
              }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
                <span style={{ padding: '0 8px' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
              </div>

              {/* Google Sign-in button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="btn-ghost"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    borderColor: 'var(--glass-border)',
                    fontSize: '12.5px'
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginRight: '4px' }}>
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
  const [lines, setLines] = useState([]);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
        <span style={{
          display: 'inline-block',
          width: '6px',
          height: '11px',
          background: 'var(--primary)',
          animation: 'blink 1.0s step-end infinite',
          marginTop: '2px'
        }} />
      )}
      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
