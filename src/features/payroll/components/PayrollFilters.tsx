import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import "./PayrollTable.css";

/**
 * Reusable PayrollFilters component
 * Provides filtering, searching, and sorting for payroll data
 */

export interface FilterState {
  search: string;
  period: string;
  status: string;
  employeeId: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface PayrollFiltersProps {
  /** Initial filter state */
  initialFilters?: Partial<FilterState>;
  /** Available periods for filtering */
  periods?: string[];
  /** Available statuses for filtering */
  statuses?: Array<{ value: string; label: string }>;
  /** Callback when filters change */
  onChange: (filters: FilterState) => void;
  /** Show advanced filters */
  showAdvanced?: boolean;
  /** CSS class name */
  className?: string;
}

const DEFAULT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
];

const SORT_OPTIONS = [
  { value: "period", label: "Period" },
  { value: "employee_id", label: "Employee ID" },
  { value: "allowance", label: "Allowance" },
  { value: "status", label: "Status" },
  { value: "created_at", label: "Created Date" },
];

export const PayrollFilters: React.FC<PayrollFiltersProps> = ({
  initialFilters = {},
  periods = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"],
  statuses = DEFAULT_STATUSES,
  onChange,
  showAdvanced = true,
  className = "",
}) => {
  const [filters, setFilters] = useState<FilterState>({
    search: initialFilters.search || "",
    period: initialFilters.period || "",
    status: initialFilters.status || "",
    employeeId: initialFilters.employeeId || "",
    sortBy: initialFilters.sortBy || "period",
    sortOrder: initialFilters.sortOrder || "desc",
  });

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handleFilterChange = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onChange(newFilters);
  };

  const handleReset = () => {
    const emptyFilters: FilterState = {
      search: "",
      period: "",
      status: "",
      employeeId: "",
      sortBy: "period",
      sortOrder: "desc",
    };
    setFilters(emptyFilters);
    onChange(emptyFilters);
  };

  return (
    <Card className={`payroll-filters ${className}`} glass>
      <div className="payroll-filters-header">
        <h3>Filter & Cari</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="payroll-filters-toggle"
        >
          {isAdvancedOpen ? "▼ Sembunyikan" : "▶ Tampilkan"} Filter Lanjutan
        </Button>
      </div>

      {/* Basic Filters */}
      <div className="payroll-filters-basic">
        <div className="payroll-filter-group">
          <label htmlFor="payroll-search-input">Cari</label>
          <input
            id="payroll-search-input"
            type="text"
            className="payroll-filter-input"
            placeholder="Cari berdasarkan employee atau ID..."
            value={filters.search}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
          />
        </div>

        <div className="payroll-filter-group">
          <label htmlFor="payroll-period-select">Periode</label>
          <select
            id="payroll-period-select"
            className="payroll-filter-select"
            value={filters.period}
            onChange={(e) => handleFilterChange({ period: e.target.value })}
          >
            <option value="">Semua Periode</option>
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="payroll-filter-group">
          <label htmlFor="payroll-status-select">Status</label>
          <select
            id="payroll-status-select"
            className="payroll-filter-select"
            value={filters.status}
            onChange={(e) => handleFilterChange({ status: e.target.value })}
          >
            <option value="">Semua Status</option>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && isAdvancedOpen && (
        <div className="payroll-filters-advanced">
          <div className="payroll-filter-group">
            <label htmlFor="payroll-employee-input">Employee ID</label>
            <input
              id="payroll-employee-input"
              type="text"
              className="payroll-filter-input"
              placeholder="ID karyawan..."
              value={filters.employeeId}
              onChange={(e) => handleFilterChange({ employeeId: e.target.value })}
            />
          </div>

          <div className="payroll-filter-group">
            <label htmlFor="payroll-sortby-select">Urutkan Berdasarkan</label>
            <select
              id="payroll-sortby-select"
              className="payroll-filter-select"
              value={filters.sortBy}
              onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="payroll-filter-group">
            <label htmlFor="payroll-sortorder-select">Urutan</label>
            <select
              id="payroll-sortorder-select"
              className="payroll-filter-select"
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange({ sortOrder: e.target.value as "asc" | "desc" })}
            >
              <option value="asc">Ascending (A-Z)</option>
              <option value="desc">Descending (Z-A)</option>
            </select>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="payroll-filters-actions">
        <Button variant="outline" size="sm" onClick={handleReset} className="payroll-filters-reset">
          Reset Filter
        </Button>
      </div>
    </Card>
  );
};

export default PayrollFilters;
