import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  Upload, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Shield,
  RefreshCw,
  FileBadge,
  Eye,
  X,
  FileUp,
  Loader2,
  History
} from 'lucide-react';
import { Card, CardHeader, PageHeader } from '@/shared/ui';
import { Modal } from '@/shared/ui/Modal';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { documentService } from '@/features/employee/api/document.service';
import type { EmployeeDocument } from '@/features/employee/types/document.types';
import { showToast } from '@/shared/ui/toast';
import { getErrorMessage } from '@/shared/api/errorHandler';
import { api } from '@/shared/api/httpClient';
import { ApprovalHistoryModal } from "@/shared/components/ApprovalHistoryModal";
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import './MyDocumentsPage.css';

type TabType = "Semua" | "contract" | "letter" | "identity" | "pending" | "approved";

/* =================================================================
   Upload Modal Component
   ================================================================= */
interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'identity', label: 'Identitas (KTP/SIM/Paspor)' },
  { value: 'contract', label: 'Kontrak Kerja' },
  { value: 'letter', label: 'Surat Keterangan' },
  { value: 'certificate', label: 'Sertifikat' },
  { value: 'education', label: 'Ijazah / Pendidikan' },
  { value: 'tax', label: 'Pajak (NPWP, dll)' },
  { value: 'insurance', label: 'Asuransi / BPJS' },
  { value: 'other', label: 'Lainnya' },
];

