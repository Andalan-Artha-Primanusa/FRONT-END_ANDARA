import React from 'react';
import { Eye, Trash2, Clock } from 'lucide-react';

interface AttendanceTableProps {
  items: any[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

const getStatusBadge = (status: string) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('late') || s.includes('terlambat')) return { label: 'Terlambat', color: 'orange' };
  if (s.includes('present') || s.includes('hadir') || s === 'active') return { label: 'Hadir', color: 'green' };
  if (s.includes('absent') || s.includes('tidak hadir')) return { label: 'Absen', color: 'red' };
  return { label: status || 'Hadir', color: 'blue' };
};

const formatTime = (time: any) => {
  if (!time) return '--:--';
  try {
    const d = new Date(time);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch { return String(time); }
};

const formatDate = (date: any) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return String(date); }
};

export const AttendanceTable: React.FC<AttendanceTableProps> = ({ items, onView, onDelete }) => {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Karyawan</th>
            <th>Tanggal</th>
            <th>Jam Masuk</th>
            <th>Jam Pulang</th>
            <th>Status</th>
            <th className="th-center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const status = getStatusBadge(item.status || 'Present');
            const empName = item.employee?.full_name || item.employee_name || `Karyawan #${item.employee_id}`;
            const empId = item.employee?.employee_id || item.employee_id;

            return (
              <tr key={item.id || index}>
                <td>
                  <div className="cell-name">
                    <div className="cell-avatar">{empName.charAt(0).toUpperCase()}</div>
                    <div className="cell-stacked">
                      <span className="cell-name-text">{empName}</span>
                      <span className="cell-stacked__sub">ID: {empId}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="cell-stacked">
                    <span className="cell-stacked__main">{formatDate(item.date || item.created_at)}</span>
                  </div>
                </td>
                <td>
                  <div className="cell-stacked" style={{ color: status.color === 'orange' ? '#f59e0b' : 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} />
                      <span style={{ fontWeight: 600 }}>{formatTime(item.check_in || item.clock_in)}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="cell-stacked">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} />
                      <span style={{ fontWeight: 600 }}>{formatTime(item.check_out || item.clock_out)}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge-soft badge-soft--${status.color}`} style={{ borderRadius: '999px' }}>
                    {status.label}
                  </span>
                </td>
                <td>
                  <div className="action-btn-group">
                    <button className="action-btn action-btn-view" onClick={() => onView(String(item.id))} title="Lihat Detail">
                      <Eye size={16} />
                    </button>
                    <button className="action-btn action-btn-delete" onClick={() => onDelete(String(item.id))} title="Hapus Catatan">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
