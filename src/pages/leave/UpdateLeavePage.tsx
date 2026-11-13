import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { showToast } from '@/shared/ui/toast';
import { getLeaveDetail, updateLeaveRequest } from '@/features/leave/api/leave.service';
import { api } from '@/shared/api/httpClient';
import type { LeaveUpdatePayload } from '@/features/leave/types/leave.types';
import { Calendar, ChevronLeft } from 'lucide-react';
import '../dashboard/overview/OverviewPage.css';
import './LeavePages.css';

const UpdateLeavePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isViewMode = location.pathname.includes('/view/');
  
  const [formData, setFormData] = useState({
    leave_type_id: 0,
    type: 'annual',
    start_date: '',
    end_date: '',
    total_days: 1,
    reason: '',
  });
  const [leaveTypes, setLeaveTypes] = useState<{ id: number; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadDetail = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const [detailResult, typesRes] = await Promise.all([
          getLeaveDetail(id),
          api.get('/leave-types').catch(() => ({ data: { data: [] } })),
        ]);
        if (cancelled) return;
        const payload = detailResult.payload as Record<string, any>;
        const types = typesRes.data?.data ?? [];
        setLeaveTypes(types);

        setFormData({
          leave_type_id: payload.leave_type_id || 0,
          type: payload.type || 'annual',
          start_date: payload.start_date || '',
          end_date: payload.end_date || '',
          total_days: payload.total_days || 1,
          reason: payload.reason || '',
        });
      } catch (err: any) {
        if (cancelled) return;
        const message = err.response?.data?.message || err.message || 'Gagal memuat data cuti';
        showToast(message, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDetail();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (formData.start_date && formData.end_date && !loading) {
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
  }, [formData.start_date, formData.end_date, loading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'total_days' ? (parseInt(value) || 1) : value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.type.trim()) {
      showToast('Tipe leave wajib dipilih', 'error');
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

  const handleUpdateLeave = async () => {
    if (!validateForm() || !id) return;

    setLoading(true);

    try {
      const payload: LeaveUpdatePayload = {
        start_date: formData.start_date,
        end_date: formData.end_date,
        total_days: formData.total_days,
        reason: formData.reason,
      };

      await updateLeaveRequest(id, payload);
      showToast('Data cuti berhasil diperbarui!', 'success');
      setTimeout(() => {
        navigate('/leave/requests');
      }, 1500);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Gagal memperbarui data cuti';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/leave/requests');
  };

  if (loading && !formData.start_date) {
    return (
      <div className="leave-page">
        <PageHeader
          title={`${isViewMode ? 'Lihat' : 'Edit'} Pengajuan Cuti`}
          subtitle="Memuat data cuti..."
          badge={{ icon: Calendar, label: "Leave Center" }}
          actions={
            <button className="btn-outline" onClick={handleCancel} aria-label="Kembali">
              <ChevronLeft size={18} />
              Kembali
            </button>
          }
          style={{ marginBottom: '2rem' }}
        />
      </div>
    );
  }

  return (
    <div className="leave-page">
      <PageHeader
        title={`${isViewMode ? 'Lihat' : 'Edit'} Pengajuan Cuti`}
        subtitle={isViewMode ? 'Informasi detail pengajuan cuti Anda' : 'Perbarui informasi pengajuan cuti Anda'}
        badge={{ icon: Calendar, label: "Leave Center" }}
        actions={
          <button className="btn-outline" onClick={handleCancel} aria-label="Kembali">
            <ChevronLeft size={18} />
            Kembali
          </button>
        }
        style={{ marginBottom: '2rem' }}
      />

      {/* Form Card */}
      <Card className="leave-card" glass>
        <form className="leave-form" onSubmit={(e) => { e.preventDefault(); void handleUpdateLeave(); }}>
          {/* Tipe Cuti */}
          <div className="leave-form-group">
            <label htmlFor="type">
              Tipe Cuti
              <span className="leave-required">*</span>
            </label>
            <input
              id="type"
              className="leave-input"
              value={(() => {
                const matched = leaveTypes.find(lt => lt.id === formData.leave_type_id);
                return matched ? matched.name : (formData.type?.toUpperCase() || '-');
              })()}
              disabled
              style={{ opacity: 0.7 }}
            />
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
                disabled={isViewMode || loading}
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
                disabled={isViewMode || loading}
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
              disabled={isViewMode || loading}
              placeholder="Jelaskan alasan pengajuan cuti Anda..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="leave-actions">
            {!isViewMode && (
              <Button
                variant="primary"
                size="md"
                onClick={handleUpdateLeave}
                disabled={loading}
              >
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            )}
            <Button
              variant="secondary"
              size="md"
              onClick={handleCancel}
              disabled={loading}
            >
              {isViewMode ? 'Kembali' : 'Batal'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default UpdateLeavePage;
