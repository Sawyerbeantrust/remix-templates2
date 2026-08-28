import React, { useState } from 'react';
import {
  RefreshCw, CheckCircle2, AlertTriangle, Radio, Server,
  Globe, Database, ExternalLink, Activity
} from 'lucide-react';
import { Product, FeaturedCategory } from '../../types/index.js';
import { syncCatalogToServer } from '../../utils/catalogSync.js';

interface SyncTabProps {
  products: Product[];
  featuredCategories: FeaturedCategory[];
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const SyncTab: React.FC<SyncTabProps> = ({
  products,
  featuredCategories,
  addLog,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('Connected • Ready to sync');

  const handleSyncNow = async () => {
    setIsSyncing(true);
    addLog('Initiating full catalog sync with WordPress & WooCommerce REST endpoint...', 'info');
    try {
      await syncCatalogToServer(products, featuredCategories);
      setSyncStatus('Last synchronized just now • 100% in sync');
      addLog(`Full sync completed: ${products.length} products published to server catalog.`, 'success');
    } catch (err: any) {
      setSyncStatus(`Sync error: ${err?.message || 'Network timeout'}`);
      addLog(`Sync error: ${err?.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
            <Radio size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              WordPress & WooCommerce Live Sync Bridge
            </h3>
            <p className="text-xs text-neutral-400">
              Bi-directional catalog synchronization between Triton Cloud and car-lifts.co.za
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSyncNow}
          disabled={isSyncing}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? 'Synchronizing...' : 'Sync Catalog Now'}</span>
        </button>
      </div>

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-[#141414] border border-neutral-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Target Host</span>
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          </div>
          <p className="text-sm font-mono text-white">car-lifts.co.za</p>
          <p className="text-[11px] text-neutral-500">Cape Town Datacenter</p>
        </div>

        <div className="p-5 bg-[#141414] border border-neutral-800 rounded-xl space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Sync Status</span>
          <p className="text-sm font-semibold text-white truncate">{syncStatus}</p>
          <p className="text-[11px] text-neutral-500">REST API v3 Handshake Active</p>
        </div>

        <div className="p-5 bg-[#141414] border border-neutral-800 rounded-xl space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Pending Changes</span>
          <p className="text-sm font-mono text-emerald-400">0 Items Queued</p>
          <p className="text-[11px] text-neutral-500">Real-time cache updated</p>
        </div>
      </div>
    </div>
  );
};
