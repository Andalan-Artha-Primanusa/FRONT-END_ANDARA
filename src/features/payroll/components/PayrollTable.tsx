import { useMemo } from "react";
import type { PayrollItem } from "../types/payroll.types";
import PayrollStatusBadge from "@/shared/ui/PayrollStatusBadge";
import "./PayrollTable.css";

/**
 * Reusable PayrollTable component
 * Displays payroll data in a structured table format with status badges
 */

export interface PayrollTableProps {
  /** Array of payroll items to display */
  items: PayrollItem[];
  /** Optional additional columns to display */
  additionalColumns?: string[];
  /** Callback when a row is clicked */
  onRowClick?: (item: PayrollItem, index: number) => void;
  /** Show action column */
  showActions?: boolean;
  /** Custom row actions */
  rowActions?: Array<{
    label: string;
    onClick: (item: PayrollItem, index: number) => void;
  }>;
  /** CSS class name */
  className?: string;
}

const DEFAULT_COLUMNS = ["id", "employee_id", "period", "allowance", "bonus", "status"];

/**
 * Format value for display in table
 */
const formatDisplayValue = (value: unknown): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "number") {
    // Format as currency if looks like money
    if (value > 1000) {
      return `Rp ${value.toLocaleString("id-ID")}`;
    }
    return String(value);
  }
  return String(value);
};

/**
 * Get columns from items, prioritizing preferred columns
 */
const getDisplayColumns = (items: PayrollItem[], additional?: string[]): string[] => {
  if (items.length === 0) {
    return [...DEFAULT_COLUMNS, ...(additional || [])];
  }

  const keys = Object.keys(items[0]);
  const preferred = [...DEFAULT_COLUMNS, ...(additional || [])];
  const merged = [...preferred, ...keys.filter((key) => !preferred.includes(key))];

  // Filter and deduplicate
  return merged.filter((key, index) => merged.indexOf(key) === index && key !== "id");
};

export const PayrollTable: React.FC<PayrollTableProps> = ({
  items,
  additionalColumns,
  onRowClick,
  showActions = false,
  rowActions = [],
  className = "",
}) => {
  const columns = useMemo(() => getDisplayColumns(items, additionalColumns), [items, additionalColumns]);

  if (items.length === 0) {
    return (
      <div className={`payroll-table-empty ${className}`}>
        <p>Tidak ada data payroll untuk ditampilkan</p>
      </div>
    );
  }

  return (
    <div className={`payroll-table-wrapper ${className}`}>
      <table className="payroll-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} className={`payroll-table-header payroll-table-header-${column}`}>
                {column.replace(/_/g, " ").toUpperCase()}
              </th>
            ))}
            {showActions && rowActions.length > 0 && (
              <th className="payroll-table-header payroll-table-header-actions">AKSI</th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={`${String(item.id ?? index)}`}
              className={`payroll-table-row ${onRowClick ? "payroll-table-row-clickable" : ""}`}
              onClick={() => onRowClick?.(item, index)}
            >
              {columns.map((column) => {
                const value = (item as unknown as Record<string, unknown>)[column];

                // Special handling for status column
                if (column === "status") {
                  return (
                    <td key={`${String(item.id)}-${column}`} className="payroll-table-cell payroll-table-cell-status">
                      <PayrollStatusBadge status={(value || "draft") as any} size="sm" />
                    </td>
                  );
                }

                return (
                  <td
                    key={`${String(item.id)}-${column}`}
                    className={`payroll-table-cell payroll-table-cell-${column}`}
                    title={formatDisplayValue(value)}
                  >
                    {formatDisplayValue(value)}
                  </td>
                );
              })}
              {showActions && rowActions.length > 0 && (
                <td className="payroll-table-cell payroll-table-cell-actions">
                  <div className="payroll-table-actions">
                    {rowActions.map((action, idx) => (
                      <button
                        key={idx}
                        className="payroll-table-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick(item, index);
                        }}
                        title={action.label}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PayrollTable;
