import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { BarChart3, CheckCircle2, RefreshCw, Send, Target } from 'lucide-react';
import { PageHeader } from '@/shared/ui';
import { getMyKpis, submitMyKpi } from '@/features/dashboard/api/kpi.service';
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
  employee?: { 
    id?: number | string; 
    name?: string;
    user?: {
      name?: string;
    }
  };
  [key: string]: unknown;
};

const MyKpiPage = () => {
  const [kpis, setKpis] = useState<KpiRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState('Ready to load my KPI');

  const tableColumns = kpis.length > 0 ? Object.keys(kpis[0]) : ['id', 'title', 'target', 'achievement', 'period', 'score', 'status'];
  const summaryCards = useMemo(() => {
    const draftCount = kpis.filter((item) => String(item.status ?? '').toLowerCase() === 'draft').length;
    const submittedCount = kpis.filter((item) => String(item.status ?? '').toLowerCase() === 'submitted').length;
    const approvedCount = kpis.filter((item) => String(item.status ?? '').toLowerCase() === 'approved').length;

    return [
      {
        label: 'Total KPI',
        subtitle: 'Semua KPI pribadi',
        value: String(kpis.length),
        change: 'Data KPI aktif',
        tone: 'blue' as const,
        icon: BarChart3,
      },
      {
        label: 'Draft',
        subtitle: 'Siap diajukan',
        value: String(draftCount),
        change: 'Belum dikirim',
        tone: 'orange' as const,
        icon: Target,
      },
      {
        label: 'Submitted',
        subtitle: 'Menunggu review',
        value: String(submittedCount),
        change: 'Menunggu approval',
        tone: 'purple' as const,
        icon: Send,
      },
      {
        label: 'Approved',
        subtitle: 'Sudah disetujui',
        value: String(approvedCount),
        change: statusMessage,
        tone: 'green' as const,
        icon: CheckCircle2,
      },
    ];
  }, [kpis, statusMessage]);

  useEffect(() => {
    void loadMyKpis();
  }, []);

  const loadMyKpis = async () => {
    setLoading(true);
    setStatusMessage('Memuat KPI pribadi...');

    try {
      const result = await getMyKpis();
      const payload = result.items;
      setKpis(Array.isArray(payload) ? payload : []);
      setStatusMessage('KPI pribadi berhasil dimuat.');
    } catch (error: any) {
      setStatusMessage(error?.response?.data?.message || 'Gagal memuat KPI pribadi.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitKpi = async (id: string) => {
    if (!id) return;

    setSubmittingId(id);
    setStatusMessage(`Submit KPI #${id}...`);

    try {
      await submitMyKpi(id);
      setStatusMessage(`KPI #${id} berhasil di-submit.`);
      await loadMyKpis();
    } catch (error: any) {
      setStatusMessage(error?.response?.data?.message || 'Gagal submit KPI.');
      console.error(error);
    } finally {
      setSubmittingId('');
    }
  };

  const formatCellValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      // Handle employee object with nested user name
      if (record.user && typeof record.user === 'object') {
        const user = record.user as Record<string, unknown>;
        if (user.name) return String(user.name);
      }
      
      const candidate = record.name ?? record.title ?? record.id;
      if (candidate !== undefined && candidate !== null && typeof candidate !== 'object') {
        return String(candidate);
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  const getStatusChipClass = (statusValue: unknown) => {
    const status = String(statusValue ?? '').toLowerCase();
    if (status === 'approved') return 'kpi-status-chip kpi-status-chip--approved';
    if (status === 'submitted') return 'kpi-status-chip kpi-status-chip--submitted';
    return 'kpi-status-chip kpi-status-chip--draft';
  };

  return (
    <div className="kpi-page">
      <PageHeader
        badge={{ icon: Target, label: 'Performance Center' }}
        title="My KPI"
        subtitle="Kelola KPI pribadi dengan tampilan yang rapi, konsisten, dan mudah dipindai."
        actions={
          <div className="page-hero-actions">
            <Button variant="outline" size="md" onClick={loadMyKpis} disabled={loading}>
              <RefreshCw size={16} />
              Segarkan
            </Button>
          </div>
        }
      />

      <div className="kpi-summary-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.label} className="kpi-summary-card" glass>
              <div className="kpi-summary-header">
                <div>
                  <span className="kpi-summary-label">{card.label}</span>
                  <p className="kpi-summary-subtitle">{card.subtitle}</p>
                </div>
                <span className={`kpi-summary-icon kpi-summary-icon--${card.tone}`}>
                  <Icon size={18} />
                </span>
              </div>
              <div className="kpi-summary-value">{card.value}</div>
              <div className="kpi-summary-change">{card.change}</div>
            </Card>
          );
        })}
      </div>

      <Card className="kpi-card" glass>
        <div className="kpi-card-title">
          <Target size={18} />
          <span>Ringkasan Endpoint ESS KPI</span>
        </div>
        <p className="kpi-hint">
          GET /my/kpi untuk lihat KPI sendiri, POST /my/kpi/{'{id}'}/submit untuk submit KPI status draft.
        </p>
      </Card>

      <Card className="kpi-table-card" glass>
        <div className="kpi-table-header">
          <div>
            <h2>Daftar KPI Saya</h2>
            <p>Alur status: draft -&gt; submitted -&gt; approved.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadMyKpis} disabled={loading}>
            Segarkan Data
          </Button>
        </div>

        {kpis.length > 0 ? (
          <div className="ui-table-overflow">
            <table className="ui-table">
              <thead>
                <tr>
                  {tableColumns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((item, index) => {
                  const id = String(item.id ?? '');
                  const status = String(item.status ?? '').toLowerCase();
                  const canSubmit = status === 'draft' && id.length > 0;

                  return (
                    <tr key={`${item.id ?? index}`}>
                      {tableColumns.map((column) => (
                        <td key={`${item.id ?? index}-${column}`}>
                          {column.toLowerCase() === 'status' ? (
                            <span className={getStatusChipClass((item as Record<string, unknown>)[column])}>
                              {formatCellValue((item as Record<string, unknown>)[column])}
                            </span>
                          ) : (
                            formatCellValue((item as Record<string, unknown>)[column])
                          )}
                        </td>
                      ))}
                      <td>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => void handleSubmitKpi(id)}
                          disabled={!canSubmit || submittingId === id}
                        >
                          <Send size={14} />
                          {submittingId === id ? 'Submitting...' : 'Submit'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="kpi-empty-state">
            Belum ada KPI pribadi.
          </div>
        )}
      </Card>

      <div className="kpi-status-bar">
        <strong>Status:</strong> {statusMessage}
      </div>
    </div>
  );
};

export default MyKpiPage;
