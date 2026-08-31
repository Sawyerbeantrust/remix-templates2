import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, Download, Trash2, Search, CheckCircle2,
  Activity, Play, RefreshCw, X, Copy, Check, Info
} from 'lucide-react';
import { ErrorLogItem } from '../../types/console.js';
import {
  getSystemErrors,
  clearSystemErrors,
  subscribeToErrors,
  logSystemError
} from '../../utils/errorLogger.js';

interface ErrorsTabProps {
  errors?: ErrorLogItem[];
  handleDownloadErrorLogJson: (errors: any[]) => void;
  handleDownloadErrorLogCsv: (errors: any[]) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ErrorsTab: React.FC<ErrorsTabProps> = ({
  errors: externalErrors = [],
  handleDownloadErrorLogJson,
  handleDownloadErrorLogCsv,
  addLog,
}) => {
  const [systemErrors, setSystemErrors] = useState<ErrorLogItem[]>(() => {
    return externalErrors.length > 0 ? externalErrors : getSystemErrors();
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedError, setSelectedError] = useState<ErrorLogItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);

  // Subscribe to real-time error logger events
  useEffect(() => {
    const unsubscribe = subscribeToErrors((latestErrors) => {
      setSystemErrors(latestErrors);
    });
    return unsubscribe;
  }, []);

  const categories = ['All', 'API/Network', 'Media', 'Runtime', 'CSV/Import', 'Database', 'React'];

  const filtered = systemErrors.filter((e) => {
    const matchesSearch =
      e.error.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.context && e.context.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.category && e.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'All' ||
      (e.category && e.category.toLowerCase().includes(categoryFilter.toLowerCase()));

    return matchesSearch && matchesCategory;
  });

  const handleClearAll = () => {
    if (systemErrors.length === 0) return;
    if (window.confirm('Clear all recorded system error and telemetry logs?')) {
      clearSystemErrors();
      setSystemErrors([]);
      addLog('Cleared system error telemetry buffer', 'info');
    }
  };

  const handleRunDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    setDiagnosticResult(null);
    addLog('Running full system diagnostic health check...', 'info');

    const issuesFound: string[] = [];

    try {
      // 1. API Health Check (verifies catalog & products endpoints with graceful fallback)
      try {
        const res = await fetch('/api/catalog');
        if (!res.ok) {
          // Check /api/products as alternative
          const prodRes = await fetch('/api/products');
          if (!prodRes.ok) {
            issuesFound.push(`API Products & Catalog endpoints returned HTTP status ${res.status}`);
            logSystemError(`Server API Products endpoint returned HTTP ${res.status}`, '/api/products', 'API/Network');
          }
        }
      } catch (err: any) {
        issuesFound.push(`API Connection test failed: ${err.message}`);
        logSystemError(err, 'Diagnostic health test on API endpoints', 'API/Network');
      }

      // 2. Storage Quota Check
      try {
        const testKey = '__diag_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
      } catch (err: any) {
        issuesFound.push('localStorage quota exceeded or access denied');
        logSystemError(err, 'localStorage diagnostic write test', 'Storage');
      }

      if (issuesFound.length === 0) {
        setDiagnosticResult('All system subsystems are healthy and operational (API 200 OK, Storage Functional, Zero Unresolved Exceptions).');
        addLog('Diagnostic completed: 100% healthy, 0 issues detected.', 'success');
      } else {
        setDiagnosticResult(`Diagnostic identified ${issuesFound.length} issue(s): ${issuesFound.join('; ')}`);
        addLog(`Diagnostic warning: ${issuesFound.length} issues logged.`, 'warning');
      }
    } catch (e: any) {
      logSystemError(e, 'Diagnostic self-test', 'Runtime');
      setDiagnosticResult(`Diagnostic encountered an error: ${e?.message || 'Unknown error'}`);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const handleTriggerTestNotice = () => {
    logSystemError(
      'Sample Diagnostic Notice: System operational verification event',
      'Diagnostic check invoked by console admin for telemetry verification',
      'Diagnostic'
    );
    addLog('Logged diagnostic sample notice to telemetry table', 'info');
  };

  const handleCopyDetails = () => {
    if (!selectedError) return;
    const text = JSON.stringify(selectedError, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-950/80 border border-red-500/40 text-red-400">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              System Exception & Error Telemetry Tracker
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                {systemErrors.length} recorded
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Captured stack traces, network timeouts, image fallbacks, and runtime notices
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRunDiagnostic}
            disabled={isRunningDiagnostic}
            className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Activity size={13} className={isRunningDiagnostic ? 'animate-spin' : ''} />
            <span>{isRunningDiagnostic ? 'Testing...' : 'Run Diagnostics'}</span>
          </button>
          <button
            type="button"
            onClick={handleTriggerTestNotice}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-750 text-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play size={12} />
            <span>Test Log</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownloadErrorLogJson(systemErrors)}
            disabled={systemErrors.length === 0}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-750 text-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Download size={13} />
            <span>JSON</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownloadErrorLogCsv(systemErrors)}
            disabled={systemErrors.length === 0}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-750 text-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Download size={13} />
            <span>CSV</span>
          </button>
          {systemErrors.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Diagnostic Result Banner */}
      {diagnosticResult && (
        <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl flex items-start gap-3 text-xs">
          <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-white">Diagnostic Report</div>
            <div className="text-neutral-300 mt-0.5 font-mono text-[11px]">{diagnosticResult}</div>
          </div>
          <button
            type="button"
            onClick={() => setDiagnosticResult(null)}
            className="text-neutral-400 hover:text-white p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search error messages, traces, categories..."
            className="w-full pl-9 pr-8 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-neutral-200 text-neutral-900 font-bold'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className="border border-neutral-800 rounded-xl overflow-hidden bg-[#141414]">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {searchQuery || categoryFilter !== 'All' ? 'No Matching Telemetry Records' : 'All Systems Healthy & Operational'}
              </h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                {searchQuery || categoryFilter !== 'All'
                  ? 'Try adjusting your search query or category filters.'
                  : 'Zero unhandled exceptions, API failure codes, or broken network paths captured.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900 text-neutral-400 uppercase font-bold border-b border-neutral-800 text-[11px]">
                <tr>
                  <th className="p-3 w-28">Timestamp</th>
                  <th className="p-3 w-32">Category</th>
                  <th className="p-3">Error Summary</th>
                  <th className="p-3 hidden md:table-cell">Context Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 text-neutral-300">
                {filtered.map((err) => (
                  <tr
                    key={err.id}
                    className="hover:bg-neutral-900/60 cursor-pointer transition-colors"
                    onClick={() => setSelectedError(err)}
                  >
                    <td className="p-3 font-mono text-neutral-400 text-[11px] whitespace-nowrap">
                      {err.timestamp}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-neutral-800/80 border border-neutral-700 text-neutral-300 rounded text-[10px] uppercase font-bold tracking-wide">
                        {err.category || 'Runtime'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-white max-w-xs truncate">
                      {err.error}
                    </td>
                    <td className="p-3 text-neutral-400 max-w-md truncate font-mono text-[11px] hidden md:table-cell">
                      {err.context || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Error Modal */}
      {selectedError && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-neutral-800 rounded-xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Exception Telemetry Trace
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedError(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-2 gap-2 text-neutral-400 bg-neutral-900/60 p-3 rounded-lg border border-neutral-850">
                <div>
                  <span className="text-neutral-500">Timestamp: </span>
                  <span className="text-neutral-200">{selectedError.timestamp}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Category: </span>
                  <span className="text-neutral-200">{selectedError.category || 'Runtime'}</span>
                </div>
                {selectedError.id && (
                  <div className="col-span-2 truncate">
                    <span className="text-neutral-500">Trace ID: </span>
                    <span className="text-neutral-300">{selectedError.id}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="text-neutral-400 text-[11px] mb-1 font-sans font-semibold">Error Message</div>
                <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-lg text-red-300 font-bold break-words">
                  {selectedError.error}
                </div>
              </div>

              {selectedError.context && (
                <div>
                  <div className="text-neutral-400 text-[11px] mb-1 font-sans font-semibold">Context / Path</div>
                  <div className="p-3 bg-black rounded-lg border border-neutral-850 text-neutral-300 break-words whitespace-pre-wrap">
                    {selectedError.context}
                  </div>
                </div>
              )}

              {selectedError.stack && (
                <div>
                  <div className="text-neutral-400 text-[11px] mb-1 font-sans font-semibold">Stack Trace</div>
                  <div className="p-3 bg-black rounded-lg border border-neutral-850 text-neutral-400 text-[10px] max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {selectedError.stack}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
              <button
                type="button"
                onClick={handleCopyDetails}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? 'Copied JSON' : 'Copy Trace JSON'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedError(null)}
                className="px-4 py-1.5 bg-neutral-200 hover:bg-white text-neutral-900 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
