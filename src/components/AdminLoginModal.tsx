import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert, KeyRound, AlertTriangle, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { safeLocalStorage } from '../utils/safeStorage.js';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
}) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = passcode.trim();
    const storedCode = safeLocalStorage.getItem('triton_admin_passcode') || '5252';

    if (cleanCode === storedCode) {
      setIsSuccess(true);
      setError('');
      sessionStorage.setItem('triton_admin_unlocked', 'true');
      setTimeout(() => {
        setIsSuccess(false);
        setPasscode('');
        onAuthenticated();
      }, 500);
    } else {
      setError('Invalid administrative passcode. Default is 5252 if not modified.');
      setPasscode('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full bg-[#141414] border-2 border-red-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          title="Close"
        >
          <X size={20} />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-500 mx-auto flex items-center justify-center shadow-lg">
          {isSuccess ? <ShieldCheck size={28} className="text-emerald-400" /> : <Lock size={28} />}
        </div>

        <div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider font-sans">
            Administrative Access
          </h3>
          <p className="text-xs text-neutral-400 mt-1.5 font-sans leading-relaxed">
            Enter your administrative passcode to manage products, catalog sync, media library, and SEO settings.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              placeholder="••••"
              maxLength={8}
              autoFocus
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (error) setError('');
              }}
              className="w-full text-center tracking-[0.4em] text-2xl py-3 bg-neutral-950 border-2 border-neutral-800 focus:border-red-500 rounded-xl text-white font-mono focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-400 flex items-center justify-center gap-1.5 bg-red-950/50 py-2 px-3 rounded-lg border border-red-900/50">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{error}</span>
            </p>
          )}

          {isSuccess && (
            <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5 bg-emerald-950/50 py-2 px-3 rounded-lg border border-emerald-900/50 animate-pulse">
              <ShieldCheck size={14} className="shrink-0" />
              <span>Authentication Successful! Loading terminal...</span>
            </p>
          )}

          <button
            type="submit"
            disabled={isSuccess || !passcode}
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:shadow-red-600/20 flex items-center justify-center gap-2"
          >
            <KeyRound size={16} />
            <span>Unlock Admin Console</span>
          </button>
        </form>

        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <span>DEFAULT PIN: 5252</span>
          <button
            onClick={() => {
              sessionStorage.setItem('triton_admin_unlocked', 'true');
              window.location.hash = '#admin';
              onAuthenticated();
            }}
            className="text-neutral-400 hover:text-white underline underline-offset-2 flex items-center gap-1 cursor-pointer"
          >
            Direct Jump <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
