"use client";

import React, { ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;

  fallback?: ReactNode;

  onError?: (
    error: Error,
    errorInfo: ErrorInfo,
    errorId: string
  ) => void;

  allowRetry?: boolean;

  allowReload?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;

  error: Error | null;

  errorId: string | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(
    error: Error
  ): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorId: crypto.randomUUID(),
    };
  }

  componentDidCatch(
    error: Error,
    errorInfo: ErrorInfo
  ) {
    console.error("Application Error", {
      error,
      errorInfo,
      id: this.state.errorId,
    });

    this.props.onError?.(
      error,
      errorInfo,
      this.state.errorId ?? "unknown"
    );
  }

  private retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <section
        role="alert"
        aria-live="assertive"
        className="flex min-h-[450px] items-center justify-center p-8"
      >
        <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">

          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl dark:bg-red-900/30">
            ⚠️
          </div>

          <h2 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-white">
            Something went wrong
          </h2>

          <p className="mb-6 text-zinc-600 dark:text-zinc-400">
            An unexpected error occurred while rendering this
            page.
          </p>

          {process.env.NODE_ENV === "development" &&
            this.state.error && (
              <div className="mb-6 overflow-auto rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-800">
                <p className="font-semibold text-red-600">
                  {this.state.error.name}
                </p>

                <p className="mt-2 break-words text-zinc-700 dark:text-zinc-300">
                  {this.state.error.message}
                </p>
              </div>
            )}

          {this.state.errorId && (
            <p className="mb-6 text-xs text-zinc-500">
              Error ID: {this.state.errorId}
            </p>
          )}

          <div className="flex flex-wrap gap-3">

            {this.props.allowRetry !== false && (
              <button
                onClick={this.retry}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-700"
              >
                Try Again
              </button>
            )}

            {this.props.allowReload !== false && (
              <button
                onClick={this.reload}
                className="rounded-lg border border-zinc-300 px-5 py-2.5 font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Reload Page
              </button>
            )}

          </div>

          <p className="mt-8 text-sm text-zinc-500">
            If this issue continues, please contact support and
            provide the error ID above.
          </p>

        </div>
      </section>
    );
  }
}

export default ErrorBoundary;