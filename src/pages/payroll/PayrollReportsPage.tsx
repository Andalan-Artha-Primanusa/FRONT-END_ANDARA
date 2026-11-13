import React, { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, FileText, DollarSign, Users, Eye, Download, AlertCircle, Receipt, ShieldCheck } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Modal } from '@/shared/ui/Modal';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { PayrollStatusBadge } from '@/shared/ui/PayrollStatusBadge';
import { payrollService, toSafeArray } from '@/features/payroll/api/payroll.service';
import { getApiBaseUrl } from '@/shared/api/httpClient';
import { parsePaginatedResponse } from '@/shared/api/pagination';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/employee/EmployeesPage.css';
import { PageHeader } from '@/shared/ui';

const formatCurrency = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `Rp ${(num || 0).toLocaleString("id-ID")}`;
};

const TABS = [
  { key: 'tax', label: 'Pajak & BPJS', icon: ShieldCheck },
  { key: 'detail', label: 'Laporan Detail', icon: FileText },
];

type TabKey = 'tax' | 'detail';

const PayrollReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('tax');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState<"Semua" | "Pending" | "Approved">("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [exportModal, setExportModal] = useState(false);
  const [exportPeriod, setExportPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [exportType, setExportType] = useState<"bca" | "summary">("bca");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await payrollService.getPayrollList({ page: currentPage, per_page: pageSize });
      const parsed = parsePaginatedResponse<any>(response);
      setData(parsed.items.length ? parsed.items : toSafeArray(response));
      setTotalPages(parsed.totalPages);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!exportPeriod) return;
    setExportLoading(true);
    try {
      const token = sessionStorage.getItem("token") || "";
      const baseUrl = getApiBaseUrl();
      const endpoint = exportType === "bca" ? `/payroll/export/bca-klikpay?period=${exportPeriod}` : `/payroll/export/summary?period=${exportPeriod}`;
      const response = await fetch(`${baseUrl}${endpoint}`, { headers: { Authorization: `Bearer ${token}`, "X-Company-Id": sessionStorage.getItem("selectedCompanyId") || "" } });
      if (!response.ok) throw new Error("Gagal mengunduh file export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportType === "bca" ? `bca-klikpay-${exportPeriod}.csv` : `payroll-summary-${exportPeriod}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      setExportModal(false);
    } catch (err: any) {
      setExportError(err.message || 'Gagal export');
    } finally {
      setExportLoading(false);
    }
  };

  const openDetail = async (item: any) => {
    setDetailLoading(true);
    setSelectedPayroll(item);
    try {
      const response = await payrollService.getPayrollSlip(item.id);
      setSelectedPayroll(response?.data ?? response);
    } catch (err: any) {
      console.error("Failed to load payroll detail:", err);
    } finally {
      setDetailLoading(false);
    }
    setDetailModal(true);
  };

  useEffect(() => {
    void loadData();
  }, [currentPage, pageSize]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const empName = (item.employee?.user?.name || '').toLowerCase();
      const empCode = (item.employee?.employee_code || '').toLowerCase();
      const query = searchText.toLowerCase();
      const matchSearch = empName.includes(query) || empCode.includes(query);
      let statusMatch = true;
      if (activeFilterTab === "Pending") statusMatch = item.status === 'pending';
      else if (activeFilterTab === "Approved") statusMatch = item.status === 'approved';
      return matchSearch && statusMatch;
    });
  }, [data, searchText, activeFilterTab]);

  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData;

  const taxSummary = useMemo(() => {
    const totals = data.reduce((acc, curr) => ({
      pph21: acc.pph21 + (parseFloat(curr.pph21) || 0),
      bpjs: acc.bpjs + (parseFloat(curr.bpjs_kesehatan) || 0) + (parseFloat(curr.bpjs_ketenagakerjaan) || 0),
      records: acc.records + 1
    }), { pph21: 0, bpjs: 0, records: 0 });
    return [
      { label: "Total PPh21", subtitle: "Akumulasi", value: formatCurrency(totals.pph21), tone: "blue" as const },
      { label: "Total BPJS", subtitle: "Kesehatan & TK", value: formatCurrency(totals.bpjs), tone: "orange" as const },
      { label: "Total Records", subtitle: "Jumlah entri", value: totals.records, tone: "green" as const },
    ];
  }, [data]);

  const detailSummary = useMemo(() => {
    const totals = data.reduce((acc, curr) => ({
      thp: acc.thp + (parseFloat(curr.take_home_pay) || 0),
      deductions: acc.deductions + (parseFloat(curr.total_deduction) || 0),
      records: acc.records + 1
    }), { thp: 0, deductions: 0, records: 0 });
    return [
      { label: "Total Take Home Pay", subtitle: "Akumulasi", value: formatCurrency(totals.thp), tone: "blue" as const },
      { label: "Total Potongan", subtitle: "Deductions", value: formatCurrency(totals.deductions), tone: "orange" as const },
      { label: "Total Records", subtitle: "Jumlah entri", value: totals.records, tone: "green" as const },
    ];
  }, [data]);

  useEffect(() => { setCurrentPage(1); }, [searchText, activeFilterTab]);

  return (
    <div className="crud-page">
      <PageHeader
        title="Laporan Pajak & Payroll"
        subtitle="Laporan komprehensif pajak, BPJS, dan detail payroll karyawan."
        badge={{ icon: FileText, label: "Pusat Payroll" }}
        scope
        actions={
          <>
            <button className="btn-outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Segarkan
            </button>
            <button className="btn-outline" onClick={() => setExportModal(true)} style={{ color: '#059669' }}>
              <Download size={16} /> Export
            </button>
          </>
        }
      />

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 24 }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      <div className="elyra-tabs" style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 4, display: "flex", marginBottom: "1.5rem" }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as TabKey)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                background: isActive ? "linear-gradient(135deg, var(--hero-bg-start), var(--hero-bg-end))" : "transparent",
                color: isActive ? "#fff" : "#64748b", fontWeight: isActive ? 700 : 500, fontSize: "0.875rem",
                fontFamily: "'Poppins', sans-serif", transition: "all 0.2s",
              }}
            >
              <Icon size={18} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {(activeTab === 'tax' ? taxSummary : detailSummary).map((card) => {
          const Icon = activeTab === 'tax'
            ? (card.tone === "blue" ? DollarSign : card.tone === "green" ? Users : ShieldCheck)
            : (card.tone === "blue" ? DollarSign : card.tone === "green" ? Users : Receipt);
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
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="table-section payroll-report-table-section">
        <div className="wuw-table-area payroll-report-table-area">
          <div className="table-toolbar payroll-report-table-toolbar">
            <div className="control-section-inner">
              <div className="elyra-tabs">
                {["Semua", "Pending", "Approved"].map((tab) => (
                  <button key={tab} className={`elyra-tab ${activeFilterTab === tab ? "active" : ""}`}
                    onClick={() => setActiveFilterTab(tab as "Semua" | "Pending" | "Approved")}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="control-actions">
                <div className="search-box">
                  <div className="search-icon-inside"><Search size={18} /></div>
                  <input type="text" placeholder="Cari karyawan atau kode..." value={searchText}
                    onChange={(e) => setSearchText(e.target.value)} className="search-input-pill" />
                </div>
              </div>
            </div>
          </div>
          {loading && <LoadingState message="Memuat data..." />}

          {!loading && paginatedData.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState title="Belum Ada Data"
                message={searchText || activeFilterTab !== "Semua" ? "Tidak ada data yang sesuai." : "Belum ada data payroll."}
                actionLabel="Segarkan" onAction={() => void loadData()} />
            </div>
          )}

          {!loading && paginatedData.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '250px' }}>Karyawan</th>
                      <th>Periode</th>
                      {activeTab === 'tax' ? (
                        <><th>Gaji Pokok</th><th>PPh21</th><th>BPJS Kesehatan</th><th>BPJS TK</th></>
                      ) : (
                        <><th>Gaji Pokok</th><th>Tunjangan</th><th>Lembur</th><th>Take Home Pay</th><th>Potongan</th></>
                      )}
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">{(item.employee?.user?.name || 'U')[0].toUpperCase()}</div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{item.employee?.user?.name || 'Unknown'}</span>
                              <span className="cell-stacked__sub">{item.employee?.employee_code || item.employee_id}</span>
                            </div>
                          </div>
                        </td>
                        <td><Badge variant="default">{item.period}</Badge></td>
                        {activeTab === 'tax' ? (
                          <>
                            <td style={{ fontWeight: 500 }}>{formatCurrency(item.basic_salary)}</td>
                            <td style={{ color: '#e11d48', fontWeight: 600 }}>{formatCurrency(item.pph21)}</td>
                            <td>{formatCurrency(item.bpjs_kesehatan)}</td>
                            <td>{formatCurrency(item.bpjs_ketenagakerjaan)}</td>
                          </>
                        ) : (
                          <>
                            <td style={{ fontWeight: 500 }}>{formatCurrency(item.basic_salary)}</td>
                            <td>{formatCurrency(item.allowances || item.allowance || 0)}</td>
                            <td>{formatCurrency(item.overtime_pay || 0)}</td>
                            <td style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(item.take_home_pay)}</td>
                            <td style={{ color: '#e11d48', fontWeight: 600 }}>{formatCurrency(item.total_deduction)}</td>
                          </>
                        )}
                        <td className="td-center">
                          <div className="action-btn-group">
                            <button className="action-btn action-btn-edit" title="Lihat Detail" onClick={() => openDetail(item)}>
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination">
                <div className="pagination-info">{filteredData.length === 0
                  ? 'Menampilkan 0 data'
                  : `Menampilkan ${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filteredData.length)} dari ${filteredData.length} data`}</div>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.max(1, safePage - 1))} disabled={safePage === 1}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button key={page} className={`pagination-btn ${safePage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                  ))}
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}>›</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={exportModal} onClose={() => setExportModal(false)} title="Export Payroll" size="md"
        footer={<>
          <button className="modal-btn-cancel" onClick={() => setExportModal(false)}>Batal</button>
          <button className="modal-btn-confirm" onClick={handleExport} disabled={exportLoading}
            style={{ background: 'linear-gradient(135deg, var(--hero-bg-start), var(--hero-bg-end))' }}>
            {exportLoading ? <><RefreshCw size={16} className="animate-spin" /> Memproses...</> : <><Download size={16} /> Download CSV</>}
          </button>
        </>}
      >
        <p className="modal-completion-task" style={{ marginBottom: '1rem' }}>Pilih tipe export dan periode</p>
        <label className="modal-completion-label">Tipe Export</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          {([['bca', 'BCA KlikPay CSV', 'Format siap import ke BCA KlikPay', DollarSign], ['summary', 'Summary Lengkap', 'Detail gaji, tunjangan, potongan, BPJS, PPh21', FileText]] as const).map(([key, title, desc, Icon]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: exportType === key ? '2px solid var(--color-primary)' : '2px solid #e2e8f0', background: exportType === key ? '#eff6ff' : '#fff', cursor: 'pointer' }} onClick={() => setExportType(key)}>
              <input type="radio" name="exportTypeReport" checked={exportType === key} onChange={() => setExportType(key)} style={{ accentColor: 'var(--color-primary)' }} />
              <Icon size={20} color="var(--color-primary)" />
              <div><div style={{ fontWeight: 600, color: '#1e293b' }}>{title}</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>{desc}</div></div>
            </label>
          ))}
        </div>
        <label className="modal-completion-label" style={{ marginTop: 16 }}>Periode</label>
        <input type="month" className="crud-input" value={exportPeriod} onChange={(e) => setExportPeriod(e.target.value)} style={{ width: '100%', marginTop: 8 }} />
      </Modal>

      <Modal isOpen={!!exportError} onClose={() => setExportError(null)} title="Export Gagal" size="md"
        footer={<>
          <button className="modal-btn-cancel" onClick={() => setExportError(null)}>Tutup</button>
          <button className="modal-btn-confirm" onClick={() => { setExportError(null); setExportModal(true); }} style={{ background: 'linear-gradient(135deg, var(--hero-bg-start), var(--hero-bg-end))' }}>Coba Lagi</button>
        </>}
      >
        <p className="modal-completion-task" style={{ marginBottom: '1rem' }}>Tidak bisa mengunduh file</p>
        <div style={{ padding: 16, background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca' }}>
          <p style={{ color: '#991b1b', fontWeight: 600, margin: '0 0 8px' }}>Penyebab:</p>
          <p style={{ color: '#7f1d1d', margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>{exportError}</p>
        </div>
        <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
          <strong>Solusi:</strong> Generate payroll untuk periode <strong>{exportPeriod}</strong> dan pastikan statusnya approved/paid.
        </div>
      </Modal>

      <Modal isOpen={detailModal && !!selectedPayroll} onClose={() => setDetailModal(false)}
        title={'Detail ' + (activeTab === 'tax' ? 'Pajak & BPJS' : 'Payroll')} size="lg"
        footer={<button className="modal-btn-cancel" onClick={() => setDetailModal(false)}>Tutup</button>}
      >
        <p className="modal-completion-task" style={{ marginBottom: '1rem' }}>{selectedPayroll?.employee?.name || selectedPayroll?.employee?.user?.name || '-'} • {selectedPayroll?.period || '-'}</p>
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <p>Memuat detail...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Gaji Pokok</p>
                <p style={{ fontWeight: 600, color: '#1e293b', margin: '4px 0 0' }}>{formatCurrency(selectedPayroll?.summary?.basic_salary ?? selectedPayroll?.basic_salary ?? 0)}</p>
              </div>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Tunjangan</p>
                <p style={{ fontWeight: 600, color: '#1e293b', margin: '4px 0 0' }}>{formatCurrency(selectedPayroll?.summary?.allowance ?? selectedPayroll?.allowance ?? 0)}</p>
              </div>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Bonus</p>
                <p style={{ fontWeight: 600, color: '#1e293b', margin: '4px 0 0' }}>{formatCurrency(selectedPayroll?.summary?.bonus ?? selectedPayroll?.bonus ?? 0)}</p>
              </div>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Gross Pay</p>
                <p style={{ fontWeight: 600, color: '#1e293b', margin: '4px 0 0' }}>{formatCurrency(selectedPayroll?.summary?.gross_pay ?? 0)}</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
              <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Potongan</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef2f2', borderRadius: 8 }}>
                  <span style={{ color: '#64748b' }}>PPh 21</span>
                  <span style={{ fontWeight: 600, color: '#e11d48' }}>{formatCurrency(selectedPayroll?.summary?.pph21 ?? selectedPayroll?.pph21 ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef2f2', borderRadius: 8 }}>
                  <span style={{ color: '#64748b' }}>BPJS Kesehatan</span>
                  <span style={{ fontWeight: 600, color: '#e11d48' }}>{formatCurrency(selectedPayroll?.summary?.bpjs_kesehatan ?? selectedPayroll?.bpjs_kesehatan ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef2f2', borderRadius: 8 }}>
                  <span style={{ color: '#64748b' }}>BPJS Ketenagakerjaan</span>
                  <span style={{ fontWeight: 600, color: '#e11d48' }}>{formatCurrency(selectedPayroll?.summary?.bpjs_ketenagakerjaan ?? selectedPayroll?.bpjs_ketenagakerjaan ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fee2e2', borderRadius: 8, fontWeight: 600 }}>
                  <span style={{ color: '#991b1b' }}>Total Potongan</span>
                  <span style={{ color: '#dc2626' }}>{formatCurrency(selectedPayroll?.summary?.total_deduction ?? selectedPayroll?.total_deduction ?? 0)}</span>
                </div>
              </div>
            </div>
            <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 12, textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: '#166534', margin: 0 }}>Take Home Pay</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', margin: '4px 0 0' }}>{formatCurrency(selectedPayroll?.summary?.take_home_pay ?? selectedPayroll?.take_home_pay ?? 0)}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PayrollReportsPage;
