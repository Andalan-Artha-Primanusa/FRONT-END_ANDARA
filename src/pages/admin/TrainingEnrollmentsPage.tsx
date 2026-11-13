import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '@/shared/ui/toast';
import { RefreshCw, GraduationCap, Users, Search, Filter, CheckCircle, Clock, XCircle, BookOpen, Award, X, Loader2, History, TrendingUp, Save } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Modal } from '@/shared/ui/Modal';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { PageHeader } from '@/shared/ui';
import { ApprovalHistoryModal } from '@/shared/components/ApprovalHistoryModal';
import { trainingService } from '@/features/training/api/training.service';
import { useAuthStore } from '@/app/store/auth.store';
import { RBACUtils } from '@/shared/hooks/rbac';
import { PERMISSIONS } from '@/shared/types/rbac.types';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/leave/LeaveShared.css';

const TrainingEnrollmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canEnroll = RBACUtils.hasPermission(user, PERMISSIONS.TRAINING_ENROLL);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"Semua" | "Pending" | "In Progress" | "Completed" | "Cancelled">("Semua");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Complete Modal State
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completingEnrollmentId, setCompletingEnrollmentId] = useState<number | null>(null);
  const [completingEnrollmentName, setCompletingEnrollmentName] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completeData, setCompleteData] = useState({ score: '', notes: '', certificate_path: '' });

  // History Modals
  const [historyModal, setHistoryModal] = useState<{ module: string; id: number | string } | null>(null);
  const [progressHistoryModal, setProgressHistoryModal] = useState<number | null>(null);
  const [progressHistories, setProgressHistories] = useState<any[]>([]);
  const [loadingHistories, setLoadingHistories] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await trainingService.getEnrollments();
      let arr: any[] = [];
      if (Array.isArray(data)) arr = data;
      else if (Array.isArray(data?.data)) arr = data.data;
      else if (data?.data?.data && Array.isArray(data?.data?.data)) arr = data.data.data;
      setEnrollments(arr);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: number) => {
    if (!canEnroll) {
      showToast('Anda tidak memiliki izin menyetujui pendaftaran training', 'error');
      return;
    }
    try {
      setLoading(true);
      await trainingService.approveEnrollment(id);
      fetchData();
      showToast('Pendaftaran berhasil disetujui', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error?.response?.data?.message || error?.message || 'Gagal menyetujui pendaftaran', 'error');
      setLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    if (!canEnroll) {
      showToast('Anda tidak memiliki izin menolak pendaftaran training', 'error');
      return;
    }
    try {
      setLoading(true);
      await trainingService.rejectEnrollment(id);
      fetchData();
      showToast('Pendaftaran berhasil ditolak', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error?.response?.data?.message || error?.message || 'Gagal menolak pendaftaran', 'error');
      setLoading(false);
    }
  };

  const openCompleteModal = (enrollment: any) => {
    if (!canEnroll) {
      showToast('Anda tidak memiliki izin mengubah progress training', 'error');
      return;
    }
    setCompletingEnrollmentId(enrollment.id);
    setCompletingEnrollmentName(enrollment.program?.title || 'Training');
    setCompleteData({ score: '', notes: '', certificate_path: '' });
    setCompleteModalOpen(true);
  };

  const closeCompleteModal = () => {
    setCompleteModalOpen(false);
    setCompletingEnrollmentId(null);
    setCompletingEnrollmentName('');
    setCompleteData({ score: '', notes: '', certificate_path: '' });
  };

  const handleComplete = async () => {
    if (!completingEnrollmentId) return;
    if (!canEnroll) {
      showToast('Anda tidak memiliki izin mengubah progress training', 'error');
      return;
    }
    setCompleting(true);
    try {
      const payload: any = {
        score: 100, // Progress otomatis menjadi 100 saat selesai
      };
      if (completeData.notes) payload.notes = completeData.notes;
      if (completeData.certificate_path) payload.certificate_path = completeData.certificate_path;
      await trainingService.completeTraining(completingEnrollmentId, payload);
      closeCompleteModal();
      fetchData();
      showToast('Pelatihan berhasil ditandai selesai', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || err?.message || 'Gagal menandai pelatihan selesai', 'error');
    } finally {
      setCompleting(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!completingEnrollmentId) return;
    if (!canEnroll) {
      showToast('Anda tidak memiliki izin mengubah progress training', 'error');
      return;
    }
    const scoreVal = Number(completeData.score);
    if (completeData.score === '' || Number.isNaN(scoreVal) || scoreVal < 0 || scoreVal > 100) {
      showToast('Nilai progress harus bernilai antara 0 sampai 100', 'error');
      return;
    }
    setCompleting(true);
    try {
      await trainingService.updateEnrollmentProgress(completingEnrollmentId, {
        score: scoreVal,
        notes: completeData.notes,
      });
      closeCompleteModal();
      fetchData();
      showToast('Progress berhasil disimpan', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || err?.message || 'Gagal menyimpan progress', 'error');
    } finally {
      setCompleting(false);
    }
  };

  const openProgressHistory = async (id: number) => {
    setProgressHistoryModal(id);
    setLoadingHistories(true);
    try {
      const data = await trainingService.getProgressHistory(id);
      let arr: any[] = [];
      if (Array.isArray(data)) arr = data;
      else if (Array.isArray(data?.data)) arr = data.data;
      else if (Array.isArray(data?.data?.data)) arr = data.data.data;
      setProgressHistories(arr);
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat riwayat progress', 'error');
    } finally {
      setLoadingHistories(false);
    }
  };

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((e: any) => {
      const programTitle = String(e.program?.title || e.training_title || '').toLowerCase();
      const employeeName = String(e.employee?.user?.name || e.employee_name || '').toLowerCase();
      const query = searchText.toLowerCase();
      
      const matchSearch = !query || programTitle.includes(query) || employeeName.includes(query);

      let statusMatch = true;
      if (activeTab === "Pending") statusMatch = e.status === 'pending';
      else if (activeTab === "In Progress") statusMatch = e.status === 'in_progress' || e.status === 'ongoing';
      else if (activeTab === "Completed") statusMatch = e.status === 'completed';
      else if (activeTab === "Cancelled") statusMatch = e.status === 'cancelled' || e.status === 'dropped';

      return matchSearch && statusMatch;
    });
  }, [enrollments, searchText, activeTab]);

  const paginatedEnrollments = filteredEnrollments;

  const summaryStats = useMemo(() => {
    const total = enrollments.length;
    const completed = enrollments.filter(e => e.status === 'completed').length;
    const inProgress = enrollments.filter(e => e.status === 'in_progress' || e.status === 'ongoing').length;

    return [
      { label: "Total Pendaftaran", subtitle: "Seluruh pendaftaran", value: String(total), change: "Data pendaftaran aktif", tone: "blue" as const, icon: Users },
      { label: "Hasil Filter", subtitle: "Pendaftaran sesuai pencarian", value: String(filteredEnrollments.length), change: `${paginatedEnrollments.length} data per halaman`, tone: "green" as const, icon: Search },
      { label: "Sedang Berlangsung", subtitle: "Pelatihan aktif", value: String(inProgress), change: "Dalam proses", tone: "orange" as const, icon: Clock },
      { label: "Selesai", subtitle: "Pelatihan selesai", value: String(completed), change: "Status final selesai", tone: "green" as const, icon: CheckCircle },
    ];
  }, [enrollments, filteredEnrollments.length, paginatedEnrollments.length]);

  const [totalPages, setTotalPages] = useState(1);

  const clearFilters = () => {
    setSearchText("");
    setActiveTab("Semua");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; tone: string }> = {
      'completed': { label: 'Completed', tone: 'green' },
      'in_progress': { label: 'In Progress', tone: 'orange' },
      'ongoing': { label: 'In Progress', tone: 'orange' },
      'pending': { label: 'Pending', tone: 'orange' },
      'cancelled': { label: 'Cancelled', tone: 'red' },
      'dropped': { label: 'Cancelled', tone: 'red' },
    };
    const config = statusMap[status?.toLowerCase()] || { label: status?.toUpperCase() || 'UNKNOWN', tone: 'orange' };
    return (
      <span className={`badge-soft badge-soft--${config.tone}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Pendaftaran Pelatihan"
        subtitle="Lacak dan kelola pendaftaran dan kemajuan pelatihan karyawan."
        badge={{ icon: GraduationCap, label: "L & D" }}
        actions={
          <button className="btn-outline" onClick={fetchData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Memuat...' : 'Segarkan'}
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {summaryStats.map((card) => {
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

      {/* Analytics Title Card */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Pendaftaran</h2>
            <p className="analytics-subtitle">Kelola pendaftaran pelatihan karyawan</p>
          </div>
        </div>
      </Card>

      {/* Control Section */}
      <Card className="control-section-card">
        <div className="control-section-inner">
          {/* Tabs */}
          <div className="elyra-tabs">
            {(["Semua", "Pending", "In Progress", "Completed", "Cancelled"] as const).map((tab) => (
              <button
                key={tab}
                className={`elyra-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab !== "Semua" && (
                  <span className="tab-count">
                    {tab === "Pending"
                      ? enrollments.filter(e => e.status === 'pending').length
                      : tab === "In Progress"
                      ? enrollments.filter(e => e.status === 'in_progress' || e.status === 'ongoing').length
                      : tab === "Completed"
                      ? enrollments.filter(e => e.status === 'completed').length
                      : enrollments.filter(e => e.status === 'cancelled' || e.status === 'dropped').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search & Filter */}
          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Cari program atau nama karyawan..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
            <button
              className={`filter-btn-rounded ${showFilters ? 'active' : ''}`}
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
              {(searchText || activeTab !== "Semua") && (
                <button className="btn-clear-filter" onClick={clearFilters}>
                  Hapus Filter
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Table Section */}
      <div className="table-section">
        <div className="wuw-table-area">
          {loading && <LoadingState message="Memuat data pendaftaran..." />}

          {!loading && paginatedEnrollments.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Pendaftaran Kosong"
                message={searchText || activeTab !== "Semua" ? 'Tidak ada pendaftaran yang sesuai dengan kriteria Anda.' : 'Belum ada data pendaftaran pelatihan.'}
                actionLabel="Segarkan"
                onAction={fetchData}
              />
            </div>
          )}

          {!loading && paginatedEnrollments.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '400px' }}>Program Pelatihan</th>
                      <th>Karyawan</th>
                      <th>Tanggal Mulai</th>
                      <th>Status</th>
                      <th>Skor / Progress</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEnrollments.map((enrollment) => (
                      <tr key={enrollment.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {(enrollment.program?.title || enrollment.training_title || 'T').charAt(0).toUpperCase()}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{enrollment.program?.title || enrollment.program?.nama || enrollment.training_title || 'Training Program'}</span>
                              <span className="cell-stacked__sub">{String(enrollment.program_id || enrollment.id)}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {(enrollment.employee?.user?.name || enrollment.employee_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{enrollment.employee?.user?.name || enrollment.employee_name || 'Employee'}</span>
                              <span className="cell-stacked__sub">
                                {enrollment.employee?.department?.name || 'No Dept'} • {enrollment.employee?.position?.name || 'No Pos'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: '#475569', fontWeight: 500 }}>
                          {enrollment.program?.start_date
                            ? new Date(enrollment.program.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'N/A'}
                        </td>
                        <td className="td-center">
                          {getStatusBadge(enrollment.status)}
                        </td>
                        <td>
                          {enrollment.score !== undefined && enrollment.score !== null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${enrollment.score}%`, height: '100%', background: '#10b981', borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{Number(enrollment.score)}%</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            {canEnroll && enrollment.status === 'pending' && enrollment.can_act !== false && (
                              <>
                                <button
                                  className="action-btn"
                                  style={{ color: '#10b981', background: '#ecfdf5' }}
                                  onClick={() => handleApprove(enrollment.id)}
                                  title="Approve"
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button
                                  className="action-btn"
                                  style={{ color: '#ef4444', background: '#fef2f2' }}
                                  onClick={() => handleReject(enrollment.id)}
                                  title="Reject"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                            {canEnroll && (enrollment.status === 'enrolled' || enrollment.status === 'in_progress') && (
                              <button
                                className="action-btn"
                                style={{ color: '#8b5cf6', background: '#f5f3ff' }}
                                onClick={() => openCompleteModal(enrollment)}
                                title="Update Progress"
                              >
                                <Award size={16} />
                              </button>
                            )}
                            <button
                                className="action-btn"
                                style={{ color: 'var(--color-primary)', background: '#eff6ff' }}
                                onClick={() => openProgressHistory(enrollment.id)}
                                title="Riwayat Progress"
                            >
                                <TrendingUp size={16} />
                            </button>
                            {enrollment.approval_flow_id && (
                              <button 
                                className="action-btn" 
                                onClick={() => setHistoryModal({ module: 'training', id: enrollment.id })} 
                                title="Riwayat Approval"
                              >
                                <History size={16} />
                              </button>
                            )}
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => navigate(`/training/programs`)}
                              title="Lihat Program"
                            >
                              <BookOpen size={16} />
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
                  {filteredEnrollments.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredEnrollments.length)} dari ${filteredEnrollments.length} data`}
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

      {/* Complete Modal */}
      <Modal
        isOpen={canEnroll && completeModalOpen}
        onClose={closeCompleteModal}
        title={`Update Progress / Selesai — ${completingEnrollmentName}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Nilai (0-100)</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Masukkan nilai"
              value={completeData.score}
              onChange={(e) => setCompleteData({ ...completeData, score: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label>Path Sertifikat (opsional)</label>
            <input
              type="text"
              placeholder="/path/to/certificate.pdf"
              value={completeData.certificate_path}
              onChange={(e) => setCompleteData({ ...completeData, certificate_path: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label>Catatan (opsional)</label>
            <textarea
              placeholder="Catatan tambahan..."
              value={completeData.notes}
              onChange={(e) => setCompleteData({ ...completeData, notes: e.target.value })}
              className="form-control"
              rows={3}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontWeight: 600, background: 'var(--color-primary)' }}
              onClick={handleUpdateProgress}
              disabled={completing}
            >
              {completing ? (
                <><Loader2 size={16} className="animate-spin" style={{ marginRight: '6px' }} />Menyimpan...</>
              ) : (
                <><Save size={16} style={{ marginRight: '6px' }} />Simpan Progress</>
              )}
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontWeight: 600 }}
              onClick={handleComplete}
              disabled={completing}
            >
              {completing ? (
                <><Loader2 size={16} className="animate-spin" style={{ marginRight: '6px' }} />Menyimpan...</>
              ) : (
                <><Award size={16} style={{ marginRight: '6px' }} />Tandai Selesai</>
              )}
            </button>
            <button
              type="button"
              className="btn-outline"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontWeight: 600 }}
              onClick={closeCompleteModal}
              disabled={completing}
            >
              <X size={16} style={{ marginRight: '6px' }} />Batal
            </button>
          </div>
        </div>
      </Modal>

      {/* Progress History Modal */}
      <Modal isOpen={!!progressHistoryModal} onClose={() => setProgressHistoryModal(null)} title="Riwayat Progress Pelatihan">
        {loadingHistories ? (
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
            {progressHistories.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Belum ada riwayat progress.</p>
            ) : (
              <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Oleh</th>
                    <th>Perubahan Skor</th>
                    <th>Status</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {progressHistories.map(h => (
                    <tr key={h.id}>
                      <td>{new Date(h.created_at).toLocaleString()}</td>
                      <td>{h.user?.name || 'Sistem'}</td>
                      <td>
                        <span style={{ color: '#64748b' }}>{h.old_score || 0}%</span>
                        <span style={{ margin: '0 4px' }}>→</span>
                        <span style={{ color: '#10b981', fontWeight: 500 }}>{h.new_score || 0}%</span>
                      </td>
                      <td>
                        {h.old_status} → {h.new_status}
                      </td>
                      <td style={{ color: '#64748b' }}>{h.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>

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

export default TrainingEnrollmentsPage;
