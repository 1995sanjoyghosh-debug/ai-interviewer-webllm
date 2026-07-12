import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function App() {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [question, setQuestion] = useState('');
  const [docId, setDocId] = useState('');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('Ready to ingest a document.');
  const [loading, setLoading] = useState(false);

  const addMessage = (type, textValue) => {
    setMessages((prev) => [...prev, { type, text: textValue }]);
  };

  const handleIngest = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessages([]);
    setDocId('');

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

      setDocId(result.docId);
      setStatus(`Ready to query document: ${result.source}`);
      addMessage('success', result.message || 'Document ingested successfully.');
    } catch (error) {
      addMessage('error', error.message);
      setStatus('Ingest failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async (event) => {
    event.preventDefault();
    if (!docId) {
      addMessage('error', 'Upload or ingest a document before asking a question.');
      return;
    }

    setLoading(true);
    setMessages([]);

    try {
      const response = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, question }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Query failed');
      }

      addMessage('answer', result.answer);
      if (result.chunks?.length) {
        addMessage('info', `Context chunks used: ${result.chunks.length}`);
      }
      setStatus('Answer generated successfully.');
    } catch (error) {
      addMessage('error', error.message);
      setStatus('Query failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header>
        <h1>RAG Document Summarizer</h1>
        <p>Upload PDF, DOCX, plain text, or paste a web URL to summarize content using open-source models.</p>
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
      </section>

      <section className="panel">
        <form onSubmit={handleQuery}>
          <h2>2. Ask a question or summarize</h2>
          <label>
            Question or summary prompt
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question, or leave blank to summarize." />
          </label>
          <button type="submit" disabled={loading || !docId}>Generate Answer</button>
        </form>
      </section>

      <section className="panel status-panel">
        <h2>Status</h2>
        <p>{status}</p>
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.type}`}>
            <pre>{message.text}</pre>
          </div>
        ))}
      </section>
    </div>
  );
}

export default App;
