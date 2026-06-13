import { useState } from 'react';
import { logCarbonEntry } from '../utils/firebase';
import { verifyQuestPhoto } from '../utils/gemini';
import { CheckCircle2, Star, Award, Zap, Compass, RefreshCw, Camera, AlertCircle, Leaf } from 'lucide-react';

export default function CarbonQuest({ user, onProfileUpdate }) {
  const [completingId, setCompletingId] = useState(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [feedback, setFeedback] = useState({}); // { [missionId]: { success: bool, text: string } }

  const [activeMissions, setActiveMissions] = useState(() => {
    const stored = localStorage.getItem(`ecoSphere_missions_${user.uid}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [
          { id: 'm_1', title: 'Cold Wash Cycle', description: 'Wash a full load of laundry on a cold water setting.', category: 'Energy', xp: 150, co2Saved: 3 },
          { id: 'm_2', title: 'Meatless Dinner', description: 'Eat a completely vegetarian or vegan dinner tonight.', category: 'Diet', xp: 200, co2Saved: 5 },
          { id: 'm_3', title: 'Bikers Club', description: 'Replace a car drive under 5 km with walking or cycling.', category: 'Transport', xp: 250, co2Saved: 8 },
          { id: 'm_4', title: 'Vampire Slayer', description: 'Unplug 5 unused electronics (TVs, chargers, microwave clocks) before sleeping.', category: 'Energy', xp: 100, co2Saved: 1.5 }
        ];
      }
    } else {
      const defaultMissions = [
        { id: 'm_1', title: 'Cold Wash Cycle', description: 'Wash a full load of laundry on a cold water setting.', category: 'Energy', xp: 150, co2Saved: 3 },
        { id: 'm_2', title: 'Meatless Dinner', description: 'Eat a completely vegetarian or vegan dinner tonight.', category: 'Diet', xp: 200, co2Saved: 5 },
        { id: 'm_3', title: 'Bikers Club', description: 'Replace a car drive under 5 km with walking or cycling.', category: 'Transport', xp: 250, co2Saved: 8 },
        { id: 'm_4', title: 'Vampire Slayer', description: 'Unplug 5 unused electronics (TVs, chargers, microwave clocks) before sleeping.', category: 'Energy', xp: 100, co2Saved: 1.5 }
      ];
      localStorage.setItem(`ecoSphere_missions_${user.uid}`, JSON.stringify(defaultMissions));
      return defaultMissions;
    }
  });

  const handleCompleteMission = async (mission) => {
    setCompletingId(mission.id);
    try {
      // 1. Log Carbon Entry and update quest rewards atomically via secure gateway
      const result = await logCarbonEntry(user.uid, {
        name: `Mission Completed: ${mission.title}`,
        category: mission.category,
        co2Value: -mission.co2Saved, // negative delta means savings!
        notes: `Successfully completed quest and prevented ${mission.co2Saved} kg of carbon output.`
      }, {
        logType: 'quest',
        questId: mission.id,
        questXP: mission.xp,
        questTokens: mission.xp // award mission.xp tokens
      });

      // 2. Update UI: remove completed mission
      const remainingMissions = activeMissions.filter(m => m.id !== mission.id);
      setActiveMissions(remainingMissions);
      localStorage.setItem(`ecoSphere_missions_${user.uid}`, JSON.stringify(remainingMissions));

      // 3. Update local state using securely calculated stats
      const updatedUser = {
        ...user,
        completedMissions: result.completedMissions,
        carbonCurrent: result.carbonCurrent,
        xp: result.xp,
        level: result.level,
        ecoTokens: result.ecoTokens
      };
      onProfileUpdate(updatedUser);

    } catch (e) {
      console.error("Failed to complete mission", e);
    } finally {
      setCompletingId(null);
    }
  };

  const handleVerifyPhoto = async (e, mission) => {
    const file = e.target.files[0];
    if (!file) return;

    setVerifyingId(mission.id);
    setFeedback(prev => ({ ...prev, [mission.id]: null }));

    try {
      const verificationResult = await verifyQuestPhoto(file, mission.title);
      
      if (verificationResult.verified) {
        setFeedback(prev => ({ 
          ...prev, 
          [mission.id]: { success: true, text: verificationResult.explanation } 
        }));

        // Award base XP + 100 XP photo bonus, and 50 extra Eco-Tokens for visual proof
        const totalXpGranted = mission.xp + 100;
        const totalTokensGranted = mission.xp + 50;

        // Log carbon entry and quest rewards atomically via secure gateway
        const result = await logCarbonEntry(user.uid, {
          name: `Mission Verified via Photo: ${mission.title}`,
          category: mission.category,
          co2Value: -mission.co2Saved,
          notes: `AI Confirmed: ${verificationResult.explanation}`
        }, {
          logType: 'quest',
          questId: mission.id,
          questXP: totalXpGranted,
          questTokens: totalTokensGranted
        });

        // Delay slightly so user can read the success message before disappearing
        setTimeout(async () => {
          const remainingMissions = activeMissions.filter(m => m.id !== mission.id);
          setActiveMissions(remainingMissions);
          localStorage.setItem(`ecoSphere_missions_${user.uid}`, JSON.stringify(remainingMissions));

          const updatedUser = {
            ...user,
            completedMissions: result.completedMissions,
            carbonCurrent: result.carbonCurrent,
            xp: result.xp,
            level: result.level,
            ecoTokens: result.ecoTokens
          };
          onProfileUpdate(updatedUser);
          setFeedback(prev => ({ ...prev, [mission.id]: null }));
        }, 3000);

      } else {
        setFeedback(prev => ({ 
          ...prev, 
          [mission.id]: { success: false, text: verificationResult.explanation || "Verification failed. The uploaded photo did not match the quest criteria." } 
        }));
      }
    } catch (err) {
      console.error(err);
      setFeedback(prev => ({ 
        ...prev, 
        [mission.id]: { success: false, text: "AI scanning error. Please try completing manually instead." } 
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  const handleGenerateAiMissions = async () => {
    setAiGenerating(true);
    // Simulate AI prompt analysis
    await new Promise(r => setTimeout(r, 1500));
    try {
      const generated = [
        { id: `m_ai_${Date.now()}_1`, title: 'Line Dry Day', description: 'Air-dry your clothes today instead of using the dryer.', category: 'Energy', xp: 180, co2Saved: 4.2 },
        { id: `m_ai_${Date.now()}_2`, title: 'No-Plastic Shopping', description: 'Go shopping using only reusable bags and avoid any plastic packaging.', category: 'Shopping', xp: 220, co2Saved: 3 },
        { id: `m_ai_${Date.now()}_3`, title: 'Carpool Commute', description: 'Carpool with a colleague or friend for your daily drive.', category: 'Transport', xp: 200, co2Saved: 6 }
      ];
      
      const merged = [...activeMissions, ...generated].slice(0, 6); // Cap at 6 active
      setActiveMissions(merged);
      localStorage.setItem(`ecoSphere_missions_${user.uid}`, JSON.stringify(merged));
    } catch (e) {
      console.error(e);
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>CarbonQuest</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Complete individual missions, level up your profile, and earn achievements.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="glass-panel" style={{
            padding: '10px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            background: 'rgba(0, 255, 136, 0.03)',
            boxShadow: '0 0 15px rgba(0, 255, 136, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Leaf size={14} color="var(--primary)" />
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {user.ecoTokens || 0}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Eco-Tokens</span>
          </div>

          <button
            onClick={handleGenerateAiMissions}
            disabled={aiGenerating}
            className="btn-secondary glow-indigo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              fontSize: '13px'
            }}
          >
            <RefreshCw size={14} className={aiGenerating ? 'animate-spin' : ''} />
            {aiGenerating ? 'AI Generating...' : 'Suggest AI Quests'}
          </button>
        </div>
      </div>

      {/* Progress Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }} className="dashboard-grid">
        
        {/* Active Missions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={20} color="var(--primary)" />
            Active Quests
          </h3>

          {activeMissions.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={36} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>All quests completed!</p>
              <p style={{ fontSize: '12.5px' }}>Click "Suggest AI Quests" above to receive customized sustainability missions.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeMissions.map((mission) => {
                const missionFeedback = feedback[mission.id];
                const isVerifying = verifyingId === mission.id;
                
                return (
                  <div key={mission.id} className="glass-panel" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '20px',
                    gap: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px'
                    }}>
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--glass-border)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600',
                            color: 'var(--text-muted)'
                          }}>
                            {mission.category}
                          </span>
                          <span style={{
                            background: 'rgba(0, 255, 136, 0.1)',
                            color: 'var(--primary)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            Saves {mission.co2Saved} kg CO₂
                          </span>
                        </div>

                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {mission.title}
                        </h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                          {mission.description}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-amber)', fontSize: '13px', fontWeight: '700' }}>
                            <Star size={14} fill="var(--accent-amber)" />
                            +{mission.xp}
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>XP Reward</span>
                        </div>

                        {/* Hidden file input */}
                        <input
                          type="file"
                          accept="image/*"
                          id={`file-verify-${mission.id}`}
                          onChange={(e) => handleVerifyPhoto(e, mission)}
                          style={{ display: 'none' }}
                          disabled={completingId === mission.id || isVerifying}
                        />

                        {/* Verify button */}
                        <label
                          htmlFor={`file-verify-${mission.id}`}
                          className="btn-ghost"
                          style={{
                            padding: '8px 12px',
                            fontSize: '12px',
                            borderColor: 'rgba(0, 240, 255, 0.3)',
                            color: 'var(--accent-cyan)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            opacity: (completingId === mission.id || isVerifying) ? 0.5 : 1,
                            pointerEvents: (completingId === mission.id || isVerifying) ? 'none' : 'auto'
                          }}
                        >
                          <Camera size={14} />
                          Verify
                        </label>

                        {/* Manual Complete */}
                        <button
                          onClick={() => handleCompleteMission(mission)}
                          disabled={completingId === mission.id || isVerifying}
                          className="btn-ghost"
                          style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            borderColor: 'rgba(0, 255, 136, 0.3)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {completingId === mission.id ? 'Claiming...' : 'Complete'}
                        </button>
                      </div>
                    </div>

                    {/* Verification Loader */}
                    {isVerifying && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '12px',
                        color: 'var(--accent-cyan)',
                        background: 'rgba(0, 240, 255, 0.05)',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px dashed rgba(0, 240, 255, 0.2)'
                      }}>
                        <div style={{
                          width: '14px',
                          height: '14px',
                          border: '2px solid var(--glass-border)',
                          borderTopColor: 'var(--accent-cyan)',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        <span>Copilot Coach checking visual proof... (+100 XP photo bonus pending)</span>
                      </div>
                    )}

                    {/* Verification Feedback Banner */}
                    {missionFeedback && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        fontSize: '12px',
                        background: missionFeedback.success ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255, 42, 95, 0.08)',
                        border: missionFeedback.success ? '1px solid rgba(0, 255, 136, 0.2)' : '1px solid rgba(255, 42, 95, 0.2)',
                        color: missionFeedback.success ? 'var(--primary)' : 'var(--accent-rose)',
                        padding: '10px 12px',
                        borderRadius: '8px'
                      }}>
                        {missionFeedback.success ? <CheckCircle2 size={16} style={{ marginTop: '1px', flexShrink: 0 }} /> : <AlertCircle size={16} style={{ marginTop: '1px', flexShrink: 0 }} />}
                        <div>
                          <strong>{missionFeedback.success ? 'AI Proof Verified! (+100 XP Bonus)' : 'Verification Failed'}</strong>
                          <p style={{ marginTop: '2px', color: 'var(--text-secondary)' }}>{missionFeedback.text}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Achievements & Profile level */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Level Progress */}
          <div className="glass-panel glow-indigo" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="var(--secondary)" />
              Profile Level Status
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, var(--secondary) 0%, var(--accent-purple) 100%)',
                color: '#fff',
                fontSize: '20px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}>
                Lvl {user.level || 1}
              </div>

              <div style={{ flexGrow: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>XP: {user.xp || 0} / {Math.ceil(((user.xp || 0) + 1) / 1000) * 1000}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {Math.round(((user.xp || 0) % 1000) / 10)}% to next lvl
                  </span>
                </div>
                <div className="xp-bar">
                  <div className="xp-fill" style={{ width: `${((user.xp || 0) % 1000) / 10}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Badges / Achievements Unlock */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="var(--accent-amber)" />
              Earned Badges
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { id: 'b_1', name: 'Seed Sower', desc: 'Initialize your EcoTwin', unlocked: true, iconColor: '#10b981' },
                { id: 'b_2', name: 'Green Chef', desc: 'Complete 3 diet quests', unlocked: user.completedMissions?.length >= 3, iconColor: '#059669' },
                { id: 'b_3', name: 'Grid Master', desc: 'Complete 5 energy quests', unlocked: user.completedMissions?.length >= 5, iconColor: '#06b6d4' },
                { id: 'b_4', name: 'Commuter Pro', desc: 'Swap 5 petrol commutes', unlocked: user.completedMissions?.length >= 8, iconColor: '#6366f1' }
              ].map(badge => (
                <div
                  key={badge.id}
                  className="glass-card"
                  style={{
                    opacity: badge.unlocked ? 1 : 0.45,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: '12px 8px'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: badge.unlocked ? `rgba(255, 255, 255, 0.05)` : 'rgba(0, 0, 0, 0.1)',
                    border: badge.unlocked ? `1.5px solid ${badge.iconColor}` : '1.5px solid var(--glass-border)',
                    color: badge.unlocked ? badge.iconColor : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px'
                  }}>
                    <Award size={18} />
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: badge.unlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {badge.name}
                  </div>
                  <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.3' }}>
                    {badge.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
