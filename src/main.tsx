import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/routes";
import { ToastProvider } from "@/app/layouts/ToastProvider";
import "./index.css";
import "./shared/styles/submenu-table.css";
import "./shared/styles/ui-accent-fixes.css";
import "./shared/styles/table-standard.css";
import "./shared/styles/andara-button-theme.css";
import "./shared/styles/brand-ui-consistency.css";

const storedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialTheme = storedTheme === 'dark' || storedTheme === 'light'
  ? storedTheme
  : (prefersDark ? 'dark' : 'light');

document.documentElement.dataset.theme = initialTheme;

const isInjectedPerformanceNoise = (error: ErrorEvent | PromiseRejectionEvent) => {
  const message = error instanceof ErrorEvent
    ? error.message
    : String(error.reason?.message ?? error.reason ?? "");
  const stack = error instanceof ErrorEvent
    ? String(error.error?.stack ?? "")
    : String(error.reason?.stack ?? "");

  return (
    message.includes("Cannot read properties of undefined (reading 'startTime')") &&
    (stack.includes("reportAllChanges") || stack.includes("<anonymous>"))
  );
};

window.addEventListener("error", (event) => {
  if (isInjectedPerformanceNoise(event)) {
    event.preventDefault();
  }
}, true);

window.addEventListener("unhandledrejection", (event) => {
  if (isInjectedPerformanceNoise(event)) {
    event.preventDefault();
  }
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      // 🔒 SECURITY: Don't expose error stack traces in production
      const isDev = import.meta.env.DEV;
      
      return (
        <div style={{ padding: 20, color: 'red', fontFamily: "'Poppins', sans-serif" }}>
          <h2>⚠️ Something went wrong</h2>
          <p>An unexpected error occurred. Please refresh the page and try again.</p>
          {isDev && (
            <>
              <hr />
              <details style={{ marginTop: 20, cursor: 'pointer' }}>
                <summary>Error Details (Development Only)</summary>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{this.state.error?.toString()}</pre>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.stack}</pre>
              </details>
            </>
          )}
          <button 
            onClick={() => window.location.href = '/'}
            style={{ marginTop: 20, padding: '8px 16px', cursor: 'pointer' }}
          >
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
