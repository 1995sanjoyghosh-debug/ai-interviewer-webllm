import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function App() {
  const [url, setUrl] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [docId, setDocId] = useState('');
  const [messages, setMessages] = useState([]);
  const [citations, setCitations] = useState([]);
  const [status, setStatus] = useState('Paste a web link to start chatting with the document.');
  const [loading, setLoading] = useState(false);

  const addMessage = (role, content) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const handleIngest = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessages([]);
    setCitations([]);
    setDocId('');

    try {
      const formData = new FormData();
      if (url.trim()) {
        formData.append('url', url.trim());
      } else {
        throw new Error('Please enter a web link to ingest.');
      }

      const response = await fetch(`${API_BASE}/api/load`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Ingest failed');
      }

      setDocId(result.docId);
      setStatus(`Document ready: ${result.source}`);
      addMessage('assistant', 'I can answer questions about this document. Ask me anything.');
    } catch (error) {
      setStatus('Ingest failed.');
      addMessage('assistant', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async (event) => {
    event.preventDefault();
    const trimmed = chatInput.trim();

    if (!trimmed) {
      return;
    }

    if (!docId) {
      setStatus('Ingest a link before chatting.');
      return;
    }

    addMessage('user', trimmed);
    setChatInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, question: trimmed }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Query failed');
      }

      addMessage('assistant', result.answer);
      setCitations(result.citations || []);
      setStatus('Answer generated successfully.');
    } catch (error) {
      addMessage('assistant', error.message);
      setStatus('Query failed.');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCitations([]);
    setStatus('Chat cleared. You can ask another question.');
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Document Chat Bot</h1>
        <p>Paste a web link and chat with the linked document. Responses are returned with citation markers.</p>
      </header>

      <section className="panel hero-panel">
        <div>
          <h2>Enter a link to start</h2>
          <p>Only a web link is required — no file upload needed.</p>
        </div>
        <form onSubmit={handleIngest} className="link-form">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            disabled={loading}
          />
          <button type="submit" disabled={loading}>Ingest Link</button>
        </form>
      </section>

      <section className="panel chat-panel">
        <div className="chat-header">
          <div>
            <h2>Chat with the document</h2>
            <p className="subtext">Ask questions and get answers with citations.</p>
          </div>
          <button type="button" className="secondary" onClick={clearChat} disabled={!docId || loading}>
            Clear chat
          </button>
        </div>

        <div className="chat-window">
          {messages.length === 0 ? (
            <div className="empty-state">Ingest a link and start asking questions about the document.</div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`bubble ${message.role}`}>
                <span className="bubble-title">{message.role === 'user' ? 'You' : 'Bot'}</span>
                <p>{message.content}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleChat} className="chat-form">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask anything about the ingested webpage"
            disabled={loading || !docId}
          />
          <button type="submit" disabled={loading || !docId}>Send</button>
        </form>

        {citations.length > 0 && (
          <div className="citations-panel">
            <h3>Citations</h3>
            <ul>
              {citations.map((source) => (
                <li key={source.id}>
                  <span className="citation-label">{source.label}</span>
                  <span>{source.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="panel status-panel">
        <h2>Status</h2>
        <p>{status}</p>
      </section>
    </div>
  );
}

export default App;
