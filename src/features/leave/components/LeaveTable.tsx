import React from 'react';
import { Eye, Check, X, Pencil, Trash2, History } from 'lucide-react';

interface LeaveTableProps {
  items: any[];
  onView: (item: any) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onHistory?: (id: string) => void;
  canApproveLeave?: boolean;
}

const getLeaveTypeLabel = (item: any) => {
  if (item.leave_type?.name) return item.leave_type.name;
  const typeMap: Record<string, string> = {
    annual: 'Cuti Tahunan',
    sick: 'Cuti Sakit',
    personal: 'Cuti Pribadi',
    maternity: 'Cuti Melahirkan',
    unpaid: 'Cuti Tanpa Gaji',
  };
  return typeMap[item.type?.toLowerCase()] || item.type || '-';
};

const formatDate = (date: any) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatStatusLabel = (status: string) => {
  if (status === 'approved') return 'Disetujui';
  if (status === 'rejected') return 'Ditolak';
  if (status === 'submitted') return 'Diajukan';
  if (status === 'active') return 'Aktif';
  return 'Menunggu';
};

const getNestedName = (...values: any[]) =>
  values.find((value) => typeof value === 'string' && value.trim()) || '';

const getEmployeeSubtitle = (employee: any) => {
  const departmentName = getNestedName(
    employee?.department?.name,
    employee?.departmentRel?.name,
    employee?.department_rel?.name
  );
  const positionName = getNestedName(
    employee?.position?.name,
    employee?.positionRel?.name,
    employee?.position_rel?.name
  );

  return [departmentName, positionName].filter(Boolean).join(' • ');
};

export const LeaveTable: React.FC<LeaveTableProps> = ({ items, onView, onApprove, onReject, onEdit, onDelete, onHistory, canApproveLeave }) => {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Karyawan</th>
            <th>Tipe Cuti</th>
            <th>Periode</th>
            <th>Durasi</th>
            <th className="th-center">Status</th>
            <th className="th-center" style={{ width: '160px' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const status = String(item.status || 'pending').toLowerCase();
            const empName = item.employee?.user?.name || item.employee?.full_name || item.user?.name || `EMP-${item.employee_id}`;
            const employeeSubtitle = getEmployeeSubtitle(item.employee);
            
            return (
              <tr key={item.id || index}>
                <td>
                  <div className="cell-name">
                    <div className="cell-avatar">
                      {empName.charAt(0).toUpperCase()}
                    </div>
                    <div className="cell-stacked">
                      <span className="cell-name-text">{empName}</span>
                      {employeeSubtitle && <span className="cell-stacked__sub">{employeeSubtitle}</span>}
                    </div>
                  </div>
                </td>
                <td><span className="badge-soft badge-soft--blue">{getLeaveTypeLabel(item)}</span></td>
                <td>
                  <div className="cell-stacked">
                    <span className="cell-stacked__main">{formatDate(item.start_date)}</span>
                    <span className="cell-stacked__sub">s/d {formatDate(item.end_date)}</span>
                  </div>
                </td>
                <td><strong>{item.total_days || 1}</strong> Hari</td>
                <td className="td-center">
                  <span className={`badge-soft badge-soft--${status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'orange'}`}>
                    {formatStatusLabel(status)}
                  </span>
                </td>
                <td className="td-center">
                  <div className="action-btn-group">
                    <button className="action-btn action-btn-view" onClick={() => onView(item)} title="Lihat Detail">
                      <Eye size={16} />
                    </button>
                    
                    {canApproveLeave && status === 'pending' && (
                      <>
                        <button className="action-btn action-btn-approve" onClick={() => onApprove?.(String(item.id))} title="Setujui">
                          <Check size={16} />
                        </button>
                        <button className="action-btn action-btn-reject" onClick={() => onReject?.(String(item.id))} title="Tolak">
                          <X size={16} />
                        </button>
                      </>
                    )}

                    {!canApproveLeave && status === 'pending' && onEdit && (
                       <button className="action-btn action-btn-edit" onClick={() => onEdit(String(item.id))} title="Edit">
                         <Pencil size={16} />
                       </button>
                    )}

                    {onHistory && (
                      <button className="action-btn" style={{ background: '#f5f3ff', color: '#8b5cf6' }} onClick={() => onHistory(String(item.id))} title="Riwayat Persetujuan">
                        <History size={16} />
                      </button>
                    )}
                    {onDelete && (
                       <button className="action-btn action-btn-delete" onClick={() => onDelete(String(item.id))} title="Hapus">
                         <Trash2 size={16} />
                       </button>
                    )}
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
