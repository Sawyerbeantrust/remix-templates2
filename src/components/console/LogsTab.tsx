import React from 'react';
import { Terminal, Download, Trash2, CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { LogEntry } from '../../types/console.js';

interface LogsTabProps {
  logs: LogEntry[];
  filteredLogs: LogEntry[];
  logFilter: 'all' | 'error' | 'warning' | 'info' | 'success';
  setLogFilter: (filter: 'all' | 'error' | 'warning' | 'info' | 'success') => void;
  clearLogs: () => void;
  exportLogsAsText: () => void;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  logs,
  filteredLogs,
  logFilter,
  setLogFilter,
  clearLogs,
  exportLogsAsText,
}) => {
  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
            <Terminal size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Terminal Activity & Sync Stream Logs
            </h3>
            <p className="text-xs text-neutral-400">Live output stream of catalog operations, API calls, and sync events</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
            {(['all', 'info', 'success', 'warning', 'error'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setLogFilter(type)}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded ${
                  logFilter === type ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={exportLogsAsText}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Download size={13} />
            <span>Export</span>
          </button>
          <button
            type="button"
            onClick={clearLogs}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-red-400 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Logs Console Container */}
      <div className="p-4 bg-black border border-neutral-800 rounded-xl max-h-[600px] overflow-y-auto font-mono text-xs space-y-2">
        {filteredLogs.map((log) => {
          const type = log.type || 'info';
          return (
            <div key={log.id} className="flex items-start gap-3 py-1 border-b border-neutral-900 last:border-0">
              <span className="text-neutral-500 shrink-0 select-none">[{log.timestamp}]</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase shrink-0 ${
                  type === 'success'
                    ? 'bg-emerald-950 text-emerald-400'
                    : type === 'warning'
                    ? 'bg-amber-950 text-amber-400'
                    : type === 'error'
                    ? 'bg-red-950 text-red-400'
                    : 'bg-neutral-900 text-neutral-400'
                }`}
              >
                {type}
              </span>
              <span
                className={`flex-1 break-words ${
                  type === 'success'
                    ? 'text-emerald-300'
                    : type === 'warning'
                    ? 'text-amber-300'
                    : type === 'error'
                    ? 'text-red-300'
                    : 'text-neutral-300'
                }`}
              >
                {log.message}
              </span>
            </div>
          );
        })}

        {filteredLogs.length === 0 && (
          <div className="text-center py-8 text-neutral-600">No log entries recorded matching current filter.</div>
        )}
      </div>
    </div>
  );
};
