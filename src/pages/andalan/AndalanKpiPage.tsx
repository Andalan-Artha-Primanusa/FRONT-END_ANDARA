import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Edit3, Plus, RefreshCw, Send, Target, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, PageHeader } from "@/shared/ui";
import { LoadingState } from "@/shared/ui/DataStateDisplay";
import { useAuthStore } from "@/app/store/auth.store";
import { getAllEmployees } from "@/features/employee/api/employee.service";
import type { EmployeeItem } from "@/features/employee/types/employee.types";
import {
  approveAndalanKpi,
  createAndalanKpiCycle,
  deleteAndalanKpi,
  getAndalanKpiCycles,
  submitAndalanKpi,
  type AndalanKpiCycle,
  type AndalanKpiCyclePayload,
} from "@/features/andalan-kpi/api/andalan-kpi.service";
import "@/shared/styles/CrudPage.css";
import "./AndalanKpiPage.css";

type FormItem = {
  employee_key: string;
  user_id: string;
  salary_number: string;
  employee_id: string;
  employee_name: string;
  department: string;
  position: string;
  indicator: string;
  category: string;
  target: string;
  unit: string;
  weight: string;
  description: string;
};

const year = String(new Date().getFullYear());
const emptyItem = (): FormItem => ({
  employee_key: "",
  user_id: "",
  salary_number: "",
  employee_id: "",
  employee_name: "",
  department: "",
  position: "",
  indicator: "",
  category: "operasional",
  target: "",
  unit: "",
  weight: "100",
  description: "",
});

const employeeField = (employee: EmployeeItem, fields: string[]) => {
  const record = employee as unknown as Record<string, unknown>;
  return fields.map((field) => record[field]).find((value) => value !== null && value !== undefined && value !== "");
};

const employeeName = (employee: EmployeeItem) =>
  String(employeeField(employee, ["CompleteName"]) ?? employee.user?.name ?? employee.employee_code ?? employee.id);

const employeeKey = (employee: EmployeeItem) =>
  String(employeeField(employee, ["Employee_ID", "id"]) ?? "");

const statusLabel = (status: string) => ({
  draft: "Draft",
  supervisor_review: "Menunggu Supervisor",
  head_review: "Menunggu Head",
  hr_review: "Menunggu HR",
  director_review: "Menunggu Director",
  finalized: "Final",
  rejected: "Ditolak",
}[status] ?? status);

const nextRole = (status: string) => ({
  supervisor_review: "Supervisor",
  head_review: "Head Departemen",
  hr_review: "HR",
  director_review: "Director",
}[status] ?? "");

const formatDate = (value?: string) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";

const AndalanKpiPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const rawUser = user as unknown as Record<string, unknown> | null;
  const userId = String(rawUser?.user_id ?? rawUser?.id ?? "");
  const [cycles, setCycles] = useState<AndalanKpiCycle[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "Penilaian KPI Tahunan",
    period_type: "annual" as AndalanKpiCyclePayload["period_type"],
    period_label: year,
    start_date: year + "-01-01",
    end_date: year + "-12-31",
    notes: "",
    items: [emptyItem()],
  });

  const load = async () => {
    setLoading(true);
    setError("");
    const [cyclesResult, employeesResult] = await Promise.allSettled([getAndalanKpiCycles(), getAllEmployees()]);
    if (cyclesResult.status === "fulfilled") setCycles(cyclesResult.value);
    if (employeesResult.status === "fulfilled") {
      setEmployees([...employeesResult.value].sort((left, right) => employeeName(left).localeCompare(employeeName(right), "id")));
    }
    if (cyclesResult.status === "rejected" && employeesResult.status === "rejected") {
      setError("Data KPI dan karyawan belum dapat dimuat.");
    } else if (employeesResult.status === "rejected") {
      setError("Data karyawan MINEPRO belum dapat dimuat. Form KPI tetap dapat dibuka setelah data tersedia.");
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const summary = useMemo(() => ({
    total: cycles.length,
    draft: cycles.filter((item) => item.status === "draft" || item.status === "rejected").length,
    approval: cycles.filter((item) => item.status.endsWith("_review")).length,
    finalized: cycles.filter((item) => item.status === "finalized").length,
  }), [cycles]);

  const changeItem = (index: number, key: keyof FormItem, value: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }));
  };

  const chooseEmployee = (index: number, selectedKey: string) => {
    const employee = employees.find((item) => employeeKey(item) === selectedKey);
    if (!employee) {
      changeItem(index, "employee_key", "");
      changeItem(index, "employee_name", "");
      return;
    }
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? {
        ...item,
        employee_key: selectedKey,
        employee_name: employeeName(employee),
        employee_id: employeeKey(employee),
        salary_number: String(employeeField(employee, ["Salary_Number"]) ?? ""),
        user_id: String(employee.user_id ?? employeeField(employee, ["UserID"]) ?? ""),
        department: String(employeeField(employee, ["Department"]) ?? employee.department ?? ""),
        position: String(employeeField(employee, ["PositionDesc"]) ?? employee.position ?? ""),
      } : item),
    }));
  };

  const submitForm = async () => {
    if (!form.name.trim() || !form.period_label.trim() || !form.start_date || !form.end_date) {
      setError("Nama KPI, periode, dan tanggal wajib diisi.");
      return;
    }
    if (form.items.some((item) => !item.employee_name || !item.indicator.trim() || item.target === "" || item.weight === "")) {
      setError("Setiap indikator harus memiliki karyawan, indikator, target, dan bobot.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await createAndalanKpiCycle({
        name: form.name.trim(),
        period_type: form.period_type,
        period_label: form.period_label.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        notes: form.notes.trim() || undefined,
        items: form.items.map((item) => ({
          user_id: item.user_id || undefined,
          salary_number: item.salary_number || undefined,
          employee_id: item.employee_id || undefined,
          employee_name: item.employee_name,
          department: item.department || undefined,
          position: item.position || undefined,
          indicator: item.indicator.trim(),
          description: item.description.trim() || undefined,
          category: item.category || undefined,
          target: Number(item.target),
          unit: item.unit || undefined,
          weight: Number(item.weight),
        })),
      });
      setForm((current) => ({ ...current, items: [emptyItem()], notes: "" }));
      setShowForm(false);
      await load();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "KPI gagal dibuat.");
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id: string | number, action: "submit" | "approve" | "delete") => {
    if (action === "delete" && !window.confirm("Hapus draft KPI ini?")) return;
    setActionId(String(id) + action);
    setError("");
    try {
      if (action === "submit") await submitAndalanKpi(id);
      if (action === "approve") await approveAndalanKpi(id, { actor_user_id: userId });
      if (action === "delete") await deleteAndalanKpi(id);
      await load();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Aksi KPI gagal diproses.");
    } finally {
      setActionId(null);
    }
  };

  return <div className="crud-page andalan-kpi-page">
    <PageHeader
      title="ANDARA KPI"
      subtitle="Kelola target, pencapaian, dan approval KPI tanpa mengubah data MINEPRO."
      badge={{ icon: Target, label: "ANDALAN" }}
      actions={<div className="andalan-kpi-header-actions"><button className="andalan-kpi-secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Segarkan</button><button className="andalan-kpi-primary-button" onClick={() => navigate("/andalan/kpi/create")}><Plus size={16} /> Buat KPI</button></div>}
    />

    {error ? <Card><div className="andalan-kpi-error">{error}</div></Card> : null}

    <div className="andalan-kpi-summary-grid">
      <Card><span>Total Siklus</span><strong>{summary.total}</strong><small>Periode KPI ANDARA</small></Card>
      <Card><span>Draft</span><strong>{summary.draft}</strong><small>Siap diajukan</small></Card>
      <Card><span>Menunggu Approval</span><strong>{summary.approval}</strong><small>Dalam alur persetujuan</small></Card>
      <Card><span>Final</span><strong>{summary.finalized}</strong><small>Sudah dikunci</small></Card>
    </div>

    {showForm ? <Card className="andalan-kpi-form-card">
      <div className="andalan-kpi-section-heading"><div><h2>Buat Siklus KPI</h2><p>Data karyawan dipilih dari MINEPRO, sedangkan KPI tersimpan di tabel ANDALAN.</p></div><ClipboardCheck size={24} /></div>
      <div className="andalan-kpi-form-grid">
        <label>Nama Siklus<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
        <label>Tipe Periode<select value={form.period_type} onChange={(event) => setForm((current) => ({ ...current, period_type: event.target.value as AndalanKpiCyclePayload["period_type"] }))}><option value="monthly">Bulanan</option><option value="quarterly">Kuartal</option><option value="semi_annual">Semester</option><option value="annual">Tahunan</option></select></label>
        <label>Label Periode<input value={form.period_label} onChange={(event) => setForm((current) => ({ ...current, period_label: event.target.value }))} placeholder="2026 / Q1 2026" /></label>
        <label>Tanggal Mulai<input type="date" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} /></label>
        <label>Tanggal Selesai<input type="date" value={form.end_date} onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))} /></label>
        <label className="andalan-kpi-form-wide">Catatan<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={2} placeholder="Opsional" /></label>
      </div>

      <div className="andalan-kpi-items-heading"><h3>Indikator KPI</h3><button className="andalan-kpi-outline-button" type="button" onClick={() => setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }))}><Plus size={15} /> Tambah Indikator</button></div>
      {form.items.map((item, index) => <div className="andalan-kpi-item-form" key={index}>
        <div className="andalan-kpi-item-form-head"><strong>Indikator {index + 1}</strong>{form.items.length > 1 ? <button className="andalan-kpi-remove-button" type="button" onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={15} /> Hapus</button> : null}</div>
        <div className="andalan-kpi-form-grid">
          <label className="andalan-kpi-form-wide">Nama Karyawan<select value={item.employee_key} onChange={(event) => chooseEmployee(index, event.target.value)} required><option value="">Pilih karyawan dari MINEPRO</option>{employees.map((employee) => <option key={employeeKey(employee)} value={employeeKey(employee)}>{employeeName(employee)}{employeeField(employee, ["Salary_Number"]) ? " — " + String(employeeField(employee, ["Salary_Number"])) : ""}</option>)}</select></label>
          <label>Indikator<input value={item.indicator} onChange={(event) => changeItem(index, "indicator", event.target.value)} placeholder="Contoh: Penyelesaian tiket IT" /></label>
          <label>Kategori<input value={item.category} onChange={(event) => changeItem(index, "category", event.target.value)} placeholder="Operasional" /></label>
          <label>Target<input type="number" min="0" value={item.target} onChange={(event) => changeItem(index, "target", event.target.value)} /></label>
          <label>Unit<input value={item.unit} onChange={(event) => changeItem(index, "unit", event.target.value)} placeholder="Tiket / % / Hari" /></label>
          <label>Bobot (%)<input type="number" min="0" max="100" value={item.weight} onChange={(event) => changeItem(index, "weight", event.target.value)} /></label>
          <label className="andalan-kpi-form-wide">Deskripsi<textarea value={item.description} onChange={(event) => changeItem(index, "description", event.target.value)} rows={2} placeholder="Definisi dan cara pengukuran" /></label>
        </div>
      </div>)}
      <div className="andalan-kpi-form-actions"><button className="andalan-kpi-secondary-button" type="button" onClick={() => setShowForm(false)}>Batal</button><button className="andalan-kpi-primary-button" type="button" onClick={() => void submitForm()} disabled={saving}>{saving ? "Menyimpan..." : "Simpan KPI"}</button></div>
    </Card> : null}

    <Card className="andalan-kpi-list-card">
      <div className="andalan-kpi-section-heading"><div><h2>Siklus KPI</h2><p>Setiap perubahan approval tercatat pada riwayat ANDALAN.</p></div><Target size={24} /></div>
    {loading ? <LoadingState message="Memuat KPI ANDARA..." /> : cycles.length === 0 ? <div className="andalan-kpi-empty">Belum ada siklus KPI. Klik <b>Buat KPI</b> untuk memulai.</div> : <div className="andalan-kpi-table-wrap"><table className="andalan-kpi-table"><thead><tr><th>Siklus</th><th>Periode</th><th>Karyawan</th><th>Indikator</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{cycles.map((cycle) => <tr key={cycle.id}><td><strong>{cycle.name}</strong><small>{formatDate(cycle.start_date)} - {formatDate(cycle.end_date)}</small></td><td>{cycle.period_label}</td><td>{cycle.employee_count ?? 0}</td><td>{cycle.item_count ?? 0}</td><td><span className={"andalan-kpi-status andalan-kpi-status-" + cycle.status}>{statusLabel(cycle.status)}</span></td><td><div className="andalan-kpi-row-actions">{cycle.status === "draft" || cycle.status === "rejected" ? <button className="andalan-kpi-icon-button" title="Edit KPI" onClick={() => navigate(`/andalan/kpi/edit/${cycle.id}`)}><Edit3 size={15} /></button> : null}{cycle.status === "draft" || cycle.status === "rejected" ? <button className="andalan-kpi-action-button" onClick={() => void handleAction(cycle.id, "submit")} disabled={actionId === String(cycle.id) + "submit"}><Send size={15} /> Ajukan</button> : null}{cycle.status.endsWith("_review") ? <button className="andalan-kpi-action-button" onClick={() => void handleAction(cycle.id, "approve")} disabled={actionId === String(cycle.id) + "approve"}><CheckCircle2 size={15} /> Approve {nextRole(cycle.status)}</button> : null}{cycle.status === "draft" || cycle.status === "rejected" ? <button className="andalan-kpi-icon-button andalan-kpi-delete-button" title="Hapus draft" onClick={() => void handleAction(cycle.id, "delete")} disabled={actionId === String(cycle.id) + "delete"}><Trash2 size={15} /></button> : null}</div></td></tr>)}</tbody></table></div>}
    </Card>
  </div>;
};

export default AndalanKpiPage;
