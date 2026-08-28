import { ErrorLogItem } from '../types/console.js';
import { safeLocalStorage } from './safeStorage.js';

const STORAGE_KEY = 'triton_system_errors_telemetry';
const MAX_ERRORS = 150;

type ErrorListener = (errors: ErrorLogItem[]) => void;
const listeners: Set<ErrorListener> = new Set();

let inMemoryErrors: ErrorLogItem[] = [];

// Initialize from safeLocalStorage
function loadStoredErrors(): ErrorLogItem[] {
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[ErrorLogger] Failed to load stored errors:', e);
  }
  return [];
}

inMemoryErrors = loadStoredErrors();

function persistErrors() {
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryErrors.slice(0, MAX_ERRORS)));
  } catch (e) {
    console.warn('[ErrorLogger] Failed to persist errors:', e);
  }
}

function notifyListeners() {
  const current = [...inMemoryErrors];
  listeners.forEach((listener) => {
    try {
      listener(current);
    } catch (e) {
      console.error('[ErrorLogger] Listener error:', e);
    }
  });
}

// Log a system error with deduplication within 2 seconds
const recentErrorTimestamps = new Map<string, number>();

export function logSystemError(
  error: Error | string,
  context?: string,
  category: string = 'Runtime',
  stack?: string
): ErrorLogItem {
  const errorMsg = typeof error === 'string' ? error : error?.message || 'Unknown exception';
  const errorStack = stack || (typeof error === 'object' && error?.stack ? error.stack : undefined);
  const now = new Date();
  const timeStr = now.toLocaleTimeString();

  // Deduplicate identical error within 2 seconds
  const dedupKey = `${category}:${errorMsg}:${context || ''}`;
  const lastTime = recentErrorTimestamps.get(dedupKey);
  const nowMs = Date.now();
  if (lastTime && nowMs - lastTime < 2000) {
    return inMemoryErrors[0] || {
      id: `err-${nowMs}`,
      timestamp: timeStr,
      error: errorMsg,
      context,
      category,
      stack: errorStack,
    };
  }
  recentErrorTimestamps.set(dedupKey, nowMs);

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
  try {
    safeLocalStorage.removeItem(STORAGE_KEY);
  } catch {}
  notifyListeners();
}

export function subscribeToErrors(listener: ErrorListener): () => void {
  listeners.add(listener);
  listener([...inMemoryErrors]);
  return () => {
    listeners.delete(listener);
  };
}

// Global Browser Uncaught Handlers Initialization
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Ignore harmless benign resize/vite hmr warnings
    if (
      event.message?.includes('ResizeObserver') ||
      event.message?.includes('failed to connect to websocket') ||
      event.message?.includes('Script error.')
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

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || 'Unhandled Promise Rejection';
    if (msg.includes('ResizeObserver') || msg.includes('failed to connect to websocket')) {
      return;
    }
    logSystemError(
      msg,
      typeof reason === 'object' && reason !== null ? JSON.stringify(reason) : undefined,
      'Promise/Async',
      reason?.stack
    );
  });
}
