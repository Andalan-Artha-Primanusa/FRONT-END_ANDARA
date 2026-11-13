import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardHeader, PageHeader } from "@/shared/ui";
import { LoadingState, ErrorState, EmptyState } from "@/shared/ui/DataStateDisplay";

import { Calendar, RefreshCw, Clock3, CircleCheckBig, CircleX, Wallet, Search, Filter, Plus, Clock, History } from "lucide-react";

import { getMyLeaveBalance, getMyLeaves } from "@/features/ess/api/ess.service";
import { resubmitLeave } from "@/features/leave/api/leave.service";
import { showToast } from "@/shared/ui/toast";
import type { GenericApiItem } from "@/features/ess/types/ess.types";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "@/pages/leave/LeaveShared.css";
import { ApprovalHistoryModal } from "@/shared/components/ApprovalHistoryModal";

const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const getLeaveTypeLabel = (type: string | undefined) => {
  const typeMap: Record<string, string> = {
    annual: "Cuti Tahunan",
    sick: "Cuti Sakit",
    personal: "Cuti Pribadi",
    unpaid: "Cuti Tanpa Bayar",
  };
  return typeMap[type?.toLowerCase() ?? ""] ?? type ?? "-";
};

const toLabel = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const isNumericLike = (value: unknown) => {
  if (typeof value === "number") return true;
  if (typeof value !== "string") return false;
  return value.trim() !== "" && !Number.isNaN(Number(value));
};

type LeaveBalanceData = {
  policy: {
    year?: number | string;
    entitlement_type?: string;
    annual_allowance?: number;
    is_paid?: boolean;
    max_pending_days?: number;
    carry_over_enabled?: boolean;
  };
  balance: {
    allocated_days?: number;
    carry_over_days?: number;
    used_days?: number;
    pending_days?: number;
    available_days?: number;
  };
};

