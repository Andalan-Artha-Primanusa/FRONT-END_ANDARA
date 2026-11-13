import { useEffect, useMemo, useState, Fragment } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/app/store/auth.store";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Alert } from "@/shared/ui/Alert";
import { showToast } from '@/shared/ui/toast';
import { LoadingState, EmptyState } from "@/shared/ui/DataStateDisplay";
import { PageHeader } from "@/shared/ui";
import { getErrorMessage } from "@/shared/api/errorHandler";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";
import { isLegacyPresentationSession } from "@/shared/config/legacyPresentation";

import {
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  FileText,
  Trash2,
  Calendar,
  Eye,
  Target,
  Pencil,
  ChevronDown,
  ChevronRight,
  Activity,
  BarChart3,
  Gauge,
} from "lucide-react";
import "@/shared/styles/CrudPage.css";
import "./AdminKpiPage.css";
import {
  getKpiPeriods,
  deleteKpiPeriod,
  approveKpiPeriod,
} from "@/features/admin/api/kpi.service";
import { getLegacyEes } from "@/features/dashboard/api/kpi.service";

type KpiItem = {
  id: number;
  indicator: string;
  description?: string;
  category?: string;
  weight: number;
  target: number;
  achievement: number;
  score: number;
  status: string;
  formula_type?: string;
  measurement_method?: string;
  source?: string;
};

type KpiPeriod = {
  id: number;
  employee_id: number;
  period_type: string;
  period_label: string;
  start_date: string;
  end_date: string;
  overall_score: number;
  status: string;
  notes?: string;
  created_at: string;
  employee?: {
    id: number;
    user?: { name: string };
  };
  items: KpiItem[];
};

const toScoreNumber = (value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatKpiDate = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
};

const PERIOD_LABELS: Record<string, string> = {
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
  annual: "Annual",
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
};

const typeIcon = (periodType?: string) => {
  switch (periodType) {
    case "quarterly": return <Activity size={16} />;
    case "semi_annual": return <BarChart3 size={16} />;
    case "annual": return <Gauge size={16} />;
    default: return <Activity size={16} />;
  }
};

const getStatusClass = (status?: string) => {
  const normalized = (status || "").toLowerCase();
  if (["approved", "approve", "accepted", "done", "completed"].includes(normalized)) return "badge-soft badge-soft--green";
  if (["submitted", "sent", "waiting_review"].includes(normalized)) return "badge-soft badge-soft--yellow";
  return "badge-soft badge-soft--gray";
};

const getInitial = (value?: string | null) => (value?.trim().charAt(0) || "K").toUpperCase();

