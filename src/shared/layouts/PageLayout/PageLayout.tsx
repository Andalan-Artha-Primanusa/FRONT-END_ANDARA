import React from 'react';
import './PageLayout.css';

/* ========================================
   PAGE LAYOUT TYPES
   ====================================== */

export interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: Array<{
    label: string;
    href?: string;
  }>;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  layout?: 'default' | 'grid' | 'full';
}

export interface PageFooterProps {
  children?: React.ReactNode;
  pagination?: React.ReactNode;
  info?: string;
  className?: string;
}

export interface PageEmptyProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export interface PageLoadingProps {
  message?: string;
}

/* ========================================
   PAGE LAYOUT - Main Container
   ====================================== */

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  className = '',
}) => {
  return <div className={`page-layout ${className}`}>{children}</div>;
};

/* ========================================
   PAGE HEADER - Header with Title & Actions
   ====================================== */

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumb,
  actions,
  children,
  className = '',
}) => {
  return (
    <div className={`page-header ${className}`}>
      {breadcrumb && breadcrumb.length > 0 && (
        <p className="page-breadcrumb">
          {breadcrumb.map((item, index) => (
            <React.Fragment key={index}>
              {item.href ? (
                <a href={item.href}>{item.label}</a>
              ) : (
                <span>{item.label}</span>
              )}
              {index < breadcrumb.length - 1 && <span>/</span>}
            </React.Fragment>
          ))}
        </p>
      )}

      <div className="page-header-top">
        <div className="page-header-content">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>

      {children && <div className="page-filters">{children}</div>}
    </div>
  );
};

/* ========================================
   PAGE CONTENT - Body Container
   ====================================== */

export const PageContent: React.FC<PageContentProps> = ({
  children,
  className = '',
  layout = 'default',
}) => {
  const layoutClass =
    layout === 'grid'
      ? 'page-content-grid'
      : layout === 'full'
        ? 'page-content-full'
        : 'page-content';

  return <div className={`page-body`}>
    <div className={`${layoutClass} ${className}`}>{children}</div>
  </div>;
};

/* ========================================
   PAGE TABLE WRAPPER
   ====================================== */

export const PageTableWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={`page-table-wrapper ${className}`}>{children}</div>;
};

/* ========================================
   PAGE FOOTER - Footer with Pagination
   ====================================== */

export const PageFooter: React.FC<PageFooterProps> = ({
  children,
  pagination,
  info,
  className = '',
}) => {
  return (
    <div className={`page-footer ${className}`}>
      {info && <div className="page-footer-info">{info}</div>}
      {pagination && <div className="page-footer-pagination">{pagination}</div>}
      {children}
    </div>
  );
};

/* ========================================
   PAGE EMPTY STATE - No Data Display
   ====================================== */

export const PageEmpty: React.FC<PageEmptyProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="page-empty">
      {icon && <div className="page-empty-icon">{icon}</div>}
      <h2 className="page-empty-title">{title}</h2>
      {description && <p className="page-empty-description">{description}</p>}
      {action && <div className="page-empty-action">{action}</div>}
    </div>
  );
};

/* ========================================
   PAGE LOADING - Loading State
   ====================================== */

export const PageLoading: React.FC<PageLoadingProps> = ({ message }) => {
  return (
    <div className="page-loading">
      <div>
        <div className="page-loading-spinner"></div>
        {message && <p style={{ marginTop: '16px', textAlign: 'center' }}>{message}</p>}
      </div>
    </div>
  );
};

/* ========================================
   FILTER COMPONENTS
   ====================================== */

export const PageFiltersSearch: React.FC<{
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
}> = ({ placeholder = 'Search...', value = '', onChange, onSearch }) => {
  return (
    <div className="page-filters-search">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange?.(e.target.value);
        }}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            onSearch?.(value);
          }
        }}
      />
    </div>
  );
};

export const PageFiltersButtons: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <div className="page-filters-buttons">{children}</div>;
};

/* ========================================
   Composite Layout Helper
   ====================================== */

export const PageLayoutTemplate: React.FC<{
  title: string;
  subtitle?: string;
  breadcrumb?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: {
    info?: string;
    pagination?: React.ReactNode;
  };
  loading?: boolean;
  empty?: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
}> = ({
  title,
  subtitle,
  breadcrumb,
  actions,
  children,
  footer,
  loading,
  empty,
}) => {
  if (loading) {
    return (
      <PageLayout>
        <PageHeader title={title} subtitle={subtitle} />
        <PageLoading />
      </PageLayout>
    );
  }

  if (empty) {
    return (
      <PageLayout>
        <PageHeader title={title} subtitle={subtitle} />
        <PageContent>
          <PageEmpty {...empty} />
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumb={breadcrumb}
        actions={actions}
      />
      <PageContent>{children}</PageContent>
      {footer && (
        <PageFooter info={footer.info} pagination={footer.pagination} />
      )}
    </PageLayout>
  );
};