const MyLeavesPage = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isBalanceRoute = pathname === "/leave/balance" || pathname.includes("leave/balance");

  const [leaves, setLeaves] = useState<GenericApiItem[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historyModal, setHistoryModal] = useState<{ module: string; id: number | string } | null>(null);

  // Search & Filter State
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const loadLeaves = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await getMyLeaves();
      setLeaves(result.items);
    } catch (error: unknown) {
      console.error("Failed to load leaves:", error);
      setErrorMessage("Gagal memuat cuti");
    } finally {
      setLoading(false);
    }
  };

  const loadLeaveBalance = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await getMyLeaveBalance();
      const balanceData =
        result.payload && typeof result.payload === "object"
          ? (result.payload as unknown as LeaveBalanceData)
          : null;
      setLeaveBalance(balanceData);
    } catch (error: unknown) {
      console.error("Failed to load leave balance:", error);
      setErrorMessage("Gagal memuat saldo cuti");
    } finally {
      setLoading(false);
    }
  };

  // Filter & Paginate Logic
  const filteredLeaves = useMemo(() => {
    return leaves.filter((item) => {
      const leave = item as any;
      const searchStr = searchText.toLowerCase();
      if (searchStr) {
        const typeMatch = getLeaveTypeLabel(leave.type).toLowerCase().includes(searchStr);
        const idMatch = String(leave.id).includes(searchStr);
        if (!typeMatch && !idMatch) return false;
      }

      if (selectedStatus) {
        const status = (leave.status || "pending").toLowerCase();
        if (status !== selectedStatus.toLowerCase()) return false;
      }

      return true;
    });
  }, [leaves, searchText, selectedStatus]);

  const paginatedLeaves = filteredLeaves;

  const [totalPages, setTotalPages] = useState(1);

  const summaryCards = useMemo(() => {
    if (isBalanceRoute) {
      const balanceEntries = leaveBalance ? Object.entries(leaveBalance) : [];
      return [
        {
          label: "Balance Fields",
          subtitle: "Jumlah field saldo cuti",
          value: String(balanceEntries.length),
          change: "Ringkasan data saldo",
          tone: "blue" as const,
          icon: Wallet,
        },
        {
          label: "Available Snapshot",
          subtitle: "Status saldo yang tampil",
          value: leaveBalance ? "Ready" : "-",
          change: "Data saldo personal",
          tone: "green" as const,
          icon: CircleCheckBig,
        },
        {
          label: "Route",
          subtitle: "Halaman yang sedang dibuka",
          value: "Balance",
          change: "/leave/balance",
          tone: "orange" as const,
          icon: Calendar,
        },
      ];
    }

    const pendingLeaves = leaves.filter(
      (item) => String((item as any).status ?? "pending").toLowerCase() === "pending"
    ).length;
    const approvedLeaves = leaves.filter(
      (item) => String((item as any).status ?? "").toLowerCase() === "approved"
    ).length;
    const rejectedLeaves = leaves.filter(
      (item) => String((item as any).status ?? "").toLowerCase() === "rejected"
    ).length;

    return [
      {
        label: "Total Leaves",
        subtitle: "Semua pengajuan cuti",
        value: String(leaves.length),
        change: "Riwayat cuti yang tersimpan",
        tone: "blue" as const,
        icon: Calendar,
      },
      {
        label: "Hasil Filter",
        subtitle: "Cuti sesuai pencarian",
        value: String(filteredLeaves.length),
        change: `${paginatedLeaves.length} data per halaman`,
        tone: "green" as const,
        icon: Search,
      },
      {
        label: "Pending",
        subtitle: "Menunggu persetujuan",
        value: String(pendingLeaves),
        change: "Perlu ditinjau",
        tone: "orange" as const,
        icon: Clock3,
      },
      {
        label: "Approved",
        subtitle: "Pengajuan disetujui",
        value: String(approvedLeaves),
        change: "Status final selesai",
        tone: "green" as const,
        icon: CircleCheckBig,
      },
    ];
  }, [isBalanceRoute, leaveBalance, leaves, filteredLeaves.length, paginatedLeaves.length]);

  const clearFilters = () => {
    setSearchText("");
    setSelectedStatus("");
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    if (isBalanceRoute) {
      void loadLeaveBalance();
      return;
    }
    void loadLeaves();
  };

  const handleResubmit = async (id: string | number) => {
    try {
      await resubmitLeave(String(id));
      await loadLeaves();
      showToast("Pengajuan berhasil diajukan ulang", "success");
    } catch (error: unknown) {
      console.error("Failed to resubmit leave:", error);
      showToast("Gagal mengajukan ulang cuti", "error");
    }
  };

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedStatus]);

  useEffect(() => {
    if (isBalanceRoute) {
      void loadLeaveBalance();
    } else {
      void loadLeaves();
    }
  }, [isBalanceRoute]);

  return (
    <div className="crud-page">
      {/* Header */}
      <PageHeader
        title={isBalanceRoute ? "Saldo Cuti Saya" : "Cuti Saya"}
        subtitle={isBalanceRoute
          ? "Lihat saldo cuti tersedia Anda dengan tampilan visual yang konsisten."
          : "Lihat riwayat cuti Anda dengan tampilan yang konsisten di seluruh aplikasi."}
        badge={{ icon: isBalanceRoute ? Wallet : Calendar, label: isBalanceRoute ? "Pusat Saldo Cuti" : "Pusat Cuti" }}
        actions={
          <>
            <button className="btn-outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Memuat..." : "Segarkan"}
            </button>
            {!isBalanceRoute && (
              <button className="btn-primary" onClick={() => navigate("/leave/request")} disabled={loading}>
                <Plus size={16} />
                Ajukan Cuti
              </button>
            )}
          </>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="employee-summary-card">
              <div className="employee-summary-header">
                <div>
                  <p className="employee-summary-label">{card.label}</p>
                  <p className="employee-summary-subtitle">{card.subtitle}</p>
                </div>
                <div className={`employee-summary-icon-wrapper employee-icon-${card.tone}`}>
                  <Icon size={28} />
                </div>
              </div>
              <div className={`employee-summary-value employee-value-${card.tone}`}>{card.value}</div>
              <p className="employee-summary-trend">{card.change}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Title Card - Only for leave history */}
      {!isBalanceRoute && (
        <Card className="analytics-title-card">
          <div className="analytics-title-inner">
            <div className="analytics-icon">
              <Calendar size={24} />
            </div>
            <div>
              <h2 className="analytics-title">Riwayat Cuti</h2>
              <p className="analytics-subtitle">Kelola dan lihat semua pengajuan cuti</p>
            </div>
          </div>
        </Card>
      )}

      {/* Control Section - Only for leave history */}
      {!isBalanceRoute && (
        <Card className="control-section-card">
          <div className="control-section-inner">
            <div className="control-actions">
              <div className="search-box">
                <div className="search-icon-inside">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Cari cuti..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="search-input-pill"
                />
              </div>
              <button
                className={`filter-btn-rounded ${showFilters ? "active" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={18} />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="filter-dropdown">
              <div className="filter-row">
                <div className="filter-group">
                  <label>Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="filter-select-premium"
                  >
                    <option value="">Semua Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                {(searchText || selectedStatus) && (
                  <button className="btn-clear-filter" onClick={clearFilters}>
                    Hapus Filter
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Leave History Table */}
      {!isBalanceRoute && (
        <div className="table-section">
          <div className="wuw-table-area">
            {loading && <LoadingState message="Memuat cuti..." />}

            {!loading && errorMessage && (
              <div className="error-state-container">
                <div className="error-state">
                  <p className="error-state-title">Koneksi Terputus</p>
                  <p className="error-state-message">{errorMessage}</p>
                  <button className="btn-primary" onClick={() => void loadLeaves()}>
                    Coba Lagi
                  </button>
                </div>
              </div>
            )}

            {!loading && !errorMessage && paginatedLeaves.length === 0 && (
              <div style={{ padding: "5rem 0" }}>
                <EmptyState
                  title="Cuti Kosong"
                  message={
                    searchText || selectedStatus
                      ? "Tidak ada cuti yang sesuai dengan kriteria Anda."
                      : "Belum ada pengajuan cuti. Ajukan cuti untuk memulai."
                  }
                  actionLabel="Ajukan Cuti"
                  onAction={() => navigate("/leave/request")}
                />
              </div>
            )}

            {!loading && !errorMessage && paginatedLeaves.length > 0 && (
              <>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: "300px" }}>Jenis Cuti</th>
                        <th>Mulai</th>
                        <th>Selesai</th>
                        <th>Hari</th>
                        <th>Persetujuan</th>
                        <th className="th-center">Status</th>
                        <th className="th-center" style={{ width: "120px" }}>
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLeaves.map((item, index) => {
                        const leave = item as any;
                        const status = (leave.status || "pending").toLowerCase();
                        return (
                          <tr key={String(leave.id ?? index)}>
                            <td>
                              <div className="cell-name">
                                <div className="cell-avatar" style={{ background: '#f1f5f9', color: '#64748b' }}>
                                  <Calendar size={14} />
                                </div>
                                <div className="cell-stacked">
                                  <span className="cell-name-text">{getLeaveTypeLabel(leave.type)}</span>
                                  <span className="cell-stacked__sub">{String(leave.id)}</span>
                                </div>
                              </div>
                            </td>
                            <td style={{ color: "#475569", fontWeight: 500 }}>{formatDate(leave.start_date)}</td>
                            <td style={{ color: "#475569", fontWeight: 500 }}>{formatDate(leave.end_date)}</td>
                            <td>
                              <span style={{ color: "#64748b", fontWeight: 600 }}>{leave.total_days || 1} hari</span>
                            </td>
                            <td>
                              <div className="cell-name">
                                <div className="cell-avatar" style={{ background: '#EBF4FF', color: '#7F9CF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                  {(leave.approver?.user?.name || 'A').charAt(0).toUpperCase()}
                                </div>
                                <div className="cell-stacked">
                                  <span className="cell-name-text">{leave.approver?.user?.name || 'System'}</span>
                                  <span className="cell-stacked__sub">Approver</span>
                                </div>
                              </div>
                            </td>
                            <td className="td-center">
                              <span
                                className={`badge-soft badge-soft--${
                                  status === "approved"
                                    ? "green"
                                    : status === "pending"
                                    ? "orange"
                                    : status === "returned"
                                    ? "purple"
                                    : "red"
                                }`}
                              >
                                {status === "returned"
                                  ? "Dikembalikan"
                                  : status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            </td>
                            <td className="td-center">
                              <div className="action-btn-group">
                                <button
                                  className="action-btn action-btn-edit"
                                  onClick={() => navigate(`/leave/request/${leave.id}`)}
                                  title="Lihat Detail"
                                >
                                  <Calendar size={16} />
                                </button>
                                {status === "returned" && (
                                  <button
                                    className="action-btn"
                                    style={{ color: "#d97706", background: "#fffbeb" }}
                                    onClick={() => handleResubmit(leave.id)}
                                    title="Ajukan Ulang"
                                  >
                                    <RefreshCw size={16} />
                                  </button>
                                )}
                                <button className="action-btn" style={{ color: '#8b5cf6', background: '#f5f3ff' }} onClick={() => setHistoryModal({ module: 'leave', id: leave.id })} title="Riwayat Approval"><History size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="table-pagination">
                  <div className="pagination-info">
                    {filteredLeaves.length === 0
                      ? 'Menampilkan 0 data'
                      : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredLeaves.length)} dari ${filteredLeaves.length} data`}
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
      )}

      {/* Balance Section Header */}
      {isBalanceRoute && leaveBalance && (
        <Card className="analytics-title-card">
          <div className="analytics-title-inner">
            <div className="analytics-icon">
              <Wallet size={24} />
            </div>
            <div>
              <h2 className="analytics-title">Saldo Cuti</h2>
              <p className="analytics-subtitle">Detail saldo cuti Anda</p>
            </div>
          </div>
        </Card>
      )}

      {/* Balance Policy Info */}
      {isBalanceRoute && leaveBalance?.policy && (
        <Card className="control-section-card">
          <div className="control-section-inner">
            <div className="filter-group">
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}>
                Informasi Kebijakan Cuti {leaveBalance.policy.year}
              </h3>
              <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", fontSize: "0.9rem" }}>
                <div>
                  <span style={{ color: "#64748b" }}>Jenis Entitlement: </span>
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>{leaveBalance.policy.entitlement_type === "fixed" ? "Tetap" : leaveBalance.policy.entitlement_type}</span>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Cuti Tahunan: </span>
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>{leaveBalance.policy.annual_allowance} hari</span>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Dibayar: </span>
                  <span style={{ fontWeight: 600, color: leaveBalance.policy.is_paid ? "#059669" : "#dc2626" }}>
                    {leaveBalance.policy.is_paid ? "Ya" : "Tidak"}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Maks. Hari Pending: </span>
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>{leaveBalance.policy.max_pending_days} hari</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Balance Cards Grid */}
      {isBalanceRoute && (
        <div
          className="leave-balance-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {leaveBalance?.balance ? (
            <>
              <div className="employee-summary-card">
                <div className="employee-summary-header">
                  <div>
                    <p className="employee-summary-label">Hari Dialokasikan</p>
                    <p className="employee-summary-subtitle">Total cuti yang dialokasikan</p>
                  </div>
                  <div className="employee-summary-icon-wrapper employee-icon-blue">
                    <Calendar size={28} />
                  </div>
                </div>
                <div className="employee-summary-value employee-value-blue">{leaveBalance.balance.allocated_days}</div>
                <p className="employee-summary-trend">Dari kebijakan perusahaan</p>
              </div>

              <div className="employee-summary-card">
                <div className="employee-summary-header">
                  <div>
                    <p className="employee-summary-label">Sisa Tahun Lalu</p>
                    <p className="employee-summary-subtitle">Cuti yang dibawa ke tahun ini</p>
                  </div>
                  <div className="employee-summary-icon-wrapper employee-icon-orange">
                    <Clock size={28} />
                  </div>
                </div>
                <div className="employee-summary-value employee-value-orange">{leaveBalance.balance.carry_over_days}</div>
                <p className="employee-summary-trend">{leaveBalance.policy?.carry_over_enabled ? "Aktif" : "Tidak aktif"}</p>
              </div>

              <div className="employee-summary-card">
                <div className="employee-summary-header">
                  <div>
                    <p className="employee-summary-label">Cuti Digunakan</p>
                    <p className="employee-summary-subtitle">Total cuti yang sudah diambil</p>
                  </div>
                  <div className="employee-summary-icon-wrapper employee-icon-red">
                    <CircleX size={28} />
                  </div>
                </div>
                <div className="employee-summary-value employee-value-red">{leaveBalance.balance.used_days}</div>
                <p className="employee-summary-trend">Sudah terpakai</p>
              </div>

              <div className="employee-summary-card">
                <div className="employee-summary-header">
                  <div>
                    <p className="employee-summary-label">Cuti Pending</p>
                    <p className="employee-summary-subtitle">Sedang dalam pengajuan</p>
                  </div>
                  <div className="employee-summary-icon-wrapper employee-icon-purple">
                    <Clock3 size={28} />
                  </div>
                </div>
                <div className="employee-summary-value employee-value-purple">{leaveBalance.balance.pending_days}</div>
                <p className="employee-summary-trend">Menunggu persetujuan</p>
              </div>

              <div className="employee-summary-card">
                <div className="employee-summary-header">
                  <div>
                    <p className="employee-summary-label">Cuti Tersedia</p>
                    <p className="employee-summary-subtitle">Sisa cuti yang bisa diambil</p>
                  </div>
                  <div className="employee-summary-icon-wrapper employee-icon-green">
                    <CircleCheckBig size={28} />
                  </div>
                </div>
                <div className="employee-summary-value employee-value-green">{leaveBalance.balance.available_days}</div>
                <p className="employee-summary-trend">Siap digunakan</p>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#94a3b8" }}>
              <Wallet size={64} style={{ opacity: 0.3, marginBottom: "1rem" }} />
              <p style={{ fontSize: "1.1rem", fontWeight: "500" }}>Tidak ada data saldo cuti</p>
              <p style={{ marginTop: "0.5rem" }}>Hak cuti Anda akan muncul di sini.</p>
            </div>
          )}
        </div>
      )}
      {historyModal && (
        <ApprovalHistoryModal
          isOpen={!!historyModal}
          onClose={() => setHistoryModal(null)}
          module={historyModal.module}
          moduleId={historyModal.id}
        />
      )}
    </div>
  );
};

export default MyLeavesPage;
