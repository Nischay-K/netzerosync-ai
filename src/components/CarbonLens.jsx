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
    <div className="fade-in carbon-lens-style-1">
      
      {/* Header */}
      <div>
        <h1 className="carbon-lens-style-2">Carbon Lens AI</h1>
        <p className="carbon-lens-style-3">
          Upload invoices, receipts, grocery bills, or travel boarding passes. Our AI calculates emissions instantly.
        </p>
      </div>

      <div className="carbon-lens-style-4 dashboard-grid">
        
        {/* Left Column: Upload Form */}
        <div className="glass-panel glow-indigo carbon-lens-style-5">
          <h3 className="carbon-lens-style-6">Scan Bill or Receipt</h3>

          {!isGeminiConfigured() && (
            <div className="carbon-lens-style-7">
              <AlertCircle size={16} />
              <span>
                Running in <strong>Mock Scanner</strong> mode. Paste your Gemini API key in the settings drawer to use live multimodal AI receipt scanning.
              </span>
            </div>
          )}

          {successMsg && (
            <div className="carbon-lens-style-8">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleScan} className="carbon-lens-style-9">
            
            {/* File drag-drop input */}
            <div className="carbon-lens-style-10">
              <input
                type="file"
                accept="image/*,application/pdf"
                id="file-upload"
                onChange={handleFileChange}
                className="carbon-lens-style-11"
              />
              
              <div className="carbon-lens-style-12">
                <Upload size={32} color="var(--text-muted)" />
                <div>
                  <p className="carbon-lens-style-13">
                    {file ? file.name : 'Choose file or drag & drop'}
                  </p>
                  <p className="carbon-lens-style-14">
                    JPG, PNG, PDF up to 5MB (Grocery bills, utility invoices, flight tickets)
                  </p>
                </div>
              </div>
            </div>

            {/* Preview image */}
            {previewUrl && (
              <div className="carbon-lens-style-15">
                <img src={previewUrl} alt="Preview" className="carbon-lens-style-16" />
                <button
                  type="button"
                  onClick={clearSelection}
                  className="carbon-lens-style-17"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            {/* Manual text notes */}
            <div>
              <label className="carbon-lens-style-18">
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
              className="btn-primary carbon-lens-style-19"
            >
              {loading ? 'AI Scanning Receipt Content...' : 'Initiate AI Analysis'}
            </button>
          </form>
        </div>

        {/* Right Column: AI Extraction Results */}
        <div className="carbon-lens-style-20">
          {loading ? (
            <div className="glass-panel carbon-lens-style-21">
              <div className="xp-bar carbon-lens-style-22">
                <div className="xp-fill carbon-lens-style-23" />
              </div>
              <p className="carbon-lens-style-24">Gemini OCR extracting items & calculating CO₂ equivalents...</p>
            </div>
          ) : result ? (
            <div className="glass-panel glow-emerald fade-in carbon-lens-style-25">
              <div className="carbon-lens-style-26">
                <h3 className="carbon-lens-style-27">Extraction Breakdown</h3>
                <span className="carbon-lens-style-28">
                  +{result.totalCo2} kg CO₂
                </span>
              </div>

              {/* Items Table */}
              <div className="carbon-lens-style-29">
                <table className="carbon-lens-style-30">
                  <thead>
                    <tr className="carbon-lens-style-31">
                      <th className="carbon-lens-style-32">Item</th>
                      <th className="carbon-lens-style-33">Category</th>
                      <th className="carbon-lens-style-34">CO₂ Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items?.map((item, index) => (
                      <tr key={index} className="carbon-lens-style-35">
                        <td className="carbon-lens-style-36">{item.name}</td>
                        <td className="carbon-lens-style-37">{item.category}</td>
                        <td className="carbon-lens-style-38" style={{ color: item.co2 > 5 ? 'var(--accent-rose)' : 'var(--text-primary)' }}>
                          {item.co2} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Suggestions */}
              {result.suggestions && (
                <div className="carbon-lens-style-39">
                  <strong className="carbon-lens-style-40">Coach Recommendation:</strong>
                  {result.suggestions}
                </div>
              )}

              {/* Buttons */}
              <div className="carbon-lens-style-41">
                <button
                  onClick={clearSelection}
                  className="btn-ghost carbon-lens-style-42"
                >
                  Discard
                </button>
                <button
                  onClick={handleLogToFootprint}
                  className="btn-primary carbon-lens-style-43"
                >
                  <Check size={16} /> Log to Footprint Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel carbon-lens-style-44">
              <FileText size={48} strokeWidth={1} className="carbon-lens-style-45" />
              <h4 className="carbon-lens-style-46">No Scan Initiated</h4>
              <p className="carbon-lens-style-47">Upload a file or write shopping notes on the left and click "Initiate AI Analysis" to parse carbon weights.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