const CATEGORIES = [
  { value: 'personal', label: 'Personal' },
  { value: 'employment', label: 'Kepegawaian' },
  { value: 'contract', label: 'Kontrak' },
  { value: 'training', label: 'Pelatihan' },
  { value: 'legal', label: 'Legal' },
  { value: 'other', label: 'Lainnya' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const extractEmployeeId = (raw: unknown): string | null => {
  const root = raw && typeof raw === 'object' ? raw as Record<string, any> : {};
  const payload = root.data ?? root;
  const candidates = [
    payload?.id,
    payload?.employee?.id,
    payload?.profile?.employee?.id,
    payload?.user?.employee?.id,
    payload?.user?.employee_id,
    payload?.employeeId,
    payload?.employee_id,
  ];

  const value = candidates.find((candidate) => candidate !== undefined && candidate !== null && candidate !== '');
  return value === undefined ? null : String(value);
};

const getStoredEmployeeId = (): string | null => {
  try {
    const rawUser = sessionStorage.getItem('user');
    return rawUser ? extractEmployeeId(JSON.parse(rawUser)) : null;
  } catch {
    return null;
  }
};

const resolveCurrentEmployeeId = async (): Promise<string | null> => {
  const storedEmployeeId = getStoredEmployeeId();
  if (storedEmployeeId) return storedEmployeeId;

  for (const endpoint of ['/me', '/my/profile']) {
    try {
      const response = await api.get(endpoint);
      const employeeId = extractEmployeeId(response.data);
      if (employeeId) return employeeId;
    } catch {
      // Some accounts, especially admin-only users, do not have ESS profile data.
    }
  }

  return null;
};

const getDocumentFileName = (doc: EmployeeDocument): string => {
  if (doc.file_name) return doc.file_name;
  return String(doc.file_path || '').split('/').filter(Boolean).pop() || '';
};

const getStoredDocumentFileName = (doc: EmployeeDocument): string => {
  const pathCandidates = [doc.file_path, doc.file_url];
  for (const path of pathCandidates) {
    const cleanPath = String(path || '').split('?')[0];
    const fileName = cleanPath.split('/').filter(Boolean).pop();
    if (fileName) return fileName;
  }

  return getDocumentFileName(doc);
};

const getBackendOrigin = () => String(api.defaults.baseURL || '').replace(/\/api\/?$/, '');

const getDocumentStorageUrl = (doc: EmployeeDocument): string => {
  if (doc.file_url) {
    if (/^https?:\/\//i.test(doc.file_url)) return doc.file_url;
    const path = doc.file_url.startsWith('/') ? doc.file_url : `/${doc.file_url}`;
    return `${getBackendOrigin()}${path}`;
  }

  return '';
};

const getDocumentDownloadUrl = (doc: EmployeeDocument): string => {
  const fileName = getStoredDocumentFileName(doc);
  return `${api.defaults.baseURL}/documents/${encodeURIComponent(fileName)}`;
};

const UploadDocumentModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [category, setCategory] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDocumentType('');
      setCategory('');
      setExpiresAt('');
      setFile(null);
      setDragActive(false);
      setSubmitting(false);
      setErrors({});
      setFormError('');
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) newErrors.title = 'Judul dokumen wajib diisi';
    if (!documentType) newErrors.documentType = 'Tipe dokumen wajib dipilih';
    if (!file) newErrors.file = 'File wajib diunggah';
    if (file && file.size > MAX_FILE_SIZE) {
      newErrors.file = 'Ukuran file maksimal 10MB';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    
    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrors(prev => ({ ...prev, file: 'Ukuran file maksimal 10MB' }));
      return;
    }

    setFile(selectedFile);
    setFormError('');
    setErrors(prev => {
      const { file: _, ...rest } = prev;
      return rest;
    });

    // Auto-fill title from filename if empty
    if (!title.trim()) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(nameWithoutExt);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('document_type', documentType);
      if (category) formData.append('category', category);
      if (expiresAt) formData.append('expires_at', expiresAt);
      formData.append('file', file!);

      const employeeId = await resolveCurrentEmployeeId();
      if (!employeeId) {
        const message = 'Akun Anda belum terhubung ke data karyawan, sehingga dokumen tidak dapat diunggah dari halaman ESS.';
        setFormError(message);
        showToast(message, 'error');
        return;
      }
      formData.append('employee_id', employeeId);

      await documentService.uploadDocument(formData);
      showToast('Dokumen berhasil diunggah', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Upload failed', err);
      const message = getErrorMessage(err) || 'Gagal mengunggah dokumen';
      showToast(message, 'error');
      // Handle validation errors from API
      if (err?.errors) {
        const apiErrors: Record<string, string> = {};
        for (const [key, messages] of Object.entries(err.errors)) {
          apiErrors[key] = Array.isArray(messages) ? messages[0] : String(messages);
        }
        setErrors(apiErrors);
        if (apiErrors.employee_id) {
          setFormError('Akun Anda belum terhubung ke data karyawan, sehingga dokumen tidak dapat diunggah.');
        }
      } else {
        setFormError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Unggah Dokumen" size="md" footer={(
      <>
        <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
          Batal
        </button>
        <button type="submit" form="upload-document-form" className="btn-primary" disabled={submitting || !file}>
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Mengunggah...
            </>
          ) : (
            <>
              <Upload size={16} />
              Unggah Dokumen
            </>
          )}
        </button>
      </>
    )}>
      <form id="upload-document-form" className="document-upload-form" onSubmit={handleSubmit}>
          {formError && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.85rem 1rem',
              borderRadius: 12,
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              fontSize: '0.86rem',
              fontWeight: 600,
            }}>
              {formError}
            </div>
          )}

          {/* Drop zone */}
          <div
            className={`upload-dropzone ${dragActive ? 'upload-dropzone--active' : ''} ${file ? 'upload-dropzone--has-file' : ''} ${errors.file ? 'upload-dropzone--error' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="upload-file-input"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
            />
            {file ? (
              <div className="upload-file-preview">
                <div className="upload-file-icon">
                  <FileUp size={28} />
                </div>
                <div className="upload-file-info">
                  <span className="upload-file-name">{file.name}</span>
                  <span className="upload-file-size">{formatFileSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  className="upload-file-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="upload-dropzone-content">
                <div className="upload-dropzone-icon">
                  <FileUp size={36} />
                </div>
                <p className="upload-dropzone-text">
                  <strong>Klik untuk pilih file</strong> atau seret & lepas di sini
                </p>
                <p className="upload-dropzone-hint">
                  PDF, DOC, DOCX, XLS, XLSX, JPG, PNG — Maks. 10MB
                </p>
              </div>
            )}
          </div>
          {errors.file && <p className="field-error">{errors.file}</p>}

          {/* Form fields */}
          <div className="form-grid">
            {/* Title */}
            <div className="form-group">
              <label className="form-label">
                Judul Dokumen <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.title ? 'form-input--error' : ''}`}
                placeholder="Contoh: KTP, Ijazah S1, Sertifikat PMP"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors(prev => { const { title: _, ...rest } = prev; return rest; });
                }}
                disabled={submitting}
              />
              {errors.title && <p className="field-error">{errors.title}</p>}
            </div>

            {/* Document Type */}
            <div className="form-group">
              <label className="form-label">
                Tipe Dokumen <span className="required">*</span>
              </label>
              <select
                className={`form-input ${errors.documentType ? 'form-input--error' : ''}`}
                value={documentType}
                onChange={(e) => {
                  setDocumentType(e.target.value);
                  if (errors.documentType) setErrors(prev => { const { documentType: _, ...rest } = prev; return rest; });
                }}
                disabled={submitting}
              >
                <option value="">Pilih tipe dokumen</option>
                {DOCUMENT_TYPES.map(dt => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>
              {errors.documentType && <p className="field-error">{errors.documentType}</p>}
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
              >
                <option value="">Pilih kategori (opsional)</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Expiry Date */}
            <div className="form-group">
              <label className="form-label">Tanggal Kadaluarsa</label>
              <input
                type="date"
                className="form-input"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={submitting}
              />
              <p className="field-hint">Kosongkan jika tidak ada masa berlaku</p>
            </div>
          </div>

        </form>
    </Modal>
  );
};


