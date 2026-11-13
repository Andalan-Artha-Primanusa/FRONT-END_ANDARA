import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import './Alert.css';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertProps {
  type?: AlertType;
  variant?: AlertType;
  message?: string;
  title?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  showIcon?: boolean;
  dismissible?: boolean;
}

const alertIcons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
};

export const Alert: React.FC<AlertProps> = ({
  type,
  variant,
  message,
  title,
  children,
  onClose,
  showIcon = true,
  dismissible = false,
}) => {
  const alertType = type || variant || 'info';
  const Icon = alertIcons[alertType];
  const content = children || message || title;

  return (
    <div className={`ui-alert ui-alert-${alertType}`}>
      {showIcon && <Icon size={20} className="ui-alert-icon" />}
      <span className="ui-alert-message">{content}</span>
      {dismissible && onClose && (
        <button className="ui-alert-close" onClick={onClose}>
          <X size={18} />
        </button>
      )}
    </div>
  );
};

export default Alert;
