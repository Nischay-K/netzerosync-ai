import { useState, useEffect, useRef } from 'react';
import { Award, Compass, Shield, Zap, Leaf, CheckCircle2, Lock, X, Trophy } from 'lucide-react';
import { getCarbonLogs, UserProfile } from '../utils/firebase';

interface AchievementsDrawerProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export default function AchievementsDrawer({ user, isOpen, onClose }: AchievementsDrawerProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

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

  // Trap Escape key and manage focus for A11y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    <div className="achievements-drawer-style-1">
      {/* Drawer Header */}
      <div className="achievements-drawer-style-2">
        <div className="achievements-drawer-style-3">
          <div className="achievements-drawer-style-4">
            <Award size={20} />
          </div>
          <div>
            <h3 className="achievements-drawer-style-5">Eco Achievements</h3>
            <span className="achievements-drawer-style-6">
              Gamified Carbon Milestones
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          ref={closeButtonRef}
          aria-label="Close Achievements Drawer"
          className="achievements-drawer-style-7"
        >
          <X size={20} />
        </button>
      </div>

      {/* Progress Circle Summary */}
      <div className="achievements-drawer-style-8">
        <div className="achievements-drawer-style-9">
          {/* SVG Progress Circle */}
          <svg width="70" height="70" aria-hidden="true" className="achievements-drawer-style-10">
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
              className="achievements-drawer-style-11"
            />
          </svg>
          <span className="achievements-drawer-style-12">
            {progressPercent}%
          </span>
        </div>

        <div className="achievements-drawer-style-13">
          <div className="achievements-drawer-style-14">
            Milestones Tracker
          </div>
          <div className="achievements-drawer-style-15">
            Unlocked {unlockedCount} of {badges.length} environmental badges. Keep logging green choices to unlock more!
          </div>
        </div>
      </div>

      {/* Badges List container */}
      <div className="achievements-drawer-style-16">
        {loading ? (
          <div className="achievements-drawer-style-17">
            <div className="achievements-drawer-style-18" />
          </div>
        ) : (
          badges.map((badge) => (
            <div
              key={badge.id}
              role="status"
              aria-label={`${badge.title} badge - ${badge.isUnlocked ? 'Unlocked' : 'Locked'}. ${badge.description}`}
              className={`glass-panel ${badge.isUnlocked ? badge.glowClass : ''} achievements-drawer-style-19`} style={{ background: badge.isUnlocked ? 'rgba(11, 33, 26, 0.5)' : 'rgba(11, 33, 26, 0.25)', borderColor: badge.isUnlocked ? badge.color + '33' : 'rgba(255,255,255,0.04)', opacity: badge.isUnlocked ? 1 : 0.65 }}
            >
              {/* Badge Icon circle */}
              <div className="achievements-drawer-style-20" style={{ background: badge.isUnlocked ? badge.color + '18' : 'rgba(255,255,255,0.02)', border: `1px solid ${badge.isUnlocked ? badge.color + '44' : 'rgba(255,255,255,0.05)'}`, color: badge.isUnlocked ? badge.color : 'var(--text-muted)', boxShadow: badge.isUnlocked ? `0 0 15px ${badge.color}15` : 'none' }}>
                {badge.icon}
              </div>

              {/* Text Info */}
              <div className="achievements-drawer-style-21">
                <div className="achievements-drawer-style-22">
                  <h4 className="achievements-drawer-style-23" style={{ color: badge.isUnlocked ? '#fff' : 'var(--text-muted)' }}>
                    {badge.title}
                  </h4>
                  {badge.isUnlocked ? (
                    <span className="achievements-drawer-style-24" style={{ color: badge.color }}>
                      <CheckCircle2 size={11} /> Unlocked
                    </span>
                  ) : (
                    <span className="achievements-drawer-style-25">
                      <Lock size={11} /> Locked
                    </span>
                  )}
                </div>
                <p className="achievements-drawer-style-26">
                  {badge.description}
                </p>
                <div className="achievements-drawer-style-27" style={{ color: badge.isUnlocked ? 'var(--primary)' : 'var(--text-muted)' }}>
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
