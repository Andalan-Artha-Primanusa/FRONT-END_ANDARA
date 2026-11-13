import React from 'react';
import type { ReactNode } from 'react';
import './Table.css';

/* ========================================
   TABLE MAIN COMPONENT
   ======================================== */

interface TableProps {
  children: ReactNode;
  className?: string;
  loading?: boolean;
  empty?: boolean;
}

export const Table: React.FC<TableProps> = ({ children, className = '', loading = false, empty = false }) => {
  return (
    <div className={`table-wrapper ${loading ? 'table-loading' : ''} ${empty ? 'table-empty' : ''} ${className}`}>
      <table className="table">
        {children}
      </table>
    </div>
  );
};

/* ========================================
   TABLE HEADER COMPONENT
   ======================================== */

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className = '' }) => {
  return (
    <thead className={`table-header ${className}`}>
      {children}
    </thead>
  );
};

/* ========================================
   TABLE BODY COMPONENT
   ======================================== */

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

export const TableBody: React.FC<TableBodyProps> = ({ children, className = '' }) => {
  return (
    <tbody className={`table-body ${className}`}>
      {children}
    </tbody>
  );
};

/* ========================================
   TABLE ROW COMPONENT
   ======================================== */

interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  isHeader?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({ children, className = '', onClick, isHeader = false }) => {
  const rowClass = isHeader ? 'table-header-row' : 'table-body-row';
  
  return (
    <tr className={`${rowClass} ${className}`} onClick={onClick}>
      {children}
    </tr>
  );
};

/* ========================================
   TABLE CELL COMPONENT
   ====================================== */

interface TableCellProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  nowrap?: boolean;
  truncate?: boolean;
  onClick?: () => void;
  isHeader?: boolean;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
  hideMobile?: boolean;
}

export const TableCell: React.FC<TableCellProps> = ({
  children,
  className = '',
  align = 'left',
  nowrap = false,
  truncate = false,
  onClick,
  isHeader = false,
  sortable = false,
  sortDirection = null,
  onSort,
  hideMobile = false,
}) => {
  const cellClass = isHeader ? 'table-header-cell' : 'table-body-cell';
  
  let alignClass = '';
  if (align === 'center') alignClass = 'table-cell-center';
  if (align === 'right') alignClass = 'table-cell-right';
  
  const classes = [
    cellClass,
    alignClass,
    nowrap && 'table-cell-nowrap',
    truncate && 'table-cell-truncate',
    hideMobile && 'table-cell-hide-mobile',
    isHeader && sortable && 'sortable',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    if (sortable && onSort) {
      onSort();
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <td className={classes} onClick={handleClick}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {children}
        {isHeader && sortable && sortDirection && (
          <span className="table-sort-indicator">
            <svg className={`table-sort-icon ${sortDirection === 'desc' ? 'desc' : ''}`} viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 6.5l4.5 4 4.5-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </span>
        )}
      </div>
    </td>
  );
};

/* ========================================
   TABLE EMPTY STATE COMPONENT
   ======================================== */

interface TableEmptyProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
}

export const TableEmpty: React.FC<TableEmptyProps> = ({
  icon,
  title = 'No Data',
  description = 'There is no data to display',
}) => {
  return (
    <div className="table-empty">
      {icon && <div className="table-empty-icon">{icon}</div>}
      <h3 className="table-empty-title">{title}</h3>
      <p className="table-empty-description">{description}</p>
    </div>
  );
};

/* ========================================
   TABLE ACTIONS COMPONENT
   ====================================== */

interface TableActionProps {
  onClick: () => void;
  icon: ReactNode;
  title?: string;
  variant?: 'view' | 'edit' | 'delete' | 'approve' | 'reject';
  disabled?: boolean;
}

export const TableAction: React.FC<TableActionProps> = ({ onClick, icon, title, variant = 'view', disabled = false }) => {
  return (
    <button
      className={`table-action-button ${variant}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
      type="button"
    >
      {icon}
    </button>
  );
};

interface TableActionsProps {
  children: ReactNode;
  className?: string;
}

export const TableActions: React.FC<TableActionsProps> = ({ children, className = '' }) => {
  return <div className={`table-actions ${className}`}>{children}</div>;
};
