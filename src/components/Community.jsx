import { useState, useEffect } from 'react';
import { getCommunityChallenges, joinCommunityChallenge, getLeaderboard } from '../utils/firebase';
import { Users, Trophy, Award, UserCheck } from 'lucide-react';

export default function Community({ user, onProfileUpdate }) {
  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

  const loadCommunityData = async () => {
    setLoading(true);
    try {
      const chData = await getCommunityChallenges();
      const lbData = await getLeaderboard();
      setChallenges(chData);
      setLeaderboard(lbData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      loadCommunityData();
    });
  }, [user]);

  const handleJoinChallenge = async (challengeId) => {
    setJoiningId(challengeId);
    try {
      const updatedUserStats = await joinCommunityChallenge(user.uid, challengeId);
      
      const updatedUser = {
        ...user,
        ...updatedUserStats
      };
      
      onProfileUpdate(updatedUser);
      loadCommunityData();
    } catch (e) {
      console.error(e);
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) {
    return (
      <div className="layout-center-300">
        <p className="text-sec">Loading community statistics...</p>
      </div>
    );
  }

  return (
    <div className="fade-in layout-stack-30">
      
      {/* Header */}
      <div>
        <h1 className="margin-bottom-6" style={{ fontSize: '28px' }}>Community Hub</h1>
        <p className="text-sec">
          Collaborate with active carbon warriors, join collective energy challenges, and top the leaderboard.
        </p>
      </div>

      <div className="dashboard-grid layout-grid-lb">
        
        {/* Left Column: Community Challenges */}
        <div className="layout-stack-20">
          <h3 className="text-size-18 layout-row-align-center-gap-10">
            <Users size={20} color="var(--primary)" />
            Active Collective Challenges
          </h3>

          <div className="layout-stack-16">
            {challenges.map((challenge) => {
              const isJoined = user.joinedChallenges?.includes(challenge.id);
              const percentage = Math.round((challenge.current / challenge.goal) * 100);

              return (
                <div key={challenge.id} className={`glass-panel challenge-item ${isJoined ? 'joined' : 'unjoined'}`}>
                  <div className="layout-between-start">
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {challenge.title}
                      </h4>
                      <p className="text-sec-12-5 margin-top-4">
                        {challenge.description}
                      </p>
                    </div>

                    {isJoined ? (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        color: 'var(--primary)',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        <UserCheck size={12} /> Joined
                      </span>
                    ) : (
                      <button
                        onClick={() => handleJoinChallenge(challenge.id)}
                        disabled={joiningId === challenge.id}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '20px' }}
                      >
                        {joiningId === challenge.id ? 'Joining...' : 'Join Event'}
                      </button>
                    )}
                  </div>

                  {/* Progress tracker */}
                  <div>
                    <div className="challenge-progress-meta">
                      <span>Community reduction goal: <strong>{challenge.goal} kg CO₂</strong></span>
                      <span>{percentage}% reached</span>
                    </div>

                    <div className="xp-bar" style={{ height: '8px' }}>
                      <div className="xp-fill" style={{ 
                        width: `${Math.min(100, percentage)}%`,
                        background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent-cyan) 100%)'
                      }} />
                    </div>

                    <div className="challenge-progress-stats">
                      <span>Saved: {challenge.current} kg CO₂</span>
                      <span>Participants: {challenge.participantCount} users</span>
                    </div>
                  </div>

                  <div className="challenge-footer">
                    <span>Your Contribution Estimate: <strong>{challenge.co2SavedPerMember} kg CO₂ / day</strong></span>
                    <span style={{ color: 'var(--accent-amber)', fontWeight: '600' }}>+{challenge.rewardXP} XP Event Bonus</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Leaderboards */}
        <div className="glass-panel glow-indigo layout-stack-20">
          <h3 className="text-size-18 layout-row-align-center-gap-10">
            <Trophy size={20} color="var(--accent-amber)" />
            Top Global Eco Warriors
          </h3>

          <div className="layout-stack-10">
            {leaderboard.map((warrior, idx) => {
              const isSelf = warrior.uid === user.uid;

              return (
                <div
                  key={warrior.uid}
                  className="glass-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: isSelf ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                    borderColor: isSelf ? 'var(--secondary)' : 'var(--glass-border)'
                  }}
                >
                  {/* Rank Indicator */}
                  <div 
                    className="leaderboard-avatar-rank"
                    style={{
                      background: idx === 0 ? 'rgba(245, 158, 11, 0.15)' : idx === 1 ? 'rgba(148, 163, 184, 0.15)' : idx === 2 ? 'rgba(180, 83, 9, 0.15)' : 'rgba(255,255,255,0.03)',
                      color: idx === 0 ? 'var(--accent-amber)' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : 'var(--text-muted)'
                    }}
                  >
                    {idx + 1}
                  </div>

                  {/* Name and Level */}
                  <div style={{ flexGrow: 1 }}>
                    <div className="leaderboard-item-details">
                      <span 
                        className="text-size-13-5"
                        style={{ 
                          fontWeight: '600',
                          color: isSelf ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                      >
                        {warrior.displayName}
                      </span>
                      {isSelf && <span style={{ fontSize: '10px', color: 'var(--secondary)' }}>(You)</span>}
                    </div>
                    <div className="text-mut-11 margin-top-2">
                      Footprint: <strong>{warrior.carbonCurrent || 6.8} tons/yr</strong>
                    </div>
                  </div>

                  {/* Level & XP */}
                  <div style={{ textAlign: 'right' }}>
                    <span className="level-badge">Lvl {warrior.level || 1}</span>
                    <div className="margin-top-4" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {warrior.xp} XP
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div 
            className="glass-card text-mut-11-5 layout-row-align-center-gap-8 margin-top-8"
            style={{
              background: 'rgba(255, 255, 255, 0.01)',
              padding: '12px',
              borderRadius: '8px'
            }}
          >
            <Award size={14} color="var(--primary)" />
            <span>Complete carbon reduction quests and submit receipts to earn XP and raise your leaderboard standing!</span>
          </div>

        </div>

      </div>
    </div>
  );
}
