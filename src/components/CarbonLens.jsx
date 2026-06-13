import { useState } from 'react';
import { scanReceipt, isGeminiConfigured } from '../utils/gemini';
import { logCarbonEntry } from '../utils/firebase';
import { Upload, FileText, Trash2, Check, AlertCircle } from 'lucide-react';

export default function CarbonLens({ user, onProfileUpdate, addLogNotify }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [textNotes, setTextNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
      setSuccessMsg('');
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!file && !textNotes) return;

    setLoading(true);
    setResult(null);
    setSuccessMsg('');

    try {
      const parsedData = await scanReceipt(file, textNotes);
      setResult(parsedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogToFootprint = async () => {
    if (!result) return;
    try {
      // 1. Log entry and award XP securely via API Gateway
      const resultData = await logCarbonEntry(user.uid, {
        name: file ? `Receipt: ${file.name}` : `Manual Log: ${textNotes.substring(0, 25)}...`,
        category: 'Purchase Receipt',
        co2Value: result.totalCo2, // positive value means additions
        notes: result.suggestions || "Receipt details scanned."
      }, {
        xpReward: 120,
        tokenReward: 20
      });

      // 2. Trigger profile update using securely calculated stats
      const updatedUser = {
        ...user,
        carbonCurrent: resultData.carbonCurrent,
        xp: resultData.xp,
        level: resultData.level,
        ecoTokens: resultData.ecoTokens
      };
      onProfileUpdate(updatedUser);

      setSuccessMsg(`Logged ${result.totalCo2} kg of CO₂ to your dashboard! Earned +120 XP.`);
      setResult(null);
      setFile(null);
      setPreviewUrl('');
      setTextNotes('');

      if (addLogNotify) {
        addLogNotify();
      }
    } catch (err) {
      console.error("Failed to log receipt metrics", err);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setPreviewUrl('');
    setResult(null);
    setSuccessMsg('');
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>Carbon Lens AI</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Upload invoices, receipts, grocery bills, or travel boarding passes. Our AI calculates emissions instantly.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '30px' }} className="dashboard-grid">
        
        {/* Left Column: Upload Form */}
        <div className="glass-panel glow-indigo" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <h3 style={{ fontSize: '18px' }}>Scan Bill or Receipt</h3>

          {!isGeminiConfigured() && (
            <div style={{
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              color: 'var(--accent-cyan)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={16} />
              <span>
                Running in <strong>Mock Scanner</strong> mode. Paste your Gemini API key in the settings drawer to use live multimodal AI receipt scanning.
              </span>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: 'var(--primary)',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '13px',
              textAlign: 'center',
              fontWeight: '600'
            }}>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleScan} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* File drag-drop input */}
            <div style={{ position: 'relative' }}>
              <input
                type="file"
                accept="image/*,application/pdf"
                id="file-upload"
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  top: 0,
                  left: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 2
                }}
              />
              
              <div style={{
                border: '2px dashed var(--glass-border)',
                borderRadius: '12px',
                padding: '36px 20px',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.01)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}>
                <Upload size={32} color="var(--text-muted)" />
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600' }}>
                    {file ? file.name : 'Choose file or drag & drop'}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    JPG, PNG, PDF up to 5MB (Grocery bills, utility invoices, flight tickets)
                  </p>
                </div>
              </div>
            </div>

            {/* Preview image */}
            {previewUrl && (
              <div style={{ position: 'relative', width: '100%', maxHeight: '180px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                <button
                  type="button"
                  onClick={clearSelection}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-rose)'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            {/* Manual text notes */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Add items details manually (Alternative if no image)
              </label>
              <textarea
                rows="3"
                placeholder="Example: 1kg local potatoes, 2 Uber rides, organic eggs, 1 fast-fashion shirt..."
                value={textNotes}
                onChange={(e) => setTextNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading || (!file && !textNotes)}
              className="btn-primary"
              style={{
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? 'AI Scanning Receipt Content...' : 'Initiate AI Analysis'}
            </button>
          </form>
        </div>

        {/* Right Column: AI Extraction Results */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', gap: '16px' }}>
              <div className="xp-bar" style={{ width: '150px', height: '6px' }}>
                <div className="xp-fill" style={{ width: '80%', animation: 'pulse 1.5s infinite' }} />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Gemini OCR extracting items & calculating CO₂ equivalents...</p>
            </div>
          ) : result ? (
            <div className="glass-panel glow-emerald fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px' }}>Extraction Breakdown</h3>
                <span style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  color: 'var(--accent-rose)',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  +{result.totalCo2} kg CO₂
                </span>
              </div>

              {/* Items Table */}
              <div style={{ overflowX: 'auto', flexGrow: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 4px' }}>Item</th>
                      <th style={{ padding: '8px 4px' }}>Category</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right' }}>CO₂ Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items?.map((item, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '10px 4px', color: 'var(--text-primary)', fontWeight: '500' }}>{item.name}</td>
                        <td style={{ padding: '10px 4px', color: 'var(--text-secondary)' }}>{item.category}</td>
                        <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: '600', color: item.co2 > 5 ? 'var(--accent-rose)' : 'var(--text-primary)' }}>
                          {item.co2} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Suggestions */}
              {result.suggestions && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--glass-border)',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  lineHeight: '1.4',
                  color: 'var(--text-secondary)'
                }}>
                  <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>Coach Recommendation:</strong>
                  {result.suggestions}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                <button
                  onClick={clearSelection}
                  className="btn-ghost"
                  style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                >
                  Discard
                </button>
                <button
                  onClick={handleLogToFootprint}
                  className="btn-primary"
                  style={{
                    flex: 2,
                    padding: '10px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={16} /> Log to Footprint Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
              <FileText size={48} strokeWidth={1} style={{ marginBottom: '16px' }} />
              <h4 style={{ color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '4px' }}>No Scan Initiated</h4>
              <p style={{ fontSize: '12px' }}>Upload a file or write shopping notes on the left and click "Initiate AI Analysis" to parse carbon weights.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
