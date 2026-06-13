import { useState, useEffect } from 'react';
import { Award, Compass, Shield, Zap, Leaf, CheckCircle2, Lock, X, Trophy } from 'lucide-react';
import { getCarbonLogs } from '../utils/firebase';

export default function AchievementsDrawer({ user, isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.uid) {
      Promise.resolve().then(() => {
        setLoading(true);
      });
      getCarbonLogs(user.uid)
        .then(history => {
          setLogs(history || []);
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, user?.uid]);

  if (!isOpen) return null;

  // Badge criteria calculations
  const badges = [
    {
      id: 'badge_scout',
      title: 'Carbon Scout',
      description: 'Log at least 1 manual habit entry to begin your tracking telemetry.',
      icon: <Compass size={24} />,
      isUnlocked: logs.length > 0,
      criteriaText: 'Log 1 manual activity',
      color: '#10b981', // Emerald
      glowClass: 'glow-emerald'
    },
    {
      id: 'badge_scanner',
      title: 'Visionary Scanner',
      description: 'Use the Carbon Lens AI model to scan and parse a product or invoice.',
      icon: <Zap size={24} />,
      isUnlocked: logs.some(l => l.name?.toLowerCase().includes('lens') || l.category === 'Shopping'),
      criteriaText: 'Scan a receipt or product with Lens',
      color: '#00f0ff', // Cyan
      glowClass: 'glow-cyan'
    },
    {
      id: 'badge_patron',
      title: 'Green Patron',
      description: 'Exchange your earned Eco-Tokens to fund a verified green project offset.',
      icon: <Leaf size={24} />,
      isUnlocked: logs.some(l => l.category === 'Offset' || l.name?.toLowerCase().includes('offset')),
      criteriaText: 'Fund a carbon offset project',
      color: '#fbbf24', // Amber
      glowClass: 'glow-amber'
    },
    {
      id: 'badge_climber',
      title: 'Eco Climber',
      description: 'Earn enough experience points (XP) to climb to Level 2 or higher.',
      icon: <Shield size={24} />,
      isUnlocked: (user.level || 1) >= 2,
      criteriaText: 'Reach Level 2 rank',
      color: '#8b5cf6', // Purple
      glowClass: 'glow-purple'
    },
    {
      id: 'badge_hero',
      title: 'Net-Zero Hero',
      description: 'Optimize lifestyle parameters until current footprint is equal or below your target limit.',
      icon: <Trophy size={24} />,
      isUnlocked: (user.carbonCurrent || 6.8) <= (user.carbonTarget || 3.5),
      criteriaText: 'Current Footprint <= Target Footprint',
      color: '#f43f5e', // Rose
      glowClass: 'glow-rose'
    }
  ];

  const unlockedCount = badges.filter(b => b.isUnlocked).length;
  const progressPercent = Math.round((unlockedCount / badges.length) * 100);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '400px',
      height: '100vh',
      background: 'rgba(5, 22, 16, 0.95)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid var(--glass-border)',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.6)',
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
      {/* Drawer Header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.01)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '8px',
            borderRadius: '10px',
            color: 'var(--primary)',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.15)'
          }}>
            <Award size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Eco Achievements</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Gamified Carbon Milestones
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Progress Circle Summary */}
      <div style={{
        padding: '24px 20px',
        background: 'rgba(11, 33, 26, 0.3)',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '24px'
      }}>
        <div style={{ position: 'relative', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* SVG Progress Circle */}
          <svg width="70" height="70" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="35"
              cy="35"
              r="30"
              fill="transparent"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="5"
            />
            <circle
              cx="35"
              cy="35"
              r="30"
              fill="transparent"
              stroke="var(--primary)"
              strokeWidth="5"
              strokeDasharray={2 * Math.PI * 30}
              strokeDashoffset={2 * Math.PI * 30 * (1 - progressPercent / 100)}
              style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
            />
          </svg>
          <span style={{
            position: 'absolute',
            fontSize: '14px',
            fontWeight: '700',
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)'
          }}>
            {progressPercent}%
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
            Milestones Tracker
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            Unlocked {unlockedCount} of {badges.length} environmental badges. Keep logging green choices to unlock more!
          </div>
        </div>
      </div>

      {/* Badges List container */}
      <div style={{
        flexGrow: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0' }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '2.5px solid var(--glass-border)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : (
          badges.map((badge) => (
            <div
              key={badge.id}
              className={`glass-panel ${badge.isUnlocked ? badge.glowClass : ''}`}
              style={{
                display: 'flex',
                gap: '16px',
                padding: '16px',
                background: badge.isUnlocked ? 'rgba(11, 33, 26, 0.5)' : 'rgba(11, 33, 26, 0.25)',
                borderColor: badge.isUnlocked ? badge.color + '33' : 'rgba(255,255,255,0.04)',
                opacity: badge.isUnlocked ? 1 : 0.65,
                position: 'relative',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Badge Icon circle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: badge.isUnlocked ? badge.color + '18' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${badge.isUnlocked ? badge.color + '44' : 'rgba(255,255,255,0.05)'}`,
                color: badge.isUnlocked ? badge.color : 'var(--text-muted)',
                boxShadow: badge.isUnlocked ? `0 0 15px ${badge.color}15` : 'none'
              }}>
                {badge.icon}
              </div>

              {/* Text Info */}
              <div style={{ flexGrow: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: badge.isUnlocked ? '#fff' : 'var(--text-muted)' }}>
                    {badge.title}
                  </h4>
                  {badge.isUnlocked ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9.5px', color: badge.color, fontWeight: '700', textTransform: 'uppercase' }}>
                      <CheckCircle2 size={11} /> Unlocked
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: '500' }}>
                      <Lock size={11} /> Locked
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '6px' }}>
                  {badge.description}
                </p>
                <div style={{
                  fontSize: '9.5px',
                  fontFamily: 'monospace',
                  color: badge.isUnlocked ? 'var(--primary)' : 'var(--text-muted)',
                  background: 'rgba(255,255,255,0.02)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  Target: {badge.criteriaText}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Embedded CSS Animations */}
      <style>{`
        .glow-cyan {
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.08);
          border-color: rgba(0, 240, 255, 0.25) !important;
        }
        .glow-amber {
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.08);
          border-color: rgba(251, 191, 36, 0.25) !important;
        }
        .glow-purple {
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.08);
          border-color: rgba(139, 92, 246, 0.25) !important;
        }
        .glow-rose {
          box-shadow: 0 0 20px rgba(244, 63, 94, 0.08);
          border-color: rgba(244, 63, 94, 0.25) !important;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
