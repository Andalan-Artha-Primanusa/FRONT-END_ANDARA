import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  History,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { PageHeader } from '@/shared/ui';
import { EmptyState, LoadingState } from '@/shared/ui/DataStateDisplay';
import { ApprovalHistoryModal } from '@/shared/components/ApprovalHistoryModal';
import { documentService } from '@/features/employee/api/document.service';
import type { EmployeeDocument } from '@/features/employee/types/document.types';
import { api } from '@/shared/api/httpClient';
import { getErrorMessage } from '@/shared/api/errorHandler';
import { showToast } from '@/shared/ui/toast';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import './DocumentReviewPage.css';

type DocumentStatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'expired';
type DocumentAction = 'approve' | 'reject';

type ReviewDocument = EmployeeDocument & {
  employee?: {
    id?: number;
    employee_code?: string;
    name?: string;
    user?: { name?: string; email?: string };
  };
  employee_name?: string;
  can_act?: boolean;
  can_review?: boolean;
  current_step?: number;
  total_steps?: number;
  required_role?: { display_name?: string; name?: string } | string;
  current_role?: { display_name?: string; name?: string } | string;
  approval?: {
    can_act?: boolean;
    current_step?: number;
    total_steps?: number;
    current_role?: { display_name?: string; name?: string } | string;
    required_role?: { display_name?: string; name?: string } | string;
  };
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'pending' },
  submitted: { label: 'Pending', className: 'pending' },
  approved: { label: 'Approved', className: 'approved' },
  rejected: { label: 'Rejected', className: 'rejected' },
  expired: { label: 'Kedaluwarsa', className: 'expired' },
  archived: { label: 'Diarsipkan', className: 'archived' },
};

const unwrapDocuments = (raw: any): ReviewDocument[] => {
  let payload = raw?.data ?? raw;
  if (!Array.isArray(payload) && payload?.data) {
    payload = payload.data;
  }
  return Array.isArray(payload) ? payload : [];
};

