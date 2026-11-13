import { useEffect, useMemo, useState } from "react";
import { Card, PageHeader } from "@/shared/ui";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { LoadingState, ErrorState, EmptyState } from "@/shared/ui/DataStateDisplay";
import { getErrorMessage } from "@/shared/api/errorHandler";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Eye,
  ListChecks,
  RefreshCw,
  Search,
  Send,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./MyKpiPage.css";
import { getMyKpiPeriods, submitMyKpiPeriod, updateMyKpiPeriodItems } from "@/features/ess/api/ess.service";
import { showToast } from "@/shared/ui/toast";

type KpiPeriodItem = {
  id: number;
  indicator: string;
  description?: string;
  category?: string;
  target?: number | string;
  achievement?: number | string;
  score?: number | string;
  status?: string;
};

type KpiPeriodRecord = {
  id: number;
  period_type?: string;
  period_label?: string;
  start_date?: string;
  end_date?: string;
  overall_score?: number | string;
  status?: string;
  notes?: string;
  items?: KpiPeriodItem[];
};

type KpiPeriodDraftMap = Record<number, string>;

const TAB_OPTIONS = ["Semua", "Draft", "Submitted", "Approved"] as const;

const normalizeStatus = (status?: string) => {
  const value = String(status || "").toLowerCase();
  if (["approved", "approve", "accepted", "done", "completed"].includes(value)) return "approved";
  if (["submitted", "sent", "waiting_review"].includes(value)) return "submitted";
  return "draft";
};

const normalizePeriodType = (periodType?: string) => {
  const value = String(periodType || "").toLowerCase();
  if (value === "quarterly") return "Triwulan";
  if (value === "semi_annual") return "Semester";
  if (value === "annual") return "Tahunan";
  return value ? value.replace(/_/g, " ") : "-";
};

const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const formatRange = (start?: string, end?: string) => {
  if (!start && !end) return "-";
  return `${formatDate(start)} - ${formatDate(end)}`;
};

const getStatusClass = (status?: string) => {
  const normalized = normalizeStatus(status);
  if (normalized === "approved") return "badge-soft badge-soft--green";
  if (normalized === "submitted") return "badge-soft badge-soft--yellow";
  return "badge-soft badge-soft--gray";
};

const getStatusLabel = (status?: string) => {
  const normalized = normalizeStatus(status);
  if (normalized === "approved") return "Disetujui";
  if (normalized === "submitted") return "Diajukan";
  return "Draft";
};

const getTabStatus = (tab: string) => {
  if (tab === "Draft") return "draft";
  if (tab === "Submitted") return "submitted";
  if (tab === "Approved") return "approved";
  return undefined;
};

