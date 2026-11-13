import React from 'react';
import type { CSSProperties } from 'react';
import './Skeleton.css';

/* ========================================
   SKELETON COMPONENT
   ==============================  ======== */

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'title' | 'avatar' | 'image' | 'button' | 'input' | 'card';
  className?: string;
  style?: CSSProperties;
  wave?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  variant = 'text',
  className = '',
  style,
  wave = false,
}) => {
  let variantClass = 'skeleton';
  let variantHeight = height;
  let variantWidth = width;

  switch (variant) {
    case 'text':
      variantClass = 'skeleton skeleton-text';
      variantHeight = '16px';
      break;
    case 'title':
      variantClass = 'skeleton skeleton-title';
      variantHeight = '24px';
      variantWidth = '40%';
      break;
    case 'circular':
      variantClass = 'skeleton skeleton-avatar';
      variantHeight = '48px';
      variantWidth = '48px';
      break;
    case 'avatar':
      variantClass = 'skeleton skeleton-avatar';
      variantHeight = '48px';
      variantWidth = '48px';
      break;
    case 'image':
      variantClass = 'skeleton skeleton-image';
      variantHeight = 'auto';
      break;
    case 'button':
      variantClass = 'skeleton skeleton-button';
      variantHeight = '40px';
      variantWidth = '100px';
      break;
    case 'input':
      variantClass = 'skeleton skeleton-input';
      variantHeight = '40px';
      variantWidth = '100%';
      break;
    case 'card':
      variantClass = 'skeleton skeleton-card';
      variantHeight = '200px';
      variantWidth = '100%';
      break;
    default:
      variantClass = 'skeleton';
  }

  const classes = [
    variantClass,
    wave && 'skeleton-wave',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const customStyle: CSSProperties = {
    width: variantWidth,
    height: variantHeight,
    ...style,
  };

  return (
    <div
      className={classes}
      style={customStyle}
      role="status"
      aria-busy="true"
      aria-label="Loading..."
    />
  );
};

/* ========================================
   SKELETON GROUP (Multiple skeletons)
   ======================================== */

interface SkeletonGroupProps {
  count?: number;
  variant?: 'text' | 'circular' | 'rectangular';
  horizontal?: boolean;
  className?: string;
}

export const SkeletonGroup: React.FC<SkeletonGroupProps> = ({
  count = 3,
  variant = 'text',
  horizontal = false,
  className = '',
}) => {
  return (
    <div className={`skeleton-group ${horizontal ? 'horizontal' : ''} ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} variant={variant === 'text' ? 'text' : variant} />
      ))}
    </div>
  );
};

/* ========================================
   SKELETON CARD (Loading card placeholder)
   ======================================== */

interface SkeletonCardProps {
  showImage?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showImage = true,
  showTitle = true,
  showDescription = true,
  className = '',
}) => {
  return (
    <div className={`skeleton-group ${className}`} style={{ gap: '16px' }}>
      {showImage && <Skeleton variant="image" />}
      {showTitle && <Skeleton variant="title" />}
      {showDescription && (
        <>
          <Skeleton variant="text" />
          <Skeleton variant="text" width="80%" />
        </>
      )}
    </div>
  );
};

/* ========================================
   SKELETON TABLE ROW
   ======================================== */

interface SkeletonTableRowProps {
  columns?: number;
  className?: string;
}

export const SkeletonTableRow: React.FC<SkeletonTableRowProps> = ({
  columns = 4,
  className = '',
}) => {
  return (
    <div className={`skeleton-table-row ${className}`}>
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} variant="text" />
      ))}
    </div>
  );
};

/* ========================================
   SKELETON TABLE
   ======================================== */

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  className = '',
}) => {
  return (
    <div className={className}>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonTableRow key={index} columns={columns} />
      ))}
    </div>
  );
};

/* ========================================
   SKELETON LIST
   ======================================== */

interface SkeletonListProps {
  items?: number;
  showAvatar?: boolean;
  className?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  items = 5,
  showAvatar = true,
  className = '',
}) => {
  return (
    <div className={className}>
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonGroup
          key={index}
          horizontal={showAvatar}
          variant={showAvatar ? 'circular' : 'text'}
          count={showAvatar ? 2 : 2}
        />
      ))}
    </div>
  );
};
