'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

/**
 * ToolErrorBoundary — catches runtime errors inside any PDF tool.
 *
 * Wrap any tool's ClientPage with this component. When a tool crashes
 * (e.g. corrupted PDF, unsupported browser API, library exception), the
 * user sees a helpful recovery UI instead of a blank white screen.
 *
 * Usage:
 *   <ToolErrorBoundary toolName="Compress PDF">
 *     <ClientPage />
 *   </ToolErrorBoundary>
 */
export default class ToolErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(`[ToolErrorBoundary] ${this.props.toolName || 'Tool'} crashed:`, error, info);
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const toolName = this.props.toolName || 'This tool';
    const errorMessage = this.state.error?.message || 'An unexpected error occurred.';

    return (
      <div className="tool-error-boundary">
        <div className="tool-error-icon">
          <AlertTriangle size={40} strokeWidth={1.5} />
        </div>
        <h2 className="tool-error-title">Oops — {toolName} ran into a problem</h2>
        <p className="tool-error-desc">
          {errorMessage.length < 120
            ? errorMessage
            : 'Something went wrong while processing your file. This is usually caused by an unsupported or corrupted file.'}
        </p>
        <p className="tool-error-hint">
          Try a different file, refresh the page, or{' '}
          <Link href="/contact" className="tool-error-link">let us know</Link> if the issue persists.
        </p>
        <div className="tool-error-actions">
          <button onClick={this.reset} className="btn-primary tool-error-btn">
            <RefreshCw size={15} />
            Try Again
          </button>
          <Link href="/" className="btn-secondary tool-error-btn">
            <Home size={15} />
            Back to Tools
          </Link>
        </div>
      </div>
    );
  }
}
