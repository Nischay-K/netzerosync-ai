import { useState } from 'react';
import styles from './Onboarding.module.css';
import { updateUserProfile, logCarbonEntry, UserProfile } from '../utils/firebase';
import { calculateFootprint, FootprintAnswers } from '../utils/calculators';
import { Car, Flame, ShoppingBag, Utensils, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

interface OnboardingProps {
  user: UserProfile;
  onComplete: (profile: UserProfile) => void;
}

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Required<FootprintAnswers>>({
    // Step 1: Transport
    transportMode: 'car_petrol', // car_petrol, car_electric, public, cycle_walk
    distancePerWeek: 150, // km
    flightsPerYear: 2, // count
    vehicleType: 'compact', // compact, hybrid, suv
    
    // Step 2: Food
    dietType: 'meat_heavy', // meat_heavy, meat_average, vegetarian, vegan
    localFoodPct: 30, // %
    
    // Step 3: Energy
    electricityBill: 1200, // INR/month (default Indian context or convert as needed)
    energySource: 'grid', // grid, mixed, solar
    houseSize: 'medium', // small, medium, large
    gridRegion: 'balanced', // renewable_heavy, balanced, coal_heavy
    
    // Step 4: Shopping
    shoppingHabit: 'average', // low, average, high
    recycleHabit: 'some' // none, some, active
  });

  const totalSteps = 4;

  const handleSelect = (field: keyof FootprintAnswers, value: string | number) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const handleFinish = async () => {
    const { total, target } = calculateFootprint(answers);

    // Map sliders values based on onboarding parameters
    const transportVal = answers.transportMode === 'car_petrol' ? 80 : answers.transportMode === 'car_electric' ? 40 : 20;
    const dietVal = answers.dietType === 'meat_heavy' ? 90 : answers.dietType === 'meat_average' ? 60 : answers.dietType === 'vegetarian' ? 30 : 15;
    const energyVal = answers.energySource === 'solar' ? 10 : answers.energySource === 'mixed' ? 45 : 80;
    const shoppingVal = answers.shoppingHabit === 'high' ? 85 : answers.shoppingHabit === 'average' ? 50 : 25;

    const profileData = {
      carbonCurrent: total,
      carbonTarget: target,
      twinState: {
        transportSlider: transportVal,
        dietSlider: dietVal,
        energySlider: energyVal,
        shoppingSlider: shoppingVal
      }
    };

    try {
      await updateUserProfile(user.uid, profileData);
      
      // Log initial footprint values as standard entry
      await logCarbonEntry(user.uid, {
        name: "Initial Footprint Onboarding Calculation",
        category: "System Onboarding",
        co2Value: 0,
        notes: `Initial estimate: ${total} tons CO2/year. Target: ${target} tons.`
      });

      onComplete({ ...user, ...profileData });
    } catch (err) {
      console.error(err);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps + 1));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  return (
    <div className={`onboarding-style-1 ${styles['onboarding-style-1']}`}>
      <div className={`glass-panel glow-indigo fade-in onboarding-style-2 ${styles['onboarding-style-2']}`}>
        {/* Onboarding Header */}
        <div className={`onboarding-style-3 ${styles['onboarding-style-3']}`}>
          <div>
            <h2 className={`onboarding-style-4 ${styles['onboarding-style-4']}`}>Calculate Your Baseline</h2>
            <p className={`onboarding-style-5 ${styles['onboarding-style-5']}`}>Help EcoTwin understand your carbon habits.</p>
          </div>
          <div className={`onboarding-style-6 ${styles['onboarding-style-6']}`}>
            Step {step} of {totalSteps + 1}
          </div>
        </div>

        {/* Top Progress Track */}
        <div className={`onboarding-style-7 ${styles['onboarding-style-7']}`}>
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`onboarding-style-8 ${styles['onboarding-style-8']}`} style={{ background: s <= step ? 'var(--secondary)' : 'var(--bg-tertiary)' }}
            />
          ))}
        </div>

        {/* Step 1: Transport */}
        {step === 1 && (
          <div className={`fade-in onboarding-style-9 ${styles['onboarding-style-9']}`}>
            <div className={`onboarding-style-10 ${styles['onboarding-style-10']}`}>
              <div className={`onboarding-style-11 ${styles['onboarding-style-11']}`}>
                <Car size={24} />
              </div>
              <h3 className={`onboarding-style-12 ${styles['onboarding-style-12']}`}>Transportation Habits</h3>
            </div>

            <div>
              <label className={`onboarding-style-13 ${styles['onboarding-style-13']}`}>How do you commute most often?</label>
              <div className={`onboarding-style-14 ${styles['onboarding-style-14']}`}>
                {[
                  { id: 'car_petrol', label: 'Petrol/Diesel Car', desc: 'Single commuter' },
                  { id: 'car_electric', label: 'Electric Car', desc: 'Grid/Battery power' },
                  { id: 'public', label: 'Public Transit', desc: 'Bus, Subway, Trains' },
                  { id: 'cycle_walk', label: 'Walk / Cycle', desc: 'Emission free!' }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect('transportMode', opt.id)}
                    className={`glass-card onboarding-style-15 ${styles['onboarding-style-15']}`}
                    style={{ borderColor: answers.transportMode === opt.id ? 'var(--secondary)' : 'var(--glass-border)', background: answers.transportMode === opt.id ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.01)' }}
                  >
                    <div className={`onboarding-style-16 ${styles['onboarding-style-16']}`}>{opt.label}</div>
                    <div className={`onboarding-style-17 ${styles['onboarding-style-17']}`}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {['car_petrol', 'car_electric'].includes(answers.transportMode) && (
              <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                <label className={`onboarding-style-13 ${styles['onboarding-style-13']}`} style={{ display: 'block', marginBottom: '8px' }}>Vehicle Classification / Size</label>
                <div className={`onboarding-style-14 ${styles['onboarding-style-14']}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'compact', label: 'Compact / Sedan', desc: 'Standard efficiency' },
                    { id: 'hybrid', label: 'Hybrid / Smart', desc: 'Lower emissions' },
                    { id: 'suv', label: 'SUV / Truck', desc: 'Higher emissions' }
                  ].map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => handleSelect('vehicleType', opt.id)}
                      className={`glass-card onboarding-style-15 ${styles['onboarding-style-15']}`}
                      style={{ 
                        borderColor: answers.vehicleType === opt.id ? 'var(--secondary)' : 'var(--glass-border)', 
                        background: answers.vehicleType === opt.id ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                        padding: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      <div className={`onboarding-style-16 ${styles['onboarding-style-16']}`} style={{ fontSize: '13px', fontWeight: '600' }}>{opt.label}</div>
                      <div className={`onboarding-style-17 ${styles['onboarding-style-17']}`} style={{ fontSize: '11px', marginTop: '2px' }}>{opt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="distance-slider" className={`onboarding-style-18 ${styles['onboarding-style-18']}`}>
                Weekly distance traveled: <strong className={`onboarding-style-19 ${styles['onboarding-style-19']}`}>{answers.distancePerWeek} km</strong>
              </label>
              <input
                id="distance-slider"
                type="range"
                min="0"
                max="800"
                step="20"
                value={answers.distancePerWeek}
                onChange={(e) => handleSelect('distancePerWeek', Number(e.target.value))}
              />
            </div>

            <div>
              <label htmlFor="flights-slider" className={`onboarding-style-20 ${styles['onboarding-style-20']}`}>
                Number of flights per year (short & long haul): <strong className={`onboarding-style-21 ${styles['onboarding-style-21']}`}>{answers.flightsPerYear}</strong>
              </label>
              <input
                id="flights-slider"
                type="range"
                min="0"
                max="20"
                step="1"
                value={answers.flightsPerYear}
                onChange={(e) => handleSelect('flightsPerYear', Number(e.target.value))}
              />
            </div>
          </div>
        )}

        {/* Step 2: Food */}
        {step === 2 && (
          <div className={`fade-in onboarding-style-22 ${styles['onboarding-style-22']}`}>
            <div className={`onboarding-style-23 ${styles['onboarding-style-23']}`}>
              <div className={`onboarding-style-24 ${styles['onboarding-style-24']}`}>
                <Utensils size={24} />
              </div>
              <h3 className={`onboarding-style-25 ${styles['onboarding-style-25']}`}>Diet & Consumption</h3>
            </div>

            <div>
              <label className={`onboarding-style-26 ${styles['onboarding-style-26']}`}>What best describes your diet?</label>
              <div className={`onboarding-style-27 ${styles['onboarding-style-27']}`}>
                {[
                  { id: 'meat_heavy', label: 'Meat Lover', desc: 'Frequent red meat / poultry' },
                  { id: 'meat_average', label: 'Balanced', desc: 'Meat in moderation, some veg' },
                  { id: 'vegetarian', label: 'Vegetarian', desc: 'No meat, dairy & eggs' },
                  { id: 'vegan', label: 'Vegan', desc: '100% plant-based' }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect('dietType', opt.id)}
                    className={`glass-card onboarding-style-28 ${styles['onboarding-style-28']}`}
                    style={{ borderColor: answers.dietType === opt.id ? 'var(--primary)' : 'var(--glass-border)', background: answers.dietType === opt.id ? 'rgba(10, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.01)' }}
                  >
                    <div className={`onboarding-style-29 ${styles['onboarding-style-29']}`}>{opt.label}</div>
                    <div className={`onboarding-style-30 ${styles['onboarding-style-30']}`}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="local-food-slider" className={`onboarding-style-31 ${styles['onboarding-style-31']}`}>
                Percentage of local/organic food: <strong className={`onboarding-style-32 ${styles['onboarding-style-32']}`}>{answers.localFoodPct}%</strong>
              </label>
              <input
                id="local-food-slider"
                type="range"
                min="0"
                max="100"
                step="10"
                value={answers.localFoodPct}
                onChange={(e) => handleSelect('localFoodPct', Number(e.target.value))}
              />
            </div>
          </div>
        )}

        {/* Step 3: Energy */}
        {step === 3 && (
          <div className={`fade-in onboarding-style-33 ${styles['onboarding-style-33']}`}>
            <div className={`onboarding-style-34 ${styles['onboarding-style-34']}`}>
              <div className={`onboarding-style-35 ${styles['onboarding-style-35']}`}>
                <Flame size={24} />
              </div>
              <h3 className={`onboarding-style-36 ${styles['onboarding-style-36']}`}>Home Utilities</h3>
            </div>

            <div>
              <label htmlFor="electricity-bill-slider" className={`onboarding-style-37 ${styles['onboarding-style-37']}`}>
                Average monthly electricity bill (estimated): <strong className={`onboarding-style-38 ${styles['onboarding-style-38']}`}>{answers.electricityBill} Units/Cost</strong>
              </label>
              <input
                id="electricity-bill-slider"
                type="range"
                min="0"
                max="8000"
                step="200"
                value={answers.electricityBill}
                onChange={(e) => handleSelect('electricityBill', Number(e.target.value))}
              />
            </div>

            <div>
              <label className={`onboarding-style-39 ${styles['onboarding-style-39']}`}>Primary household energy source?</label>
              <div className={`onboarding-style-40 ${styles['onboarding-style-40']}`}>
                {[
                  { id: 'grid', label: 'Grid Power', desc: 'Coal / Gas mix' },
                  { id: 'mixed', label: 'Mixed Clean', desc: 'Partial solar' },
                  { id: 'solar', label: '100% Solar', desc: 'Renewable panels' }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect('energySource', opt.id)}
                    className={`glass-card onboarding-style-41 ${styles['onboarding-style-41']}`}
                    style={{ borderColor: answers.energySource === opt.id ? 'var(--accent-cyan)' : 'var(--glass-border)', background: answers.energySource === opt.id ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.01)' }}
                  >
                    <div className={`onboarding-style-42 ${styles['onboarding-style-42']}`}>{opt.label}</div>
                    <div className={`onboarding-style-43 ${styles['onboarding-style-43']}`}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {answers.energySource !== 'solar' && (
              <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                <label className={`onboarding-style-39 ${styles['onboarding-style-39']}`} style={{ display: 'block', marginBottom: '8px' }}>Regional Power Grid Mix (Localized Factor)</label>
                <div className={`onboarding-style-40 ${styles['onboarding-style-40']}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'renewable_heavy', label: 'Clean / Hydro Grid', desc: 'Low emissions region' },
                    { id: 'balanced', label: 'Standard Mix Grid', desc: 'Average regional mix' },
                    { id: 'coal_heavy', label: 'Coal-Heavy Grid', desc: 'High carbon intensity' }
                  ].map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => handleSelect('gridRegion', opt.id)}
                      className={`glass-card onboarding-style-41 ${styles['onboarding-style-41']}`}
                      style={{ 
                        borderColor: answers.gridRegion === opt.id ? 'var(--accent-cyan)' : 'var(--glass-border)', 
                        background: answers.gridRegion === opt.id ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                        padding: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      <div className={`onboarding-style-42 ${styles['onboarding-style-42']}`} style={{ fontSize: '13px', fontWeight: '600' }}>{opt.label}</div>
                      <div className={`onboarding-style-43 ${styles['onboarding-style-43']}`} style={{ fontSize: '11px', marginTop: '2px' }}>{opt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className={`onboarding-style-44 ${styles['onboarding-style-44']}`}>House Size</label>
              <div className={`onboarding-style-45 ${styles['onboarding-style-45']}`}>
                {['small', 'medium', 'large'].map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleSelect('houseSize', sz)}
                    className={`onboarding-style-46 ${styles['onboarding-style-46']}`} style={{ background: answers.houseSize === sz ? 'rgba(6, 182, 212, 0.15)' : 'transparent', color: answers.houseSize === sz ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Shopping */}
        {step === 4 && (
          <div className={`fade-in onboarding-style-47 ${styles['onboarding-style-47']}`}>
            <div className={`onboarding-style-48 ${styles['onboarding-style-48']}`}>
              <div className={`onboarding-style-49 ${styles['onboarding-style-49']}`}>
                <ShoppingBag size={24} />
              </div>
              <h3 className={`onboarding-style-50 ${styles['onboarding-style-50']}`}>Consumer Behavior</h3>
            </div>

            <div>
              <label className={`onboarding-style-51 ${styles['onboarding-style-51']}`}>How would you describe your shopping habits?</label>
              <div className={`onboarding-style-52 ${styles['onboarding-style-52']}`}>
                {[
                  { id: 'low', label: 'Minimalist', desc: 'Essentials only' },
                  { id: 'average', label: 'Moderate', desc: 'Occasional clothes/gear' },
                  { id: 'high', label: 'Conspicuous', desc: 'Frequent purchases' }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect('shoppingHabit', opt.id)}
                    className={`glass-card onboarding-style-53 ${styles['onboarding-style-53']}`}
                    style={{ borderColor: answers.shoppingHabit === opt.id ? 'var(--accent-amber)' : 'var(--glass-border)', background: answers.shoppingHabit === opt.id ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.01)' }}
                  >
                    <div className={`onboarding-style-54 ${styles['onboarding-style-54']}`}>{opt.label}</div>
                    <div className={`onboarding-style-55 ${styles['onboarding-style-55']}`}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className={`onboarding-style-56 ${styles['onboarding-style-56']}`}>How often do you recycle glass/plastics/paper?</label>
              <div className={`onboarding-style-57 ${styles['onboarding-style-57']}`}>
                {[
                  { id: 'none', label: 'Rarely', desc: 'Straight to trash' },
                  { id: 'some', label: 'Sometimes', desc: 'Separate basics' },
                  { id: 'active', label: 'Always', desc: 'Dedicated sorting' }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect('recycleHabit', opt.id)}
                    className={`glass-card onboarding-style-58 ${styles['onboarding-style-58']}`}
                    style={{ borderColor: answers.recycleHabit === opt.id ? 'var(--accent-amber)' : 'var(--glass-border)', background: answers.recycleHabit === opt.id ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.01)' }}
                  >
                    <div className={`onboarding-style-59 ${styles['onboarding-style-59']}`}>{opt.label}</div>
                    <div className={`onboarding-style-60 ${styles['onboarding-style-60']}`}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Summary */}
        {step === 5 && (
          <div className={`fade-in onboarding-style-61 ${styles['onboarding-style-61']}`}>
            <div className={`onboarding-style-62 ${styles['onboarding-style-62']}`}>
              <CheckCircle size={56} />
            </div>
            
            <div>
              <h3 className={`onboarding-style-63 ${styles['onboarding-style-63']}`}>Onboarding Complete!</h3>
              <p className={`onboarding-style-64 ${styles['onboarding-style-64']}`}>Your preliminary carbon footprint statistics have been generated.</p>
            </div>

            <div className={`glass-card onboarding-style-65 ${styles['onboarding-style-65']}`}>
              <div className={`onboarding-style-66 ${styles['onboarding-style-66']}`}>
                <div>
                  <div className={`onboarding-style-67 ${styles['onboarding-style-67']}`}>
                    {calculateFootprint(answers).total}
                  </div>
                  <div className={`onboarding-style-68 ${styles['onboarding-style-68']}`}>Tons CO₂/year</div>
                  <div className={`onboarding-style-69 ${styles['onboarding-style-69']}`}>Current Footprint</div>
                </div>

                <div className={`onboarding-style-70 ${styles['onboarding-style-70']}`}></div>

                <div>
                  <div className={`onboarding-style-71 ${styles['onboarding-style-71']}`}>
                    {calculateFootprint(answers).target}
                  </div>
                  <div className={`onboarding-style-72 ${styles['onboarding-style-72']}`}>Tons CO₂/year</div>
                  <div className={`onboarding-style-73 ${styles['onboarding-style-73']}`}>Your Target Goal</div>
                </div>
              </div>
            </div>

            <p className={`onboarding-style-74 ${styles['onboarding-style-74']}`}>
              We've created your initial **EcoTwin (Digital Sustainability Twin)** ecosystem based on these numbers. Let's head over to the dashboard to inspect your twin and meet your Carbon Copilot coach!
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className={`onboarding-style-75 ${styles['onboarding-style-75']}`}>
          {step > 1 && step <= totalSteps + 1 && (
            <button
              onClick={prevStep}
              className={`btn-ghost onboarding-style-76 ${styles['onboarding-style-76']}`}
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}

          <div className={`onboarding-style-77 ${styles['onboarding-style-77']}`} />

          {step <= totalSteps ? (
            <button
              onClick={nextStep}
              className={`btn-primary onboarding-style-78 ${styles['onboarding-style-78']}`}
            >
              Next Step <ArrowRight size={16} />
            </button>
          ) : step === totalSteps + 1 ? (
            <button
              onClick={handleFinish}
              className={`btn-primary onboarding-style-79 ${styles['onboarding-style-79']}`}
            >
              Initialize EcoTwin <CheckCircle size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
