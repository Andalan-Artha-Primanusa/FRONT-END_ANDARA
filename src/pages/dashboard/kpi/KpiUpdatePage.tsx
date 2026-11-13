import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { FileText, ArrowLeft } from 'lucide-react';
import { getKpiDetail, updateKpi } from '@/features/dashboard/api/kpi.service';
import './KpiPage.css';

type KpiFormState = {
  id: string;
  title: string;
  description: string;
  target: string;
  achievement: string;
  period: string;
};

type KpiRecord = {
  id?: number | string;
  title?: string;
  description?: string;
  target?: number | string;
  achievement?: number | string;
  period?: string;
};

const KpiUpdatePage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [formState, setFormState] = useState<KpiFormState>({
    id: id || '',
    title: '',
    description: '',
    target: '',
    achievement: '',
    period: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Memuat detail KPI...');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (id) {
      void loadKpiDetail();
    }
  }, [id]);

  const loadKpiDetail = async () => {
    setLoading(true);
    setStatusMessage('Memuat detail KPI...');

    try {
      const result = await getKpiDetail(id!);
      const kpi = (result.payload ?? result) as KpiRecord;
      setFormState({
        id: String(kpi.id || ''),
        title: String(kpi.title || ''),
        description: String(kpi.description || ''),
        target: String(kpi.target || ''),
        achievement: String(kpi.achievement || ''),
        period: String(kpi.period || ''),
      });
      setStatusMessage('Detail KPI berhasil dimuat.');
    } catch (error: any) {
      setStatusMessage('Gagal memuat detail KPI.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: keyof KpiFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!String(formState.title).trim()) {
      return 'Title wajib diisi.';
    }
    const target = Number(formState.target);
    if (Number.isNaN(target) || target <= 0) {
      return 'Target harus berupa angka lebih dari 0.';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validation = validateForm();
    if (validation) {
      setErrorMessage(validation);
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setStatusMessage('Mengupdate KPI...');

    try {
      const result = await updateKpi(id!, {
        title: String(formState.title),
        description: formState.description || undefined,
        target: Number(formState.target),
        period: String(formState.period || ''),
        achievement: formState.achievement ? Number(formState.achievement) : undefined,
      });

      setStatusMessage('KPI berhasil diupdate.');
      console.log('Updated KPI:', result);
      
      setTimeout(() => {
        navigate(`/kpi/view/${id}`);
      }, 1000);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to update KPI.';
      setErrorMessage(message);
      setStatusMessage('Gagal mengupdate KPI.');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="kpi-page">
      <div className="kpi-header">
        <div>
          <div className="kpi-badge">
            <FileText size={18} />
            <span>Update KPI</span>
          </div>
          <h1>Update KPI</h1>
          <p>Edit detail KPI. Hanya field tertentu yang dapat diupdate.</p>
        </div>
        <div className="kpi-header-actions">
          <Button 
            variant="outline" 
            size="md" 
            onClick={() => navigate('/kpis')}
            disabled={loading || submitting}
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
      ) : (
        <Card className="kpi-card" glass>
          <div className="kpi-card-title">
            <FileText size={18} />
            <span>KPI Details</span>
          </div>

          <div className="kpi-form-grid">
            <label>
              KPI ID (Read-only)
              <input
                value={formState.id}
                disabled
              />
            </label>

            <label>
              Title *
              <input
                value={formState.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="e.g., Revenue Growth"
                disabled={submitting}
              />
            </label>

            <label>
              Target *
              <input
                type="number"
                value={formState.target}
                onChange={(e) => handleFieldChange('target', e.target.value)}
                placeholder="e.g., 1000000"
                disabled={submitting}
              />
            </label>

            <label>
              Period
              <input
                value={formState.period}
                onChange={(e) => handleFieldChange('period', e.target.value)}
                placeholder="e.g., Q1 2026"
                disabled={submitting}
              />
            </label>

            <label>
              Achievement
              <input
                type="number"
                value={formState.achievement}
                onChange={(e) => handleFieldChange('achievement', e.target.value)}
                placeholder="e.g., 800000"
                disabled={submitting}
              />
            </label>

            <label className="kpi-full-width">
              Description
              <input
                value={formState.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Optional description"
                disabled={submitting}
              />
            </label>
          </div>

          {errorMessage && (
            <div style={{ 
              color: '#d32f2f', 
              padding: '12px', 
              background: '#ffebee', 
              borderRadius: '4px',
              marginTop: '12px'
            }}>
              {errorMessage}
            </div>
          )}

          <div className="kpi-action-buttons">
            <Button 
              variant="primary" 
              size="md" 
              onClick={handleSubmit} 
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Update KPI'}
            </Button>
            <Button 
              variant="ghost" 
              size="md" 
              onClick={() => navigate('/kpis')}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div style={{ marginTop: '16px', padding: '12px', background: '#f0f0f0', borderRadius: '4px', fontSize: '14px' }}>
        <strong>Status:</strong> {statusMessage}
      </div>
    </div>
  );
};

export default KpiUpdatePage;
