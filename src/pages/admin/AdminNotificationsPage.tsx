import { useEffect, useMemo, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui";
import { getErrorMessage } from "@/shared/api/errorHandler";
import { showToast } from "@/shared/ui/toast";
import { Bell, Megaphone, RefreshCw, Send, Users } from "lucide-react";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "@/pages/payroll/PayrollShared.css";
import "./AdminCrudPages.css";
import "./AdminNotificationsPage.css";
import {
  createAdminNotification,
  getAdminNotificationsSummary,
  sendAdminBroadcastNotification,
} from "@/features/admin/api/admin-batch1.service";
import { getAllEmployees } from "@/features/employee/api/employee.service";
import type { EmployeeItem } from "@/features/employee/types/employee.types";

type SummaryData = {
  total_notifications?: number;
  total_sent?: number;
  total_pending?: number;
  total_failed?: number;
  sent_today?: number;
  recipients_count?: number;
};

const getNumber = (value: unknown) => (typeof value === "number" ? value : Number(value) || 0);

const AdminNotificationsPage = () => {
  const [summary, setSummary] = useState<SummaryData>({});

  const [loading, setLoading] = useState(false);
  const [_errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sendingDirect, setSendingDirect] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);

  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState("all");

  const loadSummary = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [result, empResult] = await Promise.all([
        getAdminNotificationsSummary(),
        getAllEmployees(),
      ]);
      setSummary((result ?? {}) as SummaryData);
      setEmployees(Array.isArray(empResult) ? empResult : []);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error as Record<string, unknown>));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const summaryCards = useMemo(
    () => [
      {
        label: "Total Notifikasi",
        value: getNumber(summary.total_notifications ?? summary.total_sent),
        subtitle: "Seluruh notifikasi yang telah diproses",
        icon: Bell,
        iconClass: "summary-card__icon summary-card__icon--blue",
        valueClass: "summary-card__value summary-card__value--blue",
        tone: "blue",
        change: "Semua",
      },
      {
        label: "Terkirim Hari Ini",
        value: getNumber(summary.sent_today ?? summary.total_sent),
        subtitle: "Aktivitas pengiriman notifikasi hari ini",
        icon: Send,
        iconClass: "summary-card__icon summary-card__icon--green",
        valueClass: "summary-card__value summary-card__value--green",
        tone: "green",
        change: "Hari ini",
      },
      {
        label: "Pending / Queue",
        value: getNumber(summary.total_pending),
        subtitle: "Notifikasi yang masih menunggu proses",
        icon: RefreshCw,
        iconClass: "summary-card__icon summary-card__icon--orange",
        valueClass: "summary-card__value summary-card__value--orange",
        tone: "orange",
        change: "Menunggu",
      },
      {
        label: "Penerima",
        value: getNumber(summary.recipients_count),
        subtitle: "Jumlah target penerima terdaftar",
        icon: Users,
        iconClass: "summary-card__icon summary-card__icon--purple",
        valueClass: "summary-card__value summary-card__value--purple",
        tone: "purple",
        change: "Terdaftar",
      },
    ],
    [summary]
  );

  const handleCreateNotification = async (event: React.FormEvent) => {
    event.preventDefault();
    setSendingDirect(true);

    try {
      await createAdminNotification({
        title,
        message,
        type: "info",
        user_ids: recipientId ? [Number(recipientId)] : [],
      });

      setTitle("");
      setMessage("");
      setRecipientId("");
      showToast("Notifikasi individual berhasil dibuat.", "success");
      await loadSummary();
    } catch (error: unknown) {
      showToast(getErrorMessage(error as Record<string, unknown>), "error");
    } finally {
      setSendingDirect(false);
    }
  };

  const handleBroadcast = async (event: React.FormEvent) => {
    event.preventDefault();
    setSendingBroadcast(true);

    try {
      await sendAdminBroadcastNotification({
        title: broadcastTitle,
        message: broadcastMessage,
        audience: broadcastAudience,
      });

      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastAudience("all");
      showToast("Notifikasi siaran berhasil dikirim.", "success");
      await loadSummary();
    } catch (error: unknown) {
      showToast(getErrorMessage(error as Record<string, unknown>), "error");
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <div className="crud-page admin-notifications-page">
      <PageHeader
        title="Notification Center"
        subtitle="Kelola notifikasi admin, kirim pesan individual, dan broadcast pengumuman ke pengguna."
        badge={{ icon: Bell, label: "Admin Center" }}
        actions={
          <button className="btn-outline" onClick={() => void loadSummary()} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Memuat..." : "Segarkan"}
          </button>
        }
      />

      <div className="employee-summary-wrapper">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="leave-summary-card">
              <div className="leave-summary-header">
                <div>
                  <p className="leave-summary-label">{card.label}</p>
                  <p className="leave-summary-subtitle">{card.subtitle}</p>
                </div>
                <div
                  className={`leave-summary-icon-wrapper leave-icon-${
                    card.tone === "blue"
                      ? "blue"
                      : card.tone === "green"
                        ? "green"
                        : card.tone === "orange"
                          ? "orange"
                          : "purple"
                  }`}
                >
                  <Icon size={28} />
                </div>
              </div>
              <div
                className={`leave-summary-value leave-value-${
                  card.tone === "blue"
                    ? "blue"
                    : card.tone === "green"
                      ? "green"
                      : card.tone === "orange"
                        ? "orange"
                        : "purple"
                }`}
              >
                {card.value}
              </div>
              <p className="leave-summary-trend">{card.change}</p>
            </div>
          );
        })}
      </div>

      <div className="notification-form-stack">
        <div className="notification-form-grid">
          <Card className="table-card notification-form-card" glass>
            <div className="table-header-bar notification-form-header">
              <div>
                <h3>Kirim Notifikasi Individual</h3>
                <p>Kirim pesan langsung ke satu karyawan, atau kosongkan penerima untuk target default.</p>
              </div>
              <span className="notification-form-badge">Notifikasi Individual</span>
            </div>
            <div className="table-card-inner">
              <form className="crud-form" onSubmit={handleCreateNotification}>
                <div className="notification-fields-grid">
                  <div className="form-group">
                    <label htmlFor="notification-title">Judul</label>
                    <input
                      id="notification-title"
                      className="form-input"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Contoh: Pengingat update profil"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="notification-recipient">Penerima (Karyawan)</label>
                    <select
                      id="notification-recipient"
                      className="form-input"
                      value={recipientId}
                      onChange={(event) => setRecipientId(event.target.value)}
                    >
                      <option value="">-- Pilih Penerima (Opsional) --</option>
                      {employees.map((emp) => {
                        const userSub = emp.user && typeof emp.user === "object" ? (emp.user as Record<string, unknown>) : {};
                        const empValId = String(emp.user_id || emp.id || "");
                        const empCodeLabel = String(emp.employee_code || emp.id || "");
                        const nameLabel = typeof userSub.name === "string" ? userSub.name : "Karyawan";

                        return (
                          <option key={empValId} value={empValId}>
                            {nameLabel} ({empCodeLabel})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="notification-message">Pesan</label>
                    <textarea
                      id="notification-message"
                      className="form-input"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Tulis isi notifikasi"
                      rows={5}
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <Button type="submit" variant="primary" loading={sendingDirect}>
                    <Send size={16} />
                    Buat Notifikasi
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          <Card className="table-card notification-form-card" glass>
            <div className="table-header-bar notification-form-header">
              <div>
                <h3>Broadcast Notifikasi</h3>
                <p>Kirim pengumuman ke kelompok pengguna yang dipilih.</p>
              </div>
              <span className="notification-form-badge">Broadcast</span>
            </div>
            <div className="table-card-inner">
              <form className="crud-form" onSubmit={handleBroadcast}>
                <div className="notification-fields-grid">
                  <div className="form-group">
                    <label htmlFor="broadcast-title">Judul Broadcast</label>
                    <input
                      id="broadcast-title"
                      className="form-input"
                      value={broadcastTitle}
                      onChange={(event) => setBroadcastTitle(event.target.value)}
                      placeholder="Contoh: Informasi maintenance sistem"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="broadcast-audience">Audience</label>
                    <select
                      id="broadcast-audience"
                      className="form-input"
                      value={broadcastAudience}
                      onChange={(event) => setBroadcastAudience(event.target.value)}
                    >
                      <option value="all">Semua Pengguna</option>
                      <option value="employees">Employees</option>
                      <option value="managers">Managers</option>
                      <option value="admins">Admins</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="broadcast-message">Pesan Broadcast</label>
                    <textarea
                      id="broadcast-message"
                      className="form-input"
                      value={broadcastMessage}
                      onChange={(event) => setBroadcastMessage(event.target.value)}
                      placeholder="Tulis pengumuman untuk seluruh target audience"
                      rows={5}
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <Button type="submit" variant="primary" loading={sendingBroadcast}>
                    <Megaphone size={16} />
                    Kirim Broadcast
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
