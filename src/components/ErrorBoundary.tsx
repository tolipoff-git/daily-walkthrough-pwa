import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAll = () => {
    try {
      localStorage.removeItem('ehs_active_session_v1');
      sessionStorage.clear();
      if (typeof window !== 'undefined' && window.indexedDB) {
        indexedDB.deleteDatabase('EHS_Walkthrough_DB');
      }
    } catch (e) {
      console.warn('Reset error:', e);
    }
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      const isRu = typeof navigator !== 'undefined' && (navigator.language?.startsWith('ru') || localStorage.getItem('ehs_walkthrough_lang') === 'ru');
      
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-rose-500 selection:text-white">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
              {isRu ? 'Произошла непредвиденная ошибка' : 'An Unexpected Error Occurred'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              {isRu
                ? 'Интерфейс приложения восстанавливается. Вы можете перезагрузить страницу или сбросить локальный кэш сессии.'
                : 'The application encountered an unexpected state. You can reload the page or reset the local session cache.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-950/50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isRu ? 'Перезагрузить страницу' : 'Reload Page'}</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAll}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 border border-rose-900/40 font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isRu ? 'Сбросить кэш сессии' : 'Reset Session Cache'}</span>
              </button>
            </div>

            {this.state.error && (
              <details className="text-left bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 overflow-x-auto">
                <summary className="cursor-pointer font-mono font-bold text-slate-300 hover:text-white">
                  {isRu ? 'Технические детали ошибки' : 'Technical Error Details'}
                </summary>
                <p className="mt-2 text-rose-400 font-mono break-all">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-2 text-[10px] text-slate-500 font-mono whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
