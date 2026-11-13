import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, PageHeader } from '@/shared/ui';
import { LoadingState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { getLeaveBalance } from '@/features/leave/api/leave.service';
import type { LeaveBalanceResponse } from '@/features/leave/types/leave.types';
import { showToast } from '@/shared/ui/toast';
import { Calendar, RefreshCw, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import './LeaveShared.css';

const LeaveBalancePage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<LeaveBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBalance = async () => {
    setLoading(true);
    try {
      const result = await getLeaveBalance();
      setData({
        policy: result.policy,
        balance: result.balance,
      });
    } catch {
      // Error handled by EmptyState
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBalance();
  }, []);

  const stats = useMemo(() => {
    if (!data) return { allocated: 0, carryOver: 0, used: 0, pending: 0, available: 0 };
    const { balance } = data;
    return {
      allocated: balance.allocated_days,
      carryOver: balance.carry_over_days,
      used: balance.used_days,
      pending: balance.pending_days,
      available: balance.available_days,
    };
  }, [data]);

  const formatEntitlementType = (value: any) => {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'fixed') return 'Tetap';
    if (normalized === 'accrual' || normalized === 'accural') return 'Bertahap';
    if (normalized === 'unlimited') return 'Tidak Terbatas';
    return value || '-';
  };

  const formatPolicyName = (value: any) => {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'paid leave') return 'Cuti Berbayar';
    if (normalized === 'unpaid leave') return 'Cuti Tidak Berbayar';
    return value || '-';
  };

  const formatEmptyPolicyValue = (value: any, emptyLabel: string) => {
    if (value === null || value === undefined || value === '') return emptyLabel;
    return value;
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Saldo Cuti Saya"
        subtitle="Lihat rincian kuota dan kebijakan cuti Anda."
        badge={{ icon: Calendar, label: "Saldo Cuti" }}
        actions={
          <button className="btn-outline" onClick={() => void loadBalance()}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Segarkan
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="leave-requests-wrapper">
        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Kuota Tahunan</p>
              <p className="leave-summary-subtitle">Dari kebijakan</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-blue">
              <Calendar size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-blue">{stats.allocated}</div>
          <p className="leave-summary-trend">Hari tersedia</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Sisa Tahun Lalu</p>
              <p className="leave-summary-subtitle">Sisa tahun lalu</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-purple">
              <TrendingUp size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-purple">{stats.carryOver}</div>
          <p className="leave-summary-trend">Hari tersedia</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Terpakai</p>
              <p className="leave-summary-subtitle">Sudah digunakan</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-green">
              <CheckCircle size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-green">{stats.used}</div>
          <p className="leave-summary-trend">Hari terpakai</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Menunggu</p>
              <p className="leave-summary-subtitle">Belum disetujui</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-orange">
              <Clock size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-orange">{stats.pending}</div>
              <p className="leave-summary-trend">Hari menunggu</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Tersedia</p>
              <p className="leave-summary-subtitle">Sisa kuota</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-red">
              <AlertCircle size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-red">{stats.available}</div>
          <p className="leave-summary-trend">Hari tersisa</p>
        </div>
      </div>

      {/* Analytics Title Card */}
      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Detail Kebijakan Cuti</h2>
            <p className="analytics-subtitle">Informasi lengkap kebijakan cuti tahun {data?.policy?.year || '-'}</p>
          </div>
        </div>
      </Card>

      {/* Policy Details Table */}
      <div className="table-section">
        <div className="table-wrap">
          {loading && !data ? (
            <LoadingState message="Memuat data saldo cuti..." />
          ) : !data ? (
            <div className="empty-state">
              <EmptyState title="Tidak ada data" message="Tidak ada data saldo cuti yang tersedia." />
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kolom</th>
                  <th>Nilai</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>ID Kebijakan</strong></td>
                  <td>{data.policy.id}</td>
                </tr>
                <tr>
                  <td><strong>Nama Kebijakan</strong></td>
                  <td>{formatPolicyName(data.policy.name)}</td>
                </tr>
                <tr>
                  <td><strong>Kode Kebijakan</strong></td>
                  <td>{data.policy.policy_code || '-'}</td>
                </tr>
                <tr>
                  <td><strong>Tipe Hak Cuti</strong></td>
                  <td>{formatEntitlementType(data.policy.entitlement_type)}</td>
                </tr>
                <tr>
                  <td><strong>Nilai Hak Cuti</strong></td>
                  <td>{data.policy.entitlement_value ?? '-'}</td>
                </tr>
                <tr>
                  <td><strong>Maks. Sisa Tahun Lalu</strong></td>
                  <td>{data.policy.max_carryover_days ?? '-'}</td>
                </tr>
                <tr>
                  <td><strong>Berbayar</strong></td>
                  <td>{data.policy.is_paid ? 'Ya' : 'Tidak'}</td>
                </tr>
                <tr>
                  <td><strong>Tahun</strong></td>
                  <td>{data.policy.year}</td>
                </tr>
                <tr>
                  <td><strong>Kuota Tahunan</strong></td>
                  <td>{data.policy.annual_allowance} hari</td>
                </tr>
                <tr>
                  <td><strong>Kuota Sisa Tahun Lalu</strong></td>
                  <td>{data.policy.carry_over_allowance} hari</td>
                </tr>
                <tr>
                  <td><strong>Sisa Tahun Lalu Aktif</strong></td>
                  <td>{data.policy.carry_over_enabled ? 'Ya' : 'Tidak'}</td>
                </tr>
                <tr>
                  <td><strong>Pencairan Cuti Aktif</strong></td>
                  <td>{data.policy.encashment_enabled ? 'Ya' : 'Tidak'}</td>
                </tr>
                <tr>
                  <td><strong>Maks. Hari Menunggu</strong></td>
                  <td>{data.policy.max_pending_days} hari</td>
                </tr>
                <tr>
                  <td><strong>Status Aktif</strong></td>
                  <td>
                    <span className={`status-badge ${data.policy.active ? 'status-badge--approved' : 'status-badge--rejected'}`}>
                      {data.policy.active ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td><strong>Periode Diblokir</strong></td>
                  <td>{formatEmptyPolicyValue(data.policy.blackout_ranges, 'Tidak ada periode diblokir')}</td>
                </tr>
                <tr>
                  <td><strong>ID Kalender Libur</strong></td>
                  <td>{formatEmptyPolicyValue(data.policy.holiday_calendar_id, 'Tidak menggunakan kalender libur khusus')}</td>
                </tr>
                <tr>
                  <td><strong>Catatan</strong></td>
                  <td>{formatEmptyPolicyValue(data.policy.notes, 'Tidak ada catatan')}</td>
                </tr>
                <tr>
                  <td><strong>Dibuat</strong></td>
                  <td>{new Date(data.policy.created_at).toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td><strong>Diperbarui</strong></td>
                  <td>{new Date(data.policy.updated_at).toLocaleString('id-ID')}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveBalancePage;
