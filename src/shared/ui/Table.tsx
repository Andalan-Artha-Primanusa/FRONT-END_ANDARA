import React from 'react';
import './Table.css';
import { ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';

interface Column {
  key: string;
  header: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface TableProps {
  columns: Column[];
  data: any[];
  searchable?: boolean;
  onSearch?: (query: string) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export const Table: React.FC<TableProps> = ({ columns, data, searchable, onSearch, pagination }) => {
  return (
    <div className="ui-table-container">
      {searchable && (
        <div className="ui-table-toolbar">
          <div className="ui-table-search">
            <Search size={16} className="text-gray" />
            <input 
              type="text" 
              placeholder="Search in table..." 
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
          <button className="ui-table-filter-btn">
            <Filter size={16} /> Filter
          </button>
        </div>
      )}
      
      <div className="ui-table-overflow">
        <table className="ui-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, rIdx) => (
                <tr key={rIdx}>
                  {columns.map((col, cIdx) => (
                    <td key={cIdx}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="ui-table-empty">
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="ui-table-pagination">
          <span className="pagination-info">
            Menampilkan halaman {pagination.currentPage} dari {pagination.totalPages}
          </span>
          <div className="pagination-controls">
            <button 
              disabled={pagination.currentPage === 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