const MyKpiPage = () => {
  const [periods, setPeriods] = useState<KpiPeriodRecord[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<KpiPeriodRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof TAB_OPTIONS)[number]>("Semua");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemDrafts, setItemDrafts] = useState<KpiPeriodDraftMap>({});
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [submittingItemId, setSubmittingItemId] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const loadData = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await getMyKpiPeriods(currentPage, pageSize);
      const items = Array.isArray(response.items) ? response.items : [];
      const mappedPeriods = items.map((item) => {
        const record = item as KpiPeriodRecord;
        return {
          ...record,
          status: normalizeStatus(record.status),
          items: Array.isArray(record.items) ? record.items : [],
        };
      });

      setPeriods(mappedPeriods);
      setTotalPages(response.totalPages);
      return mappedPeriods;
    } catch (error) {
      console.error("KPI Period Fetch Error:", error);
      const message = getErrorMessage(error as never) || "Gagal memuat KPI periode";
      setPeriods([]);
      setTotalPages(1);
      setErrorMessage(message);
      return [] as KpiPeriodRecord[];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [currentPage]);

  useEffect(() => {
    if (!showDetail || !selectedPeriod) {
      setItemDrafts({});
      return;
    }

    const nextDrafts: KpiPeriodDraftMap = {};
    (selectedPeriod.items ?? []).forEach((item) => {
      nextDrafts[item.id] = String(toNumber(item.achievement));
    });
    setItemDrafts(nextDrafts);
  }, [showDetail, selectedPeriod]);

  const filteredPeriods = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return periods.filter((period) => {
      const tabStatus = getTabStatus(activeTab);
      const statusMatch = tabStatus ? normalizeStatus(period.status) === tabStatus : true;
      if (!statusMatch) return false;

      if (!search) return true;

      const searchable = [
        period.period_label,
        period.period_type,
        period.notes,
        period.start_date,
        period.end_date,
        ...(period.items ?? []).map((item) => item.indicator),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(search);
    });
  }, [periods, searchText, activeTab]);

  const paginatedPeriods = useMemo(
    () => filteredPeriods,
    [filteredPeriods, currentPage, pageSize]
  );
  const stats = useMemo(() => ({
    total: periods.length,
    draft: periods.filter((period) => normalizeStatus(period.status) === "draft").length,
    submitted: periods.filter((period) => normalizeStatus(period.status) === "submitted").length,
    approved: periods.filter((period) => normalizeStatus(period.status) === "approved").length,
    avgScore: periods.length > 0
      ? (periods.reduce((sum, period) => sum + toNumber(period.overall_score), 0) / periods.length).toFixed(1)
      : "0.0",
  }), [periods]);

  const handleSaveItem = async (item: KpiPeriodItem) => {
    if (!selectedPeriod) return;

    setSavingItemId(item.id);
    try {
      await updateMyKpiPeriodItems(String(selectedPeriod.id), [{
        id: item.id,
        achievement: Math.max(0, toNumber(itemDrafts[item.id])),
      }]);

      const refreshedPeriods = await loadData();
      const refreshed = refreshedPeriods.find((period) => period.id === selectedPeriod.id);
      if (refreshed) {
        setSelectedPeriod({
          ...refreshed,
          items: Array.isArray(refreshed.items) ? refreshed.items : [],
        });
      }

      showToast(`Capaian ${item.indicator} berhasil disimpan.`, "success");
    } catch (error) {
      showToast(getErrorMessage(error as never) || "Gagal menyimpan capaian KPI item", "error");
    } finally {
      setSavingItemId(null);
    }
  };

  const handleSubmitItem = async (item: KpiPeriodItem) => {
    if (!selectedPeriod) return;

    setSubmittingItemId(item.id);
    try {
      await updateMyKpiPeriodItems(String(selectedPeriod.id), [{
        id: item.id,
        achievement: Math.max(0, toNumber(itemDrafts[item.id])),
      }]);
      await submitMyKpiPeriod(String(selectedPeriod.id), item.id);

      const refreshedPeriods = await loadData();
      const refreshed = refreshedPeriods.find((period) => period.id === selectedPeriod.id);
      if (refreshed) {
        setSelectedPeriod({
          ...refreshed,
          items: Array.isArray(refreshed.items) ? refreshed.items : [],
        });
      }

      showToast(`Item KPI ${item.indicator} berhasil diajukan.`, "success");
    } catch (error) {
      showToast(getErrorMessage(error as never) || "Gagal mengajukan item KPI", "error");
    } finally {
      setSubmittingItemId(null);
    }
  };

  const clearFilters = () => {
    setSearchText("");
    setActiveTab("Semua");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  const detailItems = selectedPeriod?.items ?? [];

  const getItemStatusClass = (status?: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === "approved") return "badge-soft badge-soft--green";
    if (normalized === "submitted") return "badge-soft badge-soft--yellow";
    return "badge-soft badge-soft--gray";
  };

  const getItemStatusLabel = (status?: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === "approved") return "Disetujui";
    if (normalized === "submitted") return "Diajukan";
    return "Draft";
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Performa Saya (KPI Periode)"
        subtitle="KPI yang di-assign admin tampil sebagai periode. Alurnya draft, lalu submitted, lalu approved."
        badge={{ icon: Target, label: "KPI Periode" }}
        actions={
          <button className="btn-outline" onClick={loadData} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Segarkan
          </button>
        }
      />

      <div className="employee-summary-wrapper">
        <div className="employee-summary-card">
          <div className="employee-summary-header">
            <div><p className="employee-summary-label">Total Periode</p><p className="employee-summary-subtitle">Semua KPI periode Anda</p></div>
            <div className="employee-summary-icon-wrapper employee-icon-blue"><BarChart3 size={28} /></div>
          </div>
          <div className="employee-summary-value employee-value-blue">{stats.total}</div>
          <p className="employee-summary-trend">Seluruh periode</p>
        </div>

        <div className="employee-summary-card">
          <div className="employee-summary-header">
            <div><p className="employee-summary-label">Draft</p><p className="employee-summary-subtitle">Belum diajukan</p></div>
            <div className="employee-summary-icon-wrapper" style={{ background: "#fef3c7" }}><ListChecks size={28} color="#d97706" /></div>
          </div>
          <div className="employee-summary-value" style={{ color: "#d97706" }}>{stats.draft}</div>
          <p className="employee-summary-trend">Siap submit</p>
        </div>

        <div className="employee-summary-card">
          <div className="employee-summary-header">
            <div><p className="employee-summary-label">Submitted</p><p className="employee-summary-subtitle">Menunggu review</p></div>
            <div className="employee-summary-icon-wrapper" style={{ background: "#e0f2fe" }}><Send size={28} color="#0284c7" /></div>
          </div>
          <div className="employee-summary-value" style={{ color: "#0284c7" }}>{stats.submitted}</div>
          <p className="employee-summary-trend">Sudah diajukan</p>
        </div>

        <div className="employee-summary-card">
          <div className="employee-summary-header">
            <div><p className="employee-summary-label">Approved</p><p className="employee-summary-subtitle">Disetujui atasan</p></div>
            <div className="employee-summary-icon-wrapper employee-icon-green"><CheckCircle2 size={28} /></div>
          </div>
          <div className="employee-summary-value employee-value-green">{stats.approved}</div>
          <p className="employee-summary-trend">Periode final</p>
        </div>

        <div className="employee-summary-card">
          <div className="employee-summary-header">
            <div><p className="employee-summary-label">Rata-rata Skor</p><p className="employee-summary-subtitle">Skor periode</p></div>
            <div className="employee-summary-icon-wrapper" style={{ background: "#f5f3ff" }}><TrendingUp size={28} color="#8b5cf6" /></div>
          </div>
          <div className="employee-summary-value" style={{ color: "#8b5cf6" }}>{stats.avgScore}%</div>
          <p className="employee-summary-trend">Rata-rata skor</p>
        </div>

        <div className="employee-summary-card">
          <div className="employee-summary-header">
            <div><p className="employee-summary-label">Aksi</p><p className="employee-summary-subtitle">Submit draft</p></div>
            <div className="employee-summary-icon-wrapper" style={{ background: "#ecfdf5" }}><ArrowUpRight size={28} color="#10b981" /></div>
          </div>
          <div className="employee-summary-value" style={{ color: "#10b981" }}>{stats.draft}</div>
          <p className="employee-summary-trend">Siap diajukan</p>
        </div>
      </div>

      <div className="table-section integrated-table-section">
        <div className="wuw-table-area my-kpi-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          <div className="elyra-tabs">
            {TAB_OPTIONS.map((tab) => (
              <button key={tab} className={`elyra-tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>{tab}</button>
            ))}
          </div>
          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari periode atau indikator..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
          </div>
        </div>
      </Card>

          {loading && <LoadingState message="Memuat KPI periode..." />}

          {!loading && errorMessage && (
            <div className="my-kpi-empty-wrap">
              <ErrorState
                message="Gagal Memuat KPI Periode"
                error={errorMessage}
                onRetry={loadData}
              />
            </div>
          )}

          {!loading && !errorMessage && paginatedPeriods.length === 0 && (
            <div className="my-kpi-empty-wrap">
              <EmptyState
                title="Belum Ada KPI Periode"
                message={searchText || activeTab !== "Semua" ? "Tidak ada KPI periode yang sesuai." : "Anda belum memiliki KPI periode yang ditugaskan."}
                actionLabel={searchText || activeTab !== "Semua" ? "Hapus Filter" : undefined}
                onAction={clearFilters}
              />
            </div>
          )}

          {!loading && !errorMessage && paginatedPeriods.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "320px" }}>Periode</th>
                      <th>Tipe</th>
                      <th>Rentang</th>
                      <th>Item</th>
                      <th>Skor</th>
                      <th className="th-center">Status</th>
                      <th className="th-center" style={{ width: "140px" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPeriods.map((period) => {
                      const periodStatus = normalizeStatus(period.status);
                      const itemCount = period.items?.length ?? 0;
                      const overallScore = toNumber(period.overall_score);
                      const isDraft = periodStatus === "draft";

                      return (
                        <tr key={period.id}>
                          <td>
                            <div className="cell-name">
                              <div className="cell-avatar">{(period.period_label || "K").charAt(0).toUpperCase()}</div>
                              <div className="cell-stacked">
                                <span className="cell-name-text">{period.period_label || `Periode #${period.id}`}</span>
                                <span className="cell-stacked__sub">{period.notes || "Tidak ada catatan"}</span>
                              </div>
                            </div>
                          </td>
                          <td><span style={{ color: "#475569", fontWeight: 600 }}>{normalizePeriodType(period.period_type)}</span></td>
                          <td><span style={{ color: "#64748b", fontSize: "0.85rem" }}>{formatRange(period.start_date, period.end_date)}</span></td>
                          <td><span style={{ color: "#475569", fontWeight: 600 }}>{itemCount} item</span></td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 50, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${Math.min(overallScore, 100)}%`, height: "100%", background: overallScore >= 100 ? "#10b981" : overallScore >= 75 ? "#8b5cf6" : overallScore >= 50 ? "#f59e0b" : "#ef4444", borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>{overallScore.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="td-center"><span className={getStatusClass(period.status)}>{getStatusLabel(period.status)}</span></td>
                          <td className="td-center">
                            <div className="action-btn-group">
                              <button className="action-btn action-btn-edit" onClick={() => { setSelectedPeriod(period); setShowDetail(true); }} title="Detail"><Eye size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination">
                <div className="pagination-info">{filteredPeriods.length === 0
                  ? 'Menampilkan 0 data'
                  : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredPeriods.length)} dari ${filteredPeriods.length} data`}</div>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>‹</button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <button key={page} className={`pagination-btn ${currentPage === page ? "active" : ""}`} onClick={() => setCurrentPage(page)}>{page}</button>
                  ))}
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>›</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={showDetail && !!selectedPeriod}
        onClose={() => setShowDetail(false)}
        title="Detail KPI Periode"
        size="lg"
        footer={
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Button variant="outline" style={{ flex: 1 }} onClick={() => setShowDetail(false)}>Tutup</Button>
          </div>
        }
      >
        {selectedPeriod && (
          <div style={{ padding: 0 }}>
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "1.25rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 12 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>{selectedPeriod.period_label || `Periode #${selectedPeriod.id}`}</h4>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>{normalizePeriodType(selectedPeriod.period_type)}</p>
                </div>
                <span className={getStatusClass(selectedPeriod.status)}>{getStatusLabel(selectedPeriod.status)}</span>
              </div>
              {selectedPeriod.notes && <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>{selectedPeriod.notes}</p>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: "1.25rem" }}>
              <div style={{ textAlign: "center", padding: "1rem", background: "#f8fafc", borderRadius: 12 }}>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Item</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>{detailItems.length}</div>
              </div>
              <div style={{ textAlign: "center", padding: "1rem", background: "#f8fafc", borderRadius: 12 }}>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Skor</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#8b5cf6" }}>{toNumber(selectedPeriod.overall_score).toFixed(1)}%</div>
              </div>
              <div style={{ textAlign: "center", padding: "1rem", background: selectedPeriod.status === "approved" ? "#f0fdf4" : "#f5f3ff", borderRadius: 12 }}>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Rentang</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>{formatRange(selectedPeriod.start_date, selectedPeriod.end_date)}</div>
              </div>
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 6 }}>
                <span style={{ color: "#64748b" }}>Progress Capaian</span>
                <span style={{ fontWeight: 600, color: "#1e293b" }}>{Math.round(toNumber(selectedPeriod.overall_score))}%</span>
              </div>
              <div style={{ width: "100%", height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(toNumber(selectedPeriod.overall_score), 100)}%`, height: "100%", background: toNumber(selectedPeriod.overall_score) >= 100 ? "#10b981" : "#8b5cf6", borderRadius: 4, transition: "width 0.5s" }} />
              </div>
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <div className="kpi-card-title" style={{ marginBottom: 12 }}>
                <ListChecks size={18} />
                <span>Daftar Item KPI</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Indikator</th>
                      <th>Kategori</th>
                      <th>Target</th>
                      <th>Capaian</th>
                      <th>Skor</th>
                      <th>Status / Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailItems.length > 0 ? (
                      detailItems.map((item) => {
                        const score = toNumber(item.score);
                        const canEdit = normalizeStatus(selectedPeriod.status) === "draft";
                        const itemStatus = normalizeStatus(item.status);
                        return (
                          <tr key={item.id}>
                            <td>
                              <div className="cell-stacked">
                                <span className="cell-name-text" style={{ fontSize: 13 }}>{item.indicator}</span>
                                {item.description && <span className="cell-stacked__sub">{item.description.substring(0, 80)}</span>}
                              </div>
                            </td>
                            <td><span className="badge-soft badge-soft--blue" style={{ fontSize: 11 }}>{item.category || "-"}</span></td>
                            <td><span style={{ fontWeight: 600 }}>{toNumber(item.target).toLocaleString()}</span></td>
                            <td>
                              {canEdit && itemStatus === "draft" ? (
                                <input type="number" min="0" value={itemDrafts[item.id] ?? ""}
                                  onChange={(event) => setItemDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                                  style={{ width: "100%", padding: "0.55rem 0.7rem", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff" }}
                                  placeholder="Isi capaian" />
                              ) : (
                                <span style={{ fontWeight: 500 }}>{toNumber(item.achievement).toLocaleString()}</span>
                              )}
                            </td>
                            <td><span style={{ fontWeight: 600, color: score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#ef4444" }}>{score.toFixed(1)}</span></td>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                                <span className={getItemStatusClass(item.status)}>{getItemStatusLabel(item.status)}</span>
                                {canEdit && itemStatus === "draft" ? (
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    <button className="action-btn" style={{ color: "#6366f1", background: "#eef2ff" }}
                                      onClick={() => void handleSaveItem(item)} disabled={savingItemId === item.id} title="Simpan capaian">
                                      <CheckCircle2 size={16} />
                                    </button>
                                    <button className="action-btn" style={{ color: "#10b981", background: "#ecfdf5" }}
                                      onClick={() => void handleSubmitItem(item)} disabled={submittingItemId === item.id} title="Ajukan item">
                                      <Send size={16} />
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Belum ada item KPI di periode ini.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyKpiPage;
