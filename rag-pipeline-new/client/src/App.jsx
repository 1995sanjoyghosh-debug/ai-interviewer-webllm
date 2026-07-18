import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const sourceModes = ["file", "text", "url"];

function App() {
  const [sourceMode, setSourceMode] = useState("file");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [docId, setDocId] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [messages, setMessages] = useState([]);
  const [citations, setCitations] = useState([]);
  const [usage, setUsage] = useState({
    embedding_tokens: 0,
    completion_tokens: 0,
    estimated_embedding_cost: 0,
    estimated_completion_cost: 0,
    estimated_total_cost: 0,
  });
  const [status, setStatus] = useState("Add a document source to begin.");
  const [loading, setLoading] = useState(false);

  const addMessage = (role, content) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const buildFormData = () => {
    const formData = new FormData();
    if (sourceMode === "file") {
      if (!file) {
        throw new Error("Choose a PDF, DOCX, or text file first.");
      }
      formData.append("file", file);
      return formData;
    }
    if (sourceMode === "text") {
      if (!text.trim()) {
        throw new Error("Paste some document text first.");
      }
      formData.append("text", text.trim());
      return formData;
    }
    if (!url.trim()) {
      throw new Error("Enter a web link first.");
    }
    formData.append("url", url.trim());
    return formData;
  };

  const handleIngest = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessages([]);
    setCitations([]);
    setUsage({
      embedding_tokens: 0,
      completion_tokens: 0,
      estimated_embedding_cost: 0,
      estimated_completion_cost: 0,
      estimated_total_cost: 0,
    });
    setDocId("");
    setDocumentName("");

    try {
      const response = await fetch(`${API_BASE}/api/ingest`, {
        method: "POST",
        body: buildFormData(),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || result.error || "Ingest failed");
      }

      setDocId(result.doc_id);
      setDocumentName(result.source);
      setUsage(result.usage || usage);
      setStatus(`Loaded "${result.source}" with ${result.chunk_count} chunks.`);
      addMessage("assistant", `Document loaded. Ask a question or request a summary.`);
    } catch (error) {
      setStatus("Ingest failed.");
      addMessage("assistant", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async (event) => {
    event.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || loading) {
      return;
    }
    if (!docId) {
      setStatus("Load a document before chatting.");
      return;
    }

    addMessage("user", trimmed);
    setChatInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ doc_id: docId, question: trimmed }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || result.error || "Query failed");
      }

      addMessage("assistant", result.answer);
      setCitations(result.citations || []);
      setUsage(result.usage || usage);
      setStatus("Answer generated.");
    } catch (error) {
      addMessage("assistant", error.message);
      setStatus("Query failed.");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    setMessages([]);
    setCitations([]);
    if (!docId) {
      setStatus("Chat cleared.");
      return;
    }

    try {
      await fetch(`${API_BASE}/api/clear-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ doc_id: docId }),
      });
      setStatus("Chat cleared.");
    } catch {
      setStatus("Local chat cleared. Server history may still exist.");
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">RAG pipeline</p>
          <h1>Document Chat</h1>
        </div>
        <div className="status-pill">{loading ? "Working" : "Ready"}</div>
      </header>

      <section className="workspace">
        <aside className="source-panel">
          <div className="panel-heading">
            <h2>Source</h2>
            <p>{documentName || "No document loaded"}</p>
          </div>

          <form onSubmit={handleIngest} className="source-form">
            <div className="segmented" aria-label="Document source type">
              {sourceModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={sourceMode === mode ? "active" : ""}
                  onClick={() => setSourceMode(mode)}
                  disabled={loading}
                >
                  {mode}
                </button>
              ))}
            </div>

            {sourceMode === "file" && (
              <label className="field">
                <span>Document file</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  disabled={loading}
                />
              </label>
            )}

            {sourceMode === "text" && (
              <label className="field">
                <span>Pasted text</span>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Paste document text here"
                  disabled={loading}
                />
              </label>
            )}

            {sourceMode === "url" && (
              <label className="field">
                <span>Web link</span>
                <input
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/article"
                  disabled={loading}
                />
              </label>
            )}

            <button type="submit" className="primary-action" disabled={loading}>
              {loading ? "Loading..." : "Load document"}
            </button>
          </form>

          <div className="status-block">
            <span>Status</span>
            <p>{status}</p>
          </div>

          <div className="usage-block">
            <h3>Usage</h3>
            <p>Embedding tokens: {usage.embedding_tokens}</p>
            <p>Completion tokens: {usage.completion_tokens}</p>
            <p>Estimated embed cost: ${usage.estimated_embedding_cost.toFixed(6)}</p>
            <p>Estimated completion cost: ${usage.estimated_completion_cost.toFixed(6)}</p>
            <p>Total estimated cost: ${usage.estimated_total_cost.toFixed(6)}</p>
          </div>
        </aside>

        <section className="chat-panel">
          <div className="chat-header">
            <div>
              <h2>Chat</h2>
              <p>{docId ? "Ask about the loaded document." : "Load a source to unlock chat."}</p>
            </div>
            <button
              type="button"
              className="secondary"
              onClick={clearChat}
              disabled={loading || messages.length === 0}
            >
              Clear
            </button>
          </div>

          <div className="chat-window">
            {messages.length === 0 ? (
              <div className="empty-state">No messages yet.</div>
            ) : (
              messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`bubble ${message.role}`}>
                  <span>{message.role === "user" ? "You" : "Bot"}</span>
                  <p>{message.content}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleChat} className="chat-form">
            <input
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask a question or type: summarize this document"
              disabled={loading || !docId}
            />
            <button type="submit" disabled={loading || !docId || !chatInput.trim()}>
              Send
            </button>
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
      </section>
    </main>
  );
}

export default App;
