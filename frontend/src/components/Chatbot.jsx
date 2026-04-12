import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { getSession } from '../utils/auth';
import styles from './Chatbot.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const SUGGESTED_QUERIES = [
  'Explain the main topics',
  'List important questions',
  'Summarize this document',
  'What are the key concepts?',
];

function buildSystemContext(entry) {
  if (!entry) return 'You are a helpful study assistant for engineering students.';
  return `You are a helpful study assistant for engineering students at Vishnu Institute of Technology.
The student is currently viewing: "${entry.label}" (${entry.subject.replace(/_/g, ' ')}, ${entry.year.replace(/_/g, ' ')}, ${entry.semester.replace(/_/g, ' ')}).
Help the student understand this subject. Answer questions about the topics likely covered in this material.
Be concise, clear, and use bullet points when listing items.`;
}

export default function Chatbot({ entry, isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: entry
        ? `Hi! I'm your study assistant for **${entry.label}**. Ask me anything about this material!`
        : "Hi! I'm your AI study assistant. Select a PDF and I'll help you understand the material.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Reset chat greeting when entry changes
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        text: entry
          ? `Hi! I'm your study assistant for **${entry.label}**. Ask me anything about this material!`
          : "Hi! I'm your AI study assistant. Select a PDF and I'll help you understand the material.",
      },
    ]);
  }, [entry?.filename]);

  async function sendMessage(text) {
    const userText = text || input.trim();
    if (!userText || loading) return;

    setInput('');
    setApiError('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const session = getSession();
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await axios.post(
        `${BACKEND_URL}/api/chat`,
        {
          message: userText,
          history,
          systemContext: buildSystemContext(entry),
        },
        { headers: { Authorization: `Bearer ${session?.token}` } }
      );

      setMessages((prev) => [...prev, { role: 'assistant', text: res.data.text }]);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to get response. Please try again.';
      setApiError(errMsg);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: '⚠️ ' + errMsg, isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function renderText(text) {
    // Simple markdown: bold, bullet points
    return text
      .split('\n')
      .map((line, i) => {
        const bold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        if (line.startsWith('* ') || line.startsWith('- ')) {
          return <li key={i} dangerouslySetInnerHTML={{ __html: bold.slice(2) }} />;
        }
        return <p key={i} dangerouslySetInnerHTML={{ __html: bold }} />;
      });
  }

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sidebar} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span>🤖</span>
            <span>AI Study Assistant</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close chatbot">
            ✕
          </button>
        </div>

        {entry && (
          <div className={styles.contextBadge}>
            📄 {entry.label}
          </div>
        )}

        <div className={styles.messages}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.assistantMsg} ${msg.isError ? styles.errorMsg : ''}`}
            >
              <ul className={styles.msgContent}>{renderText(msg.text)}</ul>
            </div>
          ))}
          {loading && (
            <div className={`${styles.message} ${styles.assistantMsg}`}>
              <div className={styles.typing}>
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.suggestions}>
          {SUGGESTED_QUERIES.map((q) => (
            <button
              key={q}
              className={styles.suggestionBtn}
              onClick={() => sendMessage(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>

        <div className={styles.inputRow}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this topic…"
            rows={1}
            disabled={loading}
          />
          <button
            className={styles.sendBtn}
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
