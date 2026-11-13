import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/app/store/auth.store";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { LoadingState, ErrorState, EmptyState } from "@/shared/ui/DataStateDisplay";
import { PageHeader } from "@/shared/ui";
import { getErrorMessage } from "@/shared/api/errorHandler";
import { showToast } from "@/shared/ui/toast";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS, type AuthUser } from "@/shared/types/rbac.types";
import { BellRing, RefreshCw, Search, Send, Shield, Layout, History, Trash2 } from "lucide-react";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./AdminCrudPages.css";
import {
  getAdminEmailNotifications,
  getAdminEmailNotificationLogs,
  createEmailTemplate,
  deleteEmailTemplate,
} from "@/features/admin/api/admin-batch1.service";

type EmailTemplateItem = {
  id?: number | string;
  key?: string;
  name?: string;
  subject?: string;
  is_active?: boolean;
};

type EmailLogItem = {
  id?: number | string;
  subject?: string;
  recipient_email?: string;
  status?: string;
  type?: string;
  sent_at?: string;
  created_at?: string;
};

type ApiListPayload<T> = T[] | { data?: T[] };

type ErrorWithResponse = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
};

const extractList = <T,>(payload: ApiListPayload<T>): T[] =>
  Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];

const AdminEmailNotificationsPage = () => {
  const user = useAuthStore((state) => state.user);
  const canAccess = RBACUtils.hasPermission(user, PERMISSIONS.ADMIN_EMAIL_MANAGE);

  const [items, setItems] = useState<EmailTemplateItem[]>([]);
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplateItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Template Form State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    key: '',
    name: '',
    description: '',
    subject: '',
    html_body: '',
    text_body: '',
    placeholders: [] as string[]
  });
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');

  // Search
  const [searchText, setSearchText] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [templatesResult, logsResult] = await Promise.all([
        getAdminEmailNotifications(),
        getAdminEmailNotificationLogs(),
      ]);
      setItems(extractList<EmailTemplateItem>(templatesResult));
      setLogs(extractList<EmailLogItem>(logsResult));
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error as never));
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createEmailTemplate({
        ...newTemplate,
      });
      setShowModal(false);
      setNewTemplate({ 
        key: '', 
        name: '', 
        description: '', 
        subject: '', 
        html_body: '', 
        text_body: '', 
        placeholders: [] 
      });
      void loadData();
    } catch (error: unknown) {
      const responseError = error as ErrorWithResponse;
      console.error("Save Template Error:", responseError.response?.data || error);
      const serverMessage = responseError.response?.data?.message || responseError.response?.data?.error;
      showToast(serverMessage ? `Kesalahan server: ${serverMessage}` : getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTarget?.id) return;

    setDeleting(true);
    try {
      await deleteEmailTemplate(deleteTarget.id);
      showToast("Template email berhasil dihapus", "success");
      setDeleteTarget(null);
      void loadData();
    } catch (error: unknown) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    void loadData();
  }, [canAccess]);

  if (!canAccess) {
    return (
      <div className="crud-page">
        <PageHeader
          title="Akses Ditolak"
          badge={{ icon: Shield, label: "Admin Center" }}
        />
      </div>
    );
  }

  const filteredTemplates = useMemo(() => {
    if (!searchText) return items;
    const q = searchText.toLowerCase();
    return items.filter((item) => {
      return (
        String(item.name ?? '').toLowerCase().includes(q) ||
        String(item.key ?? '').toLowerCase().includes(q) ||
        String(item.subject ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, searchText]);

  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
  }, [filteredTemplates]);

  const paginatedTemplates = sortedTemplates;

  const filteredLogs = useMemo(() => {
    if (!searchText) return logs;
    const q = searchText.toLowerCase();
    return logs.filter((log) => {
      return (
        String(log.subject ?? '').toLowerCase().includes(q) ||
        String(log.recipient_email ?? '').toLowerCase().includes(q) ||
        String(log.type ?? '').toLowerCase().includes(q)
      );
    });
  }, [logs, searchText]);

  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      const dateA = new Date(String(a.sent_at ?? a.created_at ?? 0)).getTime();
      const dateB = new Date(String(b.sent_at ?? b.created_at ?? 0)).getTime();
      return dateB - dateA;
    });
  }, [filteredLogs]);

  const paginatedLogs = sortedLogs;

  const [totalPagesTemplates, setTotalPagesTemplates] = useState(1);
  const [totalPagesLogs, setTotalPagesLogs] = useState(1);

  const clearFilters = () => {
    setSearchText('');
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Email Templates",
        subtitle: "Template yang tersedia",
        value: String(items.length),
        change: "Status Active",
        tone: "blue" as const,
        icon: Layout,
      },
      {
        label: "Total Logs",
        subtitle: "Riwayat pengiriman",
        value: String(logs.length),
        change: "All History",
        tone: "purple" as const,
        icon: History,
      },
      {
        label: "Berhasil Terkirim",
        subtitle: "Email sukses",
        value: String(logs.filter((l) => ["sent", "success", "delivered"].includes(String(l.status ?? '').toLowerCase())).length),
        change: "Success",
        tone: "green" as const,
        icon: Send,
      },
      {
        label: "Pending/Failed",
        subtitle: "Masalah delivery",
        value: String(logs.filter((l) => !["sent", "success", "delivered"].includes(String(l.status ?? '').toLowerCase())).length),
        change: "Issue",
        tone: "orange" as const,
        icon: RefreshCw,
      },
    ],
    [items.length, logs.length]
  );

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("id-ID");
  };

  const getStatusBadge = (status?: string) => {
    const normalized = String(status || '').toLowerCase();
    if (["sent", "success", "delivered"].includes(normalized)) return <span className="badge-soft badge-soft--green">SENT</span>;
    if (["pending", "queued", "processing"].includes(normalized)) return <span className="badge-soft badge-soft--orange">PENDING</span>;
    return <span className="badge-soft badge-soft--red">FAILED</span>;
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Email Logs & Templates"
        subtitle="Pantau riwayat pengiriman email dan kelola template sistem."
        badge={{ icon: BellRing, label: "Admin Center" }}
        actions={
          <>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <RefreshCw size={16} style={{ transform: 'rotate(45deg)' }} />
              Buat Template Baru
            </button>
            <button className="btn-outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Segarkan Data
            </button>
          </>
        }
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Konfigurasi Template Email"
        size="lg"
        footer={
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 2rem' }}>Batal</Button>
            <Button type="submit" variant="primary" loading={saving} style={{ padding: '0.75rem 2rem' }} onClick={(e) => { const form = (e.target as HTMLElement).closest('form'); if (form) form.requestSubmit(); }}>Simpan Template Full-Spec</Button>
          </div>
        }
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <span className="badge-soft badge-soft--blue">System Template Editor</span>
        </div>
        <form onSubmit={handleAddTemplate}>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label style={{ fontWeight: 700, color: '#475569' }}>Key Unik (Sistem ID)</label>
              <input type="text" className="form-input" value={newTemplate.key} onChange={e => setNewTemplate({...newTemplate, key: e.target.value})} required placeholder="misal: leave_approval_notification" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 700, color: '#475569' }}>Nama Template (Admin Display)</label>
              <input type="text" className="form-input" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} required placeholder="misal: Notifikasi Persetujuan Cuti" />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ fontWeight: 700, color: '#475569' }}>Deskripsi Internal</label>
              <input type="text" className="form-input" value={newTemplate.description} onChange={e => setNewTemplate({...newTemplate, description: e.target.value})} placeholder="Jelaskan kapan email ini otomatis terkirim..." />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ fontWeight: 700, color: '#475569' }}>Subject Email Default</label>
              <input type="text" className="form-input" value={newTemplate.subject} onChange={e => setNewTemplate({...newTemplate, subject: e.target.value})} required placeholder="[HRIS] Permohonan Cuti Anda Telah Disetujui" />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ fontWeight: 700, color: '#475569' }}>Isi Email (Rich HTML Format)</label>
              <textarea className="form-input" rows={8} value={newTemplate.html_body} onChange={e => setNewTemplate({...newTemplate, html_body: e.target.value})} required placeholder="<h1>Halo {{name}},</h1><p>Permohonan cuti Anda telah disetujui...</p>" style={{ resize: 'vertical', fontFamily: "'Poppins', sans-serif" }} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ fontWeight: 700, color: '#475569' }}>Isi Email (Plain Text - Fallback)</label>
              <textarea className="form-input" rows={4} value={newTemplate.text_body} onChange={e => setNewTemplate({...newTemplate, text_body: e.target.value})} placeholder="Halo {{name}}, Permohonan cuti Anda telah disetujui..." style={{ resize: 'vertical', background: '#f8fafc' }} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ fontWeight: 700, color: '#475569' }}>Dynamic Placeholders (Tags)</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input type="text" className="form-input" value={currentPlaceholder} onChange={e => setCurrentPlaceholder(e.target.value)} placeholder="Contoh: name, date, amount" />
                <Button type="button" onClick={() => { if (currentPlaceholder && !newTemplate.placeholders.includes(currentPlaceholder)) { setNewTemplate({...newTemplate, placeholders: [...newTemplate.placeholders, currentPlaceholder]}); setCurrentPlaceholder(''); } }}>Tambah</Button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {newTemplate.placeholders.map(ph => (
                  <span key={ph} style={{ background: '#eff6ff', color: 'var(--color-primary-dark)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    {`{{${ph}}}`}
                    <button type="button" style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }} onClick={() => setNewTemplate({...newTemplate, placeholders: newTemplate.placeholders.filter(p => p !== ph)})}>×</button>
                  </span>
                ))}
                {newTemplate.placeholders.length === 0 && <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Belum ada placeholder ditambahkan.</span>}
              </div>
            </div>
          </div>
        </form>
      </Modal>

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
              <p className="employee-summary-trend">{card.change}</p>
            </div>
          );
        })}
      </div>

      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon"><Layout size={24} /></div>
          <div>
            <h2 className="analytics-title">Daftar Email Templates</h2>
            <p className="analytics-subtitle">Gunakan template ini di menu "Kirim Notifikasi Email"</p>
          </div>
        </div>
      </Card>

      <Card className="control-section-card">
        <div className="control-section-inner">
          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari template atau log..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
            {searchText && <button className="btn-clear-filter" onClick={clearFilters}>Hapus Filter</button>}
          </div>
        </div>
      </Card>

      <div className="table-section" style={{ marginBottom: '2rem' }}>
        <div className="wuw-table-area">
          {loading ? <LoadingState message="Memuat templates..." /> : errorMessage ? <ErrorState message="Error" error={errorMessage} onRetry={loadData} /> : paginatedTemplates.length === 0 ? <EmptyState title="Kosong" message="Tidak ada template" /> : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Key</th>
                      <th>Name</th>
                      <th>Subject</th>
                      <th>Status</th>
                      <th className="th-center" style={{ width: '80px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTemplates.map((item) => (
                      <tr key={item.key}>
                        <td><span className="cell-id">{item.id || "-"}</span></td>
                        <td><span className="badge-soft badge-soft--blue">{item.key}</span></td>
                        <td><span className="cell-name-text" style={{ fontWeight: 600 }}>{item.name}</span></td>
                        <td>{item.subject}</td>
                        <td><span className={`badge-soft ${item.is_active ? 'badge-soft--green' : 'badge-soft--red'}`}>{item.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                        <td className="td-center">
                          <button 
                            className="btn-icon btn-icon--red" 
                            onClick={() => item.id && setDeleteTarget(item)}
                            title="Hapus Template"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPagesTemplates > 1 && (
                <div className="table-pagination">
                  <div className="pagination-info">
                    Menampilkan {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredTemplates.length)} dari {filteredTemplates.length}
                  </div>
                  <div className="pagination-controls">
                    <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                      Sebelumnya
                    </Button>
                    {Array.from({ length: totalPagesTemplates }, (_, i) => i + 1).map(page => (
                      <button key={page} className={`pagination-page-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                    ))}
                    <Button variant="outline" size="sm" disabled={currentPage === totalPagesTemplates} onClick={() => setCurrentPage(prev => prev + 1)}>
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon"><History size={24} /></div>
          <div>
            <h2 className="analytics-title">Email Delivery Logs</h2>
            <p className="analytics-subtitle">Audit pengiriman email ke karyawan</p>
          </div>
        </div>
      </Card>

      <div className="table-section">
        <div className="wuw-table-area">
          {loading ? <LoadingState message="Memuat logs..." /> : paginatedLogs.length === 0 ? <EmptyState title="Kosong" message="Tidak ada log" /> : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Subject</th>
                      <th>Recipient</th>
                      <th>Status</th>
                      <th>Sent At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log) => (
                      <tr key={log.id}>
                        <td><span className="cell-id">{log.id}</span></td>
                        <td><span className="cell-name-text" style={{ fontWeight: 600 }}>{log.subject}</span></td>
                        <td>{log.recipient_email}</td>
                        <td>{getStatusBadge(log.status)}</td>
                        <td className="cell-date">{formatDate(log.sent_at || log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPagesLogs > 1 && (
                <div className="table-pagination">
                  <div className="pagination-info">
                    Menampilkan {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredLogs.length)} dari {filteredLogs.length}
                  </div>
                  <div className="pagination-controls">
                    <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                      Sebelumnya
                    </Button>
                    {Array.from({ length: totalPagesLogs }, (_, i) => i + 1).map(page => (
                      <button key={page} className={`pagination-page-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                    ))}
                    <Button variant="outline" size="sm" disabled={currentPage === totalPagesLogs} onClick={() => setCurrentPage(prev => prev + 1)}>
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Template Email"
        message={`Template "${deleteTarget?.name || deleteTarget?.key || "ini"}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={() => void handleDeleteTemplate()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AdminEmailNotificationsPage;
