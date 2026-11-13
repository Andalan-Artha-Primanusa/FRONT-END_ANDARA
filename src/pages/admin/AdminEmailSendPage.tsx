import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { useAuthStore } from "@/app/store/auth.store";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui";
import { getErrorMessage } from "@/shared/api/errorHandler";
import { showToast } from '@/shared/ui/toast';
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS, type AuthUser } from "@/shared/types/rbac.types";
import { Mail, Send, Shield, Users, FileText } from "lucide-react";
import "@/shared/styles/CrudPage.css";
import "./AdminCrudPages.css";
import {
  getAdminEmailNotifications,
  createAdminEmailNotification,
} from "@/features/admin/api/admin-batch1.service";
import { getAllEmployees } from "@/features/employee/api/employee.service";

type EmailTemplate = {
  key?: string;
  name?: string;
  subject?: string;
  html_body?: string;
  is_active?: boolean;
  placeholders?: string[];
};

type EmployeeRecipient = {
  id?: number | string;
  user_id?: number | string;
  email?: string;
  user?: {
    name?: string;
    email?: string;
  };
};

const AdminEmailSendPage = () => {
  const user = useAuthStore((state) => state.user);
  const canAccess = RBACUtils.hasPermission(user, PERMISSIONS.ADMIN_EMAIL_MANAGE);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);


  // Form State
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlPreview, setHtmlPreview] = useState("");
  const [availablePlaceholders, setAvailablePlaceholders] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesResult, empResult] = await Promise.all([
        getAdminEmailNotifications(),
        getAllEmployees()
      ]);
      setTemplates(Array.isArray(templatesResult) ? templatesResult : []);
      setEmployees(empResult);
    } catch (error: unknown) {
      console.error(error);
    } finally {
      setLoading(false);
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

  // Handle Template Change
  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const template = templates.find(t => t.key === templateKey);
    if (template) {
      setSubject(template.subject || "");
      setHtmlPreview(template.html_body || "");
      setAvailablePlaceholders(template.placeholders || []);
    } else {
      setSubject("");
      setHtmlPreview("");
      setAvailablePlaceholders([]);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipient || !selectedTemplate) return;

    setSending(true);

    const employee = employees.find(emp => String(emp.id) === String(selectedRecipient) || String(emp.user_id) === String(selectedRecipient));
    const recipientEmail = employee?.user?.email || employee?.email;

    if (!recipientEmail) {
      showToast("Karyawan tidak memiliki email yang valid.", "error");
      setSending(false);
      return;
    }

    try {
      await createAdminEmailNotification({
        recipient_email: recipientEmail,
        user_id: Number(selectedRecipient),
        template_key: selectedTemplate,
        subject: subject || undefined,
        message: htmlPreview || undefined, // Send the body as message
      });

      showToast("Email berhasil dikirim ke " + recipientEmail, "success");
      setSelectedRecipient("");
      setSelectedTemplate("");
      setSubject("");
      setHtmlPreview("");
    } catch (error: unknown) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Kirim Notifikasi Email"
        subtitle="Gunakan template sistem untuk mengirim pesan resmi ke email karyawan."
        badge={{ icon: Mail, label: "Messenger" }}
      />

      <div className="">
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
          {/* Left: Form */}
          <Card glass style={{ padding: '2rem' }}>
            <div className="table-header-bar" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: '#eff6ff', color: 'var(--color-primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>Konfigurasi Pengiriman</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Pilih template dan target penerima</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSendEmail}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                    <FileText size={14} style={{ marginRight: '4px' }} />
                    Template Email
                  </label>
                  <select 
                    className="form-input" 
                    value={selectedTemplate} 
                    onChange={e => handleTemplateChange(e.target.value)}
                    required
                    style={{ height: '50px', borderRadius: '12px' }}
                  >
                    <option value="">-- Pilih Template --</option>
                    {templates.filter(t => t.is_active !== false).map(t => (
                      <option key={t.key} value={t.key}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                    <Users size={14} style={{ marginRight: '4px' }} />
                    Target Penerima
                  </label>
                  <select 
                    className="form-input" 
                    value={selectedRecipient} 
                    onChange={e => setSelectedRecipient(e.target.value)}
                    required
                    style={{ height: '50px', borderRadius: '12px' }}
                  >
                    <option value="">-- Pilih Karyawan --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.user_id || emp.id}>
                        {emp.user?.name || 'Karyawan'} ({emp.user?.email || 'No Email'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>Subject Email</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Subject akan muncul otomatis dari template"
                    style={{ height: '50px', borderRadius: '12px' }}
                  />
                </div>

                {/* Placeholders Guide */}
                {availablePlaceholders.length > 0 && (
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>TAG DINAMIS TERSEDIA:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {availablePlaceholders.map(ph => (
                        <span key={ph} style={{ background: '#fff', border: '1px solid #e2e8f0', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600 }}>
                          {`{{${ph}}}`}
                        </span>
                      ))}
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.65rem', color: '#94a3b8' }}>* Gunakan tag di atas dalam Subject atau Body untuk data otomatis.</p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                <Button 
                  type="submit" 
                  variant="primary" 
                  loading={sending} 
                  disabled={!selectedRecipient || !selectedTemplate || loading}
                  style={{ padding: '0.75rem 2rem', borderRadius: '12px', fontSize: '1rem', width: '100%' }}
                >
                  <Send size={18} />
                  Kirim Notifikasi Sekarang
                </Button>
              </div>
            </form>
          </Card>

          {/* Right: Live Preview */}
          <Card glass style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div className="table-header-bar" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Pratinjau Live</h3>
              <span className="badge-soft badge-soft--blue">Desktop View</span>
            </div>
            
            <div style={{ 
              flex: 1, 
              background: '#f8fafc', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              overflowY: 'auto',
              minHeight: '300px'
            }}>
              {!selectedTemplate ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center', flexDirection: 'column', gap: '1rem' }}>
                  <Mail size={48} opacity={0.2} />
                  <p>Pilih template untuk melihat<br/>tampilan email di sini.</p>
                </div>
              ) : (
                <div>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>SUBJECT:</p>
                    <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>{subject}</p>
                  </div>
                  <div 
                    className="email-preview-content"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlPreview || "") }}
                    style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminEmailSendPage;
