import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <h2 className="mb-2 text-lg font-semibold">A aparut o eroare</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {this.state.error?.message ?? "Ceva nu a functionat. Incearca sa reincarci pagina."}
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                Incearca din nou
              </Button>
              <Button size="sm" onClick={() => window.location.reload()}>
                Reincarca pagina
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
