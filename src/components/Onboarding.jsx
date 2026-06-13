import { useState } from 'react';
import { updateUserProfile, logCarbonEntry } from '../utils/firebase';
import { Car, Flame, ShoppingBag, Utensils, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    // Step 1: Transport
    transportMode: 'car_petrol', // car_petrol, car_electric, public, cycle_walk
    distancePerWeek: 150, // km
    flightsPerYear: 2, // count
    
    // Step 2: Food
    dietType: 'meat_heavy', // meat_heavy, meat_average, vegetarian, vegan
    localFoodPct: 30, // %
    
    // Step 3: Energy
    electricityBill: 1200, // INR/month (default Indian context or convert as needed)
    energySource: 'grid', // grid, mixed, solar
    houseSize: 'medium', // small, medium, large
    
    // Step 4: Shopping
    shoppingHabit: 'average', // low, average, high
    recycleHabit: 'some' // none, some, active
  });

  const totalSteps = 4;

  const handleSelect = (field, value) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const calculateFootprint = () => {
    let transportEmissions = 0;
    let foodEmissions = 0;
    let energyEmissions;
    let shoppingEmissions;

    // 1. Transport (tons CO2 per year)
    // Petrol car: 0.18 kg CO2/km. Electric car: 0.05 kg CO2/km. Public: 0.04 kg CO2/km. Cycle: 0.
    const weeklyKm = Number(answers.distancePerWeek);
    const yearlyKm = weeklyKm * 52;
    if (answers.transportMode === 'car_petrol') {
      transportEmissions = (yearlyKm * 0.18) / 1000;
    } else if (answers.transportMode === 'car_electric') {
      transportEmissions = (yearlyKm * 0.05) / 1000;
    } else if (answers.transportMode === 'public') {
      transportEmissions = (yearlyKm * 0.04) / 1000;
    }
    // Flights: average domestic/short flight is 250kg CO2. Long haul is 1 ton.
    transportEmissions += (answers.flightsPerYear * 0.3);

    // 2. Food
    // Meat heavy: 3.3 tons/yr. Medium meat: 2.5. Vegetarian: 1.7. Vegan: 1.5.
    if (answers.dietType === 'meat_heavy') foodEmissions = 3.3;
    else if (answers.dietType === 'meat_average') foodEmissions = 2.5;
    else if (answers.dietType === 'vegetarian') foodEmissions = 1.7;
    else if (answers.dietType === 'vegan') foodEmissions = 1.4;
    
    // Adjust based on local sourcing
    foodEmissions -= (answers.localFoodPct / 100) * 0.3;

    // 3. Home Energy
    // Estimate kWh from bill (e.g. 8 INR per kWh, 1200 INR = 150 kWh/month = 1800 kWh/yr)
    // 1 kWh Grid electricity = ~0.8 kg CO2. Solar = 0.05. Mixed = 0.4.
    const estimatedKwhYr = (answers.electricityBill / 8) * 12;
    let factor = 0.8;
    if (answers.energySource === 'solar') factor = 0.05;
    else if (answers.energySource === 'mixed') factor = 0.4;
    energyEmissions = (estimatedKwhYr * factor) / 1000;
    
    // Size adjustment
    if (answers.houseSize === 'large') energyEmissions += 1.2;
    else if (answers.houseSize === 'small') energyEmissions -= 0.4;
    energyEmissions = Math.max(0.2, energyEmissions);

    // 4. Shopping & Waste
    if (answers.shoppingHabit === 'high') shoppingEmissions = 2.8;
    else if (answers.shoppingHabit === 'average') shoppingEmissions = 1.6;
    else shoppingEmissions = 0.8;

    if (answers.recycleHabit === 'active') shoppingEmissions -= 0.4;
    else if (answers.recycleHabit === 'none') shoppingEmissions += 0.2;

    const total = Number((transportEmissions + foodEmissions + energyEmissions + shoppingEmissions).toFixed(1));
    const target = Number((total * 0.6).toFixed(1)); // 40% reduction target

    return { total, target, breakdown: { transport: transportEmissions, food: foodEmissions, energy: energyEmissions, shopping: shoppingEmissions } };
  };

  const handleFinish = async () => {
    const { total, target } = calculateFootprint();

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
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '40px 20px',
      background: 'var(--bg-primary)'
    }}>
      <div className="glass-panel glow-indigo fade-in" style={{
        maxWidth: '580px',
        width: '100%',
        position: 'relative'
      }}>
        {/* Onboarding Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', color: 'var(--text-primary)' }}>Calculate Your Baseline</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Help EcoTwin understand your carbon habits.</p>
          </div>
          <div style={{
            background: 'var(--bg-tertiary)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--secondary)'
          }}>
            Step {step} of {totalSteps + 1}
          </div>
        </div>

        {/* Top Progress Track */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '4px',
                background: s <= step ? 'var(--secondary)' : 'var(--bg-tertiary)',
                borderRadius: '2px',
                transition: 'background 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Step 1: Transport */}
        {step === 1 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--secondary)' }}>
                <Car size={24} />
              </div>
              <h3 style={{ fontSize: '18px' }}>Transportation Habits</h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '10px', color: 'var(--text-secondary)' }}>How do you commute most often?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { id: 'car_petrol', label: 'Petrol/Diesel Car', desc: 'Single commuter' },
                  { id: 'car_electric', label: 'Electric Car', desc: 'Grid/Battery power' },
                  { id: 'public', label: 'Public Transit', desc: 'Bus, Subway, Trains' },
                  { id: 'cycle_walk', label: 'Walk / Cycle', desc: 'Emission free!' }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect('transportMode', opt.id)}
                    className="glass-card"
                    style={{
                      cursor: 'pointer',
                      borderColor: answers.transportMode === opt.id ? 'var(--secondary)' : 'var(--glass-border)',
                      background: answers.transportMode === opt.id ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.01)'
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{opt.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Weekly distance traveled: <strong style={{ color: 'var(--text-primary)' }}>{answers.distancePerWeek} km</strong>
              </label>
              <input
                type="range"
                min="0"
                max="800"
                step="20"
                value={answers.distancePerWeek}
                onChange={(e) => handleSelect('distancePerWeek', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Number of flights per year (short & long haul): <strong style={{ color: 'var(--text-primary)' }}>{answers.flightsPerYear}</strong>
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={answers.flightsPerYear}
                onChange={(e) => handleSelect('flightsPerYear', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Food */}
        {step === 2 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)' }}>
                <Utensils size={24} />
              </div>
              <h3 style={{ fontSize: '18px' }}>Diet & Consumption</h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '10px', color: 'var(--text-secondary)' }}>What best describes your diet?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { id: 'meat_heavy', label: 'Meat Lover', desc: 'Frequent red meat / poultry' },
                  { id: 'meat_average', label: 'Balanced', desc: 'Meat in moderation, some veg' },
                  { id: 'vegetarian', label: 'Vegetarian', desc: 'No meat, dairy & eggs' },
                  { id: 'vegan', label: 'Vegan', desc: '100% plant-based' }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect('dietType', opt.id)}
                    className="glass-card"
                    style={{
                      cursor: 'pointer',
                      borderColor: answers.dietType === opt.id ? 'var(--primary)' : 'var(--glass-border)',
                      background: answers.dietType === opt.id ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.01)'
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{opt.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Percentage of local/organic food: <strong style={{ color: 'var(--text-primary)' }}>{answers.localFoodPct}%</strong>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={answers.localFoodPct}
                onChange={(e) => handleSelect('localFoodPct', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 3: Energy */}
        {step === 3 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)' }}>
                <Flame size={24} />
              </div>
              <h3 style={{ fontSize: '18px' }}>Home Utilities</h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Average monthly electricity bill (estimated): <strong style={{ color: 'var(--text-primary)' }}>{answers.electricityBill} Units/Cost</strong>
              </label>
              <input
                type="range"
                min="0"
                max="8000"
                step="200"
                value={answers.electricityBill}
                onChange={(e) => handleSelect('electricityBill', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '10px', color: 'var(--text-secondary)' }}>Primary household energy source?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'grid', label: 'Grid Power', desc: 'Coal / Gas mix' },
                  { id: 'mixed', label: 'Mixed Clean', desc: 'Partial solar' },
                  { id: 'solar', label: '100% Solar', desc: 'Renewable panels' }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect('energySource', opt.id)}
                    className="glass-card"
                    style={{
                      cursor: 'pointer',
                      padding: '12px 10px',
                      borderColor: answers.energySource === opt.id ? 'var(--accent-cyan)' : 'var(--glass-border)',
                      background: answers.energySource === opt.id ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.01)'
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '2px' }}>{opt.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '10px', color: 'var(--text-secondary)' }}>House Size</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {['small', 'medium', 'large'].map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleSelect('houseSize', sz)}
                    style={{
                      padding: '10px',
                      background: answers.houseSize === sz ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                      color: answers.houseSize === sz ? 'var(--text-primary)' : 'var(--text-muted)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      textTransform: 'capitalize'
                    }}
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
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)' }}>
                <ShoppingBag size={24} />
              </div>
              <h3 style={{ fontSize: '18px' }}>Consumer Behavior</h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '10px', color: 'var(--text-secondary)' }}>How would you describe your shopping habits?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'low', label: 'Minimalist', desc: 'Essentials only' },
                  { id: 'average', label: 'Moderate', desc: 'Occasional clothes/gear' },
                  { id: 'high', label: 'Conspicuous', desc: 'Frequent purchases' }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect('shoppingHabit', opt.id)}
                    className="glass-card"
                    style={{
                      cursor: 'pointer',
                      padding: '12px 10px',
                      borderColor: answers.shoppingHabit === opt.id ? 'var(--accent-amber)' : 'var(--glass-border)',
                      background: answers.shoppingHabit === opt.id ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.01)'
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '2px' }}>{opt.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '10px', color: 'var(--text-secondary)' }}>How often do you recycle glass/plastics/paper?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'none', label: 'Rarely', desc: 'Straight to trash' },
                  { id: 'some', label: 'Sometimes', desc: 'Separate basics' },
                  { id: 'active', label: 'Always', desc: 'Dedicated sorting' }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect('recycleHabit', opt.id)}
                    className="glass-card"
                    style={{
                      cursor: 'pointer',
                      padding: '12px 10px',
                      borderColor: answers.recycleHabit === opt.id ? 'var(--accent-amber)' : 'var(--glass-border)',
                      background: answers.recycleHabit === opt.id ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.01)'
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '2px' }}>{opt.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Summary */}
        {step === 5 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '8px' }}>
              <CheckCircle size={56} />
            </div>
            
            <div>
              <h3 style={{ fontSize: '22px', marginBottom: '6px' }}>Onboarding Complete!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Your preliminary carbon footprint statistics have been generated.</p>
            </div>

            <div className="glass-card" style={{ width: '100%', margin: '12px 0', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-rose)' }}>
                    {calculateFootprint().total}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tons CO₂/year</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Current Footprint</div>
                </div>

                <div style={{ height: '40px', width: '1px', background: 'var(--glass-border)' }}></div>

                <div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary)' }}>
                    {calculateFootprint().target}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tons CO₂/year</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Your Target Goal</div>
                </div>
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5', padding: '0 12px' }}>
              We've created your initial **EcoTwin (Digital Sustainability Twin)** ecosystem based on these numbers. Let's head over to the dashboard to inspect your twin and meet your Carbon Copilot coach!
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '36px', gap: '16px' }}>
          {step > 1 && step <= totalSteps + 1 && (
            <button
              onClick={prevStep}
              className="btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}

          <div style={{ flexGrow: 1 }} />

          {step <= totalSteps ? (
            <button
              onClick={nextStep}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
            >
              Next Step <ArrowRight size={16} />
            </button>
          ) : step === totalSteps + 1 ? (
            <button
              onClick={handleFinish}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)' }}
            >
              Initialize EcoTwin <CheckCircle size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
