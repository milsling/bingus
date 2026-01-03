import React from "react";
import Navigation from "./Navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface Props {
  children: React.ReactNode;
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
      return (
        <div className="min-h-screen bg-background pt-14 pb-20 md:pb-0 md:pt-16">
          <Navigation />
          <main className="container max-w-2xl mx-auto px-4 py-6">
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => window.location.href = "/"}
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
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
