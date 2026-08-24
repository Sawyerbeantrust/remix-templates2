import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Prevent benign development WebSocket / HMR and cross-origin Script errors from disrupting the preview in the browser
if (typeof window !== 'undefined') {
  const isWebsocketOrScriptError = (err: any) => {
    if (!err) return false;
    const msg = typeof err === 'string'
      ? err
      : (err.message || err.description || String(err));
    const lower = String(msg || '').toLowerCase();
    return lower.includes('websocket') || 
           lower.includes('failed to connect') ||
           lower.includes('closed without opened') ||
           lower.includes('script error');
  };

  // Override window.onerror directly as some test harnesses and reporting tools hook into it
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    if (isWebsocketOrScriptError(message) || isWebsocketOrScriptError(error) || (!message && lineno === 0)) {
      return true; // Prevents the firing of default event handler and suppresses error reporting
    }
    if (originalOnError) {
      return originalOnError.apply(this, arguments as any);
    }
    return false;
  };

  window.addEventListener('error', (event) => {
    const error = event.error || event.message;
    if (isWebsocketOrScriptError(error) || (!event.message && event.lineno === 0)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason && isWebsocketOrScriptError(reason)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

