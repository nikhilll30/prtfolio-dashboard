import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { projectsById } from '../data/projects';

const generalPrompts = [
  'Which project best demonstrates production AI architecture?',
  'How does Nikhil handle failure and recovery?',
  'What evidence supports the model-training work?',
];

const projectPrompts = {
  'multi-agent-researcher': [
    'Why use five services instead of one agent?',
    'How does the fan-out and fan-in work?',
    'Where does MCP fit into the architecture?',
  ],
  'rag-doc-qa': [
    'Why combine BM25 and semantic search?',
    'How are page citations preserved?',
    'What are the retrieval system’s limitations?',
  ],
  'sql-insight-agent': [
    'How are destructive SQL statements blocked?',
    'What happens when generated SQL fails?',
    'Why inspect the schema before generation?',
  ],
  'pubmedqa-finetune': [
    'Why is macro F1 more useful than accuracy here?',
    'How did weighted loss affect the “maybe” class?',
    'What are the limits of the published result?',
  ],
};

const initialMessage = {
  role: 'assistant',
  content: 'Ask me about the architecture, tradeoffs, evidence, or limitations behind Nikhil’s work. Answers are grounded in the portfolio’s bundled project documentation.',
  evidence: [],
};

export default function RecruiterChat({ isOpen, onClose, projectId, backendProvider }) {
  const [messages, setMessages] = useState([initialMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesRef = useRef(messages);
  const returnFocusRef = useRef(null);
  const project = projectId ? projectsById[projectId] : null;
  const suggestions = useMemo(() => projectPrompts[projectId] || generalPrompts, [projectId]);

  useEffect(() => {
    messagesRef.current = messages;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isOpen) return undefined;
    returnFocusRef.current = document.activeElement;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll('button, a[href], textarea:not([disabled])')]
        .filter((element) => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('drawer-open');
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('drawer-open');
      returnFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const nextMessages = [...messagesRef.current, { role: 'user', content: trimmed, evidence: [] }];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const isViteDev = window.location.port === '5173';
      const baseUrl = isViteDev ? 'http://localhost:8000' : '';
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          context: {
            project_id: projectId || null,
            surface: projectId ? 'case-study' : 'home',
          },
        }),
      });

      if (!response.ok) throw new Error('Portfolio agent unavailable');
      const data = await response.json();
      const updated = [...nextMessages, {
        role: 'assistant',
        content: data.response,
        evidence: Array.isArray(data.evidence) ? data.evidence : [],
      }];
      messagesRef.current = updated;
      setMessages(updated);
    } catch {
      const updated = [...nextMessages, {
        role: 'assistant',
        content: 'The live portfolio agent is temporarily unavailable. The case studies remain fully browsable, and you can contact Nikhil directly by email.',
        evidence: [{ label: 'Email Nikhil', href: 'mailto:bvnikhilteja2001@gmail.com', kind: 'contact' }],
      }];
      messagesRef.current = updated;
      setMessages(updated);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, projectId]);

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="agent-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.aside
            ref={panelRef}
            className="agent-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="agent-panel__header">
              <div>
                <span className="agent-kicker"><i /> Portfolio knowledge interface</span>
                <h2 id="agent-title">Ask about {project ? project.shortTitle : 'the work'}</h2>
              </div>
              <button className="icon-button" type="button" onClick={onClose} aria-label="Close portfolio agent">×</button>
            </header>

            <div className="agent-context">
              <span>Context</span>
              <strong>{project ? project.title : 'All four case studies'}</strong>
              <small>{backendProvider === 'mock' ? 'Local evidence mode' : 'Grounded in bundled documentation'}</small>
            </div>

            <div className="agent-messages" aria-live="polite" aria-busy={isLoading}>
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`agent-message agent-message--${message.role}`}>
                  <span>{message.role === 'user' ? 'You' : 'Portfolio agent'}</span>
                  <p>{message.content}</p>
                  {message.evidence?.length > 0 && (
                    <div className="agent-evidence" aria-label="Related evidence">
                      {message.evidence.map((item) => (
                        <a key={`${item.href}-${item.label}`} href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noreferrer' : undefined}>
                          {item.label} <span aria-hidden="true">↗</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="agent-message agent-message--assistant agent-message--loading">
                  <span>Portfolio agent</span>
                  <p><i /><i /><i /><b className="sr-only">Reviewing project evidence</b></p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {messages.length === 1 && (
              <div className="agent-suggestions">
                <span>Useful starting points</span>
                {suggestions.map((suggestion) => (
                  <button type="button" key={suggestion} onClick={() => sendMessage(suggestion)}>{suggestion}<i aria-hidden="true">↗</i></button>
                ))}
              </div>
            )}

            <form className="agent-composer" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="agent-question">Ask about Nikhil’s work</label>
              <textarea
                ref={inputRef}
                id="agent-question"
                rows="2"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (inputValue.trim()) handleSubmit(event);
                  }
                }}
                placeholder="Ask about architecture, evidence, or tradeoffs…"
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !inputValue.trim()} aria-label="Send question">↗</button>
            </form>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
