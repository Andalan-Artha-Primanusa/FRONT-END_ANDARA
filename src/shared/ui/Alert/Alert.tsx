import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import './Alert.css';

/* ========================================
   ALERT COMPONENT
   ======================================== */

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  description?: string | ReactNode;
  children?: ReactNode;
  onClose?: () => void;
  closeable?: boolean;
  filled?: boolean;
  outlined?: boolean;
  icon?: ReactNode;
  showIcon?: boolean;
  actions?: ReactNode;
  className?: string;
}

const ICON_MAP = {
  success: <CheckCircle size={20} />,
  error: <AlertCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />,
};

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  description,
  children,
  onClose,
  closeable = false,
  filled = false,
  outlined = false,
  icon,
  showIcon = true,
  actions,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) {
    return null;
  }

  const classes = [
    'alert',
    `alert-${type}`,
    filled && 'alert-filled',
    outlined && 'alert-outlined',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role="alert">
      {showIcon && (
        <div className="alert-icon">
          {icon || ICON_MAP[type]}
        </div>
      )}

      <div className="alert-content">
        {title && <h4 className="alert-title">{title}</h4>}
        {description && (
          <p className="alert-description">{description}</p>
        )}
        {children && <div className="alert-description">{children}</div>}
        {actions && <div className="alert-actions">{actions}</div>}
      </div>

      {closeable && (
        <button
          className="alert-close-button"
          onClick={handleClose}
          type="button"
          aria-label="Close alert"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
};

/* ========================================
   INLINE ALERT (with less padding)
   ======================================== */

interface InlineAlertProps extends Omit<AlertProps, 'filled' | 'outlined'> {
  variant?: 'filled' | 'outlined';
}

export const InlineAlert: React.FC<InlineAlertProps> = ({
  variant = 'filled',
  ...props
}) => {
  return (
    <Alert
      {...props}
      filled={variant === 'filled'}
      outlined={variant === 'outlined'}
    />
  );
};

/* ========================================
   SUCCESS ALERT (Helper)
   ======================================== */

interface SuccessAlertProps extends Omit<AlertProps, 'type'> {
  message: string;
}

export const SuccessAlert: React.FC<SuccessAlertProps> = ({
  message,
  title = 'Success',
  ...props
}) => {
  return (
    <Alert
      type="success"
      title={title}
      description={message}
      {...props}
    />
  );
};

/* ========================================
   ERROR ALERT (Helper)
   ======================================== */

interface ErrorAlertProps extends Omit<AlertProps, 'type'> {
  message: string | string[];
  title?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  title = 'Error',
  ...props
}) => {
  const isArray = Array.isArray(message);

  return (
    <Alert
      type="error"
      title={title}
      {...props}
    >
      {isArray ? (
        <ul className="alert-list">
          {message.map((msg, idx) => (
            <li key={idx}>{msg}</li>
          ))}
        </ul>
      ) : (
        <p  className="alert-description">{message}</p>
      )}
    </Alert>
  );
};

/* ========================================
   WARNING ALERT (Helper)
   ======================================== */

interface WarningAlertProps extends Omit<AlertProps, 'type'> {
  message: string;
  title?: string;
}

export const WarningAlert: React.FC<WarningAlertProps> = ({
  message,
  title = 'Warning',
  ...props
}) => {
  return (
    <Alert
      type="warning"
      title={title}
      description={message}
      {...props}
    />
  );
};

/* ========================================
   INFO ALERT (Helper)
   ======================================== */

interface InfoAlertProps extends Omit<AlertProps, 'type'> {
  message: string;
  title?: string;
}

export const InfoAlert: React.FC<InfoAlertProps> = ({
  message,
  title = 'Information',
  ...props
}) => {
  return (
    <Alert
      type="info"
      title={title}
      description={message}
      {...props}
    />
  );
};

/* ========================================
   ALERT CONTAINER
   ======================================== */

interface AlertContainerProps {
  children: ReactNode;
  className?: string;
}

export const AlertContainer: React.FC<AlertContainerProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`alert-container ${className}`}>
      {children}
    </div>
  );
};
