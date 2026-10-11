import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
          <div style={{ maxWidth: 480 }}>
            <h1 style={{ fontSize: 18, margin: "0 0 8px" }}>Something went wrong on this screen</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>{String(this.state.error.message || this.state.error)}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ background: "#0f6f8c", color: "#fff", border: 0, borderRadius: 10, padding: "8px 14px", fontWeight: 600, cursor: "pointer" }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
