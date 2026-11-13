import { useEffect, useState } from "react";
import { Edit3, Newspaper, RefreshCw } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, PageHeader } from "@/shared/ui";
import { LoadingState } from "@/shared/ui/DataStateDisplay";
import { useAuthStore } from "@/app/store/auth.store";
import { getAndalanNews, getAndalanRequests, getAndalanRoster, type AndalanNews, type AndalanRequest, type AndalanRoster } from "@/features/andalan-mobile/api/andalan-mobile.service";
import "@/shared/styles/CrudPage.css";
import "./AndalanMobilePage.css";

type ViewTab = "news" | "roster" | "leaves" | "reimbursements" | "trips";
const text = (value: unknown) => value === null || value === undefined || value === "" ? "-" : String(value);
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";
const money = (value?: string | number | null) => value === null || value === undefined || value === "" ? "-" : `Rp ${Number(value).toLocaleString("id-ID")}`;

export default function AndalanMobilePage() {
  const user = useAuthStore((state) => state.user);
  const userId = String((user as unknown as Record<string, unknown> | null)?.user_id ?? user?.id ?? "");
  const location = useLocation();
  const navigate = useNavigate();
  const [news, setNews] = useState<AndalanNews[]>([]);
  const [roster, setRoster] = useState<AndalanRoster[]>([]);
  const [requests, setRequests] = useState<{ leaves: AndalanRequest[]; reimbursements: AndalanRequest[]; trips: AndalanRequest[] }>({ leaves: [], reimbursements: [], trips: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const routeTab: ViewTab = location.pathname.endsWith("/roster") ? "roster" : location.pathname.endsWith("/leave") ? "leaves" : location.pathname.endsWith("/reimburse") ? "reimbursements" : location.pathname.endsWith("/trips") ? "trips" : "news";

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [newsResult, rosterResult] = await Promise.all([getAndalanNews(), getAndalanRoster()]);
      setNews(newsResult); setRoster(rosterResult);
      if (userId) {
        try { setRequests(await getAndalanRequests(userId)); }
        catch { setRequests({ leaves: [], reimbursements: [], trips: [] }); }
      }
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Data ANDARA belum dapat dimuat."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [userId]);

  const newsTable = <div className="andalan-mobile-table-wrap"><table className="data-table"><thead><tr><th>Berita</th><th>Kategori</th><th>Publikasi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{news.length ? news.map((item) => <tr key={item.id}><td><strong>{text(item.title)}</strong><small className="andalan-mobile-table-subtext">{text(item.summary || item.content)}</small></td><td>{text(item.category || "general")}</td><td>{date(item.published_at)}</td><td><span className="andalan-mobile-pill">Aktif</span></td><td><button className="action-btn action-btn-edit" type="button" title="Edit berita" onClick={() => navigate(`/andalan/mobile/news/edit/${item.id}`)}><Edit3 size={15} /></button></td></tr>) : <tr><td className="andalan-mobile-table-empty" colSpan={5}>Belum ada berita dari server.</td></tr>}</tbody></table></div>;
  const rosterTable = <div className="andalan-mobile-table-wrap"><table className="data-table"><thead><tr><th>Tanggal</th><th>Karyawan</th><th>Tipe</th><th>Status</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>{roster.length ? roster.map((item) => <tr key={item.id}><td>{date(item.roster_date)}</td><td><strong>{text(item.employee_name)}</strong></td><td>{text(item.leave_type || item.roster_type)}</td><td><span className="andalan-mobile-pill">{text(item.status)}</span></td><td>{text(item.notes)}</td><td><button className="action-btn action-btn-edit" type="button" title="Edit roster" onClick={() => navigate(`/andalan/mobile/roster/edit/${item.id}`)}><Edit3 size={15} /></button></td></tr>) : <tr><td className="andalan-mobile-table-empty" colSpan={6}>Belum ada roster dari server.</td></tr>}</tbody></table></div>;
  const requestTable = (items: AndalanRequest[], title: string) => {
    const rows = items.map((item) => <tr key={item.id}><td>{text(item.leave_type || item.title || item.purpose || item.destination)}</td><td>{date(item.start_date || item.expense_date)}{item.end_date ? ` - ${date(item.end_date)}` : ""}</td><td>{item.amount ? money(item.amount) : item.total_days ? `${item.total_days} hari` : text(item.estimated_amount)}</td><td><span className="andalan-mobile-pill">{text(item.status)}</span></td></tr>);
    return <Card><div className="andalan-mobile-card-header"><h2>{title}</h2></div><div className="andalan-mobile-table-wrap"><table className="data-table"><thead><tr><th>Judul/Keperluan</th><th>Tanggal</th><th>Nilai</th><th>Status</th></tr></thead><tbody>{rows.length ? rows : <tr><td className="andalan-mobile-table-empty" colSpan={4}>Belum ada pengajuan dari server.</td></tr>}</tbody></table></div></Card>;
  };
  const title = routeTab === "news" ? "Berita ANDARA" : routeTab === "roster" ? "Roster & Jadwal Cuti" : routeTab === "leaves" ? "Cuti & Izin" : routeTab === "reimbursements" ? "Reimburse" : "Perjalanan Dinas";
  return <div className="crud-page andalan-mobile-page"><PageHeader title={title} subtitle="Data ANDARA dalam tabel yang dapat dibaca dan dikelola." badge={{ icon: Newspaper, label: "ANDALAN" }} actions={<div className="andalan-mobile-header-actions"><button className="btn btn-secondary" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Segarkan</button>{routeTab === "news" ? <button className="andalan-mobile-create-button" type="button" onClick={() => navigate("/andalan/mobile/news/create")}>+ Buat Berita</button> : null}{routeTab === "roster" ? <button className="andalan-mobile-create-button" type="button" onClick={() => navigate("/andalan/mobile/roster/create")}>+ Tambah Roster</button> : null}</div>} />
    {error ? <Card><div className="andalan-mobile-muted">{error}</div></Card> : null}
    {loading ? <Card><LoadingState message="Memuat data ANDARA..." /></Card> : routeTab === "news" ? <Card><div className="andalan-mobile-card-header"><h2>Berita & Pengumuman</h2></div>{newsTable}</Card> : routeTab === "roster" ? <Card><div className="andalan-mobile-card-header"><h2>Roster & Jadwal Cuti</h2></div>{rosterTable}</Card> : requestTable(requests[routeTab], title)}
  </div>;
}