/* =================================================================
   Main Page Component
   ================================================================= */
const MyDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<EmployeeDocument | null>(null);

  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("Semua");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [historyModal, setHistoryModal] = useState<{ module: string; id: number | string } | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await documentService.getMyDocuments();
      const data = response.data?.data || response.data || [];
      setDocuments(data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const title = String(doc?.title || '').toLowerCase();
      const type = String(doc?.document_type || '').toLowerCase();
      const query = searchText.toLowerCase();
      const matchSearch = title.includes(query) || type.includes(query);

      let statusMatch = true;
      if (activeTab === "contract" || activeTab === "letter" || activeTab === "identity") {
        statusMatch = doc.document_type?.toLowerCase() === activeTab;
      } else if (activeTab === "pending") {
        statusMatch = doc.status === 'pending';
      } else if (activeTab === "approved") {
        statusMatch = doc.status === 'approved';
      }

      return matchSearch && statusMatch;
    });
  }, [documents, searchText, activeTab]);

  const paginatedDocuments = filteredDocuments;

  const [totalPages, setTotalPages] = useState(1);

  const summaryStats = useMemo(() => {
    const total = documents.length;
    const approved = documents.filter(d => d.status === 'approved').length;
    const pending = documents.filter(d => d.status === 'pending').length;
    const expiring = documents.filter(d => 
      d.expires_at && new Date(d.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    ).length;

    return [
      { label: "Total File", subtitle: "Seluruh dokumen", value: total, tone: "blue" as const },
      { label: "Terverifikasi", subtitle: "Disetujui HR", value: approved, tone: "green" as const },
      { label: "Menunggu", subtitle: "Menunggu tinjauan", value: pending, tone: "orange" as const },
      { label: "Kadaluarsa Soon", subtitle: "Segera kadaluarsa", value: expiring, tone: "red" as const },
    ];
  }, [documents]);

  const getStatusClass = (status?: string) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "approved") return "status-badge status-badge--approved";
    if (normalized === "pending" || normalized === "submitted") return "status-badge status-badge--pending";
    if (normalized === "rejected") return "status-badge status-badge--draft";
    return "status-badge status-badge--draft";
  };

  const getDocIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('contract')) return <Shield size={24} />;
    if (t.includes('letter')) return <FileBadge size={24} />;
    return <FileText size={24} />;
  };

  const handleDownload = async (doc: EmployeeDocument) => {
    try {
      const fileName = getDocumentFileName(doc);
      const storedFileName = getStoredDocumentFileName(doc);
      if (!fileName) {
        showToast('Nama file dokumen tidak tersedia.', 'error');
        return;
      }

      const downloadUrl = getDocumentDownloadUrl(doc);

      if (!storedFileName) {
        const storageUrl = getDocumentStorageUrl(doc);
        if (storageUrl) window.open(storageUrl, '_blank', 'noopener,noreferrer');
        else showToast('Lokasi file dokumen tidak tersedia.', 'error');
        return;
      }

      const response = await api.get(downloadUrl, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "document.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      showToast(getErrorMessage(err) || 'Gagal mengunduh berkas. Pastikan dokumen tersedia.', 'error');
    }
  };

  const isExpired = (dateStr: string) => new Date(dateStr) < new Date();

  const handleUploadSuccess = () => {
    fetchDocuments();
  };

  return (
    <div className="crud-page my-documents-page">
      {/* Header */}
      <PageHeader
        title="Dokumen Saya"
        subtitle="Akses dokumen resmi, sertifikat, dan catatan pekerjaan Anda."
        badge={{ icon: FileText, label: "Layanan Mandiri" }}
        actions={
          <>
            <button className="btn-outline" onClick={fetchDocuments} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
            <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
              <Upload size={16} />
              Unggah Dokumen
            </button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {summaryStats.map((card) => {
          const Icon = card.tone === "blue" ? FileText
            : card.tone === "green" ? CheckCircle2
            : card.tone === "orange" ? Clock
            : AlertCircle;

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
            <h2 className="analytics-title">Daftar Dokumen</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua dokumen Anda</p>
          </div>
        </div>
      </Card>

      {/* Table Section with integrated controls */}
      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          <div className="elyra-tabs">
            {(["Semua", "contract", "letter", "identity", "pending", "approved"] as TabType[]).map((tab) => (
              <button
                key={tab}
                className={`elyra-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari dokumen..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
          </div>
        </div>
      </Card>

          {loading && <LoadingState message="Memuat dokumen..." />}

          {!loading && paginatedDocuments.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Belum Ada Dokumen"
                message={
                  searchText || activeTab !== "Semua"
                    ? "Tidak ada dokumen yang sesuai dengan kriteria Anda."
                    : "Anda belum memiliki dokumen. Unggah dokumen pertama untuk memulai."
                }
                actionLabel="Unggah Dokumen"
                onAction={() => setShowUploadModal(true)}
              />
            </div>
          )}

          {!loading && paginatedDocuments.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '300px' }}>Dokumen</th>
                      <th>Tipe</th>
                      <th>Tanggal Update</th>
                      <th>Kadaluarsa</th>
                      <th className="th-center">Status</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {getDocIcon(doc.document_type)}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{doc.title}</span>
                              <span className="cell-stacked__sub">
                                {doc.document_type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge-soft badge-soft--blue">
                            {doc.document_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <div className="cell-stacked">
                            <span className="cell-stacked__main" style={{ fontSize: '0.85rem' }}>
                              {new Date(doc.updated_at).toLocaleDateString("id-ID", {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </span>
                            <span className="cell-stacked__sub">Terakhir diubah</span>
                          </div>
                        </td>
                        <td>
                          {doc.expires_at ? (
                            <div className="cell-stacked">
                              {/* BUG FIX: className dan style sekarang terpisah dengan benar */}
                              <span
                                className="cell-stacked__main"
                                style={{
                                  fontSize: '0.85rem',
                                  color: isExpired(doc.expires_at) ? '#dc2626' : '#475569'
                                }}
                              >
                                {new Date(doc.expires_at).toLocaleDateString("id-ID", {
                                  day: 'numeric', month: 'short', year: 'numeric'
                                })}
                              </span>
                              <span className="cell-stacked__sub">
                                {isExpired(doc.expires_at) ? 'Kadaluarsa' : 'Berlaku'}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                        <td className="td-center">
                          <span className={getStatusClass(doc.status)}>
                            {doc.status === "approved" ? "Approved"
                              : doc.status === "pending" ? "Pending"
                              : doc.status === "rejected" ? "Rejected"
                              : doc.status}
                          </span>
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => handleDownload(doc)}
                              title="Download"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => setSelectedDocument(doc)}
                              title="Lihat Detail"
                            >
                              <Eye size={16} />
                            </button>
                            <button className="action-btn" style={{ color: '#8b5cf6', background: '#f5f3ff' }} onClick={() => setHistoryModal({ module: 'document', id: doc.id })} title="Riwayat Approval"><History size={16} /></button>
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
                  {filteredDocuments.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredDocuments.length)} dari ${filteredDocuments.length} data`}
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

      {/* Upload Modal */}
      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />

      <Modal
        isOpen={!!selectedDocument}
        onClose={() => setSelectedDocument(null)}
        title="Detail Dokumen"
        size="md"
        footer={(
          <>
            <button className="modal-btn-cancel" onClick={() => setSelectedDocument(null)}>Tutup</button>
            {selectedDocument && (
              <button className="modal-btn-confirm" onClick={() => handleDownload(selectedDocument)}>
                <Download size={16} />
                Download
              </button>
            )}
          </>
        )}
      >
        {selectedDocument && (
          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {[
              ['Judul', selectedDocument.title],
              ['Tipe', selectedDocument.document_type?.replace('_', ' ') || '-'],
              ['Kategori', selectedDocument.category || '-'],
              ['Status', selectedDocument.status || '-'],
              ['Nama File', getDocumentFileName(selectedDocument) || '-'],
              ['Ukuran', selectedDocument.file_size ? `${(selectedDocument.file_size / 1024).toFixed(1)} KB` : '-'],
              ['Kadaluarsa', selectedDocument.expires_at ? new Date(selectedDocument.expires_at).toLocaleDateString('id-ID') : '-'],
              ['Catatan Review', selectedDocument.review_notes || '-'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'grid', gap: 4 }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
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

export default MyDocumentsPage;
