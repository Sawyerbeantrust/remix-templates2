import { useState, useCallback } from 'react';
import { LogEntry } from '../../types/console.js';
import { formatTimestamp } from '../../utils/console/formatters.js';

export function useSyncLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'log-init-1',
      timestamp: formatTimestamp(),
      message: 'WooCommerce & WordPress Catalog Sync Service initialized.',
      type: 'info',
    },
    {
      id: 'log-init-2',
      timestamp: formatTimestamp(),
      message: 'Connected to local high-performance cached catalog storage.',
      type: 'success',
    },
  ]);

  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warning' | 'info' | 'success'>('all');

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: formatTimestamp(),
      message,
      type,
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 499)]); // Keep last 500 logs
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([
      {
        id: `log-clear-${Date.now()}`,
        timestamp: formatTimestamp(),
        message: 'Logs buffer cleared by administrator.',
        type: 'info',
      },
    ]);
  }, []);

  const filteredLogs = logs.filter((l) => (logFilter === 'all' ? true : l.type === logFilter));

  const exportLogsAsText = useCallback(() => {
    const content = logs.map((l) => `[${l.timestamp}] [${(l.type || 'info').toUpperCase()}] ${l.message}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `triton-console-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [logs]);

  return {
    logs,
    filteredLogs,
    logFilter,
    setLogFilter,
    addLog,
    clearLogs,
    exportLogsAsText,
  };
}
