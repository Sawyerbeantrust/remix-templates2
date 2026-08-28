import React, { useState } from 'react';
import { Sliders, Save, CheckCircle2, Globe, Shield, Radio } from 'lucide-react';
import { safeLocalStorage } from '../../utils/safeStorage.js';

interface ConfigTabProps {
  theme: 'triton' | 'inospace';
  onThemeChange?: (newTheme: 'triton' | 'inospace') => void;
  autoSyncOnSave: boolean;
  setAutoSyncOnSave: (val: boolean) => void;
  autoCleanInterval: 'disabled' | 'daily' | 'weekly';
  setAutoCleanInterval: (val: 'disabled' | 'daily' | 'weekly') => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({
  theme,
  onThemeChange,
  autoSyncOnSave,
  setAutoSyncOnSave,
  autoCleanInterval,
  setAutoCleanInterval,
  addLog,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveConfig = () => {
    setSaveSuccess(true);
    addLog('Terminal configuration settings saved successfully.', 'success');
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
            <Sliders size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Integration & Terminal System Configuration
            </h3>
            <p className="text-xs text-neutral-400">Manage endpoints, sync preferences, and theme overrides</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveConfig}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Save size={14} />
          <span>Save Settings</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>Configuration saved successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sync Settings */}
        <div className="bg-[#141414] border border-neutral-800 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Catalog Sync & Clean Preferences</h4>

          <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-850">
            <div>
              <p className="text-xs font-bold text-white">Auto-Sync on Product Save</p>
              <p className="text-[11px] text-neutral-400">Automatically push product updates to server catalog</p>
            </div>
            <input
              type="checkbox"
              checked={autoSyncOnSave}
              onChange={(e) => setAutoSyncOnSave(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 space-y-2">
            <p className="text-xs font-bold text-white">Automated Draft Clean Interval</p>
            <select
              value={autoCleanInterval}
              onChange={(e) => setAutoCleanInterval(e.target.value as any)}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white"
            >
              <option value="disabled">Disabled (Manual Cleanup Only)</option>
              <option value="daily">Daily Automatic Draft Purge</option>
              <option value="weekly">Weekly Automatic Draft Purge</option>
            </select>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-[#141414] border border-neutral-800 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Application Branding & Theme</h4>

          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 space-y-2">
            <p className="text-xs font-bold text-white">Interface Theme Mode</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onThemeChange && onThemeChange('triton')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  theme === 'triton'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                <p className="text-xs font-bold uppercase">Triton Premium</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Classic Triton Red & Navy Blue</p>
              </button>

              <button
                type="button"
                onClick={() => onThemeChange && onThemeChange('inospace')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  theme === 'inospace'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                <p className="text-xs font-bold uppercase">Inospace Red</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Commercial Showroom Red Accent</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
