import React from "react";
import Navigation from "./Navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Minimal fallback without Navigation - use for root */
  minimal?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.minimal) {
        return (
          <div
            style={{
              minHeight: "100dvh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
              background: "#050509",
              color: "#F5F5F7",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <p style={{ marginBottom: "1rem", color: "#ef4444" }}>Something went wrong.</p>
            <p style={{ fontSize: "0.75rem", color: "#8E8E93", marginBottom: "1.5rem", maxWidth: "20rem", wordBreak: "break-all" }}>
              {this.state.error?.message || "Unknown error"}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                background: "#7c3aed",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Reload
            </button>
          </div>
        );
      }
      return (
        <div className="min-h-screen bg-background pt-14 pb-20 md:pb-0 md:pt-16">
          <Navigation />
          <main className="container max-w-2xl mx-auto px-4 py-6">
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => (window.location.href = "/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Feed
            </Button>
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <p className="text-destructive mb-2">Something went wrong loading this page.</p>
              <p className="text-xs text-muted-foreground mb-4 font-mono max-w-md mx-auto break-all">
                {this.state.error?.message || "Unknown error"}
              </p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
