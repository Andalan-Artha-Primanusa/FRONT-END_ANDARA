import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { showToast } from '@/shared/ui/toast';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { getKpiDetail, approveKpi } from '@/features/dashboard/api/kpi.service';
import { useAuthStore } from '@/app/store/auth.store';
import { RBACUtils } from '@/shared/hooks/rbac';
import { PERMISSIONS } from '@/shared/types/rbac.types';
import './KpiPage.css';

type KpiStatus = 'draft' | 'submitted' | 'approved';

type KpiRecord = {
  id?: number | string;
  employee_id?: number | string;
  title?: string;
  description?: string;
  target?: number | string;
  achievement?: number | string;
  period?: string;
  score?: number | string;
  status?: KpiStatus | string;
  created_at?: string;
  updated_at?: string;
  employee?: { id?: number | string; name?: string };
  user?: { id?: number | string; name?: string };
  [key: string]: unknown;
};

const KpiApprovePage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const canApprove = RBACUtils.hasPermission(user, PERMISSIONS.KPI_APPROVE);
  const [kpi, setKpi] = useState<KpiRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  useEffect(() => {
    if (id) {
      void loadKpiDetail();
    }
  }, [id]);

  const loadKpiDetail = async () => {
    setLoading(true);

    try {
      const result = await getKpiDetail(id!);
      setKpi((result.payload ?? result) as KpiRecord);
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Gagal memuat detail KPI.', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!canApprove) {
      showToast('Anda tidak memiliki izin menyetujui KPI.', 'error');
      return;
    }
    setApproving(true);

    try {
      const result = await approveKpi(id!);
      showToast('KPI berhasil disetujui', 'success');
      
      setTimeout(() => {
        navigate('/kpis');
      }, 1000);
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Gagal menyetujui KPI.', 'error');
      console.error(error);
    } finally {
      setApproving(false);
    }
  };

  const getStatusChipClass = (statusValue: unknown) => {
    const status = String(statusValue ?? '').toLowerCase();
    if (status === 'approved') return 'kpi-status-chip kpi-status-chip--approved';
    if (status === 'submitted') return 'kpi-status-chip kpi-status-chip--submitted';
    return 'kpi-status-chip kpi-status-chip--draft';
  };

  const formatCellValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const candidate = record.name ?? record.title ?? record.id;
      if (candidate !== undefined && candidate !== null && typeof candidate !== 'object') {
        return String(candidate);
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="kpi-page">
      <div className="kpi-header">
        <div>
          <div className="kpi-badge">
            <CheckCircle size={18} />
            <span>Approve KPI</span>
          </div>
          <h1>Approve KPI</h1>
          <p>Review dan approve KPI yang telah disubmit oleh karyawan (Manager/HR/Admin/Super Admin).</p>
        </div>
        <div className="kpi-header-actions">
          <Button 
            variant="outline" 
            size="md" 
            onClick={() => navigate('/kpis')}
            disabled={loading || approving}
          >
            <ArrowLeft size={16} />
            Back to List
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="kpi-card" glass>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            Loading...
          </div>
        </Card>
      ) : kpi ? (
        <>
          {kpi.status !== 'submitted' && (
            <div style={{ 
              color: '#f57c00', 
              padding: '12px', 
              background: '#fff3e0', 
              borderRadius: '4px',
              marginBottom: '16px'
            }}>
              ⚠️ KPI status harus "submitted" untuk di-approve. Status saat ini: <strong>{kpi.status}</strong>
            </div>
          )}

          <Card className="kpi-card" glass>
            <div className="kpi-card-title">
              <CheckCircle size={18} />
              <span>{kpi.title}</span>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>ID</label>
                <div>{formatCellValue(kpi.id)}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Employee ID</label>
                <div>{formatCellValue(kpi.employee_id)}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Employee Name</label>
                <div>{formatCellValue(kpi.employee?.name ?? kpi.user?.name ?? '-')}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Title</label>
                <div>{formatCellValue(kpi.title)}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Period</label>
                <div>{formatCellValue(kpi.period)}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Target</label>
                <div>{formatCellValue(kpi.target)}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Achievement</label>
                <div>{formatCellValue(kpi.achievement ?? '-')}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Score</label>
                <div>{formatCellValue(kpi.score ?? '-')}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Status</label>
                <div>
                  <span className={getStatusChipClass(kpi.status)}>
                    {formatCellValue(kpi.status)}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Created At</label>
                <div>{formatCellValue(kpi.created_at)}</div>
              </div>

              {kpi.description && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Description</label>
                  <div>{formatCellValue(kpi.description)}</div>
                </div>
              )}
            </div>

            <div className="kpi-action-buttons" style={{ marginTop: '20px' }}>
              {canApprove && (
              <Button 
                variant="primary" 
                size="md" 
                onClick={handleApprove}
                disabled={approving || kpi.status !== 'submitted'}
              >
                <CheckCircle size={16} />
                {approving ? 'Approving...' : 'Approve KPI'}
              </Button>
              )}
              <Button 
                variant="ghost" 
                size="md" 
                onClick={() => navigate('/kpis')}
                disabled={approving}
              >
                Back to List
              </Button>
            </div>
          </Card>
        </>
      ) : (
        <Card className="kpi-card" glass>
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            KPI not found.
          </div>
        </Card>
      )}

    </div>
  );
};

export default KpiApprovePage;
