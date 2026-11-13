import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { PageHeader } from '@/shared/ui';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { api } from '@/shared/api/httpClient';
import {
  deleteAttendanceRecord,
  getAllAttendanceRecords,
  getAttendanceDetail,
  type AttendanceItem,
} from '@/features/attendance/api/attendance-admin.service';
import { AttendanceSummary } from '@/features/attendance/components/AttendanceSummary';
import { AttendanceTable } from '@/features/attendance/components/AttendanceTable';
import { AttendanceDetailModal } from '@/features/attendance/components/AttendanceDetailModal';
import {
  RefreshCw, FileText, Search, Download,
} from 'lucide-react';
import { showToast } from '@/shared/ui/toast';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import './AttendanceShared.css';
import './AttendanceAdminPage.css';


const AttendanceReportsPage = () => {
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [adminItems, setAdminItems] = useState<AttendanceItem[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState(todayStr);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAdminRecords = async () => {
    setAdminLoading(true);
    try {
      const result = await getAllAttendanceRecords({
        date_from: filterDate,
        date_to: filterDate,
      });
      setAdminItems(result.items);
    } catch {
      // Error handling done in caller
    } finally {
      setAdminLoading(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    setAdminLoading(true);
    try {
      const result = await getAttendanceDetail(id);
      setSelectedDetail(result.payload);
      setIsDetailModalOpen(true);
    } catch (error: any) {
      showToast(error.message || "Gagal memuat detail", "error");
    } finally {
      setAdminLoading(false);
    }
  };

  const confirmDeleteRecord = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteAttendanceRecord(String((deleteTarget as any).id));
      showToast("Catatan kehadiran berhasil dihapus", "success");
      await loadAdminRecords();
      setDeleteTarget(null);
    } catch (error: any) {
      showToast(error.message || "Gagal menghapus catatan", "error");
    } finally {
      setDeleting(false);
    }
  };

  const fmtTime = (time: any) => {
    if (!time) return '--:--';
    try {
      const d = new Date(time);
      if (isNaN(d.getTime())) return String(time);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    } catch { return String(time); }
  };

  const csvVal = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const exportCSV = () => {
    const headers = ['Karyawan', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status'];
    const rows = filteredItems.map((item: any) => [
      item.employee_name || item.employee?.full_name || item.employee?.name || '-',
      item.date ? new Date(item.date).toLocaleDateString('id-ID') : '-',
      fmtTime(item.check_in),
      fmtTime(item.check_out),
      formatAttendanceStatus(item.status),
    ]);
    const csv = [headers.map(csvVal), ...rows.map(r => r.map(csvVal))].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data-kehadiran.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadTotalEmployees = async () => {
    try {
      const res = await api.get('/employees', { params: { per_page: 1 } });
      const total = res.data?.data?.total ?? 0;
      setTotalEmployees(total);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    void loadAdminRecords();
    void loadTotalEmployees();
  }, [filterDate]);

  const adminStats = useMemo(() => {
    const total = totalEmployees;
    const present = adminItems.filter((i: any) => {
      const s = String(i.status || '').toLowerCase();
      return s.includes('present') || s === 'active' || s === 'on_time';
    }).length;
    const late = adminItems.filter((i: any) => String(i.status || '').toLowerCase().includes('late') || String(i.status || '').toLowerCase().includes('terlambat')).length;
    const absent = 0;
    return { total, present, late, absent };
  }, [adminItems, totalEmployees]);

  const filteredItems = useMemo(() => {
    return adminItems.filter((item: any) => {
      const q = searchQuery.toLowerCase();
      const name = String(item.employee_name || item.employee?.full_name || '').toLowerCase();
      const id = String(item.employee_id || '').toLowerCase();
      const status = String(item.status || '').toLowerCase();
      const matchesSearch = name.includes(q) || id.includes(q);
      const matchesStatus = !filterStatus || status.includes(filterStatus.toLowerCase());
      return matchesSearch && matchesStatus;
    });
  }, [adminItems, searchQuery, filterStatus]);

  return (
    <div className="crud-page">
      <PageHeader
        title="Laporan Kehadiran"
        subtitle="Analitik dan laporan kehadiran karyawan."
        badge={{ icon: FileText, label: 'Pusat Laporan' }}
        scope
        actions={
          <>
            <button className="btn-outline" onClick={exportCSV}>
              <Download size={16} />
              Ekspor Data Karyawan
            </button>
            <button className="btn-outline" onClick={() => void loadAdminRecords()}>
              <RefreshCw size={16} className={adminLoading ? 'animate-spin' : ''} />
              Segarkan
            </button>
          </>
        }
      />

      <AttendanceSummary stats={adminStats} />

      <div className="table-section attendance-report-table-section">
        <div className="wuw-table-area attendance-report-table-area">
          <div className="table-toolbar attendance-report-table-toolbar">
            <div className="control-section-inner">
              <div className="control-actions">
                <select
                  className="filter-select-premium"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ height: '44px', minWidth: '160px' }}
                >
                  <option value="">Semua Status</option>
                  <option value="on_time">Hadir</option>
                  <option value="late">Terlambat</option>
                  <option value="absent">Absen</option>
                </select>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="filter-select-premium"
                  style={{ height: '44px', minWidth: '160px' }}
                />
              </div>

              <div className="control-actions">
                <div className="search-box">
                  <div className="search-icon-inside"><Search size={18} /></div>
                  <input
                    type="text"
                    placeholder="Cari nama atau ID karyawan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input-pill"
                  />
                </div>
              </div>
            </div>
          </div>
          {adminLoading && adminItems.length === 0 ? (
            <LoadingState message="Memuat data kehadiran..." />
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <EmptyState title="Tidak ada data" message="Coba ubah kriteria pencarian atau filter Anda." />
            </div>
          ) : (
            <AttendanceTable
              items={filteredItems}
              onView={handleViewDetail}
              onDelete={(id) => {
                const item = adminItems.find((entry: any) => String(entry.id) === String(id)) || null;
                setDeleteTarget(item);
              }}
              loading={adminLoading}
            />
          )}
        </div>
      </div>

      <AttendanceDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        item={selectedDetail}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Catatan Kehadiran"
        message="Catatan kehadiran ini akan dihapus dari laporan. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={() => void confirmDeleteRecord()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

const formatAttendanceStatus = (status: any) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('late') || s.includes('terlambat')) return 'Terlambat';
  if (s.includes('present') || s.includes('hadir') || s === 'active' || s === 'on_time') return 'Hadir';
  if (s.includes('absent') || s.includes('tidak hadir')) return 'Absen';
  return status ? String(status) : '-';
};

export default AttendanceReportsPage;
