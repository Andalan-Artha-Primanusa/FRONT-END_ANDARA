import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, PageHeader } from "@/shared/ui";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { showToast } from "@/shared/ui/toast";
import { LoadingState, ErrorState, EmptyState } from "@/shared/ui/DataStateDisplay";
import { BarChart3, CheckCircle2, Receipt, Wallet, Download, Printer, RefreshCw, Search, Eye } from "lucide-react";
import { getMyPayroll, getMyPayrollSlip, exportMyPayrollCsv, exportMyPayrollPdf } from "@/features/ess/api/ess.service";
import { useAuthStore } from "@/app/store/auth.store";
import type { GenericApiItem } from "@/features/ess/types/ess.types";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";

const MyPayrollPage = () => {
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<GenericApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Search & Filter
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"Semua" | "Paid" | "Pending" | "Draft">("Semua");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const loadPayroll = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await getMyPayroll(currentPage, pageSize);
      setItems(result.items);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Failed to load payroll:", error);
      setErrorMessage('Gagal memuat slip gaji');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPayroll();
  }, []);

  const summaryStats = useMemo(() => {
    const paidCount = items.filter((item) => String(item.status ?? "").toLowerCase() === "paid").length;
    const totalNetSalary = items.reduce((sum, item) => sum + (Number(item.take_home_pay || item.net_salary) || 0), 0);
    const _uniquePeriods = new Set(items.map((item) => String(item.period ?? "")).filter(Boolean));
    const pendingCount = items.filter((item) => String(item.status ?? "").toLowerCase() === "pending" || String(item.status ?? "").toLowerCase() === "draft").length;

    return [
      { label: "Total Slip", subtitle: "Seluruh riwayat payroll", value: String(items.length), tone: "blue" as const },
      { label: "Sudah Dibayar", subtitle: "Slip yang telah cair", value: String(paidCount), tone: "green" as const },
      { label: "Pending", subtitle: "Menunggu pembayaran", value: String(pendingCount), tone: "orange" as const },
      { label: "Total Gaji Bersih", subtitle: "Akumulasi pendapatan", value: `Rp ${totalNetSalary.toLocaleString("id-ID")}`, tone: "red" as const },
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const period = String(item.period || '').toLowerCase();
      const query = searchText.toLowerCase();
      const matchSearch = period.includes(query) || 
        ((item as any).employee?.user && typeof (item as any).employee.user === 'object' && 'name' in (item as any).employee.user && (item as any).employee.user.name.toLowerCase().includes(query));

      let statusMatch = true;
      if (activeTab === "Paid") statusMatch = String(item.status ?? "").toLowerCase() === "paid";
      else if (activeTab === "Pending") statusMatch = ["pending", "draft"].includes(String(item.status ?? "").toLowerCase());
      else if (activeTab === "Draft") statusMatch = String(item.status ?? "").toLowerCase() === "draft";

      return matchSearch && statusMatch;
    });
  }, [items, searchText, activeTab]);

  const paginatedItems = filteredItems;

  const [totalPages, setTotalPages] = useState(1);

  const clearFilters = () => {
    setSearchText("");
    setActiveTab("Semua");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  const handleViewSlip = async (id: string) => {
    setDetailLoading(true);
    setIsModalOpen(true);
    try {
      // Use getMyPayrollSlip to match API docs: GET /api/my/payroll/{id}/slip
      const result = await getMyPayrollSlip(id);
      setSelectedSlip(result.payload);
    } catch (error) {
      console.error("Failed to load slip details:", error);
      setIsModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      const blob = await exportMyPayrollPdf(id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Slip_Gaji_${selectedSlip?.period || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      showToast('Gagal mengunduh berkas PDF. Silakan coba lagi.', 'error');
    }
  };

  const handleDownloadCsv = async (id: string) => {
    try {
      const blob = await exportMyPayrollCsv(id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Slip_Gaji_${selectedSlip?.period || id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download CSV:", error);
      showToast('Gagal mengunduh berkas CSV. Silakan coba lagi.', 'error');
    }
  };

  const generateSlipPDF = (slip: any) => {
    const doc = new jsPDF();
    const pageWidth = 210;
    const margin = 20;

    // Professional Header
    doc.setFillColor(20, 30, 48);
    doc.rect(0, 0, pageWidth, 55, 'F');
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Company Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(slip?.company_name || 'Company Name', pageWidth / 2, 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    
    // Company Address
    doc.setFontSize(9);
    if (slip?.company_address) {
      doc.text(slip.company_address, pageWidth / 2, 28, { align: 'center' });
    }
    
    // Company Contact
    const contact = [slip?.company_phone, slip?.company_email].filter(Boolean).join(' | ');
    if (contact) {
      doc.text(contact, pageWidth / 2, 35, { align: 'center' });
    }

    // Document Title
    doc.setFontSize(16);
    doc.setTextColor(20, 30, 48);
    doc.setFont('helvetica', 'bold');
    doc.text('SLIP GAJI DIGITAL', pageWidth / 2, 68, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Periode: ${slip?.period || 'N/A'}`, pageWidth / 2, 75, { align: 'center' });

    // Divider
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, 79, pageWidth - margin, 79);

    // Employee Info
    const infoStartY = 87;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, infoStartY, pageWidth - (margin * 2), 40, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, infoStartY, pageWidth - (margin * 2), 40, 3, 3, 'S');

    doc.setTextColor(20, 30, 48);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMASI KARYAWAN', margin + 8, infoStartY + 10);
    doc.setFont('helvetica', 'normal');
    
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    
    if (slip?.employee) {
      doc.text(`Nama: ${slip.employee.name || 'N/A'}`, margin + 8, infoStartY + 17);
      doc.text(`ID: ${slip.employee.employee_code || 'N/A'}`, margin + 8, infoStartY + 23);
      doc.text(`Posisi: ${slip.employee.position || 'N/A'}`, margin + 8, infoStartY + 29);
      doc.text(`Departemen: ${slip.employee.department || 'N/A'}`, margin + 8, infoStartY + 35);
    }

    // Earnings Section
    const earnStartY = infoStartY + 50;
    doc.setFillColor(247, 254, 231);
    doc.roundedRect(margin, earnStartY, pageWidth - (margin * 2), 38, 3, 3, 'F');
    
    doc.setTextColor(20, 30, 48);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PENERIMAAN', margin + 8, earnStartY + 10);
    doc.setFont('helvetica', 'normal');
    
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    
    const summary = slip?.summary || {};
    doc.text('Gaji Pokok', margin + 8, earnStartY + 17);
    doc.text(formatCurrency(summary.basic_salary), pageWidth - margin - 8, earnStartY + 17, { align: 'right' });
    
    if (summary.allowance > 0) {
      doc.text('Tunjangan', margin + 8, earnStartY + 23);
      doc.text(formatCurrency(summary.allowance), pageWidth - margin - 8, earnStartY + 23, { align: 'right' });
    }
    
    if (summary.bonus > 0) {
      doc.text('Bonus', margin + 8, earnStartY + 29);
      doc.text(formatCurrency(summary.bonus), pageWidth - margin - 8, earnStartY + 29, { align: 'right' });
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total Gross', margin + 8, earnStartY + 35);
    doc.text(formatCurrency(summary.gross_pay), pageWidth - margin - 8, earnStartY + 35, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // Deductions Section
    const deductStartY = earnStartY + 48;
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, deductStartY, pageWidth - (margin * 2), 38, 3, 3, 'F');
    
    doc.setTextColor(20, 30, 48);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('POTONGAN', margin + 8, deductStartY + 10);
    doc.setFont('helvetica', 'normal');
    
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    
    doc.text('BPJS Kesehatan', margin + 8, deductStartY + 17);
    doc.text(`- ${formatCurrency(summary.bpjs_kesehatan)}`, pageWidth - margin - 8, deductStartY + 17, { align: 'right' });
    
    doc.text('BPJS Ketenagakerjaan', margin + 8, deductStartY + 23);
    doc.text(`- ${formatCurrency(summary.bpjs_ketenagakerjaan)}`, pageWidth - margin - 8, deductStartY + 23, { align: 'right' });
    
    doc.text('PPh21 (Pajak)', margin + 8, deductStartY + 29);
    doc.text(`- ${formatCurrency(summary.pph21)}`, pageWidth - margin - 8, deductStartY + 29, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total Potongan', margin + 8, deductStartY + 35);
    doc.text(`- ${formatCurrency(summary.total_deduction)}`, pageWidth - margin - 8, deductStartY + 35, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // Take Home Pay
    const thpStartY = deductStartY + 48;
    doc.setFillColor(20, 30, 48);
    doc.roundedRect(margin, thpStartY, pageWidth - (margin * 2), 30, 3, 3, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('TAKE HOME PAY (GAJI BERSIH)', margin + 10, thpStartY + 12);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(summary.take_home_pay), pageWidth - margin - 10, thpStartY + 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    const footerY = 285;
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, margin, footerY);
    doc.text(`Slip Gaji - ${slip?.period || ''}`, pageWidth / 2, footerY, { align: 'center' });
    doc.text('Halaman 1 dari 1', pageWidth - margin, footerY, { align: 'right' });

    doc.save(`Slip_Gaji_${slip?.period || 'export'}_${Date.now()}.pdf`);
  };

  const formatCurrency = (val: any) => `Rp ${Number(val || 0).toLocaleString("id-ID")}`;

  return (
    <div className="crud-page">
      {/* Header */}
      <PageHeader
        title="Riwayat Gaji Saya"
        subtitle="Lihat dan unduh slip gaji bulanan Anda dengan aman."
        badge={{ icon: Wallet, label: "Layanan Mandiri" }}
        actions={
          <button className="btn-outline" onClick={() => void loadPayroll()} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Segarkan
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {summaryStats.map((card) => {
          const Icon = card.tone === "blue" ? BarChart3 : card.tone === "green" ? CheckCircle2 : card.tone === "orange" ? Receipt : Wallet;

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
            <Receipt size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Slip Gaji</h2>
            <p className="analytics-subtitle">Riwayat gaji dan pendapatan Anda</p>
          </div>
        </div>
      </Card>

      {/* Table Section with integrated controls */}
      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          {/* Tabs */}
          <div className="elyra-tabs">
            {(["Semua", "Paid", "Pending", "Draft"] as const).map((tab) => (
              <button key={tab} className={`elyra-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
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
                placeholder="Cari periode..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
            {(searchText || activeTab !== "Semua") && (
              <button className="btn-clear-filter" onClick={clearFilters}>
                Hapus Filter
              </button>
            )}
          </div>
        </div>
      </Card>

          {loading && <LoadingState message="Memuat data slip gaji..." />}
          {!loading && errorMessage && <ErrorState message="Koneksi Terputus" error={errorMessage} onRetry={loadPayroll} />}

          {!loading && !errorMessage && paginatedItems.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Pencarian Kosong"
                message="Kami tidak menemukan slip gaji yang sesuai dengan kriteria Anda."
                actionLabel="Bersihkan Filter"
                onAction={clearFilters}
              />
            </div>
          )}

          {!loading && !errorMessage && paginatedItems.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Periode</th>
                      <th>Gaji Pokok</th>
                      <th>Gaji Bersih</th>
                      <th>Status</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => (
                      <tr key={String(item.id)}>
                        <td>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{String(item.period || '-')}</span>
                        </td>
                        <td><span style={{ color: '#475569' }}>{formatCurrency(item.basic_salary)}</span></td>
                        <td>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>
                            {formatCurrency(item.take_home_pay || item.net_salary)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-soft badge-soft--${String(item.status).toLowerCase()}`}>
                            {String(item.status).toUpperCase()}
                          </span>
                        </td>
                        <td className="td-center">
                          {String(item.status).toLowerCase() === 'paid' ? (
                            <button
                              className="btn-outline"
                              style={{ 
                                padding: '6px 12px', 
                                borderRadius: '8px', 
                                fontSize: '0.85rem',
                                border: '1px solid var(--color-primary)',
                                color: 'var(--color-primary)',
                                background: 'white',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onClick={() => handleViewSlip(String(item.id))}
                              title="Lihat Slip"
                            >
                              <Eye size={16} />
                              Lihat Slip
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="table-pagination">
                <div className="pagination-info">
                  {filteredItems.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredItems.length)} dari ${filteredItems.length} data`}
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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

      {/* Modal for Slip Details */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Digital Salary Slip"
        size="lg"
      >
        {detailLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="animate-spin" style={{ margin: '0 auto 1rem' }}><Receipt size={32} color="var(--color-primary)" /></div>
            <p>Memuat rincian slip gaji...</p>
          </div>
        ) : selectedSlip && selectedSlip.summary && (
          <div className="digital-slip" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Header - Blue & White Theme */}
            <div className="digital-slip-header" style={{ 
              background: 'linear-gradient(135deg, var(--hero-bg-start), var(--hero-bg-end))', 
              color: 'white', 
              padding: '2.5rem 2rem', 
              borderRadius: '16px 16px 0 0',
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.1 }}>
                <Receipt size={150} />
              </div>
              <div className="digital-slip-brand" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
                <div className="slip-logo" style={{ 
                  background: 'white', 
                  color: 'var(--color-primary-dark)',
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  fontWeight: '900',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                }}>AP</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Slip Gaji Digital</h3>
                  <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '1rem' }}>Periode: {selectedSlip.period}</p>
                </div>
              </div>
              <div className="digital-slip-status" style={{ position: 'relative', zIndex: 1 }}>
                <span className={`status-badge-${String(selectedSlip.status || 'draft').toLowerCase()}`} style={{
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(8px)',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}>
                  {String(selectedSlip.status || 'DRAFT').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Employee Info with Avatar */}
            {selectedSlip.employee && (
              <div className="slip-employee-info" style={{ 
                margin: '1.5rem', 
                padding: '1.5rem', 
                background: 'white', 
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '14px', background: '#EBF4FF', color: '#7F9CF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.5rem' }}>
                  {(selectedSlip.employee.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '1.25rem', color: '#1e293b', fontWeight: 700 }}>{selectedSlip.employee.name}</h4>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.875rem', color: '#64748b', flexWrap: 'wrap' }}>
                    <span>ID: {selectedSlip.employee.employee_code}</span>
                    <span>•</span>
                    <span>{selectedSlip.employee.position}</span>
                    <span>•</span>
                    <span>{selectedSlip.employee.department}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="digital-slip-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '0 1.5rem 1.5rem' }}>
              <div className="slip-section" style={{ 
                background: '#eff6ff', 
                padding: '1.5rem', 
                borderRadius: '12px',
                border: '1px solid var(--color-primary-light)'
              }}>
                <h4 style={{ margin: '0 0 1rem', color: 'var(--color-primary-dark)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>PENERIMAAN</h4>
                <div className="slip-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--color-primary-dark)' }}>Gaji Pokok</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(selectedSlip.summary.basic_salary)}</span>
                </div>
                {selectedSlip.summary.allowance > 0 && (
                  <div className="slip-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--color-primary-dark)' }}>Tunjangan</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(selectedSlip.summary.allowance)}</span>
                  </div>
                )}
                {selectedSlip.summary.bonus > 0 && (
                  <div className="slip-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--color-primary-dark)' }}>Bonus</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(selectedSlip.summary.bonus)}</span>
                  </div>
                )}
                <div className="slip-row slip-row--total" style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginTop: '12px', 
                  paddingTop: '12px', 
                  borderTop: '2px solid var(--color-primary)',
                  fontWeight: 'bold',
                  color: 'var(--color-primary-dark)'
                }}>
                  <span>Total Pendapatan Kotor (Gross)</span>
                  <span>{formatCurrency(selectedSlip.summary.gross_pay)}</span>
                </div>
              </div>

              <div className="slip-section" style={{ 
                background: '#fef2f2', 
                padding: '1.5rem', 
                borderRadius: '12px',
                border: '1px solid #fecaca'
              }}>
                <h4 style={{ margin: '0 0 1rem', color: '#991b1b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>POTONGAN</h4>
                <div className="slip-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#991b1b' }}>BPJS Kesehatan</span>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>- {formatCurrency(selectedSlip.summary.bpjs_kesehatan)}</span>
                </div>
                <div className="slip-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#991b1b' }}>BPJS Ketenagakerjaan</span>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>- {formatCurrency(selectedSlip.summary.bpjs_ketenagakerjaan)}</span>
                </div>
                <div className="slip-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#991b1b' }}>PPh21 (Pajak)</span>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>- {formatCurrency(selectedSlip.summary.pph21)}</span>
                </div>
                <div className="slip-row slip-row--total" style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginTop: '12px', 
                  paddingTop: '12px', 
                  borderTop: '2px solid #991b1b',
                  fontWeight: 'bold',
                  color: '#991b1b'
                }}>
                  <span>Total Potongan</span>
                  <span style={{ color: '#ef4444' }}>- {formatCurrency(selectedSlip.summary.total_deduction)}</span>
                </div>
              </div>
            </div>

            <div className="digital-slip-footer" style={{ 
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary))', 
              color: 'white',
              padding: '2rem',
              borderRadius: '0 0 16px 16px',
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              margin: '0 1.5rem 1.5rem'
            }}>
              <div className="thp-box">
                <div className="thp-label" style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '4px' }}>TAKE HOME PAY (GAJI BERSIH)</div>
                <div className="thp-value" style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(selectedSlip.summary.take_home_pay)}</div>
              </div>
            </div>

            <div className="slip-actions" style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'center',
              padding: '1.5rem',
              borderTop: '1px solid #e2e8f0'
            }}>
              <Button variant="outline" size="md" onClick={() => window.print()}>
                <Printer size={16} style={{ marginRight: '8px' }} /> Cetak
              </Button>
              <Button variant="outline" size="md" onClick={() => void handleDownloadCsv(String(selectedSlip.id))}>
                <Download size={16} style={{ marginRight: '8px' }} /> Download CSV
              </Button>
              <Button variant="primary" size="md" onClick={() => {
                generateSlipPDF(selectedSlip);
                setIsModalOpen(false);
              }}>
                <Download size={16} style={{ marginRight: '8px' }} /> Download PDF
              </Button>
            </div>

            <p className="slip-disclaimer" style={{ 
              textAlign: 'center', 
              fontSize: '0.75rem', 
              color: '#94a3b8', 
              padding: '0 1.5rem 1.5rem',
              margin: 0
            }}>
              * Slip gaji ini dihasilkan secara otomatis oleh sistem HRIS dan merupakan dokumen sah perusahaan.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyPayrollPage;
