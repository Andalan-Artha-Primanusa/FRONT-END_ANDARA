import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, CalendarDays, Newspaper } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "@/app/store/auth.store";
import { Card, PageHeader } from "@/shared/ui";
import { LoadingState } from "@/shared/ui/DataStateDisplay";
import { getAllEmployees } from "@/features/employee/api/employee.service";
import type { EmployeeItem } from "@/features/employee/types/employee.types";
import { createAndalanNews, createAndalanRoster, getAndalanNews, getAndalanRoster, updateAndalanNews, updateAndalanRoster, type AndalanNews, type AndalanRoster } from "@/features/andalan-mobile/api/andalan-mobile.service";
import "@/shared/styles/CrudPage.css";
import "./AndalanMobilePage.css";

const employeeValue = (employee: EmployeeItem, keys: string[]) => {
  const record = employee as unknown as Record<string, unknown>;
  return keys.map((key) => record[key]).find((value) => value !== null && value !== undefined && value !== "");
};
const employeeName = (employee: EmployeeItem) => String(employeeValue(employee, ["CompleteName"]) ?? employee.user?.name ?? employee.employee_code ?? employee.id);

export default function AndalanMobileFormPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const userId = String((user as unknown as Record<string, unknown> | null)?.user_id ?? user?.id ?? "");
  const resource = location.pathname.includes("/roster/") ? "roster" : "news";
  const editing = Boolean(id);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [news, setNews] = useState({ title: "", summary: "", content: "", category: "general", cover_image_url: "", is_published: true });
  const [roster, setRoster] = useState({ roster_date: "", employee_name: "", salary_number: "", employee_id: "", user_id: "", roster_type: "shift", leave_type: "", status: "planned" as "planned" | "approved" | "cancelled", notes: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const employeeResult = await getAllEmployees().catch(() => []);
        setEmployees(employeeResult);
        if (!editing || !id) return;
        if (resource === "news") {
          const item = (await getAndalanNews()).find((entry) => String(entry.id) === id) as AndalanNews | undefined;
          if (!item) throw new Error("Berita tidak ditemukan.");
          setNews({ title: item.title ?? "", summary: item.summary ?? "", content: item.content ?? "", category: item.category ?? "general", cover_image_url: item.cover_image_url ?? "", is_published: true });
        } else {
          const item = (await getAndalanRoster()).find((entry) => String(entry.id) === id) as AndalanRoster | undefined;
          if (!item) throw new Error("Roster tidak ditemukan.");
          setRoster((current) => ({ ...current, roster_date: item.roster_date ?? "", employee_name: item.employee_name ?? "", employee_id: item.employee_id ?? "", salary_number: item.salary_number ?? "", user_id: item.user_id ?? "", leave_type: item.leave_type ?? "", roster_type: item.roster_type ?? "shift", status: (item.status as "planned" | "approved" | "cancelled") ?? "planned", notes: item.notes ?? "" }));
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Data belum dapat dimuat.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [editing, id, resource]);

  const title = resource === "news" ? "Berita" : "Roster";
  const Icon = resource === "news" ? Newspaper : CalendarDays;
  const employeeOptions = useMemo(() => [...employees].sort((a, b) => employeeName(a).localeCompare(employeeName(b), "id")), [employees]);
  const chooseEmployee = (employeeId: string) => {
    const employee = employeeOptions.find((item) => String(employeeValue(item, ["Employee_ID", "id"])) === employeeId);
    if (!employee) return;
    setRoster((current) => ({ ...current, employee_name: employeeName(employee), employee_id: String(employeeValue(employee, ["Employee_ID", "id"])), salary_number: String(employeeValue(employee, ["Salary_Number"]) ?? ""), user_id: String(employee.user_id ?? employeeValue(employee, ["UserID"]) ?? "") }));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      if (resource === "news") {
        const data = { ...news, title: news.title.trim(), summary: news.summary.trim() || undefined, content: news.content.trim() || undefined, cover_image_url: news.cover_image_url.trim() || undefined, ...(editing ? { updated_by_user_id: userId } : { created_by_user_id: userId }) };
        if (editing && id) await updateAndalanNews(id, data); else await createAndalanNews(data);
        navigate("/andalan/mobile/news");
      } else {
        const data = { ...roster, employee_name: roster.employee_name.trim(), salary_number: roster.salary_number.trim() || undefined, employee_id: roster.employee_id.trim() || undefined, user_id: roster.user_id.trim() || undefined, leave_type: roster.leave_type.trim() || undefined, notes: roster.notes.trim() || undefined, ...(editing ? { updated_by_user_id: userId } : { created_by_user_id: userId }) };
        if (!data.roster_date || !data.employee_name) throw new Error("Tanggal roster dan karyawan wajib diisi.");
        if (editing && id) await updateAndalanRoster(id, data); else await createAndalanRoster(data);
        navigate("/andalan/mobile/roster");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `${title} gagal disimpan.`);
    } finally { setSaving(false); }
  };

  return <div className="crud-page andalan-mobile-page"><PageHeader title={`${editing ? "Edit" : "Tambah"} ${title}`} subtitle={`Form ${editing ? "perubahan" : "pembuatan"} data ANDARA.`} badge={{ icon: Icon, label: "ANDALAN" }} actions={<button className="btn btn-secondary" type="button" onClick={() => navigate(`/andalan/mobile/${resource}`)}><ArrowLeft size={16} /> Kembali ke tabel</button>} />
    {error ? <Card><div className="andalan-mobile-muted">{error}</div></Card> : null}
    <Card>{loading ? <LoadingState message="Memuat data..." /> : <form className="andalan-mobile-form andalan-mobile-page-form" onSubmit={(event) => void submit(event)}>
      {resource === "news" ? <><label>Judul Berita<input required value={news.title} onChange={(event) => setNews((current) => ({ ...current, title: event.target.value }))} /></label><label>Kategori<input value={news.category} onChange={(event) => setNews((current) => ({ ...current, category: event.target.value }))} /></label><label>Ringkasan<input value={news.summary} onChange={(event) => setNews((current) => ({ ...current, summary: event.target.value }))} /></label><label>URL Gambar<input type="url" value={news.cover_image_url} onChange={(event) => setNews((current) => ({ ...current, cover_image_url: event.target.value }))} /></label><label>Isi Berita<textarea rows={7} value={news.content} onChange={(event) => setNews((current) => ({ ...current, content: event.target.value }))} /></label><label className="andalan-mobile-checkbox"><input type="checkbox" checked={news.is_published} onChange={(event) => setNews((current) => ({ ...current, is_published: event.target.checked }))} /> Publikasikan sekarang</label></> : <><label>Tanggal Roster<input required type="date" value={roster.roster_date} onChange={(event) => setRoster((current) => ({ ...current, roster_date: event.target.value }))} /></label><label>Nama Karyawan<select required value={roster.employee_id} onChange={(event) => chooseEmployee(event.target.value)}><option value="">Pilih karyawan dari MINEPRO</option>{employeeOptions.map((employee) => <option key={String(employeeValue(employee, ["Employee_ID", "id"]))} value={String(employeeValue(employee, ["Employee_ID", "id"]))}>{employeeName(employee)} — {String(employeeValue(employee, ["Salary_Number"]) ?? "")}</option>)}</select></label><div className="andalan-mobile-form-grid"><label>Jenis Roster<select value={roster.roster_type} onChange={(event) => setRoster((current) => ({ ...current, roster_type: event.target.value }))}><option value="shift">Shift</option><option value="leave">Cuti</option><option value="off">Off</option></select></label><label>Jenis Cuti<input value={roster.leave_type} onChange={(event) => setRoster((current) => ({ ...current, leave_type: event.target.value }))} /></label></div><label>Status<select value={roster.status} onChange={(event) => setRoster((current) => ({ ...current, status: event.target.value as "planned" | "approved" | "cancelled" }))}><option value="planned">Planned</option><option value="approved">Approved</option><option value="cancelled">Cancelled</option></select></label><label>Catatan<textarea rows={4} value={roster.notes} onChange={(event) => setRoster((current) => ({ ...current, notes: event.target.value }))} /></label></>}
      <div className="andalan-mobile-form-actions"><button className="andalan-mobile-submit-button" type="submit" disabled={saving}>{saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : `Simpan ${title}`}</button><button className="andalan-mobile-cancel-button" type="button" onClick={() => navigate(`/andalan/mobile/${resource}`)}>Batal</button></div>
    </form>}</Card>
  </div>;
}
