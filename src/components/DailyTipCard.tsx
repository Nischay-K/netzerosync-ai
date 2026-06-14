import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

export default function DailyTipCard() {
  const [showTip, setShowTip] = useState(true);

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
  const diff = today.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const dailyTip = tipsList[dayOfYear % tipsList.length];

  if (!showTip) return null;

  return (
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
  );
}
