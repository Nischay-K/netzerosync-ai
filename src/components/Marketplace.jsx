import { useState, useEffect, useRef, useCallback } from 'react';
import { getCarbonLogs, logCarbonEntry } from '../utils/firebase';
import { scanProductCarbon } from '../utils/gemini';
import { calculateProductTokenCost } from '../utils/calculators';
import { Leaf, Coins, ShieldCheck, Check, Sparkles, Globe, Sun, Flame, Loader, ChevronRight, Search, Camera, X, Wind, TreePine, Factory } from 'lucide-react';

export default function Marketplace({ user, onProfileUpdate }) {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [purchasingId, setPurchasingId] = useState(null);
  const [successModal, setSuccessModal] = useState(null); // stores purchased project details

  // Search & Lens States
  const [searchQuery, setSearchQuery] = useState('');
  const [lensImageUrl, setLensImageUrl] = useState(null);
  const [scanningProduct, setScanningProduct] = useState(false);
  const [lensResult, setLensResult] = useState(null);
  const [lensOffsetting, setLensOffsetting] = useState(false);
  const [highlightedProjectId, setHighlightedProjectId] = useState(null);
  const fileInputRef = useRef(null);

  const handleLensFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLensImageUrl(URL.createObjectURL(file));
    setScanningProduct(true);
    setLensResult(null);
    setHighlightedProjectId(null);

    try {
      const result = await scanProductCarbon(file);
      setLensResult(result);

      let matchProjId = 'proj_mangrove';
      if (result.recommendedOffsetCategory === 'Renewables') {
        matchProjId = 'proj_solar';
      } else if (result.recommendedOffsetCategory === 'Efficiency') {
        matchProjId = 'proj_cookstoves';
      }
      setHighlightedProjectId(matchProjId);

      setTimeout(() => {
        const element = document.getElementById(matchProjId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);

    } catch (err) {
      console.error(err);
    } finally {
      setScanningProduct(false);
    }
  };

  const handleOffsetProduct = async () => {
    if (!lensResult) return;
    
    const tokenCost = calculateProductTokenCost(lensResult.carbonImpact);
    const balance = user.ecoTokens || 0;
    
    if (balance < tokenCost) {
      alert("Insufficient Eco-Tokens to offset this product footprint.");
      return;
    }

    setLensOffsetting(true);
    try {
      const carbonDelta = -(lensResult.carbonImpact); // negative value

      const updatedStats = await logCarbonEntry(user.uid, {
        name: `Lens Offset: ${lensResult.productName}`,
        category: 'Offset',
        co2Value: carbonDelta,
        notes: `Offset packaging/lifecycle carbon of ${lensResult.productName}.`
      }, {
        logType: 'offset',
        tokenCost
      });

      const updatedUser = {
        ...user,
        ...updatedStats
      };

      onProfileUpdate(updatedUser);
      
      setSuccessModal({
        title: `Product Offset: ${lensResult.productName}`,
        location: 'Gemini Lens Scan',
        offsetKg: lensResult.carbonImpact,
        cost: tokenCost,
        color: '#00f0ff',
        id: 'lens_offset'
      });

      setLensResult(null);
      setLensImageUrl(null);
      setHighlightedProjectId(null);
      
      await fetchLogs();

    } catch (e) {
      console.error(e);
    } finally {
      setLensOffsetting(false);
    }
  };

  const offsetProjects = [
    {
      id: 'proj_mangrove',
      title: 'Mangrove Reforestation',
      location: 'Mahajanga, Madagascar',
      description: 'Restore estuary mangrove ecosystems. Mangroves capture up to 10x more carbon than tropical rainforests, protect shoreline structures, and promote marine biodiversity.',
      category: 'Forestry',
      cost: 400,
      offsetKg: 1000, // 1.0 Ton
      icon: <Leaf size={24} color="var(--primary)" />,
      color: '#10b981',
      imagePrompt: 'aerial view of lush green mangrove trees bordering dark tropical seawater, futuristic glowing green overlays'
    },
    {
      id: 'proj_solar',
      title: 'Solar Microgrid Initiative',
      location: 'Rajasthan, India',
      description: 'Deploy solar-powered microgrids to rural villages, replacing kerosene lamps and diesel generators with clean, reliable electricity while expanding community education and healthcare.',
      category: 'Renewables',
      cost: 800,
      offsetKg: 2200, // 2.2 Tons
      icon: <Sun size={24} color="var(--accent-cyan)" />,
      color: '#0284c7',
      imagePrompt: 'futuristic solar grid array in beautiful golden desert landscape, neon blue grid glow outlines'
    },
    {
      id: 'proj_cookstoves',
      title: 'Clean Biomass Cookstoves',
      location: 'Nyanza Province, Kenya',
      description: 'Distribute high-efficiency biomass stoves to families. Reduces fuel-wood consumption by 60%, preventing deforestation and protecting women and children from respiratory illnesses.',
      category: 'Efficiency',
      cost: 250,
      offsetKg: 600, // 0.6 Ton
      icon: <Flame size={24} color="var(--accent-amber)" />,
      color: '#d97706',
      imagePrompt: 'modern design biomass stove stove with soft fire glow inside a neat clean African clay room'
    },
    {
      id: 'proj_wind',
      title: 'Wind Farm Development',
      location: 'Gansu, China',
      description: 'Construct and operate high-capacity wind turbines to displace coal power. This project helps scale grid-connected renewable power while providing local technical employment and training.',
      category: 'Renewables',
      cost: 600,
      offsetKg: 1600, // 1.6 Tons
      icon: <Wind size={24} color="var(--accent-purple)" />,
      color: '#7c3aed',
      imagePrompt: 'large elegant white wind turbines rotating on a scenic green mountain ridge under sunset glow'
    },
    {
      id: 'proj_amazon',
      title: 'Amazon Rainforest Preservation',
      location: 'Acre, Brazil',
      description: 'Protect pristine tropical rainforest from illegal logging and agriculture. This project supports sustainable land-use models, local community land titling, and preserves rich biological diversity.',
      category: 'Forestry',
      cost: 500,
      offsetKg: 1200, // 1.2 Tons
      icon: <TreePine size={24} color="var(--primary)" />,
      color: '#10b981',
      imagePrompt: 'dense tropical Amazon canopy with morning mist rising from a winding blue river below'
    },
    {
      id: 'proj_methane',
      title: 'Methane Capture from Landfills',
      location: 'Nairobi, Kenya',
      description: 'Capture and combust methane gas emitted from Municipal Solid Waste sites. The captured methane is either flared or converted to electricity, preventing high-potency greenhouse gas release.',
      category: 'Efficiency',
      cost: 300,
      offsetKg: 800, // 0.8 Ton
      icon: <Factory size={24} color="var(--accent-rose)" />,
      color: '#e11d48',
      imagePrompt: 'modern industrial methane gas collection facility with pipes and clean energy generators next to green hills'
    }
  ];

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const history = await getCarbonLogs(user.uid);
      setLogs(history);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  }, [user.uid]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchLogs();
    });
  }, [fetchLogs]);

  // Calculate lifetime offsets
  const lifetimeOffsetKg = logs
    .filter(log => log.category === 'Offset' && log.co2Value < 0)
    .reduce((sum, log) => sum + Math.abs(log.co2Value), 0);

  const handlePurchaseOffset = async (project) => {
    const balance = user.ecoTokens || 0;
    if (balance < project.cost) return;

    setPurchasingId(project.id);
    try {
      const carbonDelta = -(project.offsetKg); // negative value represents carbon offset

      // 1. Log the offset purchase transaction via gateway
      const updatedStats = await logCarbonEntry(user.uid, {
        name: `Offset Purchase: ${project.title}`,
        category: 'Offset',
        co2Value: carbonDelta, // negative delta is saved/offset!
        notes: `Simulated sponsorship of ${project.title} in ${project.location}.`
      }, {
        logType: 'offset',
        tokenCost: project.cost
      });

      // 2. Update local state
      const updatedUser = {
        ...user,
        ...updatedStats
      };

      // 3. Update local state
      onProfileUpdate(updatedUser);
      setSuccessModal(project);
      
      // Reload history logs
      await fetchLogs();

    } catch (e) {
      console.error("Error purchasing offset project", e);
      alert("Purchase failed. Please try again.");
    } finally {
      setPurchasingId(null);
    }
  };

  // Calculate personalized recommendations based on footprint categories
  const transportVal = user.twinState?.transportSlider || 50;
  const dietVal = user.twinState?.dietSlider || 50;
  const energyVal = user.twinState?.energySlider || 50;
  const shoppingVal = user.twinState?.shoppingSlider || 50;

  let recommendedProjectId = 'proj_mangrove';
  let recommendationReason = 'General Balance: Mangroves offer high density carbon capture for shopping/general emissions.';

  const maxVal = Math.max(transportVal, dietVal, energyVal, shoppingVal);
  if (maxVal === energyVal) {
    recommendedProjectId = 'proj_wind';
    recommendationReason = '⚡ AI Recommended: High utility footprint. Gansu wind turbines displace coal power and feed clean energy directly into the grid.';
  } else if (maxVal === transportVal) {
    recommendedProjectId = 'proj_amazon';
    recommendationReason = '⚡ AI Recommended: High transit footprint. Preserving mature Amazon canopies locks in immense carbon reserves.';
  } else if (maxVal === dietVal) {
    recommendedProjectId = 'proj_cookstoves';
    recommendationReason = '⚡ AI Recommended: High food/consumption footprint. High-efficiency stoves reduce biomass deforestation.';
  } else {
    recommendedProjectId = 'proj_methane';
    recommendationReason = '⚡ AI Recommended: High shopping/waste footprint. Landfill methane capture flared into energy prevents high-potency emissions.';
  }

  return (
    <div className="fade-in layout-stack-30">
      
      {/* Overview Header Stats */}
      <div className="layout-grid-3cols">
        
        {/* Stat 1: Eco-Tokens */}
        <div className="glass-panel glow-emerald layout-between-center">
          <div>
            <div className="widget-title">Available Balance</div>
            <div className="layout-baseline-6">
              <span className="market-stat-value-primary">
                {user.ecoTokens || 0}
              </span>
              <span className="widget-unit">Eco-Tokens</span>
            </div>
          </div>
          <div className="market-stat-icon-container-primary">
            <Coins size={24} />
          </div>
        </div>

        {/* Stat 2: Lifetime Carbon Offsets */}
        <div className="glass-panel layout-between-center">
          <div>
            <div className="widget-title">Lifetime Offsets Purchased</div>
            <div className="layout-baseline-6">
              <span className="market-stat-value-white">
                {(lifetimeOffsetKg / 1000).toFixed(1)}
              </span>
              <span className="widget-unit">tons CO₂</span>
            </div>
          </div>
          <div className="market-stat-icon-container-white">
            <Globe size={24} />
          </div>
        </div>

        {/* Stat 3: Project Net Zero Impact */}
        {(() => {
          const currentFootprint = user.carbonCurrent || 6.8;
          const reductionSpeedFactor = user.completedMissions?.length ? user.completedMissions.length * 0.15 : 0.05;
          const yearsToNetZero = Math.max(1.5, Number(((currentFootprint - 1.0) / (0.2 + reductionSpeedFactor)).toFixed(1)));
          const netZeroYear = new Date().getFullYear() + Math.ceil(yearsToNetZero);

          return (
            <div className="glass-panel glow-indigo layout-between-center">
              <div>
                <div className="widget-title">Projected Net-Zero Target</div>
                <div className="layout-baseline-6">
                  <span className="market-stat-value-cyan">
                    {netZeroYear}
                  </span>
                  <span className="widget-unit">({yearsToNetZero} yrs)</span>
                </div>
              </div>
              <div className="market-stat-icon-container-cyan">
                <Sparkles size={24} />
              </div>
            </div>
          );
        })()}

      </div>

      {/* Search and AI Lens Bar */}
      <div className="glass-panel layout-stack-16">
        <div className="layout-row-align-center-gap-12">
          <div className="pos-relative flex-grow-1">
            <Search size={16} color="var(--text-muted)" className="search-icon-pos" />
            <input
              type="text"
              placeholder="Search offset initiatives, categories, locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-field"
            />
          </div>

          <button
            onClick={() => fileInputRef.current.click()}
            className="btn-secondary glow-indigo lens-scan-btn"
          >
            <Camera size={16} />
            <span>AI Product Lens</span>
          </button>
          
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleLensFileChange}
            className="display-none"
          />
        </div>

        {/* AI Lens scanning display loader */}
        {scanningProduct && (
          <div className="lens-scanning-banner">
            <Loader size={16} className="animate-spin" />
            <span>AI carbon scanner auditing product lifecycle emissions...</span>
          </div>
        )}

        {/* Lens Scanning Results */}
        {lensResult && (
          <div className="glass-card fade-in lens-result-card">
            {/* Scanned Image Preview Thumbnail */}
            {lensImageUrl && (
              <img 
                src={lensImageUrl} 
                alt="Product Scan Thumbnail" 
                className="lens-result-thumbnail"
              />
            )}

            <div className="lens-result-body">
              <div className="layout-between-start">
                <div>
                  <div className="lens-result-tag">
                    <Sparkles size={10} /> Google Lens Footprint audit
                  </div>
                  <h4 className="lens-result-title">
                    {lensResult.productName}
                  </h4>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => {
                    setLensResult(null);
                    setLensImageUrl(null);
                    setHighlightedProjectId(null);
                  }}
                  className="btn-icon-close"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="lens-result-insight">
                {lensResult.ecoInsight}
              </p>

              {/* Action and Cost Metrics */}
              <div className="lens-result-footer">
                <div className="layout-row-align-center-gap-12 gap-20">
                  <div>
                    <div className="text-mut-9-5">Estimated Footprint</div>
                    <div className="text-rose-14-bold">
                      {lensResult.carbonImpact} kg CO₂
                    </div>
                  </div>
                  <div>
                    <div className="text-mut-9-5">Offset Token Cost</div>
                    <div className="text-primary-14-bold-flex">
                      <Coins size={11} />
                      {calculateProductTokenCost(lensResult.carbonImpact)} Tkn
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleOffsetProduct}
                  disabled={lensOffsetting || (user.ecoTokens || 0) < calculateProductTokenCost(lensResult.carbonImpact)}
                  className="btn-primary lens-offset-btn"
                >
                  {lensOffsetting ? (
                    <>
                      <Loader size={12} className="animate-spin" />
                      <span>Offsetting...</span>
                    </>
                  ) : (
                    <>
                      <span>Offset Footprint Instantly</span>
                      <ChevronRight size={12} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Project Cards Section */}
      <div>
        <h3 className="market-section-title">Verified Green Initiatives</h3>
        
        <div className="layout-grid-2cols">
          {(() => {
            const filtered = offsetProjects.filter(p => 
              p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.description.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filtered.length === 0) {
              return (
                <div className="market-empty-message">
                  No offset initiatives match your query. Try searching "solar", "mangrove", "India", or "Kenya".
                </div>
              );
            }

            return filtered.map(project => {
              const hasSufficientTokens = (user.ecoTokens || 0) >= project.cost;
              const isPurchasing = purchasingId === project.id;
              const isRecommended = project.id === recommendedProjectId;
              const isHighlighted = project.id === highlightedProjectId;

              return (
                <div 
                  key={project.id} 
                  id={project.id}
                  className={`glass-panel project-card ${isHighlighted ? 'highlighted' : ''}`}
                >
                  {/* Visual Top Highlight bar */}
                  <div 
                    className="project-card-top-bar"
                    style={{ 
                      background: project.color,
                      boxShadow: `0 0 10px ${project.color}`
                    }} 
                  />

                  <div className="project-card-header">
                    <div>
                      <div className="project-card-tags">
                        <span className="project-card-tag">
                          {project.category}
                        </span>
                        {isRecommended && (
                          <span className="project-card-tag-recommended">
                            ⚡ AI Recommended
                          </span>
                        )}
                      </div>
                      <h4 className="project-card-title">
                        {project.title}
                      </h4>
                      <span className="project-card-location">{project.location}</span>
                    </div>

                    <div className="project-card-icon-container">
                      {project.icon}
                    </div>
                  </div>

                  <p className="project-card-description">
                    {project.description}
                  </p>

                  {/* Metrics */}
                  <div className="project-card-metrics">
                    <div>
                      <div className="project-card-metric-label">Credits Needed</div>
                      <div className="project-card-metric-value-primary">
                        <Coins size={12} />
                        {project.cost}
                      </div>
                    </div>

                    <div className="text-align-right">
                      <div className="project-card-metric-label">Offset Yield</div>
                      <div className="project-card-metric-value-white">
                        -{(project.offsetKg / 1000).toFixed(1)} Tons CO₂
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Reason Callout */}
                  {isRecommended && (
                    <div className="project-card-recommendation-callout">
                      {recommendationReason}
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => handlePurchaseOffset(project)}
                    disabled={!hasSufficientTokens || isPurchasing}
                    className={`${hasSufficientTokens ? "btn-primary" : "btn-ghost"} project-card-action-btn ${hasSufficientTokens ? "" : "disabled"}`}
                  >
                    {isPurchasing ? (
                      <>
                        <Loader size={14} className="animate-spin" />
                        <span>Broadcasting offset order...</span>
                      </>
                    ) : hasSufficientTokens ? (
                      <>
                        <span>Simulate Offset Purchase</span>
                        <ChevronRight size={14} />
                      </>
                    ) : (
                      <span>Insufficient Eco-Tokens (Need {project.cost})</span>
                    )}
                  </button>
                </div>
              );
            });
          })()}
        </div>

      </div>

      {/* Offset History Log */}
      <div className="glass-panel layout-stack-20">
        <h3 className="layout-row-align-center-gap-8 text-size-18">
          <ShieldCheck size={20} color="var(--primary)" />
          Green Credit Registry History
        </h3>

        <div className="registry-history-container">
          {loadingLogs ? (
            <p className="text-mut-12">Refreshing credit audit logs...</p>
          ) : logs.filter(log => log.category === 'Offset').length === 0 ? (
            <p className="text-mut-13-center-padding">
              No offset sponsorships registered yet. Complete quests to earn credits and purchase your first offset.
            </p>
          ) : (
            <div className="layout-stack-10">
              {logs
                .filter(log => log.category === 'Offset')
                .map((log, idx) => (
                  <div 
                    key={log.id || idx} 
                    className="glass-card registry-history-item"
                  >
                    <div>
                      <div className="registry-history-item-title">
                        {log.name}
                      </div>
                      <div className="registry-history-item-meta">
                        Registered on {new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="registry-history-item-yield">
                      {(log.co2Value / 1000).toFixed(1)} Tons CO₂
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Success Animation Modal */}
      {successModal && (
        <div className="cert-modal-backdrop">
          <div className="glass-panel glow-emerald success-modal-panel fade-in" style={{ border: `2px solid ${successModal.color}` }}>
            <div className="success-modal-icon-container" style={{
              background: `${successModal.color}1c`,
              border: `2px solid ${successModal.color}`,
              color: successModal.color,
              boxShadow: `0 0 20px ${successModal.color}33`
            }}>
              <Check size={32} />
            </div>

            <h3 className="success-modal-title">
              Carbon Offset Active!
            </h3>
            <p className="success-modal-subtitle" style={{ color: successModal.color }}>
              {successModal.title} Sponsored
            </p>

            <p className="success-modal-description">
              Successfully offset **{(successModal.offsetKg / 1000).toFixed(1)} Tons of CO₂** from your profile. Your ecological footprint and Projected Net-Zero milestone year have been successfully updated in your EcoTwin telemetry.
            </p>

            <div className="success-modal-stats-card">
              <span className="success-modal-stats-label">Tokens Redeemed:</span>
              <span className="success-modal-stats-value-rose">
                -{successModal.cost} Eco-Tokens
              </span>
            </div>

            <button
              onClick={() => setSuccessModal(null)}
              className="btn-primary success-modal-btn"
              style={{
                background: `linear-gradient(135deg, ${successModal.color} 0%, #059669 100%)`
              }}
            >
              Sync EcoTwin Simulation
            </button>
          </div>
        </div>
      )}

      {/* Global spinning keyframe stylesheet */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1.5s linear infinite;
        }
        @keyframes pulse {
          0% { opacity: 0.8; }
          50% { opacity: 1; filter: brightness(1.1); }
          100% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
