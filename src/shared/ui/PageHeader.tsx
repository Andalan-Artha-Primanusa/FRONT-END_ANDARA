import React from 'react';
import type { LucideIcon } from 'lucide-react';
import CompanyScopeBadge from '@/shared/components/CompanyScopeBadge';
import './PageHeader.css';

export interface PageHeaderBadge {
  icon?: LucideIcon | React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: PageHeaderBadge | React.ReactNode;
  scope?: boolean;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  scope,
  actions,
  children,
  className = '',
  style,
}) => {
  let badgeNode: React.ReactNode = null;

  if (badge && typeof badge === 'object' && !React.isValidElement(badge) && 'label' in badge) {
    const { icon: BadgeIcon, label } = badge as PageHeaderBadge;
    badgeNode = (
      <span className="page-hero-badge">
        {BadgeIcon && <BadgeIcon size={15} />}
        <span>{label}</span>
      </span>
    );
  } else if (badge) {
    badgeNode = <span className="page-hero-badge">{badge}</span>;
  }

  return (
    <header className={`page-hero ${className}`} style={style}>
      <span className="page-hero-glow" aria-hidden="true" />
      <div className="page-hero-inner">
        <div className="page-hero-copy">
          {badgeNode}
          <h1 className="page-hero-title">{title}</h1>
          {subtitle && <p className="page-hero-subtitle">{subtitle}</p>}
          {scope && (
            <div className="page-hero-scope">
              <CompanyScopeBadge />
            </div>
          )}
        </div>
        {actions && <div className="page-hero-actions">{actions}</div>}
      </div>
      {children && <div className="page-hero-children">{children}</div>}
    </header>
  );
};

export default PageHeader;
