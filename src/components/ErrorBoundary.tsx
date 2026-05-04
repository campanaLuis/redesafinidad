import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : String(error ?? "Error desconocido");
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Ocurrió un error al cargar esta sección.
          </p>
          {this.state.message && (
            <p className="max-w-sm text-xs text-destructive/80">{this.state.message}</p>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-1 rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
