import React from 'react';
import type { LucideIcon } from 'lucide-react';
import './CardHeader.css';

interface CardHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  iconColor?: string;
  iconBgColor?: string;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  iconColor = 'var(--color-primary-dark)',
  iconBgColor = 'var(--color-primary-light)',
  className = '',
}) => {
  return (
    <div className={`card-header ${className}`}>
      {Icon && (
        <div
          className="card-header-icon-wrapper"
          style={{
            color: iconColor,
            backgroundColor: iconBgColor,
          }}
        >
          <Icon size={24} />
        </div>
      )}
      <div className="card-header-content">
        <h2 className="card-header-title">{title}</h2>
        {subtitle && <p className="card-header-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
};

export default CardHeader;