const normalizeStatus = (document: ReviewDocument) => {
  const status = String(document.status || '').toLowerCase();
  if (status === 'approved' && document.expires_at && new Date(document.expires_at) < new Date()) {
    return 'expired';
  }
  return status || 'pending';
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getEmployeeName = (document: ReviewDocument) =>
  document.employee_name ||
  document.employee?.user?.name ||
  document.employee?.name ||
  `Karyawan #${document.employee_id}`;

const getEmployeeSubtext = (document: ReviewDocument) =>
  document.employee?.employee_code || document.employee?.user?.email || `ID ${document.employee_id}`;

const getStoredFileName = (document: ReviewDocument) => {
  for (const value of [document.file_path, document.file_url]) {
    const filename = String(value || '').split('?')[0].split('/').filter(Boolean).pop();
    if (filename) return filename;
  }
  return document.file_name || '';
};

const getRoleLabel = (document: ReviewDocument) => {
  const role =
    document.approval?.current_role ||
    document.approval?.required_role ||
    document.current_role ||
    document.required_role;
  if (!role) return '';
  if (typeof role === 'string') return role;
  return role.display_name || role.name || '';
};

const getStepLabel = (document: ReviewDocument) => {
  const current = document.approval?.current_step ?? document.current_step;
  const total = document.approval?.total_steps ?? document.total_steps;
  if (current && total) return `Tahap ${current} dari ${total}`;
  if (current) return `Tahap ${current}`;
  return 'Menunggu persetujuan';
};

const canProcess = (document: ReviewDocument) => {
  const actionFlag = document.approval?.can_act ?? document.can_act ?? document.can_review;
  return actionFlag !== false && ['pending', 'submitted'].includes(String(document.status).toLowerCase());
};

const DocumentReviewPage = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ReviewDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<DocumentStatusFilter>('pending');
  const [selectedDocument, setSelectedDocument] = useState<ReviewDocument | null>(null);
  const [historyDocument, setHistoryDocument] = useState<ReviewDocument | null>(null);
  const [decision, setDecision] = useState<{ document: ReviewDocument; action: DocumentAction } | null>(null);
  const [decisionNote, setDecisionNote] = useState('');

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await documentService.getDocuments({ per_page: 100 });
      setDocuments(unwrapDocuments(data));
    } catch (error) {
      showToast(getErrorMessage(error) || 'Gagal memuat dokumen', 'error');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

  const counters = useMemo(() => {
    const totals = { all: documents.length, pending: 0, approved: 0, rejected: 0, expired: 0 };
    documents.forEach((document) => {
      const status = normalizeStatus(document);
      if (status in totals && status !== 'all') {
        totals[status as keyof typeof totals] += 1;
      }
    });
    return totals;
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return documents.filter((document) => {
      const matchesStatus = activeFilter === 'all' || normalizeStatus(document) === activeFilter;
      const searchable = [
        document.title,
        document.document_type,
        document.category,
        getEmployeeName(document),
        getEmployeeSubtext(document),
      ].join(' ').toLowerCase();
      return matchesStatus && (!query || searchable.includes(query));
    });
  }, [activeFilter, documents, searchText]);

  const summaryCards = [
    { label: 'Total Dokumen', subtitle: 'Dokumen termuat', value: counters.all, tone: 'blue', icon: FileText },
    { label: 'Menunggu', subtitle: 'Perlu keputusan', value: counters.pending, tone: 'orange', icon: Clock3 },
    { label: 'Disetujui', subtitle: 'Telah diproses', value: counters.approved, tone: 'green', icon: CheckCircle2 },
    { label: 'Kedaluwarsa', subtitle: 'Perlu perhatian', value: counters.expired, tone: 'red', icon: AlertCircle },
  ] as const;

  const closeDecision = () => {
    setDecision(null);
    setDecisionNote('');
  };

  const submitDecision = async () => {
    if (!decision) return;
    if (decision.action === 'reject' && !decisionNote.trim()) {
      showToast('Alasan penolakan wajib diisi', 'error');
      return;
    }

    setActionLoading(true);
    try {
      if (decision.action === 'approve') {
        await documentService.approveDocument(decision.document.id, decisionNote.trim() || undefined);
        showToast('Dokumen berhasil disetujui', 'success');
      } else {
        await documentService.rejectDocument(decision.document.id, decisionNote.trim());
        showToast('Dokumen berhasil ditolak', 'success');
      }
      closeDecision();
      await loadDocuments();
    } catch (error) {
      showToast(getErrorMessage(error) || 'Gagal memproses dokumen', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const downloadDocument = async (document: ReviewDocument) => {
    const fileName = getStoredFileName(document);
    if (!fileName) {
      showToast('File dokumen tidak tersedia', 'error');
      return;
    }
    try {
      const response = await api.get(`/documents/${encodeURIComponent(fileName)}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showToast(getErrorMessage(error) || 'Gagal mengunduh dokumen', 'error');
    }
  };

  const renderStatus = (document: ReviewDocument) => {
    const config = statusConfig[normalizeStatus(document)] || statusConfig.pending;
    return <span className={`document-review-status document-review-status--${config.className}`}>{config.label}</span>;
  };

  return (
    <div className="crud-page document-review-page">
      <PageHeader
        title="Review Dokumen"
        subtitle="Proses dokumen karyawan mengikuti tahap dan role pada konfigurasi Alur Persetujuan."
        badge={{ icon: FileCheck2, label: "Hukum & Dokumen" }}
        actions={
          <>
            <button className="btn-outline" onClick={() => navigate('/approval-flows')}>
              <Settings2 size={16} />
              Alur Persetujuan
            </button>
            <button className="btn-outline" onClick={() => void loadDocuments()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
          </>
        }
      />

      <div className="summary-grid">
        {summaryCards.map(({ label, subtitle, value, tone, icon: Icon }) => (
          <Card className="summary-card" key={label}>
            <div className="summary-card__header">
              <div>
                <span className="summary-card__label">{label}</span>
                <p className="summary-card__subtitle">{subtitle}</p>
              </div>
              <span className={`summary-card__icon summary-card__icon--${tone}`}>
                <Icon size={22} />
              </span>
            </div>
            <div className={`summary-card__value summary-card__value--${tone}`}>{value}</div>
            <div className="summary-card__change">{subtitle}</div>
          </Card>
        ))}
      </div>

      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <FileCheck2 size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Antrean Persetujuan Dokumen</h2>
            <p className="analytics-subtitle">Setujui atau tolak hanya ketika role Anda menjadi tahap aktif.</p>
          </div>
        </div>
      </Card>

      <Card className="document-review-list-card">
        <div className="document-review-toolbar">
          <div className="document-review-tabs">
            {[
              ['pending', 'Menunggu'],
              ['approved', 'Disetujui'],
              ['rejected', 'Ditolak'],
              ['expired', 'Kedaluwarsa'],
              ['all', 'Semua'],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={activeFilter === key ? 'active' : ''}
                onClick={() => setActiveFilter(key as DocumentStatusFilter)}
              >
                {label} <span>{counters[key as DocumentStatusFilter]}</span>
              </button>
            ))}
          </div>
          <div className="document-review-search">
            <Search size={18} />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Cari dokumen atau karyawan..."
            />
          </div>
        </div>

        {loading ? (
          <LoadingState message="Memuat antrean dokumen..." />
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            icon={<FileCheck2 size={34} />}
            title="Tidak ada dokumen"
            message={activeFilter === 'pending' ? 'Tidak ada dokumen yang menunggu persetujuan.' : 'Tidak ada dokumen yang sesuai filter.'}
          />
        ) : (
          <div className="document-review-table-wrap">
            <table className="data-table document-review-table">
              <thead>
                <tr>
                  <th>Dokumen</th>
                  <th>Karyawan</th>
                  <th>Tipe</th>
                  <th>Kedaluwarsa</th>
                  <th>Tahap Persetujuan</th>
                  <th>Status</th>
                  <th className="document-review-actions-header">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((document) => {
                  const roleLabel = getRoleLabel(document);
                  return (
                    <tr key={document.id}>
                      <td>
                        <div className="document-review-doc-cell">
                          <span className="document-review-file-icon"><FileText size={19} /></span>
                          <div>
                            <strong>{document.title}</strong>
                            <small>#{document.id}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{getEmployeeName(document)}</strong>
                        <small>{getEmployeeSubtext(document)}</small>
                      </td>
                      <td>
                        <span className="document-review-type">{String(document.document_type || '-').replace(/_/g, ' ')}</span>
                      </td>
                      <td>
                        <strong>{formatDate(document.expires_at)}</strong>
                        <small>{document.expires_at ? 'Masa berlaku' : 'Tanpa batas'}</small>
                      </td>
                      <td>
                        <div className="document-review-flow">
                          <ShieldCheck size={15} />
                          <div>
                            <strong>{getStepLabel(document)}</strong>
                            <small>{roleLabel || 'Sesuai alur aktif'}</small>
                          </div>
                        </div>
                      </td>
                      <td>{renderStatus(document)}</td>
                      <td className="td-center">
                        <div className="action-btn-group document-review-actions">
                          <button className="action-btn document-review-action document-review-action--download" title="Unduh" onClick={() => void downloadDocument(document)}>
                            <Download size={16} />
                          </button>
                          <button className="action-btn document-review-action document-review-action--view" title="Detail" onClick={() => setSelectedDocument(document)}>
                            <Eye size={16} />
                          </button>
                          <button className="action-btn document-review-action document-review-action--history" title="Riwayat Persetujuan" onClick={() => setHistoryDocument(document)}>
                            <History size={16} />
                          </button>
                          {canProcess(document) && (
                            <>
                              <button
                                className="action-btn document-review-action document-review-action--approve"
                                title="Setujui"
                                onClick={() => setDecision({ document, action: 'approve' })}
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                className="action-btn document-review-action document-review-action--reject"
                                title="Tolak"
                                onClick={() => setDecision({ document, action: 'reject' })}
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                        {!canProcess(document) && normalizeStatus(document) === 'pending' && (
                          <small className="document-review-wait">Menunggu role aktif</small>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={Boolean(selectedDocument)}
        onClose={() => setSelectedDocument(null)}
        title="Detail Dokumen"
        size="md"
      >
        {selectedDocument && (
          <div className="document-review-detail">
            {[
              ['Judul', selectedDocument.title],
              ['Karyawan', getEmployeeName(selectedDocument)],
              ['Tipe', String(selectedDocument.document_type || '-').replace(/_/g, ' ')],
              ['Kategori', selectedDocument.category || '-'],
              ['Kedaluwarsa', formatDate(selectedDocument.expires_at)],
              ['Tahap', getStepLabel(selectedDocument)],
              ['Role Aktif', getRoleLabel(selectedDocument) || 'Sesuai alur aktif'],
              ['Catatan', selectedDocument.review_notes || '-'],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
            <Button variant="outline" size="md" onClick={() => void downloadDocument(selectedDocument)}>
              <Download size={16} />
              Unduh Dokumen
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(decision)}
        onClose={closeDecision}
        title={decision?.action === 'approve' ? 'Setujui Dokumen' : 'Tolak Dokumen'}
        size="sm"
        footer={
          <>
            <Button variant="outline" size="md" onClick={closeDecision} disabled={actionLoading}>
              Batal
            </Button>
            <Button
              variant={decision?.action === 'approve' ? 'success' : 'danger'}
              size="md"
              loading={actionLoading}
              onClick={() => void submitDecision()}
            >
              {decision?.action === 'approve' ? 'Setujui' : 'Tolak'}
            </Button>
          </>
        }
      >
        <div className="document-review-decision">
          <p>
            {decision?.action === 'approve'
              ? 'Persetujuan akan diteruskan sesuai tahap berikutnya pada Alur Persetujuan.'
              : 'Dokumen akan ditolak pada tahap persetujuan yang sedang aktif.'}
          </p>
          <label htmlFor="document-review-note">
            Catatan {decision?.action === 'reject' && <span>*</span>}
          </label>
          <textarea
            id="document-review-note"
            value={decisionNote}
            onChange={(event) => setDecisionNote(event.target.value)}
            placeholder={decision?.action === 'reject' ? 'Tuliskan alasan penolakan...' : 'Catatan opsional...'}
            rows={4}
          />
        </div>
      </Modal>

      {historyDocument && (
        <ApprovalHistoryModal
          isOpen={Boolean(historyDocument)}
          onClose={() => setHistoryDocument(null)}
          module="document"
          moduleId={historyDocument.id}
        />
      )}
    </div>
  );
};

export default DocumentReviewPage;
