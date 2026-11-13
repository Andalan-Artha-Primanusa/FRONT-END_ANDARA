import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, CreditCard, FileText, ShieldCheck, RefreshCw, CheckCircle, DollarSign, Zap, AlertTriangle } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { PaginationWithSize } from "@/shared/ui/Pagination";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { showToast } from "@/shared/ui/toast";
import { PayrollStatusBadge } from "@/shared/ui/PayrollStatusBadge";
import { payrollService, toSafeArray } from "@/features/payroll/api/payroll.service";
import { getAllEmployees } from "@/features/employee/api/employee.service";
import type { PayrollItem } from "@/features/payroll/types/payroll.types";
import type { EmployeeItem } from "@/features/employee/types/employee.types";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./PayrollListPage.css";
import "./PayrollPaymentPage.css";
import { PageHeader } from "@/shared/ui";

const PayrollPaymentPage = () => {
  const navigate = useNavigate();
  const [payrollId, setPayrollId] = useState("");
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollItem | null>(null);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [allPayrolls, setAllPayrolls] = useState<PayrollItem[]>([]);
  const [currentPageRecent, setCurrentPageRecent] = useState(1);
  const [itemsPerPageRecent, setItemsPerPageRecent] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [loading, setLoading] = useState(false);
  const [bulkPayModal, setBulkPayModal] = useState(false);
  const [bulkPayLoading, setBulkPayLoading] = useState(false);
  const [bulkPeriod, setBulkPeriod] = useState<string>(""); // dedicated state for bulk pay panel
  const loadData = async () => {
    setLoading(true);
    try {
      const [empsData, payrollsData] = await Promise.all([
        getAllEmployees(),
        payrollService.getPayrollList()
      ]);
      setEmployees(toSafeArray(empsData));
      setAllPayrolls(toSafeArray(payrollsData));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const handleViewDetail = async () => {
    if (!payrollId.trim()) {
      showToast("Masukkan Payroll ID terlebih dahulu", "error");
      return;
    }

    setLoading(true);
    try {
      const cleanId = String(payrollId).replace(/^[A-Z]+/, "").replace(/^0+/, "") || payrollId;
      const payroll = await payrollService.getPayrollDetail(cleanId);
      setSelectedPayroll(payroll);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memuat detail payroll", "error");
      setSelectedPayroll(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedPayroll) {
      showToast("Pilih payroll terlebih dahulu", "error");
      return;
    }
    if (selectedPayroll.status !== "approved") {
      showToast(`Hanya payroll berstatus sudah disetujui yang bisa ditandai dibayar. Status saat ini: ${selectedPayroll.status}`, "error");
      return;
    }
    setLoading(true);
    try {
      const payrollIdValue = String(selectedPayroll.id);
      await payrollService.processPayment(payrollIdValue);
      showToast(`Payroll #${payrollIdValue} berhasil ditandai sebagai dibayar`, "success");
      setSelectedPayroll(null);
      await loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menandai payroll sebagai dibayar", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPay = async () => {
    if (!bulkPeriod) {
      showToast("Pilih periode terlebih dahulu sebelum pembayaran massal", "error");
      setBulkPayModal(false);
      return;
    }
    setBulkPayLoading(true);
    try {
      const result = await payrollService.bulkMarkAsPaid(bulkPeriod);
      const total = result?.data?.total_paid ?? result?.total_paid ?? approvedForBulk.length;
      showToast(`Pembayaran massal selesai — ${total} payroll periode ${bulkPeriod} berhasil ditandai dibayar`, "success");
      setBulkPayModal(false);
      await loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Terjadi kesalahan", "error");
    } finally {
      setBulkPayLoading(false);
    }
  };

  const getEmployeeName = (empId: string | number) => {
    const employee = safeEmployees.find((entry) => entry.id === empId || String(entry.id) === String(empId));
    return employee ? `${employee.employee_code} - ${employee.user?.name || "Unknown"}` : "Unknown";
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "#999",
      pending: "#f59e0b",
      approved: "var(--color-primary)",
      paid: "#10b981",
      rejected: "#ef4444",
    };
    return colors[status] || "#999";
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Draft",
      pending: "Menunggu",
      approved: "Disetujui",
      paid: "Sudah Dibayar",
      rejected: "Ditolak",
    };
    return labels[status] || status;
  };

  const safePayrolls = Array.isArray(allPayrolls) ? allPayrolls : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];

  // Approved payrolls for bulk pay panel (uses its own period state)
  const approvedForBulk = safePayrolls.filter(
    (p) => p.status === "approved" && (bulkPeriod === "" || String(p.period) === bulkPeriod)
  );
  const totalBulkTHP = approvedForBulk.reduce((s, p) => s + Number(p.take_home_pay || p.net_salary || 0), 0);

  // Unique periods from all payrolls for dropdowns
  const allPeriods = Array.from(new Set(safePayrolls.map(p => p.period).filter(Boolean))).sort().reverse() as string[];

  // Count approved for table filter (existing logic)
  const approvedInPeriod = safePayrolls.filter(
    (p) => p.status === "approved" && (periodFilter === "all" || String(p.period) === periodFilter)
  );

  const summaryCards = [
    {
      label: "All Payroll",
      subtitle: "Seluruh payroll yang dimuat",
      value: String(safePayrolls.length),
      change: "Ringkasan data payroll",
      tone: "blue" as const,
      icon: FileText,
    },
    {
      label: "Selected",
      subtitle: "Payroll yang sedang dibuka",
      value: selectedPayroll ? "1" : "0",
      change: selectedPayroll ? `ID ${selectedPayroll.id}` : "Belum ada pilihan",
      tone: "green" as const,
      icon: BarChart3,
    },
    {
      label: "Ready to Pay",
      subtitle: "Status yang belum paid",
      value: String(safePayrolls.filter((item) => item.status !== "paid").length),
      change: "Perlu ditinjau atau diproses",
      tone: "orange" as const,
      icon: ShieldCheck,
    },
    {
      label: "Paid",
      subtitle: "Sudah ditandai dibayar",
      value: String(safePayrolls.filter((item) => item.status === "paid").length),
      change: "Status final pembayaran",
      tone: "purple" as const,
      icon: CreditCard,
    },
  ];

  const filteredPayrolls = safePayrolls.filter((p) => {
    if (paymentFilter === 'paid' && String(p.status).toLowerCase() !== 'paid') return false;
    if (paymentFilter === 'unpaid' && String(p.status).toLowerCase() === 'paid') return false;
    if (periodFilter !== 'all' && String(p.period) !== periodFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const emp = safeEmployees.find(e => String(e.id) === String(p.employee_id) || e.employee_code === String(p.employee_id));
      const name = emp?.user?.name || emp?.employee_code || "";
      if (!String(p.id).toLowerCase().includes(q) && !String(p.period || "").toLowerCase().includes(q) && !name.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const [totalPagesRecent, setTotalPagesRecent] = useState(1);
  const recentPayrolls = filteredPayrolls.slice((currentPageRecent - 1) * itemsPerPageRecent, currentPageRecent * itemsPerPageRecent);

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(filteredPayrolls.length / itemsPerPageRecent));
    setTotalPagesRecent(nextTotalPages);
    setCurrentPageRecent((page) => Math.min(page, nextTotalPages));
  }, [filteredPayrolls, itemsPerPageRecent]);

  return (
    <div className="crud-page">
      <PageHeader
        title="Pembayaran Payroll"
        subtitle="Tandai payroll yang sudah dibayarkan kepada karyawan."
        badge={{ icon: CreditCard, label: "Pusat Payroll" }}
        actions={
          <>
            <button className="btn-outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
            <button className="btn-primary" onClick={() => navigate('/payroll/approve')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: '600', fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
              Halaman Approval
            </button>
          </>
        }
      />

      <div className="summary-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.label} className="metric-card">
              <div className="metric-header">
                <div>
                  <span className="metric-label">{card.label}</span>
                  <p className="metric-subtitle">{card.subtitle}</p>
                </div>
                <span className={`metric-icon metric-icon--${card.tone}`}>
                  <Icon size={22} />
                </span>
              </div>
              <div className="metric-value" style={{ color: card.tone === 'orange' ? '#f59e0b' : card.tone === 'blue' ? 'var(--color-primary)' : card.tone === 'green' ? '#10b981' : '#8b5cf6' }}>{card.value}</div>
              <div className="summary-card-change">{card.change}</div>
            </Card>
          );
        })}
      </div>

      {/* ── BULK PAY PANEL — Selalu Terlihat ── */}
      <Card style={{ padding: '1.5rem', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', border: '1.5px solid #86efac', borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#065f46' }}>Pembayaran Massal</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6ee7b7' }}>Tandai semua payroll yang sudah disetujui sebagai dibayar sekaligus</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
          {/* Period Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Pilih Periode
            </label>
            <select
              value={bulkPeriod}
              onChange={(e) => setBulkPeriod(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #6ee7b7', background: '#fff', fontSize: '0.9rem', fontFamily: "'Poppins', sans-serif", color: '#065f46', outline: 'none' }}
            >
              <option value="">-- Pilih Periode --</option>
              {allPeriods.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Info Box */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #a7f3d0', padding: '10px 14px' }}>
            {bulkPeriod ? (
              approvedForBulk.length > 0 ? (
                <>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                    ✅ {approvedForBulk.length} payroll siap dibayar
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.875rem', fontWeight: 700, color: '#065f46' }}>
                    Total: Rp {totalBulkTHP.toLocaleString('id-ID')}
                  </p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>Tidak ada payroll <strong>approved</strong> di periode ini</p>
              )
            ) : (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>Pilih periode untuk melihat detail</p>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={() => { if (!bulkPeriod) { showToast("Pilih periode terlebih dahulu", "error"); return; } setBulkPayModal(true); }}
            disabled={loading || !bulkPeriod || approvedForBulk.length === 0}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: (!bulkPeriod || approvedForBulk.length === 0)
                ? '#d1fae5'
                : 'linear-gradient(135deg, #10b981, #059669)',
              color: (!bulkPeriod || approvedForBulk.length === 0) ? '#6b7280' : '#fff',
              fontSize: '0.9rem', fontWeight: 700, fontFamily: "'Poppins', sans-serif",
              cursor: (!bulkPeriod || approvedForBulk.length === 0) ? 'not-allowed' : 'pointer',
              boxShadow: (!bulkPeriod || approvedForBulk.length === 0) ? 'none' : '0 4px 12px rgba(16,185,129,0.35)',
              whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}
          >
            <Zap size={16} />
            {approvedForBulk.length > 0 ? `Bayar ${approvedForBulk.length} Payroll` : 'Bayar Semua'}
          </button>
        </div>
      </Card>

      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <DollarSign size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Pembayaran Payroll</h2>
            <p className="analytics-subtitle">Pilih payroll untuk tandai dibayar</p>
          </div>
        </div>
      </Card>

      <Card className="crud-table-card" style={{ minHeight: 160 }}>
        <div className="payroll-payment-input-grid">
          <div className="payroll-payment-quick-panel" style={{ flex: 1, minHeight: 160 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <p className="payroll-payment-quick-title" style={{ margin: 0 }}>Payroll</p>
                <input
                  placeholder="Cari ID, karyawan, atau periode"
                  className="crud-input crud-input--sm"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPageRecent(1); }}
                  style={{ minWidth: 220 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value as any); setCurrentPageRecent(1); }} className="sort-select">
                  <option value="all">Semua Status</option>
                  <option value="unpaid">Belum Dibayar</option>
                  <option value="paid">Sudah Dibayar</option>
                </select>
                <select value={periodFilter} onChange={(e) => { setPeriodFilter(e.target.value); setCurrentPageRecent(1); }} className="sort-select">
                  <option value="all">Semua Periode</option>
                  {Array.from(new Set(safePayrolls.map(p => p.period).filter(Boolean))).map((prd) => (
                    <option key={String(prd)} value={String(prd)}>{String(prd)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="crud-table-wrap" style={{ minHeight: 160 }}>
              <table className="crud-table payroll-payment-table" style={{ width: '100%', fontSize: '0.95rem' }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Karyawan</th>
                    <th>Periode</th>
                    <th className="numeric">Gaji Pokok</th>
                    <th className="numeric">Take Home Pay</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayrolls.length > 0 ? (
                    recentPayrolls.map((payroll) => (
                      <tr key={payroll.id} className={selectedPayroll?.id === payroll.id ? 'is-selected-row' : ''}>
                        <td>{payroll.id}</td>
                        <td title={getEmployeeName(payroll.employee_id)}>{getEmployeeName(payroll.employee_id)}</td>
                        <td>{payroll.period}</td>
                        <td className="numeric">Rp {Number(payroll.basic_salary || 0).toLocaleString('id-ID')}</td>
                        <td className="numeric">Rp {Number(payroll.take_home_pay || payroll.net_salary || 0).toLocaleString('id-ID')}</td>
                        <td><PayrollStatusBadge status={payroll.status || 'pending'} size="sm" /></td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Button variant="outline" size="sm" onClick={() => { setPayrollId(String(payroll.id)); setSelectedPayroll(payroll); }}>
                              Lihat
                            </Button>
                            {String(payroll.status).toLowerCase() !== 'paid' && (
                              <Button variant="primary" size="sm" onClick={() => { setPayrollId(String(payroll.id)); setSelectedPayroll(payroll); }}>
                                Tandai Dibayar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        Tidak ada payroll untuk kriteria ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredPayrolls.length > itemsPerPageRecent && (
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <PaginationWithSize
                  currentPage={currentPageRecent}
                  totalPages={totalPagesRecent}
                  onPageChange={(p) => setCurrentPageRecent(p)}
                  totalItems={filteredPayrolls.length}
                  itemsPerPage={itemsPerPageRecent}
                  onItemsPerPageChange={(s) => setItemsPerPageRecent(s)}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Single Payment Confirmation Modal */}
      <Modal
        isOpen={!!selectedPayroll}
        onClose={() => setSelectedPayroll(null)}
        title={`Konfirmasi Pembayaran Payroll #${selectedPayroll?.id}`}
        size="lg"
      >
        {selectedPayroll && (
          <div className="payroll-payment-modal-container">
            <div className="payroll-payment-status-wrap" style={{ marginBottom: '1.5rem' }}>
              <PayrollStatusBadge status={selectedPayroll.status || 'approved'} size="lg" />
            </div>

            {selectedPayroll.status !== "approved" && (
              <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: '#92400e' }}>
                <AlertTriangle size={16} />
                <span>Payroll ini berstatus <strong>{selectedPayroll.status}</strong> — hanya payroll <strong>approved</strong> yang bisa ditandai dibayar.</span>
              </div>
            )}

            <div className="payroll-payment-detail-grid">
              <div className="payroll-payment-detail-column">
                <p className="payroll-payment-detail-label"><strong>Karyawan</strong></p>
                <p className="payroll-payment-detail-value">{getEmployeeName(selectedPayroll.employee_id)}</p>
                <p className="payroll-payment-detail-label"><strong>Periode</strong></p>
                <p className="payroll-payment-detail-value">{selectedPayroll.period}</p>
                <p className="payroll-payment-detail-label"><strong>Gaji Pokok</strong></p>
                <p className="payroll-payment-detail-value payroll-payment-detail-value--success">
                  Rp {Number(selectedPayroll.basic_salary || 0).toLocaleString("id-ID")}
                </p>
              </div>
              <div className="payroll-payment-detail-column">
                <p className="payroll-payment-detail-label"><strong>Tunjangan</strong></p>
                <p className="payroll-payment-detail-value payroll-payment-detail-value--success">Rp {Number(selectedPayroll.allowance || 0).toLocaleString("id-ID")}</p>
                <p className="payroll-payment-detail-label"><strong>Total Potongan</strong></p>
                <p className="payroll-payment-detail-value payroll-payment-detail-value--danger">Rp {Number(selectedPayroll.total_deduction || 0).toLocaleString("id-ID")}</p>
              </div>
            </div>

            <div className="payroll-payment-total-box" style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(16,185,129,0.05)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.15)' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Take Home Pay</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', margin: '4px 0 0 0' }}>
                Rp {Number(selectedPayroll.take_home_pay || selectedPayroll.net_salary || 0).toLocaleString("id-ID")}
              </p>
            </div>

            <div className="payroll-payment-actions" style={{ marginTop: '2rem', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="outline" size="md" onClick={() => setSelectedPayroll(null)} disabled={loading}>Batal</Button>
              {selectedPayroll.status === "paid" ? (
                <div style={{ color: '#10b981', fontWeight: 500, alignSelf: 'center' }}>✓ Sudah dibayar</div>
              ) : (
                <Button variant="primary" size="md" onClick={() => void handleMarkAsPaid()} disabled={loading || selectedPayroll.status !== "approved"}>
                  Tandai Sebagai Dibayar
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Pay Confirmation Modal */}
      <Modal isOpen={bulkPayModal} onClose={() => setBulkPayModal(false)} title="Konfirmasi Pembayaran Massal" size="md">
        <div style={{ padding: '8px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <Zap size={48} color="#10b981" />
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#166534' }}>
              Tandai {approvedForBulk.length} payroll sebagai DIBAYAR
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: '#166534' }}>
              Periode: <strong>{bulkPeriod}</strong><br />
              Total Take Home Pay: <strong>Rp {totalBulkTHP.toLocaleString('id-ID')}</strong>
            </p>
          </div>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.875rem', color: '#9a3412' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Tindakan ini <strong>tidak dapat dibatalkan</strong>. Semua payroll <strong>approved</strong> pada periode <strong>{bulkPeriod}</strong> akan berubah ke status <strong>paid</strong> secara permanen.</span>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="outline" size="md" onClick={() => setBulkPayModal(false)} disabled={bulkPayLoading}>Batal</Button>
            <Button variant="primary" size="md" onClick={() => void handleBulkPay()} disabled={bulkPayLoading}>
              <Zap size={16} style={{ marginRight: 6 }} />
              {bulkPayLoading ? 'Memproses...' : `Ya, Bayar ${approvedForBulk.length} Payroll`}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default PayrollPaymentPage;
