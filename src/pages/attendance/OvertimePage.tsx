import { useEffect, useState, useMemo } from 'react';
import { Card } from '@/shared/ui/Card';
import { Modal } from '@/shared/ui/Modal';
import { PageHeader } from '@/shared/ui';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { api } from '@/shared/api/httpClient';
import { useAuthStore } from '@/app/store/auth.store';
import { RBACUtils } from '@/shared/hooks/rbac';
import { PERMISSIONS } from '@/shared/types/rbac.types';
import { attendanceService } from '@/features/attendance/api/attendance.service';
import overtimeService from '@/features/attendance/api/overtime.service';
import { parsePaginatedResponse } from '@/shared/api/pagination';
import { showToast } from '@/shared/ui/toast';
import { RejectReasonModal } from "@/shared/components/RejectReasonModal";
import { Clock, RefreshCw, Calendar, Timer, AlertCircle, CheckCircle, XCircle, Search, MessageSquare, Eye, Send, Sparkles } from 'lucide-react';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import './AttendanceShared.css';


interface OvertimeRecord {
  id: number;
  attendance_id?: number;
  date: string;
  scheduled_checkout?: string;
  scheduled_check_out?: string;
  actual_checkout: string;
  overtime_minutes: number;
  status: string;
  request_id?: number;
  request_status?: string | null;
  reason: string | null;
  reject_reason: string | null;
  approved_by: number | null;
  approved_at: string | null;
  approver?: { id: number; name: string } | null;
  can_act?: boolean;
  evidences?: OvertimeEvidence[];
  employee?: {
    id: number;
    full_name: string;
    department?: { name: string };
    position?: { name: string };
    departmentRel?: { name: string };
    positionRel?: { name: string };
    department_rel?: { name: string };
    position_rel?: { name: string };
    user?: {
      name: string;
      profile?: any;
    };
  };
}

interface OvertimeEvidence {
  id?: number | string;
  file_url?: string;
  file_path?: string;
  status?: string;
  rejection_reason?: string | null;
  [key: string]: unknown;
}

type UnknownRecord = Record<string, unknown>;

type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

const toRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' ? (value as UnknownRecord) : {};

const toNullableNumber = (value: unknown): number | null => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toStringOrEmpty = (value: unknown): string => (typeof value === 'string' ? value : '');

const toEvidenceList = (value: unknown): OvertimeEvidence[] =>
  Array.isArray(value) ? (value as OvertimeEvidence[]) : [];

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const err = error as ApiErrorLike;
  return err.response?.data?.message || err.message || fallback;
};

const getEmployeeDepartmentName = (employee?: OvertimeRecord['employee']) =>
  employee?.departmentRel?.name || employee?.department_rel?.name || employee?.department?.name || '';

const getEmployeePositionName = (employee?: OvertimeRecord['employee']) =>
  employee?.positionRel?.name || employee?.position_rel?.name || employee?.position?.name || '';

const getEmployeeSubtitle = (employee?: OvertimeRecord['employee']) => {
  const parts = [getEmployeeDepartmentName(employee), getEmployeePositionName(employee)].filter(Boolean);
  return parts.join(' • ');
};

const toOvertimeRecord = (record: unknown): OvertimeRecord => {
  const row = toRecord(record);
  const scheduledCheckout = row.scheduled_checkout ?? row.scheduled_check_out;

  return {
    id: toNullableNumber(row.id) ?? 0,
    attendance_id: toNullableNumber(row.attendance_id) ?? undefined,
    date: toStringOrEmpty(row.date),
    scheduled_checkout: toStringOrEmpty(scheduledCheckout),
    scheduled_check_out: toStringOrEmpty(scheduledCheckout),
    actual_checkout: toStringOrEmpty(row.actual_checkout),
    overtime_minutes: toNullableNumber(row.overtime_minutes) ?? 0,
    status: normalizeOvertimeStatus(toStringOrEmpty(row.status)),
    request_id: toNullableNumber(row.id) ?? undefined,
    request_status: normalizeOvertimeStatus(toStringOrEmpty(row.status)),
    reason: typeof row.reason === 'string' ? row.reason : null,
    reject_reason: typeof row.reject_reason === 'string' ? row.reject_reason : null,
    approved_by: toNullableNumber(row.approved_by),
    approved_at: typeof row.approved_at === 'string' ? row.approved_at : null,
    approver: row.approver && typeof row.approver === 'object' ? (row.approver as OvertimeRecord['approver']) : null,
    evidences: toEvidenceList(row.evidences),
    can_act: typeof row.can_act === 'boolean' ? row.can_act : undefined,
    employee: row.employee && typeof row.employee === 'object' ? (row.employee as OvertimeRecord['employee']) : undefined,
  };
};