const AdminKpiPage = () => {
  const user = useAuthStore((state) => state.user);
  const legacyReadOnly = isLegacyPresentationSession();
  const canAccess = legacyReadOnly || RBACUtils.hasPermission(user, PERMISSIONS.KPI_VIEW);
  const canCreate = RBACUtils.hasPermission(user, PERMISSIONS.KPI_CREATE);
  const canUpdate = RBACUtils.hasPermission(user, PERMISSIONS.KPI_UPDATE);
  const canDelete = RBACUtils.hasPermission(user, PERMISSIONS.KPI_DELETE);
  const canApprove = RBACUtils.hasPermission(user, PERMISSIONS.KPI_APPROVE);
  const navigate = useNavigate();
  const location = useLocation();

  const [periods, setPeriods] = useState<KpiPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"Semua" | "Draft" | "Submitted" | "Approved">("Semua");
  const [typeFilter, setTypeFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [showDetail, setShowDetail] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<KpiPeriod | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KpiPeriod | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, "success");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (legacyReadOnly) {
        const legacy = await getLegacyEes();
        const mappedPeriods: KpiPeriod[] = legacy.results.map((result: any) => ({
          id: Number(result.id),
          employee_id: Number(result.employee_id) || 0,
          period_type: "ees",
          period_label: String(result.period ?? result.period_id ?? "EES"),
          start_date: String(result.result_date ?? ""),
          end_date: String(result.completed_at ?? result.result_date ?? ""),
          overall_score: toScoreNumber(result.score),
          status: String(result.status ?? "completed"),
          notes: String(result.description ?? "Employee Engagement Survey"),
          created_at: String(result.result_date ?? ""),
          employee: {
            id: Number(result.employee_id) || 0,
            user: { name: String(result.employee_id ?? "Legacy employee") },
          },
          items: [{
            id: Number(result.id),
            indicator: String(result.title ?? "EES"),
            description: String(result.description ?? "Employee Engagement Survey"),
            category: "EES",
            weight: 100,
            target: 100,
            achievement: toScoreNumber(result.achievement ?? result.score),
            score: toScoreNumber(result.score),
            status: String(result.status ?? "completed"),
            source: "tr_ees_results",
          }],
        }));
        setPeriods(mappedPeriods);
        return;
      }

      const res = await getKpiPeriods();
      setPeriods(res.items);
    } catch (error) {
      showToast(getErrorMessage(error as never), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) loadData();
  }, [user]);

  const filteredPeriods = useMemo(() => {
    return periods.filter((p) => {
      const empName = String(p.employee?.user?.name || "").toLowerCase();
      const label = String(p.period_label || "").toLowerCase();
      const query = searchText.toLowerCase();
      const matchSearch = empName.includes(query) || label.includes(query);

      let statusMatch = true;
      if (activeTab === "Draft") statusMatch = p.status === "draft";
      else if (activeTab === "Submitted") statusMatch = p.status === "submitted";
      else if (activeTab === "Approved") statusMatch = p.status === "approved";

      const matchType = !typeFilter || p.period_type === typeFilter;

      return matchSearch && statusMatch && matchType;
    });
  }, [periods, searchText, activeTab, typeFilter]);

  const paginatedPeriods = filteredPeriods;

  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab, typeFilter]);

  const toggleExpand = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenCreate = () => {
    if (!canCreate) {
      showToast("Anda tidak memiliki izin membuat KPI.", "error");
      return;
    }
    navigate("/kpis/create");
  };
  const handleViewDetail = (p: KpiPeriod) => {
    setSelectedPeriod(p);
    setShowDetail(true);
  };
  const handleEdit = (p: KpiPeriod) => {
    if (!canUpdate) {
      showToast("Anda tidak memiliki izin mengubah KPI.", "error");
      return;
    }
    navigate(`/kpis/edit/${p.id}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!canDelete) {
      showToast("Anda tidak memiliki izin menghapus KPI.", "error");
      return;
    }

    setDeleting(true);
    try {
      await deleteKpiPeriod(deleteTarget.id);
      showToast("Periode KPI berhasil dihapus", "success");
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      showToast(getErrorMessage(error as never), "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleApprove = async (id: number, itemId?: number) => {
    if (!canApprove) {
      showToast("Anda tidak memiliki izin menyetujui KPI.", "error");
      return;
    }

    try {
      await approveKpiPeriod(id, itemId);
      showToast("Periode KPI berhasil disetujui", "success");
      await loadData();
    } catch (error) {
      showToast(getErrorMessage(error as never), "error");
    }
  };

  const clearFilters = () => {
    setSearchText("");
    setActiveTab("Semua");
    setTypeFilter("");
    setCurrentPage(1);
  };

  if (!canAccess) {
    return (
      <div className="crud-page">
        <Alert type="error" message="Akses Ditolak. Anda tidak memiliki izin untuk mengelola KPI." />
      </div>
    );
  }

  return (
    <div className="crud-page kpi-page">
      <PageHeader
        title={legacyReadOnly ? "KPI & EES" : "Pengelolaan Periode KPI"}
        subtitle={legacyReadOnly ? "Data KPI/EES dari database legacy MINEPRO (read-only)." : "Kelola periode KPI dengan indikator kinerja multi-item per karyawan."}
        badge={{ icon: Target, label: "Kinerja" }}
        actions={
          <>
            <button className="btn-outline" onClick={loadData} disabled={loading}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Segarkan
            </button>
            {canCreate && (
            <button className="btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              Buat Periode KPI
            </button>
            )}
          </>
        }
      />

      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          <div className="elyra-tabs">
            {(["Semua", "Draft", "Submitted", "Approved"] as const).map((tab) => (
              <button
                key={tab}
                className={`elyra-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari karyawan atau label periode..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select-premium"
              style={{ width: 160 }}
            >
              <option value="">Semua Tipe</option>
              <option value="quarterly">Quarterly</option>
              <option value="semi_annual">Semi-Annual</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>
      </Card>

          {loading && <LoadingState message="Memuat periode KPI..." />}

          {!loading && paginatedPeriods.length === 0 && (
            <div style={{ padding: "5rem 0" }}>
              <EmptyState
                title="Belum Ada Periode KPI"
                message={
                  searchText || activeTab !== "Semua" || typeFilter
                    ? "Tidak ada periode KPI yang sesuai kriteria."
                    : "Buat periode KPI pertama untuk memulai."
                }
                actionLabel={canCreate ? "Buat Periode KPI" : undefined}
                onAction={canCreate ? handleOpenCreate : undefined}
              />
            </div>
          )}

          {!loading && paginatedPeriods.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th style={{ width: 200 }}>Karyawan</th>
                      <th style={{ width: 160 }}>Periode</th>
                      <th>Skor</th>
                      <th className="th-center">Status</th>
                      <th className="th-center" style={{ width: 140 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPeriods.map((period) => (
                      <Fragment key={period.id}>
                        <tr
                          className="period-row"
                          onClick={() => toggleExpand(period.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <td className="td-center">
                            {expandedRows.has(period.id) ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </td>
                          <td>
                            <div className="cell-name">
                              <div className="cell-avatar">{getInitial(period.employee?.user?.name)}</div>
                              <div className="cell-stacked">
                                <span className="cell-name-text">{period.employee?.user?.name || "Unknown"}</span>
                                <span className="cell-stacked__sub">Employee ID: {period.employee_id}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{period.period_label}</span>
                              <span className="cell-stacked__sub" style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                                {typeIcon(period.period_type)}
                                {PERIOD_LABELS[period.period_type] || period.period_type}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div
                                style={{
                                  width: 60,
                                  height: 6,
                                  background: "rgba(0,0,0,0.05)",
                                  borderRadius: 3,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${Math.min(toScoreNumber(period.overall_score), 100)}%`,
                                    height: "100%",
                                    background: getScoreColor(toScoreNumber(period.overall_score)),
                                    borderRadius: 3,
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 600,
                                  color: getScoreColor(toScoreNumber(period.overall_score)),
                                }}
                              >
                                {toScoreNumber(period.overall_score).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="td-center">
                            <span className={getStatusClass(period.status)}>
                              {period.status === "approved"
                                ? "Approved"
                                : period.status === "submitted"
                                  ? "Submitted"
                                  : "Draft"}
                            </span>
                          </td>
                          <td className="td-center" onClick={(e) => e.stopPropagation()}>
                            <div className="action-btn-group">
                              <button
                                className="action-btn action-btn-edit"
                                onClick={() => handleViewDetail(period)}
                                title="Lihat Detail"
                              >
                                <Eye size={16} />
                              </button>
                              {canUpdate && (
                              <button
                                className="action-btn action-btn-edit"
                                onClick={() => handleEdit(period)}
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              )}
                              {canDelete && (
                              <button
                                className="action-btn action-btn-delete"
                                onClick={() => setDeleteTarget(period)}
                                title="Hapus"
                              >
                                <Trash2 size={16} />
                              </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedRows.has(period.id) && period.items && period.items.length > 0 && (
                          <tr className="expandable-row">
                            <td colSpan={6} style={{ padding: 0 }}>
                              <div className="expanded-items-table">
                                <table className="data-table inner-table">
                                  <thead>
                                    <tr>
                                      <th style={{ width: "25%" }}>Indikator</th>
                                      <th style={{ width: 80 }}>Kategori</th>
                                      <th style={{ width: 60 }}>Bobot</th>
                                      <th style={{ width: 80 }}>Target</th>
                                      <th style={{ width: 80 }}>Realisasi</th>
                                      <th style={{ width: 60 }}>Skor</th>
                                      <th style={{ width: 80 }}>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {period.items.map((item) => (
                                      <tr key={item.id}>
                                        <td>
                                          <div className="cell-stacked">
                                            <span className="cell-name-text" style={{ fontSize: 13 }}>{item.indicator}</span>
                                            {item.description && (
                                              <span className="cell-stacked__sub">{item.description.substring(0, 50)}</span>
                                            )}
                                          </div>
                                        </td>
                                        <td>
                                          <span className="badge-soft badge-soft--blue" style={{ fontSize: 11 }}>
                                            {item.category || "—"}
                                          </span>
                                        </td>
                                        <td><span style={{ fontWeight: 600 }}>{item.weight}%</span></td>
                                        <td><span style={{ fontWeight: 500 }}>{item.target.toLocaleString()}</span></td>
                                        <td><span style={{ fontWeight: 500 }}>{item.achievement.toLocaleString()}</span></td>
                                        <td>
                                          <span style={{ fontWeight: 600, color: getScoreColor(toScoreNumber(item.score)) }}>
                                            {toScoreNumber(item.score).toFixed(1)}
                                          </span>
                                        </td>
                                        <td>
                                          <span className={getStatusClass(item.status)} style={{ fontSize: 10 }}>
                                            {item.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                        {expandedRows.has(period.id) && (!period.items || period.items.length === 0) && (
                          <tr className="expandable-row">
                            <td colSpan={6} style={{ padding: "16px 24px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
                              Tidak ada item KPI dalam periode ini.
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination">
                <div className="pagination-info">
                  {filteredPeriods.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredPeriods.length)} dari ${filteredPeriods.length} data`}
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`pagination-btn ${currentPage === page ? "active" : ""}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={showDetail && !!selectedPeriod}
        onClose={() => setShowDetail(false)}
        title="Detail Periode KPI"
        size="lg"
        footer={
          <div style={{ display: "flex", gap: 12 }}>
            {canUpdate && (
            <Button variant="outline" style={{ flex: 1 }} onClick={() => { setShowDetail(false); handleEdit(selectedPeriod!); }}>
              <Pencil size={16} /> Edit
            </Button>
            )}
          </div>
        }
      >
        {selectedPeriod && (<>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div className="cell-avatar" style={{ width: 48, height: 48, fontSize: 20 }}>
              {getInitial(selectedPeriod.employee?.user?.name)}
            </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 18 }}>
                    {selectedPeriod.employee?.user?.name || "Unknown"}
                  </h4>
                  <span className="cell-sub">Employee ID: {selectedPeriod.employee_id}</span>
                </div>
              </div>

              <div
                style={{
                  background: "rgba(0,0,0,0.02)",
                  padding: 20,
                  borderRadius: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <h5
                    style={{
                      margin: 0,
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Periode
                  </h5>
                  <span className={getStatusClass(selectedPeriod.status)}>
                    {selectedPeriod.status === "approved"
                      ? "Approved"
                      : selectedPeriod.status === "submitted"
                        ? "Submitted"
                        : "Draft"}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                  {selectedPeriod.period_label}
                </p>
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  <span>
                    Mulai: {formatKpiDate(selectedPeriod.start_date)}
                  </span>
                  <span>•</span>
                  <span>
                    Selesai: {formatKpiDate(selectedPeriod.end_date)}
                  </span>
                </div>
                {selectedPeriod.notes && (
                  <p
                    style={{
                      marginTop: 12,
                      fontSize: 14,
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedPeriod.notes}
                  </p>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    padding: 12,
                    background: "rgba(0,0,0,0.02)",
                    borderRadius: 8,
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: 10,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                      textTransform: "uppercase",
                    }}
                  >
                    Tipe
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    {PERIOD_LABELS[selectedPeriod.period_type] || selectedPeriod.period_type}
                  </span>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    padding: 12,
                    background: "rgba(0,0,0,0.02)",
                    borderRadius: 8,
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: 10,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                      textTransform: "uppercase",
                    }}
                  >
                    Item KPI
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    {selectedPeriod.items?.length || 0}
                  </span>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    padding: 12,
                    background: "rgba(0,0,0,0.02)",
                    borderRadius: 8,
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: 10,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                      textTransform: "uppercase",
                    }}
                  >
                    Skor Akhir
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: getScoreColor(toScoreNumber(selectedPeriod.overall_score)),
                    }}
                  >
                    {toScoreNumber(selectedPeriod.overall_score).toFixed(1)}%
                  </span>
                </div>
              </div>

              {selectedPeriod.items && selectedPeriod.items.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h5
                    style={{
                      margin: "0 0 12px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Item KPI
                  </h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedPeriod.items.map((item) => {
                      const itemStatus = String(item.status || "draft").toLowerCase();
                      const isSubmitted = itemStatus === "submitted";
                      const isApproved = itemStatus === "approved";

                      return (
                      <div
                        key={item.id}
                        style={{
                          padding: "12px 16px",
                          background: "rgba(0,0,0,0.02)",
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                            {item.indicator}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              fontSize: 12,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {item.category && <span>{item.category}</span>}
                            <span>Bobot: {item.weight}%</span>
                            <span>Target: {item.target}</span>
                            <span>Realisasi: {item.achievement}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                          <span className={getStatusClass(item.status)}>{isApproved ? "Disetujui" : isSubmitted ? "Diajukan" : "Draft"}</span>
                          {canApprove && isSubmitted && !isApproved && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => void handleApprove(selectedPeriod.id, item.id)}
                            >
                              <CheckCircle2 size={16} /> Setujui Item
                            </Button>
                          )}
                        </div>
                        <div
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            fontSize: 16,
                            color: getScoreColor(toScoreNumber(item.score)),
                            minWidth: 60,
                          }}
                        >
                          {toScoreNumber(item.score).toFixed(1)}
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                {canUpdate && (
                <Button
                  variant="outline"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowDetail(false);
                    handleEdit(selectedPeriod);
                  }}
                >
                  <Pencil size={16} /> Edit
                </Button>
                )}
              </div>
            </>)}
      </Modal>

      <ConfirmDialog
        isOpen={canDelete && !!deleteTarget}
        title="Hapus Periode KPI"
        message={`Periode KPI "${deleteTarget?.period_label || "ini"}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AdminKpiPage;
