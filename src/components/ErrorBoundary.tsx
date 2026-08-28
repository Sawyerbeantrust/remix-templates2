import * as React from 'react';
import { logSystemError } from '../utils/errorLogger.js';
import { safeLocalStorage } from '../utils/safeStorage.js';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in Triton app:', error, errorInfo);
    try {
      logSystemError(
        error,
        `React Component Stack: ${errorInfo.componentStack?.slice(0, 300) || 'N/A'}`,
        'React ErrorBoundary',
        error.stack
      );
    } catch {}
  }

  private handleReset = () => {
    try {
      safeLocalStorage.removeItem('triton_products_db_v3');
      safeLocalStorage.removeItem('triton_featured_categories_db_v3');
      safeLocalStorage.removeItem('triton_wishlist_storage');
      safeLocalStorage.removeItem('triton_cart');
    } catch {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="w-14 h-14 bg-red-600/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold border border-red-500/30">
              !
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black uppercase tracking-wider text-slate-100">
                Application Reload Required
              </h1>
              <p className="text-xs text-slate-400">
                A rendering issue occurred. Click below to restore standard catalog settings and reload the preview.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="p-3 bg-black/50 rounded-xl text-left border border-slate-800 text-[11px] font-mono text-red-400 max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Refresh Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-red-600/20"
              >
                Reset & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
