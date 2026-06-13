import { useState, useRef, useEffect } from 'react';
import { chatWithCoach, isGeminiConfigured } from '../utils/gemini';
import { Send, X, Bot, Sparkles, User } from 'lucide-react';

export default function CarbonCopilot({ user, isOpen, onClose }) {
  const [messages, setMessages] = useState([
    { id: '1', sender: 'coach', text: `Hi ${user.displayName || 'Eco Warrior'}! I am your Carbon Copilot. I've analyzed your onboarding stats and daily habits. Ask me anything about how to reduce emissions, save money, or optimize your EcoTwin ecosystem!`, timestamp: new Date().toISOString() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      // Pass message history context
      const chatHistory = messages.map(m => ({
        sender: m.sender === 'coach' ? 'coach' : 'user',
        text: m.text
      }));
      
      const coachText = await chatWithCoach(inputValue, chatHistory, user);
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'coach',
        text: coachText,
        timestamp: new Date().toISOString()
      }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'coach',
        text: "I'm having a bit of trouble connecting to my cognitive networks. But I still recommend walking to your destination today if it's less than 3 kilometers!",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '380px',
      height: '100vh',
      background: 'rgba(10, 14, 23, 0.95)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid var(--glass-border)',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
      {/* Copilot Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.01)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            padding: '8px',
            borderRadius: '10px',
            color: 'var(--secondary)'
          }}>
            <Bot size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Carbon Copilot</h3>
            <span style={{ fontSize: '11px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={10} /> AI Sustainability Coach
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages area */}
      <div style={{
        flexGrow: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {messages.map((msg) => {
          const isCoach = msg.sender === 'coach';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isCoach ? 'flex-start' : 'flex-end',
                maxWidth: '85%',
                alignSelf: isCoach ? 'flex-start' : 'flex-end'
              }}
            >
              {/* Sender label */}
              <div style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {isCoach ? (
                  <>
                    <Bot size={10} /> Copilot Coach
                  </>
                ) : (
                  <>
                    <User size={10} /> You
                  </>
                )}
              </div>

              {/* Message text bubble */}
              <div style={{
                background: isCoach ? 'rgba(255, 255, 255, 0.03)' : 'rgba(99, 102, 241, 0.15)',
                border: isCoach ? '1px solid var(--glass-border)' : '1px solid rgba(99, 102, 241, 0.25)',
                color: 'var(--text-primary)',
                padding: '12px 14px',
                borderRadius: isCoach ? '0px 14px 14px 14px' : '14px 0px 14px 14px',
                fontSize: '13px',
                lineHeight: '1.45',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.text}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              padding: '10px 16px',
              borderRadius: '0px 14px 14px 14px',
              display: 'flex',
              gap: '4px'
            }}>
              <span className="animate-pulse" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%' }}></span>
              <span className="animate-pulse" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animationDelay: '0.2s' }}></span>
              <span className="animate-pulse" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input section */}
      <form onSubmit={handleSend} style={{
        padding: '20px',
        borderTop: '1px solid var(--glass-border)',
        display: 'flex',
        gap: '8px',
        background: 'rgba(255,255,255,0.01)'
      }}>
        <input
          type="text"
          placeholder="Ask a sustainability question..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading}
          style={{ flexGrow: 1 }}
        />
        <button
          type="submit"
          className="btn-primary glow-indigo"
          disabled={loading || !inputValue.trim()}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0
          }}
        >
          <Send size={16} />
        </button>
      </form>

      {/* API Key reminder if missing */}
      {!isGeminiConfigured() && (
        <div style={{
          padding: '10px 20px',
          background: 'rgba(6, 182, 212, 0.05)',
          borderTop: '1px solid var(--glass-border)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          textAlign: 'center'
        }}>
          Mock chatbot activated. paste Gemini API key in settings modal for a live conversation.
        </div>
      )}
    </div>
  );
}
