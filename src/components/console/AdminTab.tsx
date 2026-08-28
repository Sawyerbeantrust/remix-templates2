import React, { useState } from 'react';
import {
  ShieldAlert, Lock, Unlock, KeyRound, Download, Upload,
  AlertTriangle, RefreshCw, Trash2, CheckCircle2, Power, Save
} from 'lucide-react';
import { Product, FeaturedCategory } from '../../types/index.js';
import { ConfirmationDialog } from './ConfirmationDialog.js';

interface AdminTabProps {
  isUnlocked: boolean;
  passcodeInput: string;
  setPasscodeInput: (val: string) => void;
  passcodeError: string;
  passcodeSuccessMessage: string;
  maintenanceModeState: boolean;
  handleVerifyPasscode: (code?: string) => boolean;
  handleUpdatePasscode: (newPasscode: string) => boolean;
  handleToggleMaintenance: (enabled: boolean) => void;
  handleLogout: () => void;
  handleExportFullBackup: () => void;
  handleBackupFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExecuteBackupRestore: () => void;
  backupFile: File | null;
  backupPreview: any | null;
  isRestoring: boolean;
  restoreMessage: string;
  handleResetCatalog: () => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const AdminTab: React.FC<AdminTabProps> = ({
  isUnlocked,
  passcodeInput,
  setPasscodeInput,
  passcodeError,
  passcodeSuccessMessage,
  maintenanceModeState,
  handleVerifyPasscode,
  handleUpdatePasscode,
  handleToggleMaintenance,
  handleLogout,
  handleExportFullBackup,
  handleBackupFileSelect,
  handleExecuteBackupRestore,
  backupFile,
  backupPreview,
  isRestoring,
  restoreMessage,
  handleResetCatalog,
  addLog,
}) => {
  const [newPasscode, setNewPasscode] = useState('');
  const [showResetDefaultsConfirm, setShowResetDefaultsConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-[#141414] border border-neutral-800 rounded-2xl shadow-2xl space-y-5 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-500/40 text-red-400 mx-auto flex items-center justify-center">
          <Lock size={24} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Administrative Passcode Required
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Enter your 4-digit system pin to access high-privilege operations and system backups
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyPasscode();
          }}
          className="space-y-4"
        >
          <input
            type="password"
            placeholder="••••"
            maxLength={8}
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            className="w-full text-center tracking-widest text-lg py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono focus:outline-none focus:border-red-500"
            autoFocus
          />

          {passcodeError && (
            <p className="text-xs font-semibold text-red-400 flex items-center justify-center gap-1">
              <AlertTriangle size={13} /> {passcodeError}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          >
            Authenticate Terminal
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-950/80 border border-red-500/40 text-red-400">
            <Unlock size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Terminal Administration & Critical System Controls
            </h3>
            <p className="text-xs text-neutral-400">
              Authenticated Session • Full website system backups, maintenance mode, and emergency resets
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
        >
          Lock Session
        </button>
      </div>

      {/* Grid: Maintenance Mode & Security Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Maintenance Mode Controller */}
        <div className="bg-[#141414] border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Power className="text-amber-400" size={16} />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Public Maintenance Mode</h4>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            When enabled, visitors to the public storefront are shown a high-converting maintenance page with quote request form while administrators can work freely.
          </p>
          <div className="flex items-center justify-between p-3.5 bg-neutral-950 border border-neutral-850 rounded-xl">
            <span className="text-xs font-bold text-white">
              Status: {maintenanceModeState ? <span className="text-amber-400">ACTIVE</span> : <span className="text-emerald-400">DISABLED (LIVE)</span>}
            </span>
            <button
              type="button"
              onClick={() => handleToggleMaintenance(!maintenanceModeState)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                maintenanceModeState
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              {maintenanceModeState ? 'Turn Off Maintenance' : 'Enable Maintenance'}
            </button>
          </div>
        </div>

        {/* Change Admin Passcode */}
        <div className="bg-[#141414] border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="text-indigo-400" size={16} />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Update Terminal Passcode</h4>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (handleUpdatePasscode(newPasscode)) {
                setNewPasscode('');
              }
            }}
            className="space-y-3"
          >
            <input
              type="password"
              placeholder="Enter new 4+ digit passcode"
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            {passcodeSuccessMessage && (
              <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 size={13} /> {passcodeSuccessMessage}
              </p>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
            >
              Save New Passcode
            </button>
          </form>
        </div>
      </div>

      {/* Full Backup & Restore */}
      <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 space-y-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
          Full System Backup & Disaster Recovery (JSON)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export Box */}
          <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-3">
            <h5 className="text-xs font-bold text-white">Create System Snapshot</h5>
            <p className="text-xs text-neutral-400">
              Download a complete JSON snapshot containing all products, categories, SEO configs, and theme presets.
            </p>
            <button
              type="button"
              onClick={handleExportFullBackup}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
            >
              <Download size={14} /> Export Backup File
            </button>
          </div>

          {/* Import Restore Box */}
          <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-3">
            <h5 className="text-xs font-bold text-white">Restore from Backup</h5>
            <p className="text-xs text-neutral-400">Select a validated JSON backup file to overwrite current state.</p>
            <label className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <Upload size={14} /> Select Backup File
              <input type="file" accept=".json" onChange={handleBackupFileSelect} className="hidden" />
            </label>
          </div>
        </div>

        {/* Restore Preview */}
        {backupPreview && (
          <div className="p-4 bg-indigo-950/30 border border-indigo-500/40 rounded-xl flex items-center justify-between gap-4 animate-in fade-in">
            <div>
              <p className="text-xs font-bold text-white">
                Valid Backup: {backupPreview.products?.length || 0} Products, {backupPreview.featuredCategories?.length || 0} Categories
              </p>
              <p className="text-[11px] text-neutral-400 font-mono">Timestamp: {backupPreview.timestamp}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRestoreConfirm(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow"
            >
              Execute Restore
            </button>
          </div>
        )}

        {restoreMessage && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{restoreMessage}</span>
          </div>
        )}
      </div>

      {/* Emergency Catalog Reset */}
      <div className="p-5 bg-red-950/20 border border-red-900/40 rounded-xl flex items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Reset to Master Defaults</h4>
          <p className="text-xs text-neutral-400 mt-0.5">
            Restores initial factory product stock and categories. Custom changes will be wiped.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowResetDefaultsConfirm(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
        >
          Reset Catalog
        </button>
      </div>

      {/* Confirmation for Restore */}
      <ConfirmationDialog
        isOpen={showRestoreConfirm}
        title="Restore Full System Backup"
        message="This will overwrite current products and categories with the selected backup file. Continue?"
        confirmLabel="Execute Restore"
        isDangerous={true}
        onConfirm={() => {
          handleExecuteBackupRestore();
          setShowRestoreConfirm(false);
        }}
        onCancel={() => setShowRestoreConfirm(false)}
      />

      {/* Confirmation for Defaults Reset */}
      <ConfirmationDialog
        isOpen={showResetDefaultsConfirm}
        title="Reset Catalog to Defaults"
        message="Are you sure you want to reset all products to default master stock? This cannot be undone."
        confirmLabel="Reset to Factory"
        isDangerous={true}
        onConfirm={() => {
          handleResetCatalog();
          setShowResetDefaultsConfirm(false);
        }}
        onCancel={() => setShowResetDefaultsConfirm(false)}
      />
    </div>
  );
};
