import React from 'react';
import clsx from 'clsx';
import './Badge.css';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  className, 
  children, 
  ...props 
}) => {
  return (
    <span
      className={clsx(
        'ui-badge',
        `ui-badge--${variant}`,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
