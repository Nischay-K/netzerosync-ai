import { useState, useRef, useEffect, FormEvent } from 'react';
import { chatWithCoach, isGeminiConfigured } from '../utils/gemini';
import { Send, X, Bot, Sparkles, User } from 'lucide-react';
import { UserProfile } from '../utils/firebase';

interface CarbonCopilotProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: 'coach' | 'user';
  text: string;
  timestamp: string;
}

export default function CarbonCopilot({ user, isOpen, onClose }: CarbonCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'coach', text: `Hi ${user.displayName || 'Eco Warrior'}! I am your Carbon Copilot. I've analyzed your onboarding stats and daily habits. Ask me anything about how to reduce emissions, save money, or optimize your EcoTwin ecosystem!`, timestamp: new Date().toISOString() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMessage: Message = {
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

  // Trap Escape key and manage focus for A11y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 50);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="carbon-copilot-style-1">
      {/* Copilot Header */}
      <div className="carbon-copilot-style-2">
        <div className="carbon-copilot-style-3">
          <div className="carbon-copilot-style-4">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="carbon-copilot-style-5">Carbon Copilot</h3>
            <span className="carbon-copilot-style-6">
              <Sparkles size={10} /> AI Sustainability Coach
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          ref={closeButtonRef}
          aria-label="Close Carbon Copilot"
          className="carbon-copilot-style-7"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages area */}
      <div className="carbon-copilot-style-8">
        {messages.map((msg) => {
          const isCoach = msg.sender === 'coach';
          return (
            <div
              key={msg.id}
              className="carbon-copilot-style-9" style={{ alignItems: isCoach ? 'flex-start' : 'flex-end', alignSelf: isCoach ? 'flex-start' : 'flex-end' }}
            >
              {/* Sender label */}
              <div className="carbon-copilot-style-10">
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
              <div className="carbon-copilot-style-11" style={{ background: isCoach ? 'rgba(255, 255, 255, 0.03)' : 'rgba(99, 102, 241, 0.15)', border: isCoach ? '1px solid var(--glass-border)' : '1px solid rgba(99, 102, 241, 0.25)', borderRadius: isCoach ? '0px 14px 14px 14px' : '14px 0px 14px 14px' }}>
                {msg.text}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="carbon-copilot-style-12">
            <div className="carbon-copilot-style-13">
              <span className="animate-pulse carbon-copilot-style-14"></span>
              <span className="animate-pulse carbon-copilot-style-15"></span>
              <span className="animate-pulse carbon-copilot-style-16"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input section */}
      <form onSubmit={handleSend} className="carbon-copilot-style-17">
        <input
          type="text"
          placeholder="Ask a sustainability question..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading}
          className="carbon-copilot-style-18"
        />
        <button
          type="submit"
          className="btn-primary glow-indigo carbon-copilot-style-19"
          disabled={loading || !inputValue.trim()}
        >
          <Send size={16} />
        </button>
      </form>

      {/* API Key reminder if missing */}
      {!isGeminiConfigured() && (
        <div className="carbon-copilot-style-20">
          Mock chatbot activated. paste Gemini API key in settings modal for a live conversation.
        </div>
      )}
    </div>
  );
}
