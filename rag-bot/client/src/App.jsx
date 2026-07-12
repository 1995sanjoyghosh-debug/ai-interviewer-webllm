import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function App() {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState('');
  const [chatSessions, setChatSessions] = useState({});
  const [status, setStatus] = useState('Upload a document to start chatting with it.');
  const [loading, setLoading] = useState(false);

  const messages = activeDocId ? chatSessions[activeDocId] || [] : [];

  const appendMessage = (docId, role, content) => {
    setChatSessions((prev) => ({
      ...prev,
      [docId]: [...(prev[docId] || []), { role, content }],
    }));
  };

  const handleIngest = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else if (url.trim()) {
        formData.append('url', url.trim());
      } else if (text.trim()) {
        formData.append('text', text.trim());
      } else {
        throw new Error('Please supply a file, URL, or plain text.');
      }

      const response = await fetch(`${API_BASE}/api/load`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Ingest failed');
      }

      const nextDocument = { id: result.docId, source: result.source };
      setDocuments((prev) => [...prev, nextDocument]);
      setActiveDocId(result.docId);
      setChatSessions((prev) => ({ ...prev, [result.docId]: [] }));
      setStatus(`Document ready: ${result.source}`);
      appendMessage(result.docId, 'assistant', 'I can answer questions about this document. Ask me anything.');
    } catch (error) {
      setStatus('Ingest failed.');
      appendMessage(activeDocId, 'assistant', error.message);
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

    if (!activeDocId) {
      setStatus('Upload or ingest a document before chatting.');
      return;
    }

    appendMessage(activeDocId, 'user', trimmed);
    setChatInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId: activeDocId, question: trimmed }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Query failed');
      }

      appendMessage(activeDocId, 'assistant', result.answer);
      setStatus('Answer generated successfully.');
    } catch (error) {
      appendMessage(activeDocId, 'assistant', error.message);
      setStatus('Query failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!activeDocId) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/clear-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId: activeDocId }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Could not clear chat');
      }

      setChatSessions((prev) => ({ ...prev, [activeDocId]: [] }));
      setStatus('Chat cleared.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Document Chat Bot</h1>
        <p>Upload PDF, DOCX, plain text, or paste a web URL and chat with the document using open-source models.</p>
      </header>

      <section className="panel">
        <form onSubmit={handleIngest}>
          <h2>1. Ingest document</h2>
          <label>
            File upload
            <input type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <label>
            Web link
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/article" />
          </label>
          <label>
            Text content
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste text here" rows="6" />
          </label>
          <button type="submit" disabled={loading}>Ingest Document</button>
        </form>

        {documents.length > 0 && (
          <div className="document-list">
            <h3>Loaded documents</h3>
            {documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className={`doc-chip ${doc.id === activeDocId ? 'active' : ''}`}
                onClick={() => setActiveDocId(doc.id)}
              >
                {doc.source}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="panel chat-panel">
        <div className="chat-header">
          <h2>2. Chat with the document</h2>
          <button type="button" className="secondary" onClick={handleClearChat} disabled={loading || !activeDocId}>
            Clear chat
          </button>
        </div>

        <div className="chat-window">
          {messages.length === 0 ? (
            <div className="empty-state">Upload a document and start asking questions.</div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`bubble ${message.role}`}>
                <strong>{message.role === 'user' ? 'You' : 'Bot'}</strong>
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
            placeholder="Ask anything about the uploaded document"
            disabled={loading || !activeDocId}
          />
          <button type="submit" disabled={loading || !activeDocId}>Send</button>
        </form>
      </section>

      <section className="panel status-panel">
        <h2>Status</h2>
        <p>{status}</p>
      </section>
    </div>
  );
}

export default App;