const normalizeOvertimeStatus = (status?: string | null) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'approve' || normalized === 'approved' || normalized === 'accepted') return 'approved';
  if (normalized === 'reject' || normalized === 'rejected' || normalized === 'declined') return 'rejected';
  if (normalized === 'submitted' || normalized === 'waiting') return 'pending';
  return normalized;
};

const OvertimePage = () => {
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'Semua' | 'Pending' | 'Approved' | 'Rejected'>('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reasonDraft, setReasonDraft] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
  const [reasonSaving, setReasonSaving] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [evidenceList, setEvidenceList] = useState<OvertimeEvidence[] | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;
  const user = useAuthStore((state) => state.user);

  const canViewAllOvertime = useMemo(() => {
    return RBACUtils.hasPermission(user, [PERMISSIONS.OVERTIME_VIEW, PERMISSIONS.ATTENDANCE_VIEW_ALL]);
  }, [user]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      if (canViewAllOvertime) {
        const allOvertimeRes = await api.get('/overtime/requests', { params: { page: currentPage, per_page: pageSize } });
        const parsedOvertime = parsePaginatedResponse<UnknownRecord>(allOvertimeRes.data);
        const allOvertime = parsedOvertime.items;
        const transformed = allOvertime.map(toOvertimeRecord);
        setRecords(transformed);
        setTotalPages(parsedOvertime.totalPages);
      } else {
        const [summaryResult, requestResult] = await Promise.all([
          attendanceService.getOvertimeSummary(30),
          api.get('/my/overtime'),
        ]);

        const summaryPayload = toRecord(summaryResult.payload);
        const overtimeRows = Array.isArray(summaryPayload.records) ? summaryPayload.records : [];

        const parsedRequests = parsePaginatedResponse<UnknownRecord>(requestResult.data);
        const requests = parsedRequests.items;
        setTotalPages(parsedRequests.totalPages);
        const requestByAttendanceId = new Map<string, UnknownRecord>();
        const requestByDate = new Map<string, UnknownRecord>();

        requests.forEach((request) => {
          const requestRecord = toRecord(request);
          const attendanceRecord = toRecord(requestRecord.attendance);
          const attendanceId = requestRecord.attendance_id ?? attendanceRecord.id;
          if (attendanceId !== undefined && attendanceId !== null) {
            requestByAttendanceId.set(String(attendanceId), requestRecord);
          }
          if (requestRecord.date) {
            requestByDate.set(String(requestRecord.date).slice(0, 10), requestRecord);
          }
        });

        const resolveRequestForRecord = (record: UnknownRecord) => {
          const attendanceKeys = [record.attendance_id, record.id]
            .filter((value) => value !== undefined && value !== null)
            .map(String);
          for (const key of attendanceKeys) {
            const request = requestByAttendanceId.get(key);
            if (request) return request;
          }
          const dateKey = record.date ? String(record.date).slice(0, 10) : null;
          if (dateKey && requestByDate.has(dateKey)) {
            return requestByDate.get(dateKey);
          }
          return null;
        };

        const mergedRecords = overtimeRows
          .map(toRecord)
          .filter((record) => Number(record.overtime_minutes || 0) > 0)
          .map((record) => {
            const request = resolveRequestForRecord(record);
            return {
              ...toOvertimeRecord(record),
              attendance_id: toNullableNumber(request?.attendance_id) ?? toNullableNumber(record.attendance_id) ?? toNullableNumber(record.id) ?? undefined,
              request_id: toNullableNumber(request?.id) ?? toNullableNumber(request?.attendance_id) ?? undefined,
              request_status: normalizeOvertimeStatus(toStringOrEmpty(request?.status)),
              reason: typeof request?.reason === 'string' ? request.reason : typeof record.reason === 'string' ? record.reason : null,
              reject_reason: typeof request?.reject_reason === 'string' ? request.reject_reason : null,
              approved_by: toNullableNumber(request?.approved_by),
              approved_at: typeof request?.approved_at === 'string' ? request.approved_at : null,
              approver: request?.approver && typeof request.approver === 'object' ? (request.approver as OvertimeRecord['approver']) : null,
              evidences: toEvidenceList(request?.evidences),
              status: normalizeOvertimeStatus(toStringOrEmpty(request?.status) || (Number(record.overtime_minutes || 0) > 0 ? 'pending' : 'draft')),
            };
          });

        setRecords(mergedRecords);
      }
    } catch (error: unknown) {
      console.error('Failed to load overtime:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, [canViewAllOvertime, currentPage]);

  const handleAddReason = async (record: OvertimeRecord) => {
    if (!record.request_id) {
      showToast('Data lembur belum memiliki pengajuan untuk diisi alasan.', 'info');
      return;
    }
    setSelectedRecord(record);
    setReasonDraft(record.reason || '');
    setReasonModalOpen(true);
  };

  const closeReasonModal = () => {
    if (reasonSaving) return;
    setReasonModalOpen(false);
    setReasonDraft('');
    setSelectedRecord(null);
  };

  const submitReason = async () => {
    const requestId = selectedRecord?.request_id;
    if (!requestId) return;
    const reason = reasonDraft.trim();
    if (!reason) {
      showToast('Alasan lembur tidak boleh kosong.', 'info');
      return;
    }
    try {
      setReasonSaving(true);
      await api.put(`/my/overtime/${requestId}/reason`, { reason });
      setReasonModalOpen(false);
      setReasonDraft('');
      setSelectedRecord(null);
      await loadRecords();
      showToast('Alasan lembur berhasil disimpan', 'success');
    } catch (error: unknown) {
      showToast(getApiErrorMessage(error, 'Gagal menambahkan alasan'), 'error');
    } finally {
      setReasonSaving(false);
    }
  };

  const handleApproveRequest = async (record: OvertimeRecord) => {
    const requestId = record.request_id;
    if (!requestId) return;
    try {
      setLoading(true);
      await api.put(`/overtime/requests/${requestId}/approve`);
      await loadRecords();
      showToast('Lembur berhasil disetujui', 'success');
    } catch (error: unknown) {
      showToast(getApiErrorMessage(error, 'Gagal menyetujui lembur'), 'error');
      setLoading(false);
    }
  };

  const handleRejectRequest = async (record: OvertimeRecord) => {
    const requestId = record.request_id;
    if (!requestId) return;
    setRejectTargetId(requestId);
  };

  const confirmRejectRequest = async (reason: string) => {
    if (rejectTargetId === null) return;
    try {
      setLoading(true);
      await api.put(`/overtime/requests/${rejectTargetId}/reject`, { reject_reason: reason || undefined });
      setRejectTargetId(null);
      await loadRecords();
      showToast('Lembur berhasil ditolak', 'success');
    } catch (error: unknown) {
      showToast(getApiErrorMessage(error, 'Gagal menolak lembur'), 'error');
      setLoading(false);
    }
  };

  const handleUploadEvidence = async (record: OvertimeRecord) => {
    let requestId = record.request_id;
    if (!requestId && record.attendance_id) {
      try {
        const createRes = await overtimeService.createOvertimeRequest(record.attendance_id);
        const payload = toRecord(createRes?.data ?? createRes);
        requestId = toNullableNumber(payload.id) ?? toNullableNumber(payload.request_id) ?? undefined;
      } catch (err: unknown) {
        showToast(getApiErrorMessage(err, 'Gagal membuat pengajuan lembur'), 'error');
        return;
      }
    }
    if (!requestId) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await overtimeService.uploadEvidence(requestId, file);
        showToast('Bukti berhasil diunggah', 'success');
        void loadRecords();
      } catch (err: unknown) {
        showToast(getApiErrorMessage(err, 'Gagal mengunggah bukti'), 'error');
      }
    };
    input.click();
  };

  const handleViewMyEvidences = async (record: OvertimeRecord) => {
    const requestId = record.request_id ?? record.id;
    if (!requestId) return;
    try {
      const res = canViewAllOvertime
        ? await overtimeService.getEvidencesForRequest(requestId)
        : await overtimeService.getMyEvidences(requestId);
      const payload = res?.data?.data ?? res?.data ?? res;
      const list = Array.isArray(payload) ? payload : [];
      if (list.length === 0) {
        showToast('Belum ada bukti untuk lembur ini', 'info');
        return;
      }
      setEvidenceList(toEvidenceList(list));
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Gagal mengambil bukti'), 'error');
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const dateMatch = (r.date || '').toLowerCase().includes(searchText.toLowerCase());
      const reasonMatch = (r.reason || '').toLowerCase().includes(searchText.toLowerCase());
      const currentStatus = normalizeOvertimeStatus(r.request_status ?? r.status);
      let statusMatch = true;
      if (activeTab === 'Pending') statusMatch = currentStatus === 'pending';
      else if (activeTab === 'Approved') statusMatch = currentStatus === 'approved';
      else if (activeTab === 'Rejected') statusMatch = currentStatus === 'rejected';
      return (dateMatch || reasonMatch) && statusMatch;
    });
  }, [records, searchText, activeTab]);

  const pendingCount = records.filter(r => normalizeOvertimeStatus(r.request_status ?? r.status) === 'pending').length;
  const approvedCount = records.filter(r => normalizeOvertimeStatus(r.request_status ?? r.status) === 'approved').length;
  const rejectedCount = records.filter(r => normalizeOvertimeStatus(r.request_status ?? r.status) === 'rejected').length;
  const totalMinutes = records.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0);
  const totalOvertimeDays = records.length;

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}j ${m}m`;
  };

  const formatTime = (timeStr: string | undefined) => {
    if (!timeStr) return '-';
    try {
      const date = new Date(timeStr);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      return timeStr.split(' ')[1] || timeStr;
    } catch { return timeStr; }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = normalizeOvertimeStatus(status);
    const map: Record<string, { label: string; tone: string }> = {
      'pending': { label: 'Menunggu', tone: 'orange' },
      'approved': { label: 'Disetujui', tone: 'green' },
      'rejected': { label: 'Ditolak', tone: 'red' },
    };
    const config = map[normalizedStatus] || { label: 'Tercatat', tone: 'blue' };
    return <span className={`badge-soft badge-soft--${config.tone}`}>{config.label}</span>;
  };

  return (
    <div className="crud-page">
      <PageHeader
        title={canViewAllOvertime ? 'Manajemen Lembur' : 'Lembur Saya'}
        subtitle="Kelola pengajuan lembur dan bukti pendukung secara efisien."
        badge={{ icon: Timer, label: 'Layanan Mandiri' }}
        scope
        actions={
          <button className="btn-outline" onClick={() => void loadRecords()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Segarkan
          </button>
        }
      />

      <div className="employee-summary-wrapper">
        {[
          { label: 'Hari Lembur', value: String(totalOvertimeDays), tone: 'blue', icon: Clock },
          { label: 'Pending', value: String(pendingCount), tone: 'orange', icon: AlertCircle },
          { label: 'Disetujui', value: String(approvedCount), tone: 'green', icon: CheckCircle },
          { label: 'Total Durasi', value: formatDuration(totalMinutes), tone: 'purple', icon: Timer },
        ].map((card) => (
          <div key={card.label} className="employee-summary-card">
            <div className="employee-summary-header">
              <div><p className="employee-summary-label">{card.label}</p></div>
              <div className={`employee-summary-icon-wrapper employee-icon-${card.tone}`}><card.icon size={28} /></div>
            </div>
            <div className={`employee-summary-value employee-value-${card.tone}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="table-section overtime-table-section">
        <div className="wuw-table-area overtime-table-area">
          <div className="table-toolbar overtime-table-toolbar">
            <div className="control-section-inner">
              <div className="elyra-tabs">
                {(['Semua', 'Pending', 'Approved', 'Rejected'] as const).map((tab) => (
                  <button key={tab} className={`elyra-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                    {tab} {tab !== 'Semua' && <span className="tab-count">{tab === 'Pending' ? pendingCount : tab === 'Approved' ? approvedCount : rejectedCount}</span>}
                  </button>
                ))}
              </div>
              <div className="control-actions">
                <div className="search-box">
                  <div className="search-icon-inside"><Search size={18} /></div>
                  <input type="text" placeholder="Cari lembur..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="search-input-pill" />
                </div>
              </div>
            </div>
          </div>
          {loading && <LoadingState message="Memuat lembur..." />}
          {!loading && filteredRecords.length === 0 && <EmptyState title="Belum Ada Lembur" message="Tidak ada data lembur yang ditemukan." />}
          {!loading && filteredRecords.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {canViewAllOvertime && <th>Karyawan</th>}
                    <th>Tanggal</th>
                    <th>Checkout (Jadwal/Aktual)</th>
                    <th>Durasi</th>
                    <th>Alasan</th>
                    <th className="th-center">Status</th>
                    <th className="th-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id}>
                      {canViewAllOvertime && (
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {(record.employee?.user?.name || record.employee?.full_name || 'E').charAt(0).toUpperCase()}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{record.employee?.user?.name || record.employee?.full_name || 'User'}</span>
                              {getEmployeeSubtitle(record.employee) && (
                                <span className="cell-stacked__sub">{getEmployeeSubtitle(record.employee)}</span>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} color="#64748b" />{formatDate(record.date)}</div></td>
                      <td>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatTime(record.scheduled_check_out || record.scheduled_checkout)}</div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{formatTime(record.actual_checkout)}</div>
                      </td>
                      <td><span style={{ fontWeight: 700, color: '#7c3aed' }}>{formatDuration(record.overtime_minutes)}</span></td>
                      <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.reason || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Belum diisi</span>}</td>
                      <td className="td-center">{getStatusBadge(record.request_status || record.status)}</td>
                      <td className="td-center">
                        <div className="action-btn-group">
                          {canViewAllOvertime && normalizeOvertimeStatus(record.request_status || record.status) === 'pending' && record.can_act !== false && (
                            <>
                              <button className="action-btn" style={{ color: '#10b981', background: '#ecfdf5' }} onClick={() => void handleApproveRequest(record)} title="Setujui"><CheckCircle size={16} /></button>
                              <button className="action-btn" style={{ color: '#ef4444', background: '#fef2f2' }} onClick={() => void handleRejectRequest(record)} title="Tolak"><XCircle size={16} /></button>
                            </>
                          )}
                          {record.request_id && (normalizeOvertimeStatus(record.request_status) === 'pending' || !record.reason) && (
                            <button className="action-btn" style={{ color: '#6366f1', background: '#eef2ff' }} onClick={() => void handleAddReason(record)} title="Alasan"><MessageSquare size={16} /></button>
                          )}
                          {(record.request_id || record.attendance_id) && normalizeOvertimeStatus(record.request_status) !== 'approved' && (
                            <button className="action-btn" style={{ color: '#06b6d4', background: '#ecfeff' }} onClick={() => void handleUploadEvidence(record)} title="Upload"><Send size={16} /></button>
                          )}
                          <button className="action-btn" style={{ color: '#0f172a', background: '#f1f5f9' }} onClick={() => void handleViewMyEvidences(record)} title="Bukti" disabled={!record.request_id}><Eye size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="table-pagination">
                  <div className="pagination-info">
                    Menampilkan halaman {currentPage} dari {totalPages}
                  </div>
                  <div className="pagination-controls">
                    <button className="pagination-btn" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>‹</button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button key={page} className={`pagination-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                    ))}
                    <button className="pagination-btn" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>›</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={reasonModalOpen} onClose={closeReasonModal} title="Alasan Lembur" size="md" footer={<><button className="btn-outline" onClick={closeReasonModal}>Batal</button><button className="btn-primary" onClick={() => void submitReason()} disabled={reasonSaving}>{reasonSaving ? 'Menyimpan...' : 'Simpan'}</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700 }}>{selectedRecord ? formatDate(selectedRecord.date) : ''}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Masukkan alasan lembur yang jelas.</div>
          </div>
          <textarea value={reasonDraft} onChange={(e) => setReasonDraft(e.target.value)} rows={5} placeholder="Contoh: Menyelesaikan laporan bulanan..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
        </div>
      </Modal>

      <RejectReasonModal isOpen={rejectTargetId !== null} onClose={() => setRejectTargetId(null)} onConfirm={confirmRejectRequest} />
      {evidenceList && (
        <Modal isOpen={!!evidenceList} onClose={() => setEvidenceList(null)} title="Bukti Lembur" size="sm">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {evidenceList.map((ev, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", borderRadius: "8px", background: "#f8fafc", border: "1px solid #f1f5f9", cursor: "pointer" }} onClick={() => { const url = ev.file_url || ev.url || ev.path; if (url) window.open(url as string, '_blank'); }}>
                <span style={{ fontWeight: 600 }}>{i + 1}.</span>
                <span>{String(ev.filename || ev.name || 'File Bukti')}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OvertimePage;
