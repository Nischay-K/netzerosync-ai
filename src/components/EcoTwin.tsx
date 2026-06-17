import { useState, useEffect, useRef } from 'react';
import { updateUserProfile, UserProfile } from '../utils/firebase';
import { calculateSimulationMetrics } from '../utils/calculators';
import { Leaf, TrendingDown } from 'lucide-react';
import useEcoTwinThree from '../utils/useEcoTwinThree';
import styles from './EcoTwin.module.css';

const treePositions = [
  { x: -2.0, z: 2.2 }, { x: -3.2, z: 3.5 }, { x: -4.0, z: 2.0 }, { x: -1.0, z: 3.8 },
  { x: 2.2, z: 2.2 }, { x: 3.2, z: 3.2 }, { x: 4.2, z: 1.5 }, { x: 1.5, z: 4.0 }, { x: -3.8, z: -2.0 }
];

interface EcoTwinProps {
  user: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
}

export default function EcoTwin({ user, onProfileUpdate }: EcoTwinProps) {
  const [threeLib, setThreeLib] = useState<typeof import('three') | null>(null);
  const [focusedItem, setFocusedItem] = useState<{ x: number; z: number; type: string; id: string } | null>(null);
  const focusedItemRef = useRef(focusedItem);

  useEffect(() => {
    focusedItemRef.current = focusedItem;
  }, [focusedItem]);

  // Load Three.js dynamically to prevent initial asset download delay
  useEffect(() => {
    import('three').then((mod) => {
      setThreeLib(mod);
    }).catch((err) => {
      console.error('Failed to load Three.js dynamically:', err);
    });
  }, []);

  // Current values (historical logs)
  const currentTransport = user.twinState?.transportSlider || 50;
  const currentDiet = user.twinState?.dietSlider || 50;
  const currentEnergy = user.twinState?.energySlider || 50;
  const currentShopping = user.twinState?.shoppingSlider || 50;

  // Simulation Sliders (Target lifestyle)
  const [simTransport, setSimTransport] = useState(currentTransport);
  const [simDiet, setSimDiet] = useState(currentDiet);
  const [simEnergy, setSimEnergy] = useState(currentEnergy);
  const [simShopping, setSimShopping] = useState(currentShopping);

  const [savingLoading, setSavingLoading] = useState(false);
  const [toast, setToast] = useState('');
  
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync sliders if profile changes
  useEffect(() => {
    Promise.resolve().then(() => {
      setSimTransport(currentTransport);
      setSimDiet(currentDiet);
      setSimEnergy(currentEnergy);
      setSimShopping(currentShopping);
    });
  }, [currentTransport, currentDiet, currentEnergy, currentShopping]);

  // Calculations
  const {
    simScore,
    calculatedSimCO2,
    co2Saved,
    treesEquivalent,
    financialSavings
  } = calculateSimulationMetrics(
    simTransport, simDiet, simEnergy, simShopping,
    currentTransport, currentDiet, currentEnergy, currentShopping
  );

  const handleApplyHabits = async () => {
    setSavingLoading(true);
    try {
      const updatedState = {
        transportSlider: simTransport,
        dietSlider: simDiet,
        energySlider: simEnergy,
        shoppingSlider: simShopping
      };
      
      await updateUserProfile(user.uid, {
        twinState: updatedState,
        carbonCurrent: calculatedSimCO2 // adjust user footprint to new simulated target
      });
      
      onProfileUpdate({
        ...user,
        twinState: updatedState,
        carbonCurrent: calculatedSimCO2
      });

      setToast('EcoTwin lifestyle adjustments applied successfully!');
      setTimeout(() => setToast(''), 4000);
    } catch (e) {
      console.error(e);
      setToast('Failed to apply adjustments.');
      setTimeout(() => setToast(''), 4000);
    } finally {
      setSavingLoading(false);
    }
  };

  const isHealthy = simScore < 150;
  const isModerate = simScore >= 150 && simScore < 260;
  const treesCount = isHealthy ? 9 : isModerate ? 4 : 0;

  // Call the Three.js simulator custom hook to manage the WebGL canvas
  useEcoTwinThree({
    canvasContainerRef,
    threeLib,
    simTransport,
    simDiet,
    simEnergy,
    simShopping,
    simScore,
    isHealthy,
    isModerate,
    treesCount,
    focusedItem
  });

  // Accessibility Announcement State
  const [a11yAnnouncement, setA11yAnnouncement] = useState('');

  const announceChange = (label: string, value: string) => {
    setA11yAnnouncement(`${label} changed to ${value}. Ecosystem updated.`);
  };

  return (
    <div className={`fade-in ${styles.ecoTwinContainer}`}>
      {/* Accessibility screen-reader only live announcements */}
      <div 
        className="sr-only" 
        role="status" 
        aria-live="polite" 
        style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}
      >
        {a11yAnnouncement}
      </div>

      
      {/* Toast */}
      {toast && (
        <div className={styles.ecoTwinToast}>
          {toast}
        </div>
      )}

      {/* Header section */}
      <div className={styles.ecoTwinHeader}>
        <div>
          <h1 className={styles.ecoTwinTitle}>Digital Sustainability Twin</h1>
          <p className={styles.ecoTwinSubtitle}>
            Simulate how changes to your daily lifestyle transform your local ecosystem.
          </p>
        </div>
      </div>

      <div className={`${styles.ecoTwinLayoutGrid} dashboard-grid`}>
        
        {/* Left Column: Interactive Twin Visualizer */}
        <div className={`glass-panel glow-indigo ${styles.ecoTwinVisualizerPanel}`}>
          <div className={styles.ecoTwinStatusHeader}>
            <h3 className={styles.ecoTwinStatusTitle}>3D Ecosystem Status: 
              <span className={styles.ecoTwinStatusValue} style={{ color: isHealthy ? 'var(--primary)' : isModerate ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>
                {isHealthy ? 'Pristine & Renewable' : isModerate ? 'Stressed Environment' : 'Industrial Smog Alert'}
              </span>
            </h3>
            <span className={styles.ecoTwinScoreIndex}>Score Index: {simScore}/400</span>
          </div>

          {/* Dynamic 3D WebGL Ecosystem Twin */}
          <div className={styles.ecoTwinCanvasWrapper} style={{ position: 'relative' }}>
            {/* Asset Loading overlay when Three.js chunk is downloading */}
            {!threeLib && (
              <div className="three-loading-spinner-container" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '12px',
                zIndex: 5
              }}>
                <div className="loading-spinner" style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  borderTopColor: '#10b981',
                  animation: 'spin 1.5s linear infinite'
                }} />
                <span style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>Loading interactive 3D assets...</span>
              </div>
            )}
            
            {/* 3D WebGL Canvas Container */}
            <div 
              ref={canvasContainerRef} 
              className={`${styles.ecoTwinCanvasElement} eco-twin-canvas-element`} 
              role="img" 
              aria-label={`Interactive 3D Ecosystem Twin. The environment is currently ${isHealthy ? 'Pristine and Renewable with green lands, spinning wind turbines, and growing trees.' : isModerate ? 'Stressed with drying grass.' : 'Polluted with industrial smoke and smog particles.'} You can click and drag on the 3D scene to rotate and view the landscape from different angles.`}
              tabIndex={0}
            />

            {/* Glowing environmental status overlay label */}
            <div className={styles.ecoTwinCo2Badge}>
              <Leaf size={10} color={isHealthy ? '#10b981' : isModerate ? '#eab308' : '#f43f5e'} />
              <span>CO₂ Load: <strong>{calculatedSimCO2} tons/yr</strong></span>
            </div>
          </div>

          {/* Accessible Keyboard-Navigable Landscape Map */}
          <div className="accessible-landscape-map" style={{ marginTop: '16px' }}>
            <h4 className="accessible-map-title" style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Keyboard-Navigable Landscape Map (A11y Grid)
            </h4>
            <div className="sr-terrain-list" role="list">
              <div 
                tabIndex={0} 
                role="listitem" 
                className={`sr-terrain-item ${focusedItem?.id === 'base' ? 'focused-highlight' : ''}`}
                onFocus={() => setFocusedItem({ x: 0, z: 0, type: 'base', id: 'base' })}
                onBlur={() => setFocusedItem(null)}
              >
                <strong>Island Base:</strong> Circular terrain. Ground: {isHealthy ? 'Green Grass' : isModerate ? 'Dry Meadow' : 'Polluted Gray Land'}. Center [0, 0].
              </div>
              
              {simEnergy < 60 && (
                <div 
                  tabIndex={0} 
                  role="listitem" 
                  className={`sr-terrain-item ${focusedItem?.id === 'windmill-0' ? 'focused-highlight' : ''}`}
                  onFocus={() => setFocusedItem({ x: -2.8, z: -2.8, type: 'windmill', id: 'windmill-0' })}
                  onBlur={() => setFocusedItem(null)}
                >
                  <strong>Wind Turbine #1:</strong> Height 3.2m, revolving blades. Spin Speed: {Math.round(100 - simEnergy)}%. Northwest [x:-2.8, z:-2.8].
                </div>
              )}
              {simEnergy < 35 && (
                <div 
                  tabIndex={0} 
                  role="listitem" 
                  className={`sr-terrain-item ${focusedItem?.id === 'windmill-1' ? 'focused-highlight' : ''}`}
                  onFocus={() => setFocusedItem({ x: -4.2, z: 0.2, type: 'windmill', id: 'windmill-1' })}
                  onBlur={() => setFocusedItem(null)}
                >
                  <strong>Wind Turbine #2:</strong> Height 3.2m, revolving blades. Spin Speed: {Math.round(100 - simEnergy)}%. West [x:-4.2, z:0.2].
                </div>
              )}
              
              {simEnergy < 45 && (
                <>
                  <div 
                    tabIndex={0} 
                    role="listitem" 
                    className={`sr-terrain-item ${focusedItem?.id === 'solar-0' ? 'focused-highlight' : ''}`}
                    onFocus={() => setFocusedItem({ x: 2.2, z: -3.2, type: 'solar', id: 'solar-0' })}
                    onBlur={() => setFocusedItem(null)}
                  >
                    <strong>Solar Array #1:</strong> Slanted silicon panel. Southeast [x:2.2, z:-3.2].
                  </div>
                  <div 
                    tabIndex={0} 
                    role="listitem" 
                    className={`sr-terrain-item ${focusedItem?.id === 'solar-1' ? 'focused-highlight' : ''}`}
                    onFocus={() => setFocusedItem({ x: 3.6, z: -1.8, type: 'solar', id: 'solar-1' })}
                    onBlur={() => setFocusedItem(null)}
                  >
                    <strong>Solar Array #2:</strong> Slanted silicon panel. Southeast [x:3.6, z:-1.8].
                  </div>
                </>
              )}
              
              {treePositions.slice(0, treesCount).map((pos, idx) => (
                <div 
                  key={idx}
                  tabIndex={0} 
                  role="listitem" 
                  className={`sr-terrain-item ${focusedItem?.id === `tree-${idx}` ? 'focused-highlight' : ''}`}
                  onFocus={() => setFocusedItem({ x: pos.x, z: pos.z, type: 'tree', id: `tree-${idx}` })}
                  onBlur={() => setFocusedItem(null)}
                >
                  <strong>Coniferous Tree #{idx + 1}:</strong> Evergreen pine. Foliage: {isHealthy ? 'Green' : 'Brown'}. Coordinates: [{pos.x}, {pos.z}].
                </div>
              ))}
              
              {simScore > 240 && (
                <div 
                  tabIndex={0} 
                  role="listitem" 
                  className={`sr-terrain-item ${focusedItem?.id === 'factory-0' ? 'focused-highlight' : ''}`}
                  onFocus={() => setFocusedItem({ x: 3.0, z: -1.0, type: 'factory', id: 'factory-0' })}
                  onBlur={() => setFocusedItem(null)}
                >
                  <strong>Industrial Factory:</strong> 1.2m base, smokestack active. East [x:3.0, z:-1.0].
                </div>
              )}
              
              <div 
                tabIndex={0} 
                role="listitem" 
                className={`sr-terrain-item ${focusedItem?.id === 'river' ? 'focused-highlight' : ''}`}
                onFocus={() => setFocusedItem({ x: 0, z: 0, type: 'river', id: 'river' })}
                onBlur={() => setFocusedItem(null)}
              >
                <strong>Flowing River:</strong> Blue wave animated stream. Center [0, 0].
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Simulation Panel & Savings Stats */}
        <div className={styles.ecoTwinControlPanel}>
          
          {/* Carbon Twin Statistics */}
          <div className={`glass-panel glow-emerald ${styles.ecoTwinReductionSavings}`}>
            <h3 className={styles.ecoTwinSavingsTitle}>
              <TrendingDown size={20} color="var(--primary)" />
              Simulated Reduction Savings
            </h3>

            <div className={styles.ecoTwinSavingsGrid}>
              
              <div className={`glass-card ${styles.ecoTwinSavingsCardCo2}`}>
                <div className={styles.ecoTwinCardLabel}>CO₂ Reduction</div>
                <div className={styles.ecoTwinCardValuePrimary}>
                  {co2Saved} tons <span className={styles.ecoTwinCardUnit}>/ yr</span>
                </div>
              </div>

              <div className={`glass-card ${styles.ecoTwinSavingsCardTree}`}>
                <div className={styles.ecoTwinTreeLabel}>Tree Equivalent</div>
                <div className={styles.ecoTwinTreeValue}>
                  {treesEquivalent} <span className={styles.ecoTwinTreeUnit}>planted</span>
                </div>
              </div>

              <div className={`glass-card ${styles.ecoTwinSavingsCardCost}`}>
                <div className={styles.ecoTwinCostLabel}>Estimated Annual Cost Savings</div>
                <div className={styles.ecoTwinCostValue}>
                  ₹{financialSavings.toLocaleString('en-IN')} / year
                </div>
                <div className={styles.ecoTwinCostFooter}>
                  Based on fuel offsets, plant diet discounts, and utility savings.
                </div>
              </div>
            </div>
          </div>

          {/* Action Sliders */}
          <div className={`glass-panel ${styles.ecoTwinSlidersCard}`}>
            <h4 className={styles.ecoTwinSlidersTitle}>Tweak Simulators</h4>
            
            <div className={styles.ecoTwinSlidersContainer}>
              
              {/* Slider 1: Transport */}
              <div>
                <label className={styles.ecoTwinSliderLabelGroupTransport}>
                  <span className={styles.ecoTwinSliderName}>Transport Footprint</span>
                  <span className={styles.ecoTwinSliderStatusTransport}>{simTransport === 0 ? 'Zero Emission' : simTransport < 40 ? 'Eco-Commute' : 'High Commute'}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={simTransport}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSimTransport(val);
                    announceChange('Transport Footprint', val === 0 ? 'Zero Emission' : val < 40 ? 'Eco-Commute' : 'High Commute');
                  }}
                />
              </div>

              {/* Slider 2: Diet */}
              <div>
                <label className={styles.ecoTwinSliderLabelGroupDiet}>
                  <span className={styles.ecoTwinSliderNameDiet}>Diet Choice</span>
                  <span className={styles.ecoTwinSliderStatusDiet}>{simDiet < 25 ? 'Plant-based' : simDiet < 60 ? 'Low-Meat' : 'Heavy Meat'}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={simDiet}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSimDiet(val);
                    announceChange('Diet Choice', val < 25 ? 'Plant-based' : val < 60 ? 'Low-Meat' : 'Heavy Meat');
                  }}
                />
              </div>

              {/* Slider 3: Energy */}
              <div>
                <label className={styles.ecoTwinSliderLabelGroupEnergy}>
                  <span className={styles.ecoTwinSliderNameEnergy}>Home Utilities</span>
                  <span className={styles.ecoTwinSliderStatusEnergy}>{simEnergy < 30 ? 'Renewable/Solar' : simEnergy < 60 ? 'Smart Energy' : 'Inefficient Grid'}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={simEnergy}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSimEnergy(val);
                    announceChange('Home Utilities', val < 30 ? 'Renewable/Solar' : val < 60 ? 'Smart Energy' : 'Inefficient Grid');
                  }}
                />
              </div>

              {/* Slider 4: Shopping */}
              <div>
                <label className={styles.ecoTwinSliderLabelGroupShopping}>
                  <span className={styles.ecoTwinSliderNameShopping}>Shopping & Waste</span>
                  <span className={styles.ecoTwinSliderStatusShopping}>{simShopping < 30 ? 'Minimalist Recycle' : simShopping < 60 ? 'Average Consumer' : 'High Waste'}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={simShopping}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSimShopping(val);
                    announceChange('Shopping & Waste', val < 30 ? 'Minimalist Recycle' : val < 60 ? 'Average Consumer' : 'High Waste');
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleApplyHabits}
              disabled={savingLoading || (simTransport === currentTransport && simDiet === currentDiet && simEnergy === currentEnergy && simShopping === currentShopping)}
              className={`btn-primary ${styles.ecoTwinSubmitButton}`}
            >
              {savingLoading ? 'Saving twin parameters...' : 'Lock-In Simulated Habits'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
