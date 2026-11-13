import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, GraduationCap, Calendar, Users, BookOpen, Search, Filter, Clock, Award, Edit, Trash2, BookTemplate, CheckCircle, TrendingUp, UserPlus, X, Loader2, XCircle, History, Save } from 'lucide-react';
import { showToast } from '@/shared/ui/toast';
import { ApprovalHistoryModal } from "@/shared/components/ApprovalHistoryModal";
import { Card } from '@/shared/ui/Card';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { PageHeader } from '@/shared/ui';
import { trainingService } from '@/features/training/api/training.service';
import { employeeService } from '@/features/employee/api/employee.service';
import type { TrainingProgram } from '@/features/training/types/training.types';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/leave/LeaveShared.css';
import './TrainingProgramsPage.css';
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";

const TABS = ['Program Pelatihan', 'Pendaftaran Pelatihan'] as const;
type Tab = (typeof TABS)[number];

const formatDate = (input: string) => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
};

const ProgramsTab: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const canCreate = RBACUtils.hasPermission(user, PERMISSIONS.TRAINING_CREATE);
  const canUpdate = RBACUtils.hasPermission(user, PERMISSIONS.TRAINING_UPDATE);
  const canDelete = RBACUtils.hasPermission(user, PERMISSIONS.TRAINING_DELETE);
  const canEnroll = RBACUtils.hasPermission(user, PERMISSIONS.TRAINING_ENROLL);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Semua' | 'Active' | 'Draft' | 'Completed' | 'Cancelled'>('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [selectedProgramName, setSelectedProgramName] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TrainingProgram | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await trainingService.getPrograms();
      let arr: any[] = [];
      if (Array.isArray(data)) arr = data;
      else if (Array.isArray(data?.data)) arr = data.data;
      else if (Array.isArray(data?.data?.data)) arr = data.data.data;
      setPrograms(arr);
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => programs.filter(p => {
    const q = searchQuery.toLowerCase();
    const textMatch = ((p as any).title || p.nama || '')?.toLowerCase().includes(q) || (p.category || '')?.toLowerCase().includes(q);
    let statusMatch = true;
    if (activeTab === 'Active') statusMatch = p.status === 'active';
    else if (activeTab === 'Draft') statusMatch = p.status === 'draft';
    else if (activeTab === 'Completed') statusMatch = p.status === 'completed';
    else if (activeTab === 'Cancelled') statusMatch = p.status === 'cancelled';
    return textMatch && statusMatch;
  }), [programs, searchQuery, activeTab]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => ((a as any).title || '').localeCompare((b as any).title || '')), [filtered]);
  const paginated = sorted;
  const [totalPages, setTotalPages] = useState(1);

  const summaryCards = useMemo(() => [
    { label: 'Total Program', subtitle: 'Seluruh program pelatihan', value: String(programs.length), change: 'Program Pelatihan', tone: 'blue' as const, icon: GraduationCap },
    { label: 'Hasil Filter', subtitle: 'Program sesuai pencarian', value: String(sorted.length), change: `${paginated.length} data per halaman`, tone: 'green' as const, icon: Search },
    { label: 'Aktif', subtitle: 'Program yang sedang aktif', value: String(programs.filter(p => p.status === 'active').length), change: 'Program Aktif', tone: 'orange' as const, icon: CheckCircle },
    { label: 'Kategori', subtitle: 'Kategori pelatihan', value: String(new Set(programs.map(p => p.category).filter(Boolean)).size), change: 'Jenis pelatihan', tone: 'purple' as const, icon: BookTemplate },
  ], [programs, sorted.length, paginated.length]);

  const clearFilters = () => { setSearchQuery(''); setActiveTab('Semua'); setCurrentPage(1); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!canDelete) {
      showToast('Anda tidak memiliki izin menghapus program training', 'error');
      return;
    }

    setDeleting(true);
    try {
      await trainingService.deleteProgram(Number(deleteTarget.id));
      showToast('Program berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      showToast(err?.response?.data?.message || err?.message || 'Gagal menghapus program', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openEnrollModal = (programId: number, programName: string) => {
    if (!canEnroll) {
      showToast('Anda tidak memiliki izin mendaftarkan karyawan ke training', 'error');
      return;
    }
    setSelectedProgramId(programId); setSelectedProgramName(programName);
    setEnrollModalOpen(true); setSelectedEmployeeId(null); setEmployeeSearch('');
  };
  const closeEnrollModal = () => { setEnrollModalOpen(false); setSelectedProgramId(null); setSelectedProgramName(''); setSelectedEmployeeId(null); setEmployeeSearch(''); };
  const loadEmployees = async () => { try { setEmployees(await employeeService.getEmployees()); } catch (err) { console.error(err); } };

  const handleEnroll = async () => {
    if (!canEnroll) {
      showToast('Anda tidak memiliki izin mendaftarkan karyawan ke training', 'error');
      return;
    }
    if (!selectedProgramId || !selectedEmployeeId) return;
    setEnrolling(true);
    try {
      await trainingService.enrollEmployees(selectedProgramId, [selectedEmployeeId]);
      closeEnrollModal(); fetchData();
      showToast('Karyawan berhasil didaftarkan', 'success');
    } catch (err: any) {
      console.error(err); showToast(err.response?.data?.message || err?.message || 'Gagal mendaftarkan karyawan', 'error');
    } finally { setEnrolling(false); }
  };

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter((emp: any) => (emp.user?.name || emp.name || '').toLowerCase().includes(q) || (emp.employee_code || '').toLowerCase().includes(q));
  }, [employees, employeeSearch]);

  return (
    <>
      <div className="training-summary-wrapper">
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="training-summary-card">
              <div className="training-summary-header">
                <div><p className="training-summary-label">{card.label}</p><p className="training-summary-subtitle">{card.subtitle}</p></div>
                <div className={`training-summary-icon-wrapper training-icon-${card.tone}`}><Icon size={28} /></div>
              </div>
              <div className={`training-summary-value training-value-${card.tone}`}>{card.value}</div>
              <p className="training-summary-trend">{card.change}</p>
            </div>
          );
        })}
      </div>

      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon"><BookOpen size={24} /></div>
          <div><h2 className="analytics-title">Daftar Program</h2><p className="analytics-subtitle">Kelola dan lihat semua program pelatihan</p></div>
        </div>
      </Card>

      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar integrated-table-toolbar--stack-left">
        <div className="control-section-inner">
          <div className="elyra-tabs">
            {(['Semua', 'Active', 'Draft', 'Completed', 'Cancelled'] as const).map(tab => (
              <button key={tab} className={`elyra-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => { setActiveTab(tab); setCurrentPage(1); }}>{tab}</button>
            ))}
          </div>
          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input type="text" placeholder="Cari program..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="search-input-pill" />
            </div>
            <button className={`filter-btn-rounded ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}><Filter size={18} /><span>Filter</span></button>
            {canCreate && <button className="btn-primary" onClick={() => navigate('/training/programs/create')}><Plus size={16} /> Tambah Program</button>}
          </div>
        </div>
        {showFilters && <div className="filter-dropdown"><div className="filter-row">{(searchQuery || activeTab !== 'Semua') && <button className="btn-clear-filter" onClick={clearFilters}>Hapus Filter</button>}</div></div>}
      </Card>

          {loading && <LoadingState message="Memuat program..." />}
          {!loading && paginated.length === 0 && (
            <div style={{ padding: '5rem 0' }}><EmptyState title="Pencarian Kosong" message="Tidak ada program yang sesuai." actionLabel="Bersihkan Filter" onAction={clearFilters} /></div>
          )}
          {!loading && paginated.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '400px' }}>Nama Program</th>
                      <th>Kategori</th>
                      <th>Mode</th>
                      <th>Provider</th>
                      <th>Tanggal Mulai</th>
                      <th className="th-center">Status</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(program => (
                      <tr key={program.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">{((program as any).title || 'P').charAt(0).toUpperCase()}</div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{program.title || program.nama}</span>
                              <span className="cell-stacked__sub">{program.description || 'No description'}</span>
                            </div>
                          </div>
                        </td>
                        <td><span style={{ color: '#475569', fontWeight: 600 }}>{program.category || '-'}</span></td>
                        <td><span className="badge-soft badge-soft--blue">{program.mode || '-'}</span></td>
                        <td><span style={{ color: '#64748b', fontWeight: 500 }}>{program.provider || '-'}</span></td>
                        <td><span style={{ fontSize: '0.85rem' }}>{program.start_date ? formatDate(program.start_date) : '-'}</span></td>
                        <td className="td-center">
                          <span className={`badge-soft badge-soft--${program.status === 'active' ? 'green' : program.status === 'draft' ? 'yellow' : program.status === 'completed' ? 'blue' : 'red'}`}>
                            {program.status || 'draft'}
                          </span>
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            {canEnroll && (
                            <button className="action-btn" style={{ color: '#6366f1', background: '#eef2ff' }} onClick={() => openEnrollModal(typeof program.id === 'string' ? parseInt(program.id, 10) : program.id, program.title || program.nama || '')} title="Daftarkan Karyawan">
                              <UserPlus size={16} />
                            </button>
                            )}
                            {canUpdate && <button className="action-btn action-btn-edit" onClick={() => navigate(`/training/programs/edit/${program.id}`)} title="Edit"><Edit size={16} /></button>}
                            {canDelete && <button className="action-btn action-btn-delete" onClick={() => setDeleteTarget(program)} title="Hapus"><Trash2 size={16} /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-pagination">
                <div className="pagination-info">
                  {sorted.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sorted.length)} dari ${sorted.length} data`}
                </div>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button key={page} className={`pagination-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                  ))}
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>›</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={canEnroll && enrollModalOpen} onClose={closeEnrollModal} title={`Daftarkan Karyawan — ${selectedProgramName}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input type="text" placeholder="Cari karyawan..." value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} onFocus={async () => { if (employees.length === 0) await loadEmployees(); }} className="form-control" style={{ paddingLeft: '36px' }} />
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredEmployees.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0' }}>Tidak ada karyawan ditemukan</p>
            ) : (
              filteredEmployees.map((emp: any) => (
                <button key={emp.id} type="button" onClick={() => setSelectedEmployeeId(emp.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '10px', border: selectedEmployeeId === emp.id ? '2px solid #6366f1' : '1px solid #e2e8f0', background: selectedEmployeeId === emp.id ? '#eef2ff' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: selectedEmployeeId === emp.id ? '#6366f1' : '#f1f5f9', color: selectedEmployeeId === emp.id ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                    {(emp.user?.name || emp.name || 'E').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{emp.user?.name || emp.name || 'Employee'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{emp.employee_code || '-'}</div>
                  </div>
                  {selectedEmployeeId === emp.id && <CheckCircle size={18} color="#6366f1" />}
                </button>
              ))
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            {canEnroll && (
            <button type="button" className="btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontWeight: 600 }} onClick={handleEnroll} disabled={!selectedEmployeeId || enrolling}>
              {enrolling ? <><Loader2 size={16} className="animate-spin" /> Mendaftar...</> : <><UserPlus size={16} /> Daftarkan</>}
            </button>
            )}
            <button type="button" className="btn-outline" style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontWeight: 600 }} onClick={closeEnrollModal} disabled={enrolling}>
              <X size={16} /> Batal
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={canDelete && !!deleteTarget}
        title="Hapus Program Pelatihan"
        message={`Program "${String((deleteTarget as any)?.title || (deleteTarget as any)?.nama || 'ini')}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
};

const EnrollmentsTab: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const canEnroll = RBACUtils.hasPermission(user, PERMISSIONS.TRAINING_ENROLL);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'Semua' | 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'>('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completingEnrollmentId, setCompletingEnrollmentId] = useState<number | null>(null);
  const [completingEnrollmentName, setCompletingEnrollmentName] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completeData, setCompleteData] = useState({ score: '', notes: '', certificate_path: '' });
  const [historyModal, setHistoryModal] = useState<{ module: string; id: number } | null>(null);
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

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: number) => {
    if (!canEnroll) {
      showToast('Anda tidak memiliki izin menyetujui pendaftaran training', 'error');
      return;
    }
    try { setLoading(true); await trainingService.approveEnrollment(id); fetchData(); showToast('Pendaftaran berhasil disetujui', 'success'); } catch (error: any) { console.error(error); showToast(error?.response?.data?.message || error?.message || 'Gagal menyetujui pendaftaran', 'error'); setLoading(false); }
  };

  const handleReject = async (id: number) => {
    if (!canEnroll) {
      showToast('Anda tidak memiliki izin menolak pendaftaran training', 'error');
      return;
    }
    try { setLoading(true); await trainingService.rejectEnrollment(id); fetchData(); showToast('Pendaftaran berhasil ditolak', 'success'); } catch (error: any) { console.error(error); showToast(error?.response?.data?.message || error?.message || 'Gagal menolak pendaftaran', 'error'); setLoading(false); }
  };

  const openCompleteModal = (enrollment: any) => {
    if (!canEnroll) {
      showToast('Anda tidak memiliki izin mengubah progress training', 'error');
      return;
    }
    setCompletingEnrollmentId(enrollment.id); setCompletingEnrollmentName(enrollment.program?.title || 'Training');
    setCompleteData({ score: '', notes: '', certificate_path: '' }); setCompleteModalOpen(true);
  };
  const closeCompleteModal = () => { setCompleteModalOpen(false); setCompletingEnrollmentId(null); setCompletingEnrollmentName(''); setCompleteData({ score: '', notes: '', certificate_path: '' }); };

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
      closeCompleteModal(); fetchData();
      showToast('Pelatihan berhasil ditandai selesai', 'success');
    } catch (err: any) {
      console.error(err); showToast(err.response?.data?.message || err?.message || 'Gagal menandai pelatihan selesai', 'error');
    } finally { setCompleting(false); }
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
      closeCompleteModal(); fetchData();
      showToast('Progress berhasil disimpan', 'success');
    } catch (err: any) {
      console.error(err); showToast(err.response?.data?.message || err?.message || 'Gagal menyimpan progress', 'error');
    } finally { setCompleting(false); }
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
      console.error(err); showToast('Gagal memuat riwayat progress', 'error');
    } finally { setLoadingHistories(false); }
  };

  const filtered = useMemo(() => enrollments.filter((e: any) => {
    const q = searchText.toLowerCase();
    const matchSearch = !q || (e.program?.title || e.training_title || '').toLowerCase().includes(q) || (e.employee?.user?.name || e.employee_name || '').toLowerCase().includes(q);
    let statusMatch = true;
    if (activeTab === 'Pending') statusMatch = e.status === 'pending';
    else if (activeTab === 'In Progress') statusMatch = e.status === 'in_progress' || e.status === 'ongoing';
    else if (activeTab === 'Completed') statusMatch = e.status === 'completed';
    else if (activeTab === 'Cancelled') statusMatch = e.status === 'cancelled' || e.status === 'dropped';
    return matchSearch && statusMatch;
  }), [enrollments, searchText, activeTab]);

  const paginated = filtered;
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { setCurrentPage(1); }, [searchText, activeTab]);

  const summaryStats = useMemo(() => {
    const completed = enrollments.filter(e => e.status === 'completed').length;
    const inProgress = enrollments.filter(e => e.status === 'in_progress' || e.status === 'ongoing').length;
    return [
      { label: 'Total Pendaftaran', subtitle: 'Seluruh pendaftaran', value: String(enrollments.length), change: 'Data pendaftaran aktif', tone: 'blue' as const, icon: Users },
      { label: 'Hasil Filter', subtitle: 'Pendaftaran sesuai pencarian', value: String(filtered.length), change: `${paginated.length} data per halaman`, tone: 'green' as const, icon: Search },
      { label: 'Sedang Berlangsung', subtitle: 'Pelatihan aktif', value: String(inProgress), change: 'Dalam proses', tone: 'orange' as const, icon: Clock },
      { label: 'Selesai', subtitle: 'Pelatihan selesai', value: String(completed), change: 'Status final selesai', tone: 'green' as const, icon: CheckCircle },
    ];
  }, [enrollments, filtered.length, paginated.length]);

  const clearFilters = () => { setSearchText(''); setActiveTab('Semua'); setCurrentPage(1); };

  const getStatusBadge = (status: string) => {
    const m: Record<string, { label: string; tone: string }> = { 'completed': { label: 'Completed', tone: 'green' }, 'in_progress': { label: 'In Progress', tone: 'orange' }, 'ongoing': { label: 'In Progress', tone: 'orange' }, 'pending': { label: 'Pending', tone: 'orange' }, 'cancelled': { label: 'Cancelled', tone: 'red' }, 'dropped': { label: 'Cancelled', tone: 'red' } };
    const c = m[status?.toLowerCase()] || { label: status?.toUpperCase() || 'UNKNOWN', tone: 'orange' };
    return <span className={`badge-soft badge-soft--${c.tone}`}>{c.label}</span>;
  };

  return (
    <>
      <div className="employee-summary-wrapper">
        {summaryStats.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="employee-summary-card">
              <div className="employee-summary-header">
                <div><p className="employee-summary-label">{card.label}</p><p className="employee-summary-subtitle">{card.subtitle}</p></div>
                <div className={`employee-summary-icon-wrapper employee-icon-${card.tone}`}><Icon size={28} /></div>
              </div>
              <div className={`employee-summary-value employee-value-${card.tone}`}>{card.value}</div>
              <p className="employee-summary-trend">{card.change}</p>
            </div>
          );
        })}
      </div>

      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon"><BookOpen size={24} /></div>
          <div><h2 className="analytics-title">Daftar Pendaftaran</h2><p className="analytics-subtitle">Kelola pendaftaran pelatihan karyawan</p></div>
        </div>
      </Card>

      <Card className="control-section-card">
        <div className="control-section-inner">
          <div className="elyra-tabs">
            {(['Semua', 'Pending', 'In Progress', 'Completed', 'Cancelled'] as const).map(tab => (
              <button key={tab} className={`elyra-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab}
                {tab !== 'Semua' && (
                  <span className="tab-count">
                    {tab === 'Pending' ? enrollments.filter(e => e.status === 'pending').length
                      : tab === 'In Progress' ? enrollments.filter(e => e.status === 'in_progress' || e.status === 'ongoing').length
                      : tab === 'Completed' ? enrollments.filter(e => e.status === 'completed').length
                      : enrollments.filter(e => e.status === 'cancelled' || e.status === 'dropped').length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input type="text" placeholder="Cari program atau nama karyawan..." value={searchText} onChange={e => setSearchText(e.target.value)} className="search-input-pill" />
            </div>
            <button className={`filter-btn-rounded ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}><Filter size={18} /><span>Filter</span></button>
          </div>
        </div>
        {showFilters && <div className="filter-dropdown"><div className="filter-row">{(searchText || activeTab !== 'Semua') && <button className="btn-clear-filter" onClick={clearFilters}>Hapus Filter</button>}</div></div>}
      </Card>

      <div className="table-section">
        <div className="wuw-table-area">
          {loading && <LoadingState message="Memuat data pendaftaran..." />}
          {!loading && paginated.length === 0 && (
            <div style={{ padding: '5rem 0' }}><EmptyState title="Pendaftaran Kosong" message={searchText || activeTab !== 'Semua' ? 'Tidak ada pendaftaran yang sesuai.' : 'Belum ada data pendaftaran.'} actionLabel="Segarkan" onAction={fetchData} /></div>
          )}
          {!loading && paginated.length > 0 && (
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
                    {paginated.map(enrollment => (
                      <tr key={enrollment.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">{(enrollment.program?.title || enrollment.training_title || 'T').charAt(0).toUpperCase()}</div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{enrollment.program?.title || enrollment.program?.nama || enrollment.training_title || 'Training Program'}</span>
                              <span className="cell-stacked__sub">{String(enrollment.program_id || enrollment.id)}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stacked">
                            <span className="cell-name-text">{enrollment.employee?.user?.name || enrollment.employee_name || 'Employee'}</span>
                            <span className="cell-stacked__sub">{enrollment.employee?.employee_code || '-'}</span>
                          </div>
                        </td>
                        <td style={{ color: '#475569', fontWeight: 500 }}>
                          {enrollment.program?.start_date
                            ? new Date(enrollment.program.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'N/A'}
                        </td>
                        <td className="td-center">{getStatusBadge(enrollment.status)}</td>
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
                                <button className="action-btn" style={{ color: '#10b981', background: '#ecfdf5' }} onClick={() => handleApprove(enrollment.id)} title="Approve"><CheckCircle size={16} /></button>
                                <button className="action-btn" style={{ color: '#ef4444', background: '#fef2f2' }} onClick={() => handleReject(enrollment.id)} title="Reject"><XCircle size={16} /></button>
                              </>
                            )}
                            {canEnroll && (enrollment.status === 'enrolled' || enrollment.status === 'in_progress') && (
                              <button className="action-btn" style={{ color: '#8b5cf6', background: '#f5f3ff' }} onClick={() => openCompleteModal(enrollment)} title="Update Progress"><Award size={16} /></button>
                            )}
                            <button className="action-btn" style={{ color: 'var(--color-primary)', background: '#eff6ff' }} onClick={() => openProgressHistory(enrollment.id)} title="Riwayat Progress"><TrendingUp size={16} /></button>
                            {enrollment.approval_flow_id && (
                              <button className="action-btn" style={{ color: '#8b5cf6', background: '#f5f3ff' }} onClick={() => setHistoryModal({ module: 'training', id: enrollment.id })} title="Riwayat Approval"><History size={16} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-pagination">
                <div className="pagination-info">
                  {filtered.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filtered.length)} dari ${filtered.length} data`}
                </div>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button key={page} className={`pagination-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                  ))}
                  <button className="pagination-btn" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>›</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={canEnroll && completeModalOpen} onClose={closeCompleteModal} title={`Update Progress / Selesai — ${completingEnrollmentName}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Nilai (0-100)</label>
            <input type="number" min="0" max="100" placeholder="Masukkan nilai" value={completeData.score} onChange={e => setCompleteData({ ...completeData, score: e.target.value })} className="form-control" />
          </div>
          <div className="form-group">
            <label>Path Sertifikat (opsional)</label>
            <input type="text" placeholder="/path/to/certificate.pdf" value={completeData.certificate_path} onChange={e => setCompleteData({ ...completeData, certificate_path: e.target.value })} className="form-control" />
          </div>
          <div className="form-group">
            <label>Catatan (opsional)</label>
            <textarea placeholder="Catatan tambahan..." value={completeData.notes} onChange={e => setCompleteData({ ...completeData, notes: e.target.value })} className="form-control" rows={3} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            {canEnroll && (
            <button type="button" className="btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontWeight: 600, background: 'var(--color-primary)' }} onClick={handleUpdateProgress} disabled={completing}>
              {completing ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Save size={16} /> Simpan Progress</>}
            </button>
            )}
            {canEnroll && (
            <button type="button" className="btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontWeight: 600 }} onClick={handleComplete} disabled={completing}>
              {completing ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Award size={16} /> Tandai Selesai</>}
            </button>
            )}
            <button type="button" className="btn-outline" style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontWeight: 600 }} onClick={closeCompleteModal} disabled={completing}>
              <X size={16} /> Batal
            </button>
          </div>
        </div>
      </Modal>

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
                        <span style={{ color: '#64748b' }}>{h.old_score || 0}%</span> <span style={{ margin: '0 4px' }}>→</span> <span style={{ color: '#10b981', fontWeight: 500 }}>{h.new_score || 0}%</span>
                      </td>
                      <td>{h.old_status} → {h.new_status}</td>
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
    </>
  );
};

const TrainingManagementPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('Program Pelatihan');

  return (
    <div className="crud-page training-page">
      <PageHeader
        title="Pelatihan & Pengembangan"
        subtitle="Kelola program pelatihan, pendaftaran, dan pengembangan keterampilan karyawan."
        badge={{ icon: GraduationCap, label: "L & D" }}
        scope
        actions={<RefreshCw size={16} />}
      />

      <div className="elyra-tabs" style={{ marginBottom: '1.5rem' }}>
        {TABS.map(t => (
          <button key={t} className={`elyra-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'Program Pelatihan' ? <><GraduationCap size={16} /> {t}</> : <><Users size={16} /> {t}</>}
          </button>
        ))}
      </div>

      {tab === 'Program Pelatihan' && <ProgramsTab />}
      {tab === 'Pendaftaran Pelatihan' && <EnrollmentsTab />}
    </div>
  );
};

export default TrainingManagementPage;
