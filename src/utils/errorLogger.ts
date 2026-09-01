import { ErrorLogItem } from '../types/console.js';
import { safeLocalStorage } from './safeStorage.js';

const STORAGE_KEY = 'triton_system_errors_telemetry';
const MAX_ERRORS = 50;

type ErrorListener = (errors: ErrorLogItem[]) => void;
const listeners: Set<ErrorListener> = new Set();

let inMemoryErrors: ErrorLogItem[] = [];

// Initialize from safeLocalStorage
function loadStoredErrors(): ErrorLogItem[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, MAX_ERRORS);
      }
    }
  } catch (e) {
    // Silent recovery
  }
  return [];
}

inMemoryErrors = loadStoredErrors();

function persistErrors() {
  try {
    if (typeof window === 'undefined') return;
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryErrors.slice(0, MAX_ERRORS)));
  } catch {}
}

function notifyListeners() {
  const current = [...inMemoryErrors];
  listeners.forEach((listener) => {
    try {
      listener(current);
    } catch {}
  });
}

// Check if an error message/context looks like an HTTP access log (e.g. GET /src/... 304/200, vite logs)
function isAccessOrInfoLog(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  // Match HTTP verbs + status codes (200, 304, etc.) or Vite request logs
  if (/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\//i.test(text.trim())) return true;
  if (/\b(200|304|204)\s+\d+(\.\d+)?\s*ms\b/i.test(text)) return true;
  if (text.includes('[vite]') || text.includes('failed to connect to websocket') || text.includes('ResizeObserver')) return true;
  if (text.includes('INFO:') || text.includes('304') && text.includes('GET')) return true;
  return false;
}

// Log a system error with strict deduplication and validation
const recentErrorSignatures = new Set<string>();

export function logSystemError(
  error: Error | string,
  context?: string,
  category: string = 'Runtime',
  stack?: string
): ErrorLogItem | null {
  const errorMsg = typeof error === 'string' ? error : error?.message || 'Unknown runtime exception';
  const errorStack = stack || (typeof error === 'object' && error?.stack ? error.stack : undefined);

  // Reject access logs, 304s, benign Vite info lines
  if (isAccessOrInfoLog(errorMsg) || (context && isAccessOrInfoLog(context))) {
    return null;
  }

  // Generate deduplication signature
  const sig = `${category}::${errorMsg}::${context || ''}`;
  if (recentErrorSignatures.has(sig) || inMemoryErrors.some(e => e.error === errorMsg && e.category === category && e.context === context)) {
    return inMemoryErrors[0] || null;
  }
  recentErrorSignatures.add(sig);

  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  const nowMs = Date.now();

  const newError: ErrorLogItem = {
    id: `err-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: timeStr,
    error: errorMsg,
    context: context || (typeof error === 'object' && (error as any)?.name ? `Name: ${(error as any).name}` : undefined),
    category,
    stack: errorStack,
  };

  inMemoryErrors = [newError, ...inMemoryErrors.slice(0, MAX_ERRORS - 1)];
  persistErrors();
  notifyListeners();
  return newError;
}

export function getSystemErrors(): ErrorLogItem[] {
  return [...inMemoryErrors];
}

export function clearSystemErrors(): void {
  inMemoryErrors = [];
  recentErrorSignatures.clear();
  try {
    if (typeof window !== 'undefined') {
      safeLocalStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
  notifyListeners();
}

export function subscribeToErrors(listener: ErrorListener): () => void {
  listeners.add(listener);
  try {
    listener([...inMemoryErrors]);
  } catch {}
  return () => {
    listeners.delete(listener);
  };
}

// Global Browser Uncaught Handlers Initialization
if (typeof window !== 'undefined') {
  // Catch genuine unhandled runtime window error events
  window.addEventListener('error', (event) => {
    // Ignore harmless benign resize/vite hmr warnings or script loading logs
    if (
      !event.message ||
      event.message.includes('ResizeObserver') ||
      event.message.includes('failed to connect to websocket') ||
      event.message.includes('Script error.') ||
      isAccessOrInfoLog(event.message)
    ) {
      return;
    }
    logSystemError(
      event.error || event.message || 'Window Script Exception',
      `File: ${event.filename || 'unknown'}:${event.lineno || 0}:${event.colno || 0}`,
      'Runtime',
      event.error?.stack
    );
  });

  // Catch genuine unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || 'Unhandled Promise Rejection';
    if (!msg || msg.includes('ResizeObserver') || msg.includes('failed to connect to websocket') || isAccessOrInfoLog(msg)) {
      return;
    }
    logSystemError(
      msg,
      typeof reason === 'object' && reason !== null ? (reason.stack || JSON.stringify(reason)) : undefined,
      'Promise/Async',
      reason?.stack
    );
  });
}

