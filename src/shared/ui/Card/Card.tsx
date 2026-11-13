import React from 'react';
import type { ReactNode } from 'react';
import './Card.css';

/* ========================================
   CARD MAIN COMPONENT
   ======================================== */

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'bordered' | 'filled' | 'outlined';
  accent?: 'primary' | 'success' | 'error' | 'warning' | null;
  interactive?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  accent = null,
  interactive = false,
  onClick,
}) => {
  const classes = [
    'card',
    `card-${variant}`,
    accent && `card-${accent}`,
    interactive && 'card-interactive',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
};

/* ========================================
   CARD HEADER
   ====================================== */

interface CardHeaderProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  title,
  subtitle,
  className = '',
}) => {
  return (
    <div className={`card-header ${className}`}>
      {title && <h3 className="card-header-title">{title}</h3>}
      {subtitle && <p className="card-header-subtitle">{subtitle}</p>}
      {children}
    </div>
  );
};

/* ========================================
   CARD BODY
   ====================================== */

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => {
  return <div className={`card-body ${className}`}>{children}</div>;
};

/* ========================================
   CARD FOOTER
   ====================================== */

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => {
  return <div className={`card-footer ${className}`}>{children}</div>;
};

/* ========================================
   CARD STAT (KPI Card)
   ====================================== */

interface CardStatProps {
  label: string;
  value: string | number;
  change?: {
    value: number | string;
    positive: boolean;
  };
  className?: string;
}

export const CardStat: React.FC<CardStatProps> = ({ label, value, change, className = '' }) => {
  return (
    <div className={`card-stat ${className}`}>
      <div className="card-stat-value">{value}</div>
      <div className="card-stat-label">{label}</div>
      {change && (
        <span className={`card-stat-change ${!change.positive ? 'negative' : ''}`}>
          {change.positive ? '+' : '-'}{change.value}%
        </span>
      )}
    </div>
  );
};

/* ========================================
   CARD HORIZONTAL
   ====================================== */

interface CardHorizontalProps {
  image?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export const CardHorizontal: React.FC<CardHorizontalProps> = ({
  image,
  title,
  subtitle,
  children,
  className = '',
}) => {
  return (
    <div className={`card card-horizontal ${className}`}>
      {image && (
        <div className="card-horizontal-image">
          <img src={image} alt={title} />
        </div>
      )}
      <div className="card-horizontal-content">
        <h4 style={{ margin: 0, marginBottom: '4px' }}>{title}</h4>
        {subtitle && (
          <p style={{ margin: 0, marginBottom: '16px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
};

/* ========================================
   CARD GRID (Helper for layout)
   ====================================== */

interface CardGridProps {
  children: ReactNode;
  className?: string;
}

export const CardGrid: React.FC<CardGridProps> = ({ children, className = '' }) => {
  return <div className={`card-grid ${className}`}>{children}</div>;
};
