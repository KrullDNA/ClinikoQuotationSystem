import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to main process
    try {
      window.api.logError(`${error.message}\n${errorInfo?.componentStack || ''}\n${error.stack || ''}`);
    } catch (e) {
      // Fail silently
    }
  }

  handleCopyError() {
    const { error, errorInfo } = this.state;
    const details = [
      `Error: ${error?.message || 'Unknown error'}`,
      `Stack: ${error?.stack || 'N/A'}`,
      `Component: ${errorInfo?.componentStack || 'N/A'}`,
      `Time: ${new Date().toISOString()}`
    ].join('\n\n');

    navigator.clipboard.writeText(details).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 mb-6">
              Please restart the app. If the problem persists, copy the error details and contact support.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.handleCopyError()}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium
                           hover:bg-slate-200 transition-colors"
              >
                Copy Error Details
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium
                           hover:bg-brand-800 transition-colors"
              >
                Restart App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
