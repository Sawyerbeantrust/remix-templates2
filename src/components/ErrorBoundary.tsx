import * as React from 'react';
import { logSystemError } from '../utils/errorLogger.js';

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
    try {
      console.error('Uncaught error in Triton app:', error, errorInfo);
      logSystemError(
        error,
        `React Component Stack: ${errorInfo?.componentStack ? errorInfo.componentStack.slice(0, 300) : 'N/A'}`,
        'React ErrorBoundary',
        error?.stack
      );
    } catch {}
  }

  private handleReload = () => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        window.location.reload();
      }
    } catch {}
  };

  private handleResetAndReload = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('triton_products_db_v3');
        window.localStorage.removeItem('triton_featured_categories_db_v3');
        window.localStorage.removeItem('triton_wishlist_storage');
        window.localStorage.removeItem('triton_cart');
      }
    } catch {}
    this.setState({ hasError: false, error: null });
    this.handleReload();
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'An unexpected rendering error occurred.';
      return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="w-14 h-14 bg-red-600/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold border border-red-500/30">
              !
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black uppercase tracking-wider text-neutral-100">
                Application Reload Required
              </h1>
              <p className="text-xs text-neutral-400">
                A rendering issue occurred. Click Reload to refresh the interface.
              </p>
            </div>
            {errorMsg && (
              <div className="p-3 bg-black/60 rounded-xl text-left border border-neutral-800 text-[11px] font-mono text-red-400 max-h-32 overflow-y-auto break-words">
                {errorMsg}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
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

