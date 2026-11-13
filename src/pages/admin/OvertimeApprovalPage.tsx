import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Timer, Search, CheckCircle, XCircle, Users, AlertCircle, Eye, History } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Modal } from '@/shared/ui/Modal';
import overtimeService from '@/features/attendance/api/overtime.service';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { PageHeader } from '@/shared/ui';
import { api } from '@/shared/api/httpClient';
import { useAuthStore } from '@/app/store/auth.store';
import { RBACUtils } from '@/shared/hooks/rbac';
import { PERMISSIONS } from '@/shared/types/rbac.types';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import { showToast } from '@/shared/ui/toast';
import { ApprovalHistoryModal } from "@/shared/components/ApprovalHistoryModal";
import { RejectReasonModal } from "@/shared/components/RejectReasonModal";

interface OvertimeRequest {
  id: number;
  date: string;
  scheduled_checkout: string;
  actual_checkout: string;
  overtime_minutes: number;
  status: string;
  reason: string | null;
  reject_reason: string | null;
  approved_at: string | null;
  employee?: {
    id: number;
    employee_code: string;
    user?: { id: number; name: string; email: string };
  };
  approver?: { id: number; name: string } | null;
  can_act?: boolean;
}

const OvertimeApprovalPage: React.FC = () => {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'Semua' | 'Pending' | 'Approved' | 'Rejected'>('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [historyModal, setHistoryModal] = useState<{ module: string; id: number } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [rejectEvidenceTarget, setRejectEvidenceTarget] = useState<any | null>(null);
  const [evidenceReview, setEvidenceReview] = useState<any[] | null>(null);

  const user = useAuthStore((state) => state.user);

  const canAccess = useMemo(() => {
    return RBACUtils.hasPermission(user, PERMISSIONS.OVERTIME_APPROVE);
  }, [user]);

  const fetchData = async () => {
        if (!canAccess) {
          setRequests([]);
          setLoading(false);
          return;
        }
    setLoading(true);
    try {
      const result = await api.get('/overtime/requests');
      const payload = result.data?.data ?? result.data;
      setRequests(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Error fetching overtime requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [canAccess]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  const handleApprove = async (id: number) => {
    if (!canAccess) {
      showToast('Anda tidak memiliki izin menyetujui lembur', 'error');
      return;
    }
    try {
      setLoading(true);
      await api.put(`/overtime/requests/${id}/approve`);
      fetchData();
      showToast('Lembur berhasil disetujui', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error?.response?.data?.message || 'Gagal menyetujui lembur', 'error');
      setLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    if (!canAccess) {
      showToast('Anda tidak memiliki izin menolak lembur', 'error');
      return;
    }
    setRejectTarget(id);
  };

  const confirmReject = async (reason: string) => {
    if (rejectTarget === null) return;
    if (!canAccess) {
      showToast('Anda tidak memiliki izin menolak lembur', 'error');
      return;
    }
    try {
      setLoading(true);
      await api.put(`/overtime/requests/${rejectTarget}/reject`, { reject_reason: reason || undefined });
      fetchData();
      showToast('Lembur berhasil ditolak', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error?.response?.data?.message || 'Gagal menolak lembur', 'error');
      setLoading(false);
    }
  };

  const handleViewEvidencesForRequest = async (requestId: number) => {
    try {
      const res = await overtimeService.getEvidencesForRequest(requestId);
      const payload = res?.data?.data ?? res?.data ?? res;
      const list = Array.isArray(payload) ? payload : [];
      if (list.length === 0) {
        showToast('Tidak ada bukti untuk pengajuan ini', 'info');
        return;
      }
      setEvidenceReview(list);
    } catch (err: any) {
      console.error(err);
      showToast(err?.response?.data?.message || err?.message || 'Gagal mengambil bukti', 'error');
    }
  };

  const handleEvidenceAction = async (ev: any, action: 'approve' | 'reject', reason?: string) => {
    try {
      if (action === 'approve') {
        await overtimeService.approveEvidence(ev.id);
        showToast('Bukti berhasil disetujui', 'success');
      } else {
        await overtimeService.rejectEvidence(ev.id, reason || undefined);
        showToast('Bukti berhasil ditolak', 'success');
      }
      fetchData();
    } catch (err: any) {
      console.error(err);
      showToast(err?.response?.data?.message || err?.message || 'Gagal memproses bukti', 'error');
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const name = (r.employee?.user?.name || '').toLowerCase();
      const code = (r.employee?.employee_code || '').toLowerCase();
      const query = searchText.toLowerCase();
      const matchSearch = name.includes(query) || code.includes(query);

      let statusMatch = true;
      if (activeTab === 'Pending') statusMatch = r.status === 'pending';
      else if (activeTab === 'Approved') statusMatch = r.status === 'approved';
      else if (activeTab === 'Rejected') statusMatch = r.status === 'rejected';

      return matchSearch && statusMatch;
    });
  }, [requests, searchText, activeTab]);

  const paginatedRequests = filteredRequests;

  const [totalPages, setTotalPages] = useState(1);

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}j ${m}m`;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; tone: string }> = {
      'pending': { label: 'Pending', tone: 'orange' },
      'approved': { label: 'Approved', tone: 'green' },
      'rejected': { label: 'Rejected', tone: 'red' },
    };
    const config = map[status] || { label: status, tone: 'orange' };
    return <span className={`badge-soft badge-soft--${config.tone}`}>{config.label}</span>;
  };

  const summaryCards = [
    { label: 'Total Pengajuan', subtitle: 'Seluruh pengajuan', value: String(requests.length), tone: 'blue' as const, icon: Users },
    { label: 'Menunggu Persetujuan', subtitle: 'Perlu review', value: String(pendingCount), tone: 'orange' as const, icon: AlertCircle },
    { label: 'Disetujui', subtitle: 'Pengajuan disetujui', value: String(approvedCount), tone: 'green' as const, icon: CheckCircle },
    { label: 'Ditolak', subtitle: 'Pengajuan ditolak', value: String(rejectedCount), tone: 'red' as const, icon: XCircle },
  ];

  if (!canAccess) {
    return (
      <div className="crud-page">
      <PageHeader
        title="Persetujuan Lembur"
        subtitle="Kelola dan proses pengajuan lembur karyawan."
        badge={{ icon: Timer, label: "Persetujuan" }}
        scope
      />

        <div style={{ padding: '5rem 0' }}>
          <EmptyState
            title="Akses Ditolak"
            message="Anda tidak memiliki izin untuk melihat halaman persetujuan lembur."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="crud-page">
      <PageHeader
        title="Persetujuan Lembur"
        subtitle="Kelola dan proses pengajuan lembur karyawan."
        badge={{ icon: Timer, label: "Persetujuan" }}
        scope
        actions={
          <button className="btn-outline" onClick={fetchData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Memuat...' : 'Segarkan'}
          </button>
        }
      />

      {/* Summary */}
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
              <p className="employee-summary-trend">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Title */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <Timer size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Pengajuan Lembur</h2>
            <p className="analytics-subtitle">Review dan proses pengajuan lembur karyawan</p>
          </div>
        </div>
      </Card>

      {/* Control */}
      <Card className="control-section-card">
        <div className="control-section-inner">
          <div className="elyra-tabs">
            {(['Semua', 'Pending', 'Approved', 'Rejected'] as const).map((tab) => (
              <button
                key={tab}
                className={`elyra-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab !== 'Semua' && (
                  <span className="tab-count">
                    {tab === 'Pending' ? pendingCount : tab === 'Approved' ? approvedCount : rejectedCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari nama karyawan..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="table-section">
        <div className="wuw-table-area">
          {loading && <LoadingState message="Memuat pengajuan lembur..." />}

          {!loading && paginatedRequests.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Tidak Ada Pengajuan"
                message={searchText || activeTab !== 'Semua' ? 'Tidak ada pengajuan yang sesuai filter.' : 'Belum ada pengajuan lembur.'}
                actionLabel="Segarkan"
                onAction={fetchData}
              />
            </div>
          )}

          {!loading && paginatedRequests.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '250px' }}>Karyawan</th>
                      <th>Tanggal</th>
                      <th>Jadwal</th>
                      <th>Aktual</th>
                      <th>Durasi</th>
                      <th>Alasan</th>
                      <th className="th-center">Status</th>
                      <th className="th-center" style={{ width: '140px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRequests.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {(req.employee?.user?.name || 'E').charAt(0).toUpperCase()}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{req.employee?.user?.name || 'Employee'}</span>
                              <span className="cell-stacked__sub">{req.employee?.employee_code || '-'}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: '#475569', fontWeight: 500 }}>{formatDate(req.date)}</td>
                        <td style={{ color: '#64748b' }}>{req.scheduled_checkout}</td>
                        <td style={{ color: '#0f172a', fontWeight: 600 }}>{req.actual_checkout}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#7c3aed' }}>
                            {formatDuration(req.overtime_minutes)}
                          </span>
                        </td>
                        <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {req.reason || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>-</span>}
                        </td>
                        <td className="td-center">
                          {getStatusBadge(req.status)}
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            {canAccess && req.status === 'pending' && req.can_act !== false && (
                              <>
                                <button
                                  className="action-btn"
                                  style={{ color: '#10b981', background: '#ecfdf5' }}
                                  onClick={() => handleApprove(req.id)}
                                  title="Setujui"
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button
                                  className="action-btn"
                                  style={{ color: '#ef4444', background: '#fef2f2' }}
                                  onClick={() => handleReject(req.id)}
                                  title="Tolak"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                            <button
                              className="action-btn"
                              style={{ color: '#0f172a', background: '#f1f5f9' }}
                              onClick={() => void handleViewEvidencesForRequest(req.id)}
                              title="Lihat Bukti"
                            >
                              <Eye size={16} />
                            </button>
                            <button className="action-btn" style={{ color: '#8b5cf6', background: '#f5f3ff' }} onClick={() => setHistoryModal({ module: 'overtime', id: req.id })} title="Riwayat Approval"><History size={16} /></button>
                            {req.status !== 'pending' && (
                              <button
                                className="action-btn action-btn-edit"
                                onClick={() => {
                                  const info = req.status === 'approved'
                                    ? `Disetujui oleh: ${req.approver?.name || '-'} - ${req.approved_at || '-'}`
                                    : `Ditolak oleh: ${req.approver?.name || '-'} - ${req.reject_reason || '-'}`;
                                  showToast(info, 'info');
                                }}
                                title="Lihat Detail"
                              >
                                <Eye size={16} />
                              </button>
                            )}
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
                  {filteredRequests.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredRequests.length)} dari ${filteredRequests.length} data`}
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
      {historyModal && (
        <ApprovalHistoryModal
          isOpen={!!historyModal}
          onClose={() => setHistoryModal(null)}
          module={historyModal.module}
          moduleId={historyModal.id}
        />
      )}

      <RejectReasonModal
        isOpen={canAccess && rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        onConfirm={confirmReject}
      />

      <RejectReasonModal
        isOpen={rejectEvidenceTarget !== null}
        onClose={() => setRejectEvidenceTarget(null)}
        onConfirm={async (reason: string) => {
          const ev = rejectEvidenceTarget;
          setRejectEvidenceTarget(null);
          await handleEvidenceAction(ev, 'reject', reason);
        }}
        title="Alasan Penolakan Bukti"
      />

      {evidenceReview && (
        <Modal
          isOpen={!!evidenceReview}
          onClose={() => setEvidenceReview(null)}
          title="Bukti Lembur"
          size="md"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {evidenceReview.map((ev: any, i: number) => (
              <div
                key={ev.id || i}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.75rem 1rem", borderRadius: "8px",
                  background: "#f8fafc", border: "1px solid #f1f5f9",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontWeight: 600, color: "#475569", minWidth: "1.5rem" }}>{i + 1}.</span>
                  <span style={{ color: "#0f172a", fontWeight: 500 }}>{ev.filename || ev.name || ev.file_name || 'file'}</span>
                  <span className={`badge-soft badge-soft--${ev.status === 'approved' ? 'green' : ev.status === 'rejected' ? 'red' : 'orange'}`}>
                    {ev.status || '-'}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="action-btn"
                    style={{ color: "#0f172a", background: "#f1f5f9" }}
                    onClick={() => {
                      const url = ev.url || ev.file_url || ev.path;
                      if (url) window.open(url, '_blank');
                    }}
                    title="Lihat File"
                  >
                    <Eye size={16} />
                  </button>
                  {canAccess && ev.status !== 'approved' && (
                    <>
                      <button
                        className="action-btn"
                        style={{ color: "#10b981", background: "#ecfdf5" }}
                        onClick={() => handleEvidenceAction(ev, 'approve')}
                        title="Setujui"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        className="action-btn"
                        style={{ color: "#ef4444", background: "#fef2f2" }}
                        onClick={() => {
                          setEvidenceReview(null);
                          setRejectEvidenceTarget(ev);
                        }}
                        title="Tolak"
                      >
                        <XCircle size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OvertimeApprovalPage;
