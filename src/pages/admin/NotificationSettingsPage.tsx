import React, { useState, useEffect } from 'react';
import { RefreshCw, Bell, Mail, Smartphone, CheckCircle, XCircle, Clock, Settings, ShieldCheck, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui';
import { showToast } from '@/shared/ui/toast';
import { api } from '@/shared/api/httpClient';
import { useAuthStore } from '@/app/store/auth.store';
import { RBACUtils } from '@/shared/hooks/rbac';
import { PERMISSIONS } from '@/shared/types/rbac.types';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/payroll/PayrollShared.css';
import './NotificationSettingsPage.css';

interface NotificationSetting {
  id: number;
  category: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
  in_app: boolean;
}

type NotificationChannel = 'email' | 'push' | 'in_app';

type AuditItem = {
  category: string;
  module: string;
  frontendStatus: 'ready' | 'missing';
  backendStatus: 'needs_backend' | 'ready';
  note: string;
};

const defaultSettings: NotificationSetting[] = [
  {
    id: 1,
    category: 'Absensi',
    label: 'Kehadiran & Absensi',
    description: 'Notifikasi saat karyawan melakukan check-in, check-out, atau terlambat.',
    in_app: true,
    email: true,
    push: true,
  },
  {
    id: 2,
    category: 'Payroll',
    label: 'Penggajian & Slip Gaji',
    description: 'Notifikasi saat payroll diproses, slip gaji tersedia, atau ada revisi gaji.',
    in_app: true,
    email: true,
    push: false,
  },
  {
    id: 3,
    category: 'Cuti',
    label: 'Manajemen Cuti',
    description: 'Notifikasi pengajuan cuti baru, persetujuan, atau penolakan cuti.',
    in_app: true,
    email: true,
    push: true,
  },
  {
    id: 4,
    category: 'Reimbursement',
    label: 'Klaim Biaya (Reimburse)',
    description: 'Notifikasi status klaim biaya dan pembayaran reimburse.',
    in_app: true,
    email: false,
    push: true,
  },
  {
    id: 5,
    category: 'Aset',
    label: 'Manajemen Aset',
    description: 'Notifikasi penyerahan aset, pengembalian, atau jadwal maintenance.',
    in_app: true,
    email: true,
    push: false,
  },
  {
    id: 6,
    category: 'Sistem',
    label: 'Update Sistem & Keamanan',
    description: 'Notifikasi mengenai pemeliharaan sistem atau peringatan keamanan akun.',
    in_app: true,
    email: true,
    push: true,
  },
];

const auditModules: AuditItem[] = [
  {
    category: 'Absensi',
    module: 'Attendance',
    frontendStatus: 'ready',
    backendStatus: 'needs_backend',
    note: 'Perlu event backend untuk check-in, check-out, terlambat, atau koreksi absensi.',
  },
  {
    category: 'Payroll',
    module: 'Payroll',
    frontendStatus: 'ready',
    backendStatus: 'needs_backend',
    note: 'Perlu event backend saat payroll diproses, disetujui, slip tersedia, atau pembayaran selesai.',
  },
  {
    category: 'Cuti',
    module: 'Leave',
    frontendStatus: 'ready',
    backendStatus: 'needs_backend',
    note: 'Perlu event backend saat cuti diajukan, disetujui, ditolak, atau masuk step approval berikutnya.',
  },
  {
    category: 'Reimbursement',
    module: 'Reimbursement',
    frontendStatus: 'ready',
    backendStatus: 'needs_backend',
    note: 'Perlu event backend saat klaim diajukan, disetujui, ditolak, atau ditandai dibayar.',
  },
  {
    category: 'Aset',
    module: 'Asset',
    frontendStatus: 'ready',
    backendStatus: 'needs_backend',
    note: 'Perlu event backend saat aset ditugaskan, dikembalikan, disetujui, atau ditolak.',
  },
  {
    category: 'Sistem',
    module: 'System',
    frontendStatus: 'ready',
    backendStatus: 'needs_backend',
    note: 'Perlu event backend untuk keamanan akun, maintenance, atau broadcast sistem otomatis.',
  },
];

const normalizeSettings = (raw: unknown): NotificationSetting[] => {
  const data = raw && typeof raw === 'object' ? (raw as { data?: unknown }).data : raw;
  const list = Array.isArray(data) ? data : [];

  return list
    .filter((item): item is Partial<NotificationSetting> => Boolean(item && typeof item === 'object'))
    .map((item, index) => ({
      id: Number(item.id ?? index + 1),
      category: String(item.category ?? ''),
      label: String(item.label ?? item.category ?? 'Notifikasi'),
      description: String(item.description ?? 'Pengaturan channel notifikasi.'),
      email: Boolean(item.email),
      push: Boolean(item.push),
      in_app: Boolean(item.in_app),
    }))
    .filter((item) => item.category.length > 0);
};

const getChannelLabel = (channel: NotificationChannel) => {
  if (channel === 'in_app') return 'In-App';
  if (channel === 'email') return 'Email';
  return 'Push';
};

const NotificationSettingsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const canAccess = RBACUtils.hasPermission(user, PERMISSIONS.ADMIN_EMAIL_MANAGE);

  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [usingFallback, setUsingFallback] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notification-settings');
      const settingsArray = normalizeSettings(response.data);
      if (settingsArray.length > 0) {
        setSettings(settingsArray);
        setUsingFallback(false);
      } else {
        setSettings(defaultSettings);
        setUsingFallback(true);
        showToast('Data pengaturan notifikasi kosong. Menampilkan default lokal.', 'info');
      }
    } catch (err) {
      console.error(err);
      setSettings(defaultSettings);
      setUsingFallback(true);
      showToast('Gagal memuat pengaturan notifikasi dari server. Menampilkan default lokal.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [canAccess]);

  if (!canAccess) {
    return (
      <div className="crud-page"><PageHeader
        title="Akses Ditolak"
        subtitle="Anda tidak memiliki izin untuk mengakses halaman ini."
        badge={{ icon: ShieldCheck, label: "Admin Center" }}
      /></div>
    );
  }

  const toggleChannel = async (category: string, channel: NotificationChannel) => {
    const setting = settings.find(s => s.category === category);
    if (!setting || usingFallback) return;

    const currentValue = setting[channel];
    const key = `${category}:${channel}`;
    setSavingKey(key);

    // Update optimistik di UI
    setSettings(prev => prev.map(s => 
      s.category === category 
        ? { ...s, [channel]: !currentValue }
        : s
    ));

    try {
      await api.put(`/notification-settings/${category}`, {
        channel,
        enabled: !currentValue
      });
      showToast(`${setting.label} - ${getChannelLabel(channel)} ${!currentValue ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
    } catch (err) {
      console.error(err);
      // Revert jika gagal
      setSettings(prev => prev.map(s => 
        s.category === category 
          ? { ...s, [channel]: currentValue }
          : s
      ));
      showToast(`Gagal menyimpan ${setting.label} - ${getChannelLabel(channel)}.`, 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const filteredSettings = activeCategory === 'all' 
    ? settings 
    : settings.filter(s => s.category === activeCategory);

  const categories = [
    { key: 'all', label: 'Semua', icon: Bell },
    ...settings.map((setting) => ({
      key: setting.category,
      label: setting.category,
      icon: setting.category === 'Cuti' ? Clock : setting.category === 'Sistem' ? ShieldCheck : CheckCircle,
    })),
  ];

  const emailEnabledCount = settings.reduce((acc, s) => acc + (s.email ? 1 : 0), 0);
  const pushEnabledCount = settings.reduce((acc, s) => acc + (s.push ? 1 : 0), 0);
  const appEnabledCount = settings.reduce((acc, s) => acc + (s.in_app ? 1 : 0), 0);
  const configuredCategories = new Set(settings.map((setting) => setting.category));
  const auditedModules = auditModules.map((item) => ({
    ...item,
    frontendStatus: configuredCategories.has(item.category) ? 'ready' : 'missing',
  }));
  const readyAuditCount = auditedModules.filter((item) => item.frontendStatus === 'ready').length;

  const summaryCards = [
    {
      label: "Total Triggers",
      subtitle: "Kategori Notifikasi",
      value: String(settings.length),
      change: "Pemicu Aktif",
      tone: "blue" as const,
      icon: Bell,
    },
    {
      label: "Email Channel",
      subtitle: "Via SMTP Service",
      value: String(emailEnabledCount),
      change: "Email Terdaftar",
      tone: "green" as const,
      icon: Mail,
    },
    {
      label: "Push Notification",
      subtitle: "Browser & Mobile",
      value: String(pushEnabledCount),
      change: "Real-time Alerts",
      tone: "orange" as const,
      icon: Smartphone,
    },
    {
      label: "In-App Feed",
      subtitle: "Dashboard Bell",
      value: String(appEnabledCount),
      change: "Internal Feed",
      tone: "purple" as const,
      icon: CheckCircle,
    },
  ];

  return (
    <div className="crud-page training-page notification-page">
      <PageHeader
        title="Pengaturan Notifikasi"
        subtitle="Konfigurasikan bagaimana sistem mengirimkan pemberitahuan untuk setiap aktivitas bisnis di HRIS."
        badge={{ icon: ShieldCheck, label: "System Security" }}
        actions={
          <button className="btn-outline" onClick={fetchData} disabled={loading} style={{ background: 'white' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Memuat...' : 'Segarkan'}
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="training-summary-wrapper">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="training-summary-card">
              <div className="training-summary-header">
                <div>
                  <p className="training-summary-label">{card.label}</p>
                  <p className="training-summary-subtitle">{card.subtitle}</p>
                </div>
                <div className={`training-summary-icon-wrapper training-icon-${card.tone}`}>
                  <Icon size={28} />
                </div>
              </div>
              <div className={`training-summary-value training-value-${card.tone}`}>{card.value}</div>
              <p className="training-summary-trend">{card.change}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Title Card */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <Settings size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Konfigurasi Channel</h2>
            <p className="analytics-subtitle">Aktifkan atau matikan saluran komunikasi per kategori</p>
          </div>
        </div>
      </Card>

      {usingFallback && (
        <div className="notification-warning-banner" role="status">
          <AlertTriangle size={18} />
          <span>Data yang tampil adalah default lokal karena server belum mengembalikan konfigurasi yang valid. Toggle dinonaktifkan sampai data server berhasil dimuat.</span>
        </div>
      )}

      {/* Table Section with integrated controls */}
      <div className="table-section notification-table-section">
        <div className="wuw-table-area notification-table-area">
      <Card className="control-section-card notification-table-toolbar">
        <div className="control-section-inner">
          <div className="elyra-tabs">
            {categories.map((cat) => (
              <button
                key={cat.key}
                className={`elyra-tab ${activeCategory === cat.key ? "active" : ""}`}
                onClick={() => setActiveCategory(cat.key)}
              >
                <cat.icon size={16} style={{ marginRight: '8px' }} />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

          {loading ? (
            <div className="settings-loading-state" style={{ padding: '5rem 0' }}>
              <RefreshCw size={48} className="animate-spin" color="var(--color-primary)" />
              <p style={{ marginTop: '1rem', color: '#64748b' }}>Sinkronisasi preferensi...</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '400px' }}>Tipe Notifikasi</th>
                    <th className="th-center" style={{ width: '150px' }}>Email</th>
                    <th className="th-center" style={{ width: '150px' }}>Push</th>
                    <th className="th-center" style={{ width: '150px' }}>In-App</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSettings.map((setting) => (
                    <tr key={setting.category}>
                      <td>
                        <div className="cell-name">
                          <div className="cell-avatar">
                            <Bell size={18} />
                          </div>
                          <div className="cell-stacked">
                            <span className="cell-name-text">{setting.label}</span>
                            <span className="cell-stacked__sub">{setting.description}</span>
                          </div>
                        </div>
                      </td>
                      <td className="td-center">
                        <button
                          className={`channel-pill-toggle ${setting.email ? 'enabled' : ''}`}
                          onClick={() => toggleChannel(setting.category, 'email')}
                          disabled={usingFallback || savingKey !== null}
                        >
                          {savingKey === `${setting.category}:email` ? <RefreshCw size={18} className="animate-spin" /> : setting.email ? <CheckCircle size={18} /> : <XCircle size={18} />}
                          <span className="channel-pill-label">Email</span>
                        </button>
                      </td>
                      <td className="td-center">
                        <button
                          className={`channel-pill-toggle ${setting.push ? 'enabled' : ''}`}
                          onClick={() => toggleChannel(setting.category, 'push')}
                          disabled={usingFallback || savingKey !== null}
                        >
                          {savingKey === `${setting.category}:push` ? <RefreshCw size={18} className="animate-spin" /> : setting.push ? <CheckCircle size={18} /> : <XCircle size={18} />}
                          <span className="channel-pill-label">Push</span>
                        </button>
                      </td>
                      <td className="td-center">
                        <button
                          className={`channel-pill-toggle ${setting.in_app ? 'enabled' : ''}`}
                          onClick={() => toggleChannel(setting.category, 'in_app')}
                          disabled={usingFallback || savingKey !== null}
                        >
                          {savingKey === `${setting.category}:in_app` ? <RefreshCw size={18} className="animate-spin" /> : setting.in_app ? <CheckCircle size={18} /> : <XCircle size={18} />}
                          <span className="channel-pill-label">App</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Card className="notification-audit-card">
        <div className="notification-audit-header">
          <div className="analytics-title-inner">
            <div className="analytics-icon audit-icon">
              <ClipboardCheck size={24} />
            </div>
            <div>
              <h2 className="analytics-title">Audit Kesiapan Notifikasi</h2>
              <p className="analytics-subtitle">Memastikan setiap modul utama sudah punya kategori setting dan jelas kebutuhan backend-nya</p>
            </div>
          </div>
          <span className="audit-summary-pill">{readyAuditCount}/{auditModules.length} kategori siap di frontend</span>
        </div>

        <div className="notification-audit-grid">
          {auditedModules.map((item) => (
            <div key={item.category} className="notification-audit-item">
              <div className="notification-audit-item__top">
                <div>
                  <span className="notification-audit-module">{item.module}</span>
                  <strong>{item.category}</strong>
                </div>
                <span className={`audit-status ${item.frontendStatus === 'ready' ? 'audit-status--ready' : 'audit-status--missing'}`}>
                  {item.frontendStatus === 'ready' ? 'Setting Ada' : 'Setting Belum Ada'}
                </span>
              </div>
              <p>{item.note}</p>
              <span className="audit-backend-note">Backend: perlu event creator yang membaca channel Email, Push, dan In-App.</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default NotificationSettingsPage;
