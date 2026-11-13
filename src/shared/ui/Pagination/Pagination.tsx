import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

/* ========================================
   PAGINATION COMPONENT
   ======================================== */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  showInfo?: boolean;
  alignment?: 'start' | 'center' | 'end';
  variant?: 'default' | 'table';
  locale?: 'id' | 'en';
  showPageSize?: boolean;
  pageSizeOptions?: number[];
  className?: string;
}

const STANDARD_PAGE_SIZES = [10, 25, 50, 100];

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  showInfo = true,
  alignment = 'center',
  variant = 'default',
  locale = 'en',
  showPageSize = false,
  pageSizeOptions = STANDARD_PAGE_SIZES,
  className = '',
}) => {
  const isTableVariant = variant === 'table';

  const startIndex = totalItems
    ? (currentPage - 1) * Math.max(itemsPerPage || 10, 1) + 1
    : 0;
  const endIndex = totalItems
    ? Math.min(currentPage * Math.max(itemsPerPage || 10, 1), totalItems)
    : 0;
  const isSingleItem =
    totalItems !== undefined && totalItems > 0 && startIndex === endIndex;

  const infoText = (() => {
    if (totalItems === undefined) return '';
    if (totalItems === 0) {
      return locale === 'id'
        ? 'Menampilkan 0 data'
        : 'Showing 0 items';
    }
    if (isSingleItem && totalItems === 1) {
      return locale === 'id'
        ? 'Menampilkan 1 dari 1 data'
        : 'Showing 1 of 1 item';
    }
    if (locale === 'id') {
      return `Menampilkan ${startIndex}-${endIndex} dari ${totalItems} data`;
    }
    return `Showing ${startIndex}-${endIndex} of ${totalItems} items`;
  })();
  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const sibling = 1;
    const leftSibling = Math.max(currentPage - sibling, 1);
    const rightSibling = Math.min(currentPage + sibling, totalPages);

    // Always show first page
    pages.push(1);

    // Show ellipsis if there's gap between 1 and leftSibling
    if (leftSibling > 2) {
      pages.push('...');
    }

    // Show pages around current page
    for (let i = leftSibling; i <= rightSibling; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }

    // Show ellipsis if there's gap between rightSibling and totalPages
    if (rightSibling < totalPages - 1) {
      pages.push('...');
    }

    // Always show last page (if there's more than 1 page)
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePreviousClick = () => {
    if (canGoPrevious) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextClick = () => {
    if (canGoNext) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div
      className={`${isTableVariant ? 'table-pagination' : 'pagination'} ${
        isTableVariant ? '' : `pagination-${alignment}`
      } ${className}`}
    >
      {/* Info Section */}
      {isTableVariant && showInfo && totalItems !== undefined && (
        <div className="pagination-info" title="pagination-info">
          {infoText}
        </div>
      )}

      {/* Controls */}
      <div
        className={`${isTableVariant ? 'pagination-controls' : ''}`}
        style={
          isTableVariant || (showPageSize && onItemsPerPageChange)
            ? { marginLeft: isTableVariant ? 'auto' : undefined }
            : undefined
        }
      >
        {/* Page-size selector */}
        {showPageSize && itemsPerPage !== undefined && onItemsPerPageChange && (
          <div className="page-size-selector">
            <span>{locale === 'id' ? 'Baris / halaman' : 'Rows / page'}</span>
            <select
              aria-label="Items per page"
              value={itemsPerPage}
              onChange={(e) => {
                const newItemsPerPage = parseInt(e.target.value, 10);
                onItemsPerPageChange(newItemsPerPage);
                onPageChange(1);
              }}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Previous Button */}
        <button
          className="pagination-button prev"
          onClick={handlePreviousClick}
          disabled={!canGoPrevious}
          type="button"
          aria-label="Previous page"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Page Numbers */}
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <button
                key={`ellipsis-${index}`}
                className="pagination-button ellipsis"
                disabled
                type="button"
              >
                {page}
              </button>
            );
          }

          const pageNum = page as number;
          const isActive = currentPage === pageNum;

          return (
            <button
              key={pageNum}
              className={`pagination-button page ${isActive ? 'active' : ''}`}
              onClick={() => onPageChange(pageNum)}
              disabled={isActive}
              type="button"
              aria-label={`Go to page ${pageNum}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          className="pagination-button next"
          onClick={handleNextClick}
          disabled={!canGoNext}
          type="button"
          aria-label="Next page"
        >
          <ChevronRight size={18} />
        </button>

        {/* Non-table info */}
        {!isTableVariant && showInfo && (totalItems !== undefined || itemsPerPage !== undefined) && (
          <div className="pagination-info">
            {totalItems !== undefined && (
              <span className="pagination-info-text">
                {locale === 'id' ? 'Total' : 'Total'}: <strong>{totalItems}</strong>{' '}
                {locale === 'id' ? 'data' : 'items'}
              </span>
            )}

            {itemsPerPage !== undefined && onItemsPerPageChange && (
              <div className="pagination-info-select-wrap">
                <label
                  htmlFor="items-per-page"
                  style={{ marginRight: '4px', fontSize: 'var(--font-size-xs)' }}
                >
                  {locale === 'id' ? 'Per halaman' : 'Per page'}:
                </label>
                <select
                  id="items-per-page"
                  className="pagination-info-select"
                  value={itemsPerPage}
                  onChange={(e) => {
                    const newItemsPerPage = parseInt(e.target.value, 10);
                    onItemsPerPageChange(newItemsPerPage);
                    onPageChange(1);
                  }}
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <span className="pagination-info-text">
              {locale === 'id' ? 'Halaman' : 'Page'} <strong>{currentPage}</strong>{' '}
              {locale === 'id' ? 'dari' : 'of'} <strong>{totalPages}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ========================================
   SIMPLE PAGINATION (Minimal version)
   ======================================== */

interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const SimplePagination: React.FC<SimplePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}) => {
  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      showInfo={false}
      className={className}
    />
  );
};

/* ========================================
   PAGINATION WITH SIZE CONTROL
   ======================================== */

interface PaginationWithSizeProps extends SimplePaginationProps {
  totalItems: number;
  itemsPerPage: number;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

export const PaginationWithSize: React.FC<PaginationWithSizeProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  className = '',
}) => {
  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
      onItemsPerPageChange={onItemsPerPageChange}
      showInfo={true}
      className={className}
    />
  );
};
