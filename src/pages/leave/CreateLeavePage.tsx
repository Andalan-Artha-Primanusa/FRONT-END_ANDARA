import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { showToast } from '@/shared/ui/toast';
import { createLeaveRequest } from '@/features/leave/api/leave.service';
import { api } from '@/shared/api/httpClient';
import type { LeaveCreatePayload } from '@/features/leave/types/leave.types';
import { Calendar, ChevronLeft } from 'lucide-react';
import '../dashboard/overview/OverviewPage.css';
import './LeavePages.css';

const CreateLeavePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = location.pathname === '/leave/request' ? '/leave/my-leave' : '/leave/requests';
  const [leaveTypes, setLeaveTypes] = useState<{ id: number; name: string; code: string }[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [formData, setFormData] = useState({
    leave_type_id: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    total_days: 1,
    reason: '',
  });

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const res = await api.get('/leave-types');
        const data = res.data?.data ?? [];
        setLeaveTypes(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, leave_type_id: data[0].id }));
        }
      } catch {
        // fallback to empty
      } finally {
        setTypesLoading(false);
      }
    };
    void fetchLeaveTypes();
  }, []);

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end >= start) {
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setFormData(prev => ({ ...prev, total_days: diffDays }));
      } else {
        setFormData(prev => ({ ...prev, total_days: 1 }));
      }
    }
  }, [formData.start_date, formData.end_date]);

  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'total_days' ? (parseInt(value) || 1) : name === 'leave_type_id' ? Number(value) : value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.leave_type_id) {
      showToast('Tipe cuti wajib dipilih', 'error');
      return false;
    }
    if (!formData.start_date) {
      showToast('Tanggal mulai wajib diisi', 'error');
      return false;
    }
    if (!formData.end_date) {
      showToast('Tanggal selesai wajib diisi', 'error');
      return false;
    }
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      showToast('Tanggal mulai harus sebelum tanggal selesai', 'error');
      return false;
    }
    if (!formData.reason.trim()) {
      showToast('Alasan wajib diisi', 'error');
      return false;
    }
    return true;
  };

  const handleCreateLeave = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload: LeaveCreatePayload = {
        leave_type_id: formData.leave_type_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        total_days: formData.total_days,
        reason: formData.reason,
      };

      await createLeaveRequest(payload);
      showToast('Pengajuan cuti berhasil dibuat!', 'success');
      setTimeout(() => {
        navigate(returnPath);
      }, 1500);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Gagal membuat pengajuan cuti';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(returnPath);
  };

  return (
    <div className="leave-page">
      <PageHeader
        title="Buat Pengajuan Cuti"
        subtitle="Ajukan pengajuan cuti baru dengan informasi yang lengkap"
        badge={{ icon: Calendar, label: "Leave Center" }}
        actions={
          <button className="btn-outline" onClick={handleCancel} disabled={loading}>
            <ChevronLeft size={18} />
            Kembali
          </button>
        }
        style={{ marginBottom: '2rem' }}
      />

      {/* Form Card */}
      <Card className="leave-card" glass>
        <form className="leave-form" onSubmit={(e) => { e.preventDefault(); void handleCreateLeave(); }}>
          {/* Tipe Cuti */}
          <div className="leave-form-group">
            <label htmlFor="leave_type_id">
              Tipe Cuti
              <span className="leave-required">*</span>
            </label>
            <select
              id="leave_type_id"
              name="leave_type_id"
              className="leave-input"
              value={formData.leave_type_id}
              onChange={handleInputChange}
              disabled={loading || typesLoading}
            >
              {typesLoading ? (
                <option value="0">Memuat...</option>
              ) : (
                leaveTypes.map(lt => (
                  <option key={lt.id} value={lt.id}>{lt.name}</option>
                ))
              )}
            </select>
          </div>

          {/* Dates */}
          <div className="leave-form-row">
            <div className="leave-form-group">
              <label htmlFor="start_date">
                Tanggal Mulai
                <span className="leave-required">*</span>
              </label>
              <input
                id="start_date"
                type="date"
                name="start_date"
                className="leave-input"
                value={formData.start_date}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div className="leave-form-group">
              <label htmlFor="end_date">
                Tanggal Selesai
                <span className="leave-required">*</span>
              </label>
              <input
                id="end_date"
                type="date"
                name="end_date"
                className="leave-input"
                value={formData.end_date}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
          </div>

          {/* Total Days */}
          <div className="leave-form-group">
            <label htmlFor="total_days">
              Total Hari (Otomatis)
            </label>
            <input
              id="total_days"
              type="number"
              name="total_days"
              className="leave-input"
              value={formData.total_days}
              readOnly
              disabled
              style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
            />
          </div>

          {/* Reason */}
          <div className="leave-form-group leave-form-full">
            <label htmlFor="reason">
              Alasan Cuti
              <span className="leave-required">*</span>
            </label>
            <textarea
              id="reason"
              name="reason"
              className="leave-input leave-textarea"
              value={formData.reason}
              onChange={handleInputChange}
              disabled={loading}
              placeholder="Jelaskan alasan pengajuan cuti Anda..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="leave-actions">
            <Button
              variant="primary"
              size="md"
              onClick={handleCreateLeave}
              disabled={loading}
            >
              {loading ? 'Membuat...' : 'Buat Pengajuan'}
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={handleCancel}
              disabled={loading}
            >
              Batal
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateLeavePage;
