import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, BookOpen, Calendar, ChevronLeft } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { trainingService } from '@/features/training/api/training.service';
import type { TrainingProgram } from '@/features/training/types/training.types';
import { showToast } from '@/shared/ui/toast';
import { PageHeader } from '@/shared/ui';
import '@/shared/styles/CrudPage.css';
import '../dashboard/overview/OverviewPage.css';
import './TrainingFormPage.css';

const categorySuggestions = [
  'Umum',
  'Leadership',
  'Teknis',
  'Kepatuhan',
  'Onboarding',
  'Soft Skill',
  'Keselamatan',
  'Produk',
];

type TrainingMode = NonNullable<TrainingProgram['mode']>;
type TrainingStatus = TrainingProgram['status'];

interface TrainingFormState {
  title: string;
  category: string;
  description: string;
  mode: TrainingMode;
  provider: string;
  start_date: string;
  end_date: string;
  budget: number;
  status: TrainingStatus;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};
  const response = record.response && typeof record.response === 'object' ? (record.response as Record<string, unknown>) : {};
  const data = response.data && typeof response.data === 'object' ? (response.data as Record<string, unknown>) : {};
  return typeof data.message === 'string'
    ? data.message
    : typeof record.message === 'string'
      ? record.message
      : fallback;
};

const TrainingFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [formData, setFormData] = useState<TrainingFormState>({
    title: '',
    category: '',
    description: '',
    mode: 'offline',
    provider: 'Internal',
    start_date: '',
    end_date: '',
    budget: 1000000,
    status: 'active'
  });

  useEffect(() => {
    if (!isEdit) return;
    const fetchTraining = async () => {
      setFetching(true);
      try {
        const data = await trainingService.getProgram(id);
        const trainingData: Partial<TrainingProgram> = data.data ?? {};
        setFormData({
          title: trainingData.title || '',
          category: trainingData.category || '',
          description: trainingData.description || '',
          mode: trainingData.mode || 'offline',
          provider: trainingData.provider || 'Internal',
          start_date: trainingData.start_date ? trainingData.start_date.split('T')[0] : '',
          end_date: trainingData.end_date ? trainingData.end_date.split('T')[0] : '',
          budget: trainingData.budget ? Number(trainingData.budget) : 1000000,
          status: trainingData.status || 'active'
        });
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    fetchTraining();
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Build payload exactly matching backend expectation
      const apiData: Partial<TrainingProgram> = {
        title: formData.title.trim(),
        category: formData.category.trim() || undefined,
        mode: formData.mode,
        description: formData.description.trim(),
        provider: formData.provider.trim() || 'Internal',
        start_date: formData.start_date,
        end_date: formData.end_date,
        budget: Number(formData.budget) || 1000000,
        status: formData.status
      };

      if (isEdit) {
        await trainingService.updateProgram(id, apiData);
      } else {
        await trainingService.createProgram(apiData);
      }
      showToast(isEdit ? 'Program berhasil diperbarui' : 'Program berhasil dibuat', 'success');
      navigate('/training/programs');
    } catch (err: unknown) {
      console.error('Error saving training program:', err);
      showToast(getErrorMessage(err, 'Gagal menyimpan program pelatihan'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value } as TrainingFormState);
  };

  if (fetching) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading training details...</div>;

  return (
    <div className="crud-page training-form-page">
      <PageHeader
        title={isEdit ? 'Edit Training Program' : 'Develop New Program'}
        subtitle="Design curricula, set schedules, and manage enrollments."
        badge={{ icon: BookOpen, label: "Training Center" }}
        style={{ marginBottom: '2rem' }}
        actions={
          <button type="button" className="btn-outline" onClick={() => navigate('/training/programs')} disabled={loading}>
            <ChevronLeft size={18} />
            Back
          </button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card glass style={{ padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={20} color="var(--color-primary)" /> Program Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label>Program Title</label>
                <input name="title" value={formData.title} onChange={handleChange} className="form-control" required placeholder="e.g. Pelatihan Leadership" />
              </div>

              <div className="form-group">
                <label>Category</label>
                <input
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="form-control"
                  list="training-category-suggestions"
                  placeholder="Contoh: Leadership, Frontend, Safety, HR Compliance"
                  maxLength={100}
                />
                <datalist id="training-category-suggestions">
                  {categorySuggestions.map(category => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="form-control" rows={5} placeholder="Deskripsi program pelatihan" />
              </div>
            </div>
          </Card>

          <Card glass style={{ padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={20} color="var(--color-primary)" /> Schedule & Provider
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Start Date</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input name="start_date" type="date" value={formData.start_date} onChange={handleChange} className="form-control" style={{ paddingLeft: '40px' }} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input name="end_date" type="date" value={formData.end_date} onChange={handleChange} className="form-control" style={{ paddingLeft: '40px' }} required />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Mode</label>
                  <select name="mode" value={formData.mode} onChange={handleChange} className="form-control">
                    <option value="offline">offline</option>
                    <option value="online">online</option>
                    <option value="hybrid">hybrid</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Provider</label>
                  <select name="provider" value={formData.provider} onChange={handleChange} className="form-control">
                    <option value="Internal">Internal</option>
                    <option value="External">External</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          <Card glass style={{ padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Save size={20} color="var(--color-primary)" /> Budget & Status
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Budget</label>
                <input name="budget" type="text" inputMode="numeric" value={formData.budget ? Number(formData.budget).toLocaleString("id-ID") : ""} onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value.replace(/\D/g, "")) || 0 })} className="form-control" />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="form-control">
                  <option value="active">active</option>
                  <option value="draft">draft</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
            </div>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%', height: '54px', borderRadius: '12px' }}>
              <Save size={18} style={{ marginRight: '8px' }} />
              {loading ? 'Saving...' : 'Save Program'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/training/programs')}
              style={{
                width: '100%',
                height: '50px',
                borderRadius: '12px',
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                fontWeight: 600
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TrainingFormPage;
