import React, { useState, useRef, useEffect } from 'react';

export default function RecruiterChat({ isOpen, onClose, initialQuery, backendProvider }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am Nikhil's AI Recruiter Agent. I am here to help you evaluate his technical skills, background, and the engineering details of his portfolio projects. What would you like to know?"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestionChips = [
    "Tell me about Nikhil's LangGraph system.",
    "What are the metrics for PubMedQA BERT?",
    "Why did he choose BM25 in RAG?",
    "Does he have experience with Docker?",
    "Is his SQL agent safe against injections?"
  ];

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle direct query injection (e.g. from modal)
  useEffect(() => {
    if (initialQuery) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    // Add user message
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      // POST to backend API
      // Since FastAPI runs on port 8000 in dev, we use absolute or relative url
      // Using relative '/api/chat' works in production when served by FastAPI, 
      // in dev we fallback to http://localhost:8000/api/chat
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!response.ok) {
        throw new Error('API server returned error');
      }

      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error("Chat Error:", error);
      // Fallback message
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: "Sorry, I had trouble connecting to the backend server. To see dynamic responses, please ensure the FastAPI server is running on port 8000 and that you have configured your ANTHROPIC_API_KEY or GEMINI_API_KEY in the .env file! Feel free to reach out to Nikhil directly at nikhil.teja.ai@gmail.com."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: '450px',
      backgroundColor: '#0c0a18',
      borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 999,
      animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      
      {/* Chat Header */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(18, 15, 32, 0.5)'
      }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)', boxShadow: '0 0 8px var(--accent-cyan)' }} />
            Recruiter Agent
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Powered by: <strong style={{ color: 'var(--accent-purple)', textTransform: 'capitalize' }}>{backendProvider || 'Mock Engine'}</strong>
          </span>
        </div>
        <button 
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '1.1rem',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      {/* Chat Messages area */}
      <div style={{
        flexGrow: 1,
        overflowY: 'auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div 
              style={{
                padding: '0.85rem 1.1rem',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: msg.role === 'user' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(157, 78, 221, 0.1)',
                border: msg.role === 'user' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(157, 78, 221, 0.2)',
                color: msg.role === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.92rem',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap'
              }}
            >
              {msg.content}
            </div>
            <span style={{
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              marginTop: '0.25rem',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}>
              {msg.role === 'user' ? 'You' : 'Recruiter Agent'}
            </span>
          </div>
        ))}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(157, 78, 221, 0.05)', border: '1px solid rgba(157, 78, 221, 0.1)', borderRadius: '12px', padding: '0.85rem 1.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Agent is typing</span>
            <div style={{ display: 'flex', gap: '3px' }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-purple)', animation: 'pulseGlow 1s infinite' }} />
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-purple)', animation: 'pulseGlow 1s infinite 0.2s' }} />
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-purple)', animation: 'pulseGlow 1s infinite 0.4s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && (
        <div style={{
          padding: '0 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Suggested Questions:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {suggestionChips.map((chip, idx) => (
              <button 
                key={idx}
                onClick={() => handleSendMessage(chip)}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  color: 'var(--accent-cyan)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                  e.currentTarget.style.background = 'rgba(0, 242, 254, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input box */}
      <div style={{
        padding: '1.25rem 1.5rem 1.75rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        gap: '0.75rem',
        background: 'rgba(18, 15, 32, 0.5)'
      }}>
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Ask a technical question about Nikhil..."
          style={{
            flexGrow: 1,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'border-color 0.25s ease'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent-cyan)'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
        />
        <button 
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputValue.trim()}
          className="btn btn-primary"
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            justifyContent: 'center',
            minWidth: '50px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>

    </div>
  );
}
