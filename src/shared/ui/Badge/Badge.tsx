import React from 'react';
import type { ReactNode } from 'react';
import './Badge.css';
import { X } from 'lucide-react';

/* ========================================
   BADGE COMPONENT
   Status indicator / label component
   ======================================== */

interface BadgeProps {
  children: ReactNode;
  variant?:
    | 'primary'
    | 'success'
    | 'error'
    | 'warning'
    | 'info'
    | 'default';
  solid?: boolean;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'default' | 'pill' | 'rounded';
  icon?: ReactNode;
  dot?: boolean;
  outlined?: boolean;
  closeable?: boolean;
  onClose?: () => void;
  pulse?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  solid = false,
  size = 'md',
  shape = 'default',
  icon,
  dot = false,
  outlined = false,
  closeable = false,
  onClose,
  pulse = false,
  className = '',
}) => {
  const classes = [
    'badge',
    `badge-${variant}${solid ? '-solid' : ''}`,
    `badge-${size}`,
    `badge-${shape}`,
    dot && 'badge-dot',
    outlined && 'badge-outlined',
    pulse && 'badge-pulse',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {icon && <span className="badge-icon">{icon}</span>}
      <span>{children}</span>
      {closeable && (
        <button
          className="badge-close-button"
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          type="button"
          aria-label="Remove badge"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
};

/* ========================================
   BADGE GROUP
   Container for multiple badges
   ======================================== */

interface BadgeGroupProps {
  children: ReactNode;
  className?: string;
  vertical?: boolean;
}

export const BadgeGroup: React.FC<BadgeGroupProps> = ({
  children,
  className = '',
  vertical = false,
}) => {
  const classes = [
    'badge-group',
    vertical && 'badge-group-vertical',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{children}</div>;
};

/* ========================================
   STATUS BADGE (Helper component)
   Common status indicators
   ======================================== */

interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'active' | 'inactive';
  className?: string;
  solid?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<string, { variant: BadgeProps['variant']; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  approved: { variant: 'success', label: 'Approved' },
  rejected: { variant: 'error', label: 'Rejected' },
  completed: { variant: 'success', label: 'Completed' },
  cancelled: { variant: 'default', label: 'Cancelled' },
  active: { variant: 'success', label: 'Active' },
  inactive: { variant: 'default', label: 'Inactive' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  solid = true,
  size = 'md',
  className = '',
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <Badge
      variant={config.variant}
      solid={solid}
      size={size}
      dot
      className={className}
    >
      {config.label}
    </Badge>
  );
};

/* ========================================
   LABEL BADGE (Helper component)
   For tags / labels
   ======================================== */

interface LabelBadgeProps {
  label: string;
  onRemove?: () => void;
  color?: 'primary' | 'success' | 'error' | 'warning' | 'info' | 'default';
  className?: string;
}

export const LabelBadge: React.FC<LabelBadgeProps> = ({
  label,
  onRemove,
  color = 'primary',
  className = '',
}) => {
  return (
    <Badge
      variant={color}
      size="md"
      shape="pill"
      closeable={!!onRemove}
      onClose={onRemove}
      className={className}
    >
      {label}
    </Badge>
  );
};
