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
      backgroundColor: 'var(--bg-panel)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 999,
      animation: 'fadeInUp 0.3s ease'
    }}>

      {/* Terminal title bar */}
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-panel-raised)'
      }}>
        <div>
          <h3 style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ width: '7px', height: '7px', background: 'var(--accent)', flexShrink: 0 }} />
            recruiter_agent — live session
          </h3>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            provider: <span style={{ color: 'var(--accent-dim)', textTransform: 'lowercase' }}>{backendProvider || 'mock_engine'}</span>
          </span>
        </div>
        <button className="icon-btn" onClick={onClose}>[x]</button>
      </div>

      {/* Chat Messages area */}
      <div style={{
        flexGrow: 1,
        overflowY: 'auto',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.1rem'
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
          >
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              color: msg.role === 'user' ? 'var(--accent)' : 'var(--text-muted)'
            }}>
              {msg.role === 'user' ? '> you' : 'recruiter_agent'}
            </span>
            <div
              style={{
                padding: '0.75rem 0.95rem',
                borderRadius: '2px',
                background: msg.role === 'user' ? 'var(--accent-wash)' : 'var(--bg-panel-raised)',
                border: msg.role === 'user' ? '1px solid var(--accent-dim)' : '1px solid var(--border)',
                color: msg.role === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.9rem',
                lineHeight: '1.55',
                whiteSpace: 'pre-wrap'
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              recruiter_agent
            </span>
            <div style={{
              alignSelf: 'flex-start',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: '2px',
              background: 'var(--bg-panel-raised)',
              padding: '0.75rem 0.95rem'
            }}>
              thinking<span className="cursor-blink">█</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && (
        <div style={{
          padding: '0 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            ## suggested_queries
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {suggestionChips.map((chip, idx) => (
              <button key={idx} className="chip" onClick={() => handleSendMessage(chip)}>
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input box */}
      <div style={{
        padding: '1rem 1.25rem 1.5rem',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        background: 'var(--bg-panel-raised)'
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: '0.9rem', userSelect: 'none' }}>$</span>
        <input
          type="text"
          className="terminal-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="ask a technical question..."
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputValue.trim()}
          className="btn btn-primary"
          style={{ padding: '0.7rem 0.9rem' }}
        >
          [send]
        </button>
      </div>

    </div>
  );
}
