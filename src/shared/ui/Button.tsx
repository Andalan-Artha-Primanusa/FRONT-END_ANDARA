import React from 'react';
import clsx from 'clsx';
import './Button.css';

/* ========================================
   BUTTON TYPES
   ====================================== */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button style variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'danger' | 'warning';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Button content */
  children: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
  /** Icon-only button */
  isIcon?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Block-level button */
  block?: boolean;
  /** Custom className */
  className?: string;
  /** Danger styling (alternative to variant="danger") */
  danger?: boolean;
}

/* ========================================
   BUTTON COMPONENT
   ====================================== */

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  isIcon = false,
  loading = false,
  block = false,
  disabled = false,
  danger = false,
  className,
  ...props
}) => {
  const finalVariant = danger ? 'danger' : variant;
  return (
    <button
      className={clsx(
        'ui-button',
        `ui-button--${finalVariant}`,
        `ui-button--${size}`,
        {
          'ui-button--full-width': fullWidth,
          'ui-button--icon': isIcon,
          'ui-button--loading': loading,
          'ui-button--block': block,
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="ui-button-spinner"></span>
          <span style={{ marginLeft: '4px' }}>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

/* ========================================
   PRIMARY BUTTON
   Main action button
   ====================================== */

export const PrimaryButton: React.FC<ButtonProps> = (props) => (
  <Button variant="primary" {...props} />
);

/* ========================================
   SECONDARY BUTTON
   Secondary action button
   ====================================== */

export const SecondaryButton: React.FC<ButtonProps> = (props) => (
  <Button variant="secondary" {...props} />
);

/* ========================================
   OUTLINE BUTTON
   Bordered button
   ====================================== */

export const OutlineButton: React.FC<ButtonProps> = (props) => (
  <Button variant="outline" {...props} />
);

/* ========================================
   GHOST BUTTON
   Minimal button - text only
   ====================================== */

export const GhostButton: React.FC<ButtonProps> = (props) => (
  <Button variant="ghost" {...props} />
);

/* ========================================
   SUCCESS BUTTON
   For positive actions
   ====================================== */

export const SuccessButton: React.FC<ButtonProps> = (props) => (
  <Button variant="success" {...props} />
);

/* ========================================
   DANGER BUTTON
   For destructive actions
   ====================================== */

export const DangerButton: React.FC<ButtonProps> = (props) => (
  <Button variant="danger" {...props} />
);

/* ========================================
   WARNING BUTTON
   For cautionary actions
   ====================================== */

export const WarningButton: React.FC<ButtonProps> = (props) => (
  <Button variant="warning" {...props} />
);

/* ========================================
   ICON BUTTON
   Square button for icons
   ====================================== */

export const IconButton: React.FC<ButtonProps> = (props) => (
  <Button isIcon {...props} />
);

/* ========================================
   BUTTON GROUP
   Container for multiple buttons
   ====================================== */

export interface ButtonGroupProps {
  children: React.ReactNode;
  direction?: 'horizontal' | 'vertical';
  gap?: 'sm' | 'md' | 'lg';
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  direction = 'horizontal',
  gap = 'md',
}) => {
  const gapMap = {
    sm: '8px',
    md: '12px',
    lg: '16px',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction === 'vertical' ? 'column' : 'row',
        gap: gapMap[gap],
        flexWrap: 'wrap',
      }}
    >
      {children}
    </div>
  );
};
