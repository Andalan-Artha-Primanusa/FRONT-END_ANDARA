import { useEffect, useMemo, useState } from "react";
import { Plus, QrCode, RefreshCw, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { PageHeader } from "@/shared/ui";
import { LoadingState } from "@/shared/ui/DataStateDisplay";
import { showToast } from "@/shared/ui/toast";
import { companyService, type Company } from "@/features/company/api/company.service";
import { patrolService, type PatrolCheckpoint, type PatrolScan } from "@/features/patrol/api/patrol.service";
import "./SecurityPatrolPage.css";

type FormState = {
  company_id: string;
  name: string;
  area: string;
  floor: string;
  room: string;
  starts_at: string;
  ends_at: string;
  tolerance_minutes: number;
};

const initialForm: FormState = {
  company_id: "",
  name: "",
  area: "",
  floor: "",
  room: "",
  starts_at: "20:00",
  ends_at: "06:00",
  tolerance_minutes: 15,
};

const qrUrl = (checkpoint: PatrolCheckpoint) => {
  const payload = JSON.stringify({
    type: "hris-security-patrol",
    qr_code: checkpoint.qr_code,
    checkpoint_id: checkpoint.id,
  });
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(payload)}`;
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const SecurityPatrolMonitorPage = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [checkpoints, setCheckpoints] = useState<PatrolCheckpoint[]>([]);
  const [scans, setScans] = useState<PatrolScan[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeCount = useMemo(() => checkpoints.filter((item) => item.status === "active").length, [checkpoints]);
  const outsideWindowCount = useMemo(() => scans.filter((scan) => scan.status === "outside_window").length, [scans]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [companyRows, checkpointRows, scanRows] = await Promise.all([
        companyService.list().catch(() => []),
        patrolService.checkpoints(),
        patrolService.scans({ per_page: 30 }),
      ]);
      setCompanies(companyRows);
      setCheckpoints(checkpointRows);
      setScans(scanRows);
    } catch {
      showToast("Gagal memuat data patrol", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateForm = (key: keyof FormState, value: string | number) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const createCheckpoint = async () => {
    if (!form.name.trim()) {
      showToast("Nama checkpoint wajib diisi", "error");
      return;
    }

    setSaving(true);
    try {
      await patrolService.createCheckpoint({
        company_id: form.company_id ? Number(form.company_id) : null,
        name: form.name.trim(),
        area: form.area.trim() || null,
        floor: form.floor.trim() || null,
        room: form.room.trim() || null,
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        tolerance_minutes: form.tolerance_minutes,
        status: "active",
      });
      setForm(initialForm);
      showToast("Checkpoint berhasil dibuat", "success");
      await loadData();
    } catch (error: any) {
      showToast(error?.message || "Gagal membuat checkpoint", "error");
    } finally {
      setSaving(false);
    }
  };

  const regenerateQr = async (id: number) => {
    try {
      await patrolService.regenerateQr(id);
      showToast("QR checkpoint diganti", "success");
      await loadData();
    } catch {
      showToast("Gagal mengganti QR", "error");
    }
  };

  const deleteCheckpoint = async (id: number) => {
    try {
      await patrolService.deleteCheckpoint(id);
      showToast("Checkpoint dihapus", "success");
      await loadData();
    } catch {
      showToast("Gagal menghapus checkpoint", "error");
    }
  };

  return (
    <div className="patrol-page">
      <PageHeader
        title="Monitoring Ronda Satpam"
        subtitle="Kelola QR checkpoint ruangan dan pantau bukti scan setelah jam 20:00."
        badge={{ icon: ShieldCheck, label: 'Security Patrol' }}
        actions={
          <Button variant="outline" size="md" onClick={loadData} disabled={loading}>
            <RefreshCw size={16} />
            Segarkan
          </Button>
        }
      />

      <div className="patrol-summary-grid">
        <div className="patrol-summary-card">
          <span>Total Checkpoint</span>
          <strong>{checkpoints.length}</strong>
        </div>
        <div className="patrol-summary-card">
          <span>Checkpoint Aktif</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="patrol-summary-card">
          <span>Scan Terbaru</span>
          <strong>{scans.length}</strong>
        </div>
        <div className="patrol-summary-card">
          <span>Di Luar Window</span>
          <strong>{outsideWindowCount}</strong>
        </div>
      </div>

      <Card className="patrol-form-card">
        <div className="patrol-card-heading">
          <QrCode size={20} />
          <h2>Buat Checkpoint QR</h2>
        </div>
        <div className="patrol-form-grid">
          <select value={form.company_id} onChange={(event) => updateForm("company_id", event.target.value)}>
            <option value="">Semua / default company user</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
          <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Nama checkpoint, contoh Lobby Utama" />
          <input value={form.area} onChange={(event) => updateForm("area", event.target.value)} placeholder="Area" />
          <input value={form.floor} onChange={(event) => updateForm("floor", event.target.value)} placeholder="Lantai" />
          <input value={form.room} onChange={(event) => updateForm("room", event.target.value)} placeholder="Ruangan" />
          <input type="time" value={form.starts_at} onChange={(event) => updateForm("starts_at", event.target.value)} />
          <input type="time" value={form.ends_at} onChange={(event) => updateForm("ends_at", event.target.value)} />
          <input type="number" min={0} max={240} value={form.tolerance_minutes} onChange={(event) => updateForm("tolerance_minutes", Number(event.target.value))} />
        </div>
        <Button variant="primary" size="md" onClick={createCheckpoint} disabled={saving}>
          <Plus size={16} />
          {saving ? "Menyimpan..." : "Tambah Checkpoint"}
        </Button>
      </Card>

      {loading ? <LoadingState message="Memuat patrol..." /> : (
        <div className="patrol-grid">
          <section className="patrol-checkpoint-list">
            <div className="patrol-section-title">
              <h2>QR Checkpoint</h2>
              <span>{checkpoints.length} titik</span>
            </div>
            {checkpoints.map((checkpoint) => (
              <Card key={checkpoint.id} className="patrol-checkpoint-card">
                <img src={qrUrl(checkpoint)} alt={`QR ${checkpoint.name}`} />
                <div className="patrol-checkpoint-info">
                  <h3>{checkpoint.name}</h3>
                  <p>{[checkpoint.area, checkpoint.floor, checkpoint.room].filter(Boolean).join(" - ") || "Tanpa detail ruangan"}</p>
                  <span>{checkpoint.starts_at} - {checkpoint.ends_at} | toleransi {checkpoint.tolerance_minutes} menit</span>
                  <small>{checkpoint.company?.name ?? "Default company"}</small>
                  <code>{checkpoint.qr_code}</code>
                  <div className="patrol-card-actions">
                    <Button variant="outline" size="sm" onClick={() => regenerateQr(checkpoint.id)}>
                      <RotateCcw size={14} />
                      Regenerate
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteCheckpoint(checkpoint.id)}>
                      <Trash2 size={14} />
                      Hapus
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </section>

          <section className="patrol-scan-list">
            <div className="patrol-section-title">
              <h2>Log Scan Terbaru</h2>
              <span>{scans.length} scan</span>
            </div>
            {scans.map((scan) => (
              <Card key={scan.id} className="patrol-log-card">
                <div>
                  <h3>{scan.checkpoint?.name ?? "Checkpoint"}</h3>
                  <p>{scan.user?.name ?? "User"} | {scan.employee?.employee_code ?? "-"}</p>
                  <span>{formatDateTime(scan.scanned_at)}</span>
                </div>
                <strong className={`patrol-status-badge patrol-status-${scan.status}`}>{scan.status === "on_time" ? "On Time" : "Outside Window"}</strong>
              </Card>
            ))}
          </section>
        </div>
      )}
    </div>
  );
};

export default SecurityPatrolMonitorPage;
