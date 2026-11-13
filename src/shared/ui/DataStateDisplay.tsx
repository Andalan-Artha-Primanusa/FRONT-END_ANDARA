import React from "react";
import { AlertTriangle, Inbox, RefreshCw, ArrowLeft } from "lucide-react";
import { Button, type ButtonProps } from "./Button";
import "./DataStateDisplay.css";

/* ============================================ */
/* Loading State */
/* ============================================ */

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading data...",
}) => {
  return (
    <div className="data-state-container loading-state">
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
      <p className="state-message">{message}</p>
    </div>
  );
};

/* ============================================ */
/* Error State */
/* ============================================ */

interface ErrorStateProps {
  message?: string;
  error?: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "Something went wrong",
  error,
  onRetry,
  onBack,
}) => {
  return (
    <div className="data-state-container error-state">
      <div className="error-icon" aria-hidden="true">
        <AlertTriangle size={34} />
      </div>
      <h3 className="state-title">{message}</h3>
      {error && <p className="error-details">{error}</p>}
      <div className="state-actions">
        {onRetry && (
          <Button variant="primary" size="md" onClick={onRetry}>
            <RefreshCw size={16} />
            Retry
          </Button>
        )}
        {onBack && (
          <Button variant="outline" size="md" onClick={onBack}>
            <ArrowLeft size={16} />
            Go Back
          </Button>
        )}
      </div>
    </div>
  );
};

/* ============================================ */
/* Empty State */
/* ============================================ */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: ButtonProps['variant'];
  actionClassName?: string;
  actionStyle?: React.CSSProperties;
  actionPlainButton?: boolean;
  onBack?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <Inbox size={34} />,
  title = "No data found",
  message = "There's nothing here yet",
  actionLabel,
  onAction,
  actionVariant = "primary",
  actionClassName,
  actionStyle,
  actionPlainButton = false,
  onBack,
}) => {
  return (
    <div className="data-state-container empty-state">
      <div className="empty-icon" aria-hidden="true">
        {icon}
      </div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
      <div className="state-actions">
        {actionLabel && onAction && (
          actionPlainButton ? (
            <button
              type="button"
              className={actionClassName}
              style={{
                height: '40px',
                padding: '0 16px',
                borderRadius: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                ...actionStyle,
              }}
              onClick={onAction}
            >
              {actionLabel}
            </button>
          ) : (
            <Button variant={actionVariant} className={actionClassName} style={actionStyle} size="md" onClick={onAction}>
              {actionLabel}
            </Button>
          )
        )}
        {onBack && (
          <Button variant="outline" size="md" onClick={onBack}>
            <ArrowLeft size={16} />
            Go Back
          </Button>
        )}
      </div>
    </div>
  );
};

/* ============================================ */
/* Success State Wrapper */
/* ============================================ */

interface SuccessStateProps {
  children: React.ReactNode;
}

export const SuccessState: React.FC<SuccessStateProps> = ({ children }) => {
  return <div className="success-state">{children}</div>;
};

/* ============================================ */
/* Conditional Renderer */
/* ============================================ */

interface DataStateDisplayProps {
  state: "idle" | "loading" | "success" | "error" | "empty";
  children?: React.ReactNode;
  loading?: React.ReactNode;
  error?: React.ReactNode | string;
  empty?: React.ReactNode | string;
  onRetry?: () => void;
  onBack?: () => void;
}

export const DataStateDisplay: React.FC<DataStateDisplayProps> = ({
  state,
  children,
  loading,
  error,
  empty,
  onRetry,
  onBack,
}) => {
  switch (state) {
    case "loading":
      return loading || <LoadingState />;

    case "error": {
      const errorMessage = typeof error === "string" ? error : undefined;
      return React.isValidElement(error) ? (
        error
      ) : (
        <ErrorState
          message={errorMessage || "Failed to load data"}
          onRetry={onRetry}
          onBack={onBack}
        />
      );
    }

    case "empty": {
      const emptyMessage = typeof empty === "string" ? empty : undefined;
      return React.isValidElement(empty) ? (
        empty
      ) : (
        <EmptyState message={emptyMessage} onBack={onBack} />
      );
    }

    case "success":
    case "idle":
      return <SuccessState>{children}</SuccessState>;

    default:
      return null;
  }
};

export default {
  LoadingState,
  ErrorState,
  EmptyState,
  SuccessState,
  DataStateDisplay,
};
