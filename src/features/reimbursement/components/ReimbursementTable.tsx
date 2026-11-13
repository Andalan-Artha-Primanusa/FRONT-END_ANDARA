import React from 'react';
import { Eye, Pencil, Send, Trash2 } from 'lucide-react';
import type { ReimbursementItem } from '../types/reimbursement.types';

interface ReimbursementTableProps {
  items: ReimbursementItem[];
  onView: (item: ReimbursementItem) => void;
  onEdit?: (item: ReimbursementItem) => void;
  onDelete?: (item: ReimbursementItem) => void;
  onSubmit?: (item: ReimbursementItem) => void;
  canApproveLeave?: boolean;
}

export const ReimbursementTable: React.FC<ReimbursementTableProps> = ({
  items,
  onView,
  onEdit,
  onDelete,
  onSubmit,
  canApproveLeave = false
}) => {
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'status-draft';
      case 'submitted': return 'status-submitted';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'paid': return 'status-paid';
      default: return '';
    }
  };

  const formatCurrency = (amount: number) => `Rp ${(amount || 0).toLocaleString("id-ID")}`;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="card-table-wrapper" style={{ overflowX: 'auto', background: 'white', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
      <table className="crud-table">
        <thead>
          <tr>
            {canApproveLeave && <th>Employee</th>}
            <th>Title</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Expense Date</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={canApproveLeave ? 7 : 6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                No reimbursement records found.
              </td>
            </tr>
          ) : (
            items.map((item: any) => (
              <tr key={item.id}>
                {canApproveLeave && (
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                        {item.employee?.full_name || item.employee?.name || item.employee?.user?.name || item.user?.name || item.employee_name || 'N/A'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.employee?.employee_id || item.employee_id || ''}</span>
                    </div>
                  </td>
                )}
                <td>
                  <div style={{ fontWeight: 500 }}>{item.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.description}
                  </div>
                </td>
                <td>
                  <span className="category-tag">{item.category}</span>
                </td>
                <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                  {formatCurrency(item.amount)}
                </td>
                <td>{formatDate(item.expense_date)}</td>
                <td>
                  <span className={`status-pill ${getStatusClass(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="action-btn-group">
                    <button 
                      title="View Details" 
                      onClick={() => onView(item)}
                      className="action-btn action-btn-view"
                    >
                      <Eye size={16} />
                    </button>
                    
                    {item.status.toLowerCase() === 'draft' && onEdit && (
                      <button 
                        title="Edit" 
                        onClick={() => onEdit(item)}
                        className="action-btn action-btn-edit"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    
                    {item.status.toLowerCase() === 'draft' && onSubmit && (
                      <button 
                        title="Submit" 
                        onClick={() => onSubmit(item)}
                        className="action-btn action-btn-success"
                      >
                        <Send size={16} />
                      </button>
                    )}
                    
                    {item.status.toLowerCase() === 'draft' && onDelete && (
                      <button 
                        title="Delete" 
                        onClick={() => onDelete(item)}
                        className="action-btn action-btn-delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
