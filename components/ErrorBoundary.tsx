import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white font-sans p-4">
          <div className="text-center max-w-md p-8 bg-slate-800 rounded-2xl border border-red-500/30 shadow-2xl">
            <h1 className="text-3xl font-bold font-display text-red-500 mb-4">CRITICAL ERROR</h1>
            <p className="text-slate-300 mb-8">The Helios array has encountered an unexpected system failure.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-8 py-3 bg-red-600 rounded-lg hover:bg-red-500 font-bold transition-all shadow-lg hover:shadow-red-500/25"
            >
              REBOOT SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}