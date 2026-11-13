import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { FileText, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/shared/ui';
import { createKpi } from '@/features/dashboard/api/kpi.service';
import './KpiPage.css';

type KpiFormState = {
  employee_id: string;
  title: string;
  description: string;
  target: string;
  period: string;
};

const KpiCreatePage = () => {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<KpiFormState>({
    employee_id: '',
    title: '',
    description: '',
    target: '',
    period: '',
  });
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to create KPI');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFieldChange = (key: keyof KpiFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!String(formState.employee_id).trim()) {
      return 'Employee ID wajib diisi.';
    }
    if (!String(formState.title).trim()) {
      return 'Title wajib diisi.';
    }
    if (!String(formState.period).trim()) {
      return 'Period wajib diisi.';
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

    setLoading(true);
    setErrorMessage('');
    setStatusMessage('Membuat KPI...');

    try {
      const result = await createKpi({
        employee_id: Number(formState.employee_id),
        title: String(formState.title),
        description: formState.description || undefined,
        target: Number(formState.target),
        period: String(formState.period),
      });

      setStatusMessage('KPI berhasil dibuat.');
      console.log('Created KPI:', result);
      
      // Navigate back to list after short delay
      setTimeout(() => {
        navigate('/kpis');
      }, 1000);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to create KPI.';
      setErrorMessage(message);
      setStatusMessage('Gagal membuat KPI.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kpi-page">
      <PageHeader
        badge={{ icon: FileText, label: 'Performance Center' }}
        title="Create New KPI"
        subtitle="Buat KPI baru untuk karyawan. Semua field bertanda * wajib diisi."
        actions={
          <div className="page-hero-actions">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/kpis')}
              disabled={loading}
            >
              <ArrowLeft size={16} />
              Back to List
            </Button>
          </div>
        }
      />

      <Card className="kpi-card" glass>
        <div className="kpi-card-title">
          <FileText size={18} />
          <span>KPI Details</span>
        </div>

        <div className="kpi-form-grid">
          <label>
            Employee ID *
            <input
              value={formState.employee_id}
              onChange={(e) => handleFieldChange('employee_id', e.target.value)}
              placeholder="e.g., 1"
              disabled={loading}
            />
          </label>

          <label>
            Title *
            <input
              value={formState.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="e.g., Revenue Growth"
              disabled={loading}
            />
          </label>

          <label>
            Target *
            <input
              type="number"
              value={formState.target}
              onChange={(e) => handleFieldChange('target', e.target.value)}
              placeholder="e.g., 1000000"
              disabled={loading}
            />
          </label>

          <label>
            Period *
            <input
              value={formState.period}
              onChange={(e) => handleFieldChange('period', e.target.value)}
              placeholder="e.g., Q1 2026"
              disabled={loading}
            />
          </label>

          <label className="kpi-full-width">
            Description
            <input
              value={formState.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Optional description"
              disabled={loading}
            />
          </label>
        </div>

        {errorMessage && (
          <div className="kpi-error-message">
            {errorMessage}
          </div>
        )}

        <div className="kpi-action-buttons">
          <Button 
            variant="primary" 
            size="md" 
            onClick={handleSubmit} 
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create KPI'}
          </Button>
          <Button 
            variant="ghost" 
            size="md" 
            onClick={() => navigate('/kpis')}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </Card>

      <div className="kpi-status-bar">
        <strong>Status:</strong> {statusMessage}
      </div>
    </div>
  );
};

export default KpiCreatePage;
