import React, { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, FileText, DollarSign, Receipt, Users, Eye, Download, AlertCircle } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Modal } from '@/shared/ui/Modal';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { payrollService, toSafeArray } from '@/features/payroll/api/payroll.service';
import { getApiBaseUrl } from '@/shared/api/httpClient';
import { parsePaginatedResponse } from '@/shared/api/pagination';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import { PageHeader } from '@/shared/ui';

const formatCurrency = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `Rp ${(num || 0).toLocaleString("id-ID")}`;
};

const PayrollReportsDetailedPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"Semua" | "Pending" | "Approved">("Semua");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Export
  const [exportModal, setExportModal] = useState(false);
  const [exportPeriod, setExportPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [exportType, setExportType] = useState<"bca" | "summary">("bca");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Detail Modal
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
      setError(err?.response?.data?.message || err.message || 'Gagal memuat data payroll');
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

      const endpoint = exportType === "bca"
        ? `/payroll/export/bca-klikpay?period=${exportPeriod}`
        : `/payroll/export/summary?period=${exportPeriod}`;

      const url = `${baseUrl}${endpoint}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Company-Id": sessionStorage.getItem("selectedCompanyId") || "",
        },
      });

      if (!response.ok) {
        throw new Error("Gagal mengunduh file export");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = exportType === "bca"
        ? `bca-klikpay-${exportPeriod}.csv`
        : `payroll-summary-${exportPeriod}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

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
      if (activeTab === "Pending") statusMatch = item.status === 'pending';
      else if (activeTab === "Approved") statusMatch = item.status === 'approved';

      return matchSearch && statusMatch;
    });
  }, [data, searchText, activeTab]);

  const paginatedData = filteredData;

  const [totalPages, setTotalPages] = useState(1);

  const summaryStats = useMemo(() => {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _clearFilters = () => {
    setSearchText("");
    setActiveTab("Semua");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  return (
    <div className="crud-page">
      {/* Header */}
      <PageHeader
        title="Laporan Detail Payroll"
        subtitle="Laporan komprehensif seluruh komponen penghasilan dan potongan karyawan."
        badge={{ icon: Receipt, label: "Pusat Payroll" }}
        actions={
          <>
            <button className="btn-outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
            <button
              className="btn-outline"
              onClick={() => setExportModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#059669', fontSize: '0.9rem', fontWeight: '600', fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}
            >
              <Download size={16} />
              Export Payroll
            </button>
          </>
        }
      />

      {/* Error Message */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 24 }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {summaryStats.map((card) => {
          const Icon = card.tone === "blue" ? DollarSign : card.tone === "green" ? Users : Receipt;

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
              <p className="employee-summary-trend">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Title Card */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Laporan Payroll</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua data payroll</p>
          </div>
        </div>
      </Card>

      {/* Control Section */}
      <Card className="control-section-card">
        <div className="control-section-inner">
          {/* Tabs */}
          <div className="elyra-tabs">
            {["Semua", "Pending", "Approved"].map((tab) => (
              <button
                key={tab}
                className={`elyra-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab as "Semua" | "Pending" | "Approved")}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari karyawan atau kode..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <div className="table-section">
        <div className="wuw-table-area">
          {loading && <LoadingState message="Memuat laporan payroll..." />}

          {!loading && error && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Akses Ditolak"
                message={error}
                actionLabel="Segarkan"
                onAction={() => void loadData()}
              />
            </div>
          )}

          {!loading && !error && paginatedData.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Belum Ada Data"
                message={searchText || activeTab !== "Semua"
                  ? "Tidak ada data yang sesuai dengan kriteria Anda."
                  : "Belum ada data payroll yang dibuat."}
                actionLabel="Segarkan"
                onAction={() => void loadData()}
              />
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
                      <th>Gaji Pokok</th>
                      <th>Tunjangan</th>
                      <th>Lembur</th>
                      <th>Take Home Pay</th>
                      <th>Potongan</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {(item.employee?.user?.name || 'U')[0].toUpperCase()}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{item.employee?.user?.name || 'Unknown'}</span>
                              <span className="cell-stacked__sub">{item.employee?.employee_code || item.employee_id}</span>
                            </div>
                          </div>
                        </td>
                        <td><Badge variant="default">{item.period}</Badge></td>
                        <td style={{ fontWeight: 500 }}>{formatCurrency(item.basic_salary)}</td>
                        <td>{formatCurrency(item.allowances || 0)}</td>
                        <td>{formatCurrency(item.overtime_pay || 0)}</td>
                        <td style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(item.take_home_pay)}</td>
                        <td style={{ color: '#e11d48', fontWeight: 600 }}>{formatCurrency(item.total_deduction)}</td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            <button
                              className="action-btn action-btn-edit"
                              title="Lihat Detail"
                              onClick={() => openDetail(item)}
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="table-pagination">
                <div className="pagination-info">
                  {filteredData.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredData.length)} dari ${filteredData.length} data`}
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
                      className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
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

      <Modal isOpen={exportModal} onClose={() => setExportModal(false)} title="Export Payroll" size="md"
        footer={<>
          <button className="modal-btn-cancel" onClick={() => setExportModal(false)}>Batal</button>
          <button className="modal-btn-confirm" onClick={handleExport} disabled={exportLoading}
            style={{ background: 'linear-gradient(135deg, var(--hero-bg-start) 0%, var(--hero-bg-end) 100%)', boxShadow: '0 4px 14px rgba(10, 122, 62, 0.3)' }}>
            {exportLoading ? <><RefreshCw size={16} className="animate-spin" /> Memproses...</> : <><Download size={16} /> Download CSV</>}
          </button>
        </>}
      >
        <p className="modal-completion-task" style={{ marginBottom: '1rem' }}>Pilih tipe export dan periode</p>
        <label className="modal-completion-label">Tipe Export</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', border: exportType === 'bca' ? '2px solid var(--color-primary)' : '2px solid #e2e8f0', background: exportType === 'bca' ? '#eff6ff' : '#fff', cursor: 'pointer' }} onClick={() => setExportType('bca')}>
            <input type="radio" name="exportTypeReport" checked={exportType === 'bca'} onChange={() => setExportType('bca')} style={{ accentColor: 'var(--color-primary)' }} />
            <DollarSign size={20} color="var(--color-primary)" />
            <div><div style={{ fontWeight: 600, color: '#1e293b' }}>BCA KlikPay CSV</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>Format siap import ke BCA KlikPay</div></div>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', border: exportType === 'summary' ? '2px solid var(--color-primary)' : '2px solid #e2e8f0', background: exportType === 'summary' ? '#eff6ff' : '#fff', cursor: 'pointer' }} onClick={() => setExportType('summary')}>
            <input type="radio" name="exportTypeReport" checked={exportType === 'summary'} onChange={() => setExportType('summary')} style={{ accentColor: 'var(--color-primary)' }} />
            <FileText size={20} color="var(--color-primary)" />
            <div><div style={{ fontWeight: 600, color: '#1e293b' }}>Summary Lengkap</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>Detail gaji, tunjangan, potongan, BPJS, PPh21</div></div>
          </label>
        </div>
        <label className="modal-completion-label" style={{ marginTop: '16px' }}>Periode</label>
        <input type="month" className="crud-input" value={exportPeriod} onChange={(e) => setExportPeriod(e.target.value)} style={{ width: '100%', marginTop: '8px' }} />
      </Modal>

      <Modal isOpen={!!exportError} onClose={() => setExportError(null)} title="Export Gagal" size="md"
        footer={<>
          <button className="modal-btn-cancel" onClick={() => setExportError(null)}>Tutup</button>
          <button className="modal-btn-confirm" onClick={() => { setExportError(null); setExportModal(true); }} style={{ background: 'linear-gradient(135deg, var(--hero-bg-start) 0%, var(--hero-bg-end) 100%)' }}>Coba Lagi</button>
        </>}
      >
        <p className="modal-completion-task" style={{ marginBottom: '1rem' }}>Tidak bisa mengunduh file</p>
        <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
          <p style={{ color: '#991b1b', fontWeight: 600, margin: '0 0 8px' }}>Penyebab:</p>
          <p style={{ color: '#7f1d1d', margin: 0, fontSize: '0.9rem', lineHeight: '1.6' }}>{exportError}</p>
        </div>
        <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem', color: '#475569', lineHeight: '1.6' }}>
          <strong>Solusi:</strong> Pastikan sudah generate payroll untuk periode <strong>{exportPeriod}</strong> dan statusnya sudah approved/paid.
        </div>
      </Modal>

      <Modal isOpen={detailModal && !!selectedPayroll} onClose={() => setDetailModal(false)} title="Detail Payroll" size="lg"
        footer={<button className="modal-btn-cancel" onClick={() => setDetailModal(false)}>Tutup</button>}
      >
        <p className="modal-completion-task" style={{ marginBottom: '1rem' }}>{selectedPayroll?.employee?.name || selectedPayroll?.employee?.user?.name || '-'} • {selectedPayroll?.period || '-'}</p>
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <p>Memuat detail...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Gaji Pokok</p>
                <p style={{ fontWeight: 600, color: '#1e293b', margin: '4px 0 0' }}>{formatCurrency(selectedPayroll?.summary?.basic_salary ?? selectedPayroll?.basic_salary ?? 0)}</p>
              </div>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Tunjangan</p>
                <p style={{ fontWeight: 600, color: '#1e293b', margin: '4px 0 0' }}>{formatCurrency(selectedPayroll?.summary?.allowance ?? selectedPayroll?.allowance ?? 0)}</p>
              </div>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Bonus</p>
                <p style={{ fontWeight: 600, color: '#1e293b', margin: '4px 0 0' }}>{formatCurrency(selectedPayroll?.summary?.bonus ?? selectedPayroll?.bonus ?? 0)}</p>
              </div>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Gross Pay</p>
                <p style={{ fontWeight: 600, color: '#1e293b', margin: '4px 0 0' }}>{formatCurrency(selectedPayroll?.summary?.gross_pay ?? 0)}</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Potongan</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef2f2', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b' }}>PPh 21</span>
                  <span style={{ fontWeight: 600, color: '#e11d48' }}>{formatCurrency(selectedPayroll?.summary?.pph21 ?? selectedPayroll?.pph21 ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef2f2', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b' }}>BPJS Kesehatan</span>
                  <span style={{ fontWeight: 600, color: '#e11d48' }}>{formatCurrency(selectedPayroll?.summary?.bpjs_kesehatan ?? selectedPayroll?.bpjs_kesehatan ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef2f2', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b' }}>BPJS Ketenagakerjaan</span>
                  <span style={{ fontWeight: 600, color: '#e11d48' }}>{formatCurrency(selectedPayroll?.summary?.bpjs_ketenagakerjaan ?? selectedPayroll?.bpjs_ketenagakerjaan ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fee2e2', borderRadius: '8px', fontWeight: 600 }}>
                  <span style={{ color: '#991b1b' }}>Total Potongan</span>
                  <span style={{ color: '#dc2626' }}>{formatCurrency(selectedPayroll?.summary?.total_deduction ?? selectedPayroll?.total_deduction ?? 0)}</span>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: '#166534', margin: 0 }}>Take Home Pay</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', margin: '4px 0 0' }}>{formatCurrency(selectedPayroll?.summary?.take_home_pay ?? selectedPayroll?.take_home_pay ?? 0)}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PayrollReportsDetailedPage;
