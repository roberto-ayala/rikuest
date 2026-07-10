import { Component } from 'react';
import { reportError } from '../utils/errorHandler.js';

/**
 * Catches render-time errors so a component crash shows a recoverable
 * screen instead of a white page.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    try {
      reportError(error?.message || String(error), info?.componentStack || '');
    } catch {
      // reporting must never crash the boundary itself
    }
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <pre className="max-w-xl overflow-auto text-sm text-red-500 whitespace-pre-wrap">
          {this.state.error?.message || String(this.state.error)}
        </pre>
        <button
          onClick={this.handleReload}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
        >
          Reload
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
