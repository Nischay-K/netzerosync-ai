import React, { useState } from 'react';
import { logCarbonEntry, UserProfile } from '../utils/firebase';
import { verifyQuestPhoto } from '../utils/gemini';
import { CheckCircle2, Star, Award, Zap, Compass, RefreshCw, Camera, AlertCircle, Leaf } from 'lucide-react';

interface CarbonQuestProps {
  user: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  category: string;
  xp: number;
  co2Saved: number;
}

export default function CarbonQuest({ user, onProfileUpdate }: CarbonQuestProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { success: boolean; text: string } | null>>({});

  const [activeMissions, setActiveMissions] = useState<Mission[]>(() => {
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

  const handleCompleteMission = async (mission: Mission) => {
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
      const updatedUser: UserProfile = {
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

  const handleVerifyPhoto = async (e: React.ChangeEvent<HTMLInputElement>, mission: Mission) => {
    const file = e.target.files?.[0];
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

          const updatedUser: UserProfile = {
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
      const generated: Mission[] = [
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
    <div className="fade-in carbon-quest-style-1">
      
      {/* Header */}
      <div className="carbon-quest-style-2">
        <div>
          <h1 className="carbon-quest-style-3">CarbonQuest</h1>
          <p className="carbon-quest-style-4">
            Complete individual missions, level up your profile, and earn achievements.
          </p>
        </div>

        <div className="carbon-quest-style-5">
          <div className="glass-panel carbon-quest-style-6">
            <Leaf size={14} color="var(--primary)" />
            <span className="carbon-quest-style-7">
              {user.ecoTokens || 0}
            </span>
            <span className="carbon-quest-style-8">Eco-Tokens</span>
          </div>

          <button
            onClick={handleGenerateAiMissions}
            disabled={aiGenerating}
            className="btn-secondary glow-indigo carbon-quest-style-9"
          >
            <RefreshCw size={14} className={aiGenerating ? 'animate-spin' : ''} />
            {aiGenerating ? 'AI Generating...' : 'Suggest AI Quests'}
          </button>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="carbon-quest-style-10 dashboard-grid">
        
        {/* Active Missions List */}
        <div className="carbon-quest-style-11">
          <h3 className="carbon-quest-style-12">
            <Compass size={20} color="var(--primary)" />
            Active Quests
          </h3>

          {activeMissions.length === 0 ? (
            <div className="glass-panel carbon-quest-style-13">
              <CheckCircle2 size={36} color="var(--primary)" className="carbon-quest-style-14" />
              <p className="carbon-quest-style-15">All quests completed!</p>
              <p className="carbon-quest-style-16">Click "Suggest AI Quests" above to receive customized sustainability missions.</p>
            </div>
          ) : (
            <div className="carbon-quest-style-17">
              {activeMissions.map((mission) => {
                const missionFeedback = feedback[mission.id];
                const isVerifying = verifyingId === mission.id;
                
                return (
                  <div key={mission.id} className="glass-panel carbon-quest-style-18">
                    <div className="carbon-quest-style-19">
                      <div className="carbon-quest-style-20">
                        <div className="carbon-quest-style-21">
                          <span className="carbon-quest-style-22">
                            {mission.category}
                          </span>
                          <span className="carbon-quest-style-23">
                            Saves {mission.co2Saved} kg CO₂
                          </span>
                        </div>

                        <h4 className="carbon-quest-style-24">
                          {mission.title}
                        </h4>
                        <p className="carbon-quest-style-25">
                          {mission.description}
                        </p>
                      </div>

                      <div className="carbon-quest-style-26">
                        <div className="carbon-quest-style-27">
                          <div className="carbon-quest-style-28">
                            <Star size={14} fill="var(--accent-amber)" />
                            +{mission.xp}
                          </div>
                          <span className="carbon-quest-style-29">XP Reward</span>
                        </div>

                        {/* Hidden file input */}
                        <input
                          type="file"
                          accept="image/*"
                          id={`file-verify-${mission.id}`}
                          onChange={(e) => handleVerifyPhoto(e, mission)}
                          className="carbon-quest-style-30"
                          disabled={completingId === mission.id || isVerifying}
                        />

                        {/* Verify button */}
                        <label
                          htmlFor={`file-verify-${mission.id}`}
                          className="btn-ghost carbon-quest-style-31"
                          style={{ opacity: (completingId === mission.id || isVerifying) ? 0.5 : 1, pointerEvents: (completingId === mission.id || isVerifying) ? 'none' : 'auto' }}
                        >
                          <Camera size={14} />
                          Verify
                        </label>

                        {/* Manual Complete */}
                        <button
                          onClick={() => handleCompleteMission(mission)}
                          disabled={completingId === mission.id || isVerifying}
                          className="btn-ghost carbon-quest-style-32"
                        >
                          {completingId === mission.id ? 'Claiming...' : 'Complete'}
                        </button>
                      </div>
                    </div>

                    {/* Verification Loader */}
                    {isVerifying && (
                      <div className="carbon-quest-style-33">
                        <div className="carbon-quest-style-34" />
                        <span>Copilot Coach checking visual proof... (+100 XP photo bonus pending)</span>
                      </div>
                    )}

                    {/* Verification Feedback Banner */}
                    {missionFeedback && (
                      <div className="carbon-quest-style-35" style={{ background: missionFeedback.success ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255, 42, 95, 0.08)', border: missionFeedback.success ? '1px solid rgba(0, 255, 136, 0.2)' : '1px solid rgba(255, 42, 95, 0.2)', color: missionFeedback.success ? 'var(--primary)' : 'var(--accent-rose)' }}>
                        {missionFeedback.success ? <CheckCircle2 size={16} className="carbon-quest-style-36" /> : <AlertCircle size={16} className="carbon-quest-style-37" />}
                        <div>
                          <strong>{missionFeedback.success ? 'AI Proof Verified! (+100 XP Bonus)' : 'Verification Failed'}</strong>
                          <p className="carbon-quest-style-38">{missionFeedback.text}</p>
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
        <div className="carbon-quest-style-39">
          
          {/* Level Progress */}
          <div className="glass-panel glow-indigo carbon-quest-style-40">
            <h3 className="carbon-quest-style-41">
              <Zap size={18} color="var(--secondary)" />
              Profile Level Status
            </h3>

            <div className="carbon-quest-style-42">
              <div className="carbon-quest-style-43">
                Lvl {user.level || 1}
              </div>

              <div className="carbon-quest-style-44">
                <div className="carbon-quest-style-45">
                  <span className="carbon-quest-style-46">XP: {user.xp || 0} / {Math.ceil(((user.xp || 0) + 1) / 1000) * 1000}</span>
                  <span className="carbon-quest-style-47">
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
          <div className="glass-panel carbon-quest-style-48">
            <h3 className="carbon-quest-style-49">
              <Award size={18} color="var(--accent-amber)" />
              Earned Badges
            </h3>

            <div className="carbon-quest-style-50">
              {[
                { id: 'b_1', name: 'Seed Sower', desc: 'Initialize your EcoTwin', unlocked: true, iconColor: '#10b981' },
                { id: 'b_2', name: 'Green Chef', desc: 'Complete 3 diet quests', unlocked: (user.completedMissions?.length || 0) >= 3, iconColor: '#059669' },
                { id: 'b_3', name: 'Grid Master', desc: 'Complete 5 energy quests', unlocked: (user.completedMissions?.length || 0) >= 5, iconColor: '#06b6d4' },
                { id: 'b_4', name: 'Commuter Pro', desc: 'Swap 5 petrol commutes', unlocked: (user.completedMissions?.length || 0) >= 8, iconColor: '#6366f1' }
              ].map(badge => (
                <div
                  key={badge.id}
                  className="glass-card carbon-quest-style-51"
                  style={{ opacity: badge.unlocked ? 1 : 0.45 }}
                >
                  <div className="carbon-quest-style-52" style={{ background: badge.unlocked ? `rgba(255, 255, 255, 0.05)` : 'rgba(0, 0, 0, 0.1)', border: badge.unlocked ? `1.5px solid ${badge.iconColor}` : '1.5px solid var(--glass-border)', color: badge.unlocked ? badge.iconColor : 'var(--text-muted)' }}>
                    <Award size={18} />
                  </div>
                  <div className="carbon-quest-style-53" style={{ color: badge.unlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {badge.name}
                  </div>
                  <div className="carbon-quest-style-54">
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
