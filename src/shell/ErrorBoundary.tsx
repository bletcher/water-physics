import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Catches render/lifecycle errors anywhere below it and shows a reload prompt
 * instead of a blank page. (Event-handler and async errors aren't caught by
 * React error boundaries — this is a safety net for unexpected render crashes.)
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Water Physics crashed:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="crash" role="alert">
          <div>
            <h1>Something went wrong</h1>
            <p>The water simulation hit an unexpected error.</p>
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
