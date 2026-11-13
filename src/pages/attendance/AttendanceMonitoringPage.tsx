import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, RefreshCw, Search, Trash2, UserCheck } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { api } from '@/shared/api/httpClient';
import { parsePaginatedResponse } from '@/shared/api/pagination';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import './AttendancePages.css';

type AttendanceLog = {
  id: string | number;
  salary_number?: string;
  employee_id?: string;
  employee_name?: string;
  attendance_date?: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
  distance_meters?: number | null;
  status?: string;
  location_name?: string | null;
  location_code?: string | null;
  project_id?: string | null;
};

const isAttendanceLog = (item: unknown): item is AttendanceLog =>
  Boolean(item && typeof item === 'object' && !Array.isArray(item));

const formatDate = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const AttendanceMonitoringPage = () => {
  const [items, setItems] = useState<AttendanceLog[]>([]);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/presentation/legacy/attendance/monitoring', {
        params: { page, per_page: 10, search: search || undefined, date: date || undefined },
      });
      const parsed = parsePaginatedResponse(response.data, isAttendanceLog);
      setItems(parsed.items);
      setTotalPages(parsed.totalPages);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Gagal memuat monitoring absensi.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [page, date]);

  const handleDelete = async (item: AttendanceLog) => {
    const employee = item.employee_name || item.salary_number || 'data absensi ini';
    if (!window.confirm(`Hapus log absensi ${employee} pada ${formatDate(item.attendance_date)}? Data yang dihapus tidak dapat dikembalikan.`)) return;

    setDeletingId(String(item.id));
    try {
      await api.delete(`/presentation/legacy/attendance/monitoring/${item.id}`);
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Gagal menghapus log absensi.');
    } finally {
      setDeletingId(null);
    }
  };

  const summary = useMemo(() => ({
    total: items.length,
    checkedIn: items.filter((item) => Boolean(item.check_in_at)).length,
    checkedOut: items.filter((item) => Boolean(item.check_out_at)).length,
  }), [items]);

  return (
    <div className="crud-page">
      <PageHeader
        title="Monitoring Clock In / Clock Out"
        subtitle="Lihat seluruh transaksi absensi GPS dari MINEPRO ANDARA."
        badge={{ icon: UserCheck, label: 'Attendance Monitoring' }}
        actions={<button className="btn-outline" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Segarkan</button>}
      />

      <div className="employee-summary-wrapper">
        {[
          { label: 'Data Halaman Ini', value: summary.total, icon: CalendarDays, tone: 'blue' },
          { label: 'Sudah Clock In', value: summary.checkedIn, icon: Clock3, tone: 'green' },
          { label: 'Sudah Clock Out', value: summary.checkedOut, icon: UserCheck, tone: 'orange' },
        ].map((card) => {
          const Icon = card.icon;
          return <div key={card.label} className="employee-summary-card"><div className="employee-summary-header"><div><p className="employee-summary-label">{card.label}</p><p className="employee-summary-subtitle">Data absensi GPS</p></div><div className={`employee-summary-icon-wrapper employee-icon-${card.tone}`}><Icon size={26} /></div></div><div className={`employee-summary-value employee-value-${card.tone}`}>{card.value}</div></div>;
        })}
      </div>

      <Card glass style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: '1 1 280px' }}><div className="search-icon-inside"><Search size={18} /></div><input className="search-input-pill" placeholder="Cari nama, salary number, project..." value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} onKeyDown={(event) => { if (event.key === 'Enter') void load(); }} /></div>
          <input type="date" value={date} onChange={(event) => { setPage(1); setDate(event.target.value); }} style={{ height: '44px', padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: '10px' }} />
          <button className="btn-primary" onClick={() => void load()} disabled={loading}>Cari</button>
        </div>
      </Card>

      {loading && <LoadingState message="Memuat monitoring absensi..." />}
      {!loading && error && <div className="page-alert page-alert--error">{error}</div>}
      {!loading && !error && items.length === 0 && <EmptyState title="Belum Ada Data Absensi" message="Belum ada transaksi clock-in atau clock-out yang tersimpan." />}
      {!loading && !error && items.length > 0 && (
        <Card glass>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Karyawan</th><th>Tanggal</th><th>Clock In</th><th>Clock Out</th><th>Lokasi</th><th>Jarak</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.employee_name || '-'}</strong><div className="cell-stacked__sub">{item.salary_number || item.employee_id || '-'}</div></td><td>{formatDate(item.attendance_date)}</td><td>{formatTime(item.check_in_at)}</td><td>{formatTime(item.check_out_at)}</td><td>{item.location_name || '-'}<div className="cell-stacked__sub">{item.project_id || item.location_code || '-'}</div></td><td>{item.distance_meters == null ? '-' : `${item.distance_meters} m`}</td><td><span className="badge-soft badge-soft--green">{item.check_out_at ? 'CLOCK OUT' : item.check_in_at ? 'CLOCK IN' : item.status || '-'}</span></td><td><button className="btn-icon btn-danger" title="Hapus log absensi" aria-label={`Hapus log ${item.employee_name || item.id}`} onClick={() => void handleDelete(item)} disabled={deletingId === String(item.id)}><Trash2 size={16} /></button></td></tr>)}</tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', gap: '1rem' }}><span>Halaman {page} dari {totalPages}</span><div style={{ display: 'flex', gap: '0.5rem' }}><button className="btn-outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Sebelumnya</button><button className="btn-outline" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>Berikutnya</button></div></div>
        </Card>
      )}
    </div>
  );
};

export default AttendanceMonitoringPage;
