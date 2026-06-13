import React, { useState, useEffect, useCallback } from 'react';
import { getCarbonLogs, logCarbonEntry } from '../utils/firebase';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Activity, Plus, TrendingUp, Calendar, Award, X, Printer, Share2, Leaf, Sparkles } from 'lucide-react';

export default function Dashboard({ user, onProfileUpdate, onOpenAchievements }) {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [quickLogName, setQuickLogName] = useState('');
  const [quickLogCategory, setQuickLogCategory] = useState('Transport');
  const [quickLogCo2, setQuickLogCo2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCert, setShowCert] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [showTip, setShowTip] = useState(true);

  // Daily tips data list
  const tipsList = [
    "Switch to LED lighting to reduce energy usage by up to 75% compared to incandescent bulbs.",
    "Wash laundry in cold water to save up to 90% of your washing machine's electricity consumption.",
    "Unplug chargers and electronic power strips when not in use to combat phantom power drain.",
    "Opt for public transit, walking, or cycling instead of driving for trips under 5 kilometers.",
    "Organize your refrigerator and plan meals weekly to eliminate food waste (saves ~350kg CO₂/yr).",
    "Dedicate one day a week to plant-based meals to dramatically reduce your dietary carbon load.",
    "Hang dry your garments instead of using a heated tumble dryer to cut home carbon footprint.",
    "Adjust your smart thermostat by just 1°C to save up to 10% on heating and cooling emissions.",
    "Choose loose, package-free produce at markets to directly reduce municipal plastic waste.",
    "Run dishwashers and laundry machines only when fully loaded to maximize water and energy efficiency."
  ];

  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const dailyTip = tipsList[dayOfYear % tipsList.length];

  // Carbon trend calculations
  const mapCarbonToY = React.useCallback((val) => {
    const minVal = 1.0;
    const maxVal = 8.0;
    const minY = 170;
    const maxY = 25;
    const y = minY - ((val - minVal) / (maxVal - minVal)) * (minY - maxY);
    return Math.max(maxY, Math.min(minY, y));
  }, []);

  const { points, pathD, fillD } = React.useMemo(() => {
    const weekValues = [6.8, 6.2, 5.9, 5.3, 4.8, user.carbonCurrent || 6.8];
    const pts = weekValues.map((val, idx) => ({
      x: 60 + idx * 136,
      y: mapCarbonToY(val),
      val,
      week: idx === 5 ? 'Current' : `Wk ${idx + 1}`
    }));

    let pD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const cpX1 = p0.x + 68;
      const cpY1 = p0.y;
      const cpX2 = p1.x - 68;
      const cpY2 = p1.y;
      pD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    const fD = `${pD} L ${pts[pts.length - 1].x} 170 L ${pts[0].x} 170 Z`;

    return { points: pts, pathD: pD, fillD: fD };
  }, [user.carbonCurrent, mapCarbonToY]);

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

  const handleQuickLog = async (e) => {
    e.preventDefault();
    if (!quickLogName.trim() || !quickLogCo2 || submitting) return;

    setSubmitting(true);
    try {
      const co2Val = Number(quickLogCo2);
      
      // Log entry and award XP securely via API Gateway
      const result = await logCarbonEntry(user.uid, {
        name: quickLogName,
        category: quickLogCategory,
        co2Value: co2Val,
        notes: "Quick manual logger entry."
      }, {
        xpReward: 50,
        tokenReward: 10
      });

      // Update local profile state using values calculated securely on the server
      const updatedUser = {
        ...user,
        carbonCurrent: result.carbonCurrent,
        xp: result.xp,
        level: result.level,
        ecoTokens: result.ecoTokens
      };
      onProfileUpdate(updatedUser);

      setQuickLogName('');
      setQuickLogCo2('');
      await fetchLogs();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Recharts Breakdown data preparation
  // Let's read from user's current twin sliders or calculate from logs
  const transportVal = user.twinState?.transportSlider || 50;
  const dietVal = user.twinState?.dietSlider || 50;
  const energyVal = user.twinState?.energySlider || 50;
  const shoppingVal = user.twinState?.shoppingSlider || 50;

  const totalSliders = transportVal + dietVal + energyVal + shoppingVal;
  
  const chartData = [
    { name: 'Transportation', value: Math.max(10, Math.round((transportVal / totalSliders) * 100)), color: '#6366f1' },
    { name: 'Diet & Food', value: Math.max(10, Math.round((dietVal / totalSliders) * 100)), color: '#10b981' },
    { name: 'Home Utilities', value: Math.max(10, Math.round((energyVal / totalSliders) * 100)), color: '#06b6d4' },
    { name: 'Shopping & Waste', value: Math.max(10, Math.round((shoppingVal / totalSliders) * 100)), color: '#f59e0b' }
  ];

  return (
    <div className="fade-in layout-stack-30">
            {/* Telemetry Header & Certificate Claim */}
      <div className="dashboard-header">
        <div>
          <div className="dashboard-header-telemetry">
            <span className="dashboard-header-telemetry-dot"></span>
            EcoTwin Telemetry: SYNCED
          </div>
          <h2 className="dashboard-header-title">
            Telemetry Node: <strong className="dashboard-header-name">{user.displayName}</strong>
          </h2>
        </div>
        
        <button
          onClick={() => setShowCert(true)}
          className="btn-primary dashboard-claim-btn"
        >
          <Award size={14} /> Claim Eco-Certificate
        </button>
      </div>

      {/* Daily Sustainability Tip Card */}
      {showTip && (
        <div className="glass-panel glow-emerald tip-card">
          <div className="tip-icon-container">
            <Sparkles size={20} />
          </div>
          <div className="tip-content">
            <h4 className="tip-title">
              Sustainability Tip of the Day
            </h4>
            <p className="tip-description">
              {dailyTip}
            </p>
          </div>
          <button
            onClick={() => setShowTip(false)}
            className="tip-dismiss-btn"
            aria-label="Dismiss daily tip"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Upper Widgets Grid */}
      <div className="widget-grid">
        
        {/* Widget 1: Carbon Index */}
        <div className="glass-panel glow-emerald pos-relative">
          <div className="widget-title">Current Footprint</div>
          <div className="layout-baseline-6">
            <span className="widget-value">
              {user.carbonCurrent || 6.8}
            </span>
            <span className="widget-unit">tons CO₂/yr</span>
          </div>
          <div className="widget-footer">
            <TrendingUp size={12} /> Live tracking active
          </div>
        </div>

        {/* Widget 2: Target Reduction */}
        <div className="glass-panel pos-relative">
          <div className="widget-title">Target Reduction</div>
          <div className="layout-baseline-6">
            <span className="widget-value-cyan">
              {user.carbonTarget || 3.5}
            </span>
            <span className="widget-unit">tons CO₂/yr</span>
          </div>
          <div className="widget-footer-muted">
            Target: 40% reduction from baseline
          </div>
        </div>

        {/* Widget 3: Game Rank */}
        <button 
          onClick={onOpenAchievements}
          className="glass-panel glow-indigo widget-btn" 
          title="Click to view Achievements"
          aria-label={`View achievements milestones list. Earned ${user.completedMissions?.length || 0} badges.`}
        >
          <div className="widget-title">Rank & Status</div>
          <div className="layout-baseline-6">
            <span className="widget-value">
              Lvl {user.level || 1}
            </span>
            <span className="widget-unit">{user.xp || 0} XP total</span>
          </div>
          <div className="widget-footer-secondary">
            <Award size={12} color="var(--accent-amber)" /> View Achievements ({user.completedMissions?.length || 0} Badges)
          </div>
        </button>

        {/* Widget 4: Projected Net Zero */}
        {(() => {
          const currentFootprint = user.carbonCurrent || 6.8;
          const reductionSpeedFactor = user.completedMissions?.length ? user.completedMissions.length * 0.15 : 0.05;
          const yearsToNetZero = Math.max(1.5, Number(((currentFootprint - 1.0) / (0.2 + reductionSpeedFactor)).toFixed(1)));
          const netZeroYear = new Date().getFullYear() + Math.ceil(yearsToNetZero);
          
          return (
            <div className="glass-panel glow-emerald pos-relative">
              <div className="widget-title">Projected Net-Zero</div>
              <div className="layout-baseline-6">
                <span className="widget-value-primary">
                  {netZeroYear}
                </span>
                <span className="widget-unit-margin">({yearsToNetZero} yrs)</span>
              </div>
              <div className="widget-footer-cyan">
                Accelerating via quests completed
              </div>
            </div>
          );
        })()}

      </div>

      {/* SVG Telemetry Trend Chart */}
      <div className="glass-panel layout-stack-16 pos-relative">
        <div className="chart-panel-header">
          <div>
            <h3 className="chart-panel-title">
              <TrendingUp size={20} color="var(--accent-cyan)" />
              Weekly Carbon Telemetry Trend
            </h3>
            <span className="chart-panel-subtitle">
              Historical progress compared to net-zero target line.
            </span>
          </div>

          <div className="chart-legends">
            <div className="layout-row-align-center-gap-6">
              <div className="chart-legend-dot" />
              <span className="text-sec">Current Telemetry</span>
            </div>
            <div className="layout-row-align-center-gap-6">
              <div className="chart-legend-dashed" />
              <span className="text-sec">Target Threshold</span>
            </div>
          </div>
        </div>

        {/* SVG Wrapper */}
        <div className="chart-svg-wrapper">
          <svg viewBox="0 0 800 200" width="100%" height="100%" aria-hidden="true" className="chart-svg">
            <defs>
              <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 1, 2, 3, 4].map(idx => {
              const yVal = 25 + idx * 36.25;
              const val = (8.0 - idx * 1.75).toFixed(1);
              return (
                <g key={idx}>
                  <line x1="50" y1={yVal} x2="750" y2={yVal} stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                  <text x="35" y={yVal + 4} fill="var(--text-muted)" fontSize="9.5px" textAnchor="end">{val} t</text>
                </g>
              );
            })}

            {/* Target Baseline Threshold Line */}
            <line
              x1="50"
              y1={mapCarbonToY(user.carbonTarget || 3.5)}
              x2="750"
              y2={mapCarbonToY(user.carbonTarget || 3.5)}
              stroke="var(--accent-rose)"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.8"
            />
            <text
              x="745"
              y={mapCarbonToY(user.carbonTarget || 3.5) - 6}
              fill="var(--accent-rose)"
              fontSize="9px"
              textAnchor="end"
              fontWeight="bold"
            >
              Target: {user.carbonTarget || 3.5} t
            </text>

            {/* Glowing Gradient Area Under Path */}
            <path d={fillD} fill="url(#chartAreaGrad)" />

            {/* Neon Cyan Curve Path */}
            <path
              d={pathD}
              fill="none"
              stroke="var(--accent-cyan)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="chart-svg-path"
            />

            {/* Interactive Points */}
            {points.map((pt, idx) => (
              <g key={idx}>
                {/* Outer Glow ring on hover */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredPoint === idx ? "10" : "5"}
                  fill="var(--accent-cyan)"
                  opacity={hoveredPoint === idx ? "0.3" : "0.0"}
                  className="chart-svg-interactive-circle"
                />
                {/* Core point */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  fill="var(--bg-primary)"
                  stroke="var(--accent-cyan)"
                  strokeWidth="2.5"
                  onMouseEnter={() => setHoveredPoint(idx)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="chart-svg-core-circle"
                />
                {/* Label below dot */}
                <text
                  x={pt.x}
                  y="188"
                  fill="var(--text-secondary)"
                  fontSize="10px"
                  textAnchor="middle"
                >
                  {pt.week}
                </text>
              </g>
            ))}

            {/* Dynamic Tooltip */}
            {hoveredPoint !== null && (
              <g transform={`translate(${points[hoveredPoint].x}, ${points[hoveredPoint].y - 25})`}>
                <rect
                  x="-50"
                  y="-32"
                  width="100"
                  height="38"
                  rx="6"
                  fill="var(--bg-secondary)"
                  stroke="var(--accent-cyan)"
                  strokeWidth="1"
                  className="chart-svg-rect-tooltip"
                />
                <text
                  x="0"
                  y="-20"
                  fill="#fff"
                  fontSize="9.5px"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {points[hoveredPoint].week}
                </text>
                <text
                  x="0"
                  y="-8"
                  fill="var(--accent-cyan)"
                  fontSize="11px"
                  fontWeight="800"
                  textAnchor="middle"
                >
                  {points[hoveredPoint].val} Tons
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Main Charts & Logger Panel */}
      <div className="layout-grid-lb dashboard-grid">
        
        {/* Left Grid Content: Charts & Quick Log */}
        <div className="layout-stack-30">
          
          {/* Chart visual card */}
          <div className="glass-panel layout-stack-20">
            <h3 className="text-size-18">Emissions Distribution</h3>
            
            <div className="chart-distribution-container">
              <div className="chart-distribution-pie">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends list */}
              <div className="chart-distribution-legends">
                {chartData.map((entry, idx) => (
                  <div key={idx} className="layout-row-align-center-gap-10">
                    <div className="chart-distribution-legend-color" style={{ background: entry.color }} />
                    <div className="chart-distribution-legend-name">
                      {entry.name}
                    </div>
                    <div className="chart-distribution-legend-value">
                      {entry.value}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Logger Form */}
          <div className="glass-panel layout-stack-16">
            <h3 className="layout-row-align-center-gap-8 text-size-17">
              <Activity size={18} color="var(--primary)" />
              Daily Habit Logger
            </h3>

            <form onSubmit={handleQuickLog} className="logger-form">
              <div>
                <label htmlFor="quick-log-name" className="logger-label">Action Name</label>
                <input
                  id="quick-log-name"
                  type="text"
                  placeholder="e.g. Commute to work via bus"
                  value={quickLogName}
                  onChange={(e) => setQuickLogName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="quick-log-category" className="logger-label">Category</label>
                <select
                  id="quick-log-category"
                  value={quickLogCategory}
                  onChange={(e) => setQuickLogCategory(e.target.value)}
                >
                  <option value="Transport">Transport</option>
                  <option value="Diet">Diet & Food</option>
                  <option value="Energy">Energy</option>
                  <option value="Shopping">Shopping</option>
                </select>
              </div>

              <div>
                <label htmlFor="quick-log-co2" className="logger-label">CO₂ Impact (kg)</label>
                <input
                  id="quick-log-co2"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 2.4"
                  value={quickLogCo2}
                  onChange={(e) => setQuickLogCo2(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary logger-submit-btn"
                disabled={submitting}
              >
                <Plus size={18} />
              </button>
            </form>
            <span className="logger-tip">
              Tip: Use negative numbers for carbon-saving actions (e.g. -4.5 for choosing train over flying).
            </span>
          </div>

        </div>

        {/* Right Grid Content: Recent Activities List */}
        <div className="glass-panel glow-indigo layout-stack-20">
          <h3 className="layout-row-align-center-gap-8 text-size-18">
            <Calendar size={20} color="var(--secondary)" />
            Recent Carbon Activity Log
          </h3>

          <div className="activities-list-container">
            {loadingLogs ? (
              <p className="text-mut-13">Loading logs history...</p>
            ) : logs.length === 0 ? (
              <p className="text-mut-13-center-margin">
                No entries logged yet. Try scanning a receipt or completing a mission.
              </p>
            ) : (
              logs.map((entry, idx) => {
                const isSaving = entry.co2Value <= 0;
                
                return (
                  <div
                    key={entry.id || idx}
                    className="glass-card activity-item"
                  >
                    <div>
                      <div className="activity-item-title">
                        {entry.name}
                      </div>
                      <div className="activity-item-meta">
                        <span>{entry.category}</span>
                        <span>•</span>
                        <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className={`activity-item-impact ${isSaving ? 'text-primary' : 'text-rose'}`}>
                      {isSaving ? '' : '+'}{entry.co2Value} kg
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Shareable Certificate Modal */}
      {showCert && (
        <div className="cert-modal-backdrop">
          <div className="glass-panel glow-emerald cert-modal-panel fade-in">
            {/* Close Button */}
            <button 
              onClick={() => setShowCert(false)} 
              className="cert-modal-close-btn"
              aria-label="Close certificate modal"
            >
              <X size={20} />
            </button>

            {/* Certificate Print Area */}
            <div id="print-certificate" className="cert-print-area">
              {/* Decorative Background Leaf */}
              <div className="cert-bg-leaf">
                <Leaf size={240} />
              </div>

              <div className="cert-award-icon">
                <Award size={48} />
              </div>

              <h2 className="cert-title">
                Certificate of Excellence
              </h2>
              <p className="cert-subtitle">
                In Environmental Stewardship
              </p>

              <p className="cert-recipient-pre">
                This certifies that
              </p>
              <h3 className="cert-recipient-name">
                {user.displayName}
              </h3>

              <p className="cert-text">
                has successfully completed onboarding carbon offsets, validated lifestyle targets, and logged green initiatives at **Level {user.level || 1}** explorer rank on the **NetZeroSync AI Platform**.
              </p>

              {/* Stats summary in certificate */}
              <div className="cert-stats-container">
                <div>
                  <div className="cert-stats-label">Rank Status</div>
                  <div className="cert-stats-value">Lvl {user.level || 1} Explorer</div>
                </div>
                <div className="cert-stats-divider"></div>
                <div>
                  <div className="cert-stats-label">Target Footprint</div>
                  <div className="cert-stats-value-primary">{user.carbonTarget || 3.5} Tons/yr</div>
                </div>
              </div>
            </div>

            {/* Share / Action Buttons */}
            <div className="cert-actions-container">
              <button
                onClick={() => window.print()}
                className="btn-ghost cert-action-btn-ghost"
              >
                <Printer size={14} /> Save as PDF
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`I just reached Level ${user.level} on NetZeroSync AI, reducing my target carbon footprint to ${user.carbonTarget} tons/year! Join the movement!`);
                  alert('Certificate summary copied to clipboard! Share it with your friends.');
                }}
                className="btn-primary cert-action-btn-ghost"
              >
                <Share2 size={14} /> Share Achievements
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
