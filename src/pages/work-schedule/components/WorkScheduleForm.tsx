import React from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Clock, Tag, Timer } from "lucide-react";
import "./WorkScheduleForm.css";

export interface WorkScheduleFormState {
  name: string;
  check_in_time: string;
  check_out_time: string;
  grace_period: string | number;
}

interface WorkScheduleFormProps {
  formData: WorkScheduleFormState;
  setFormData: React.Dispatch<React.SetStateAction<WorkScheduleFormState>>;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
  isUpdate?: boolean;
}

const WorkScheduleForm: React.FC<WorkScheduleFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  loading,
  isUpdate,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Card glass style={{ padding: '2.5rem', borderRadius: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <h3 style={{ margin: '0 0 2rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
           <Clock size={24} color="var(--color-primary)" /> Konfigurasi Jadwal
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Nama Jadwal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={16} /> Nama Jadwal <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Contoh: Shift Pagi"
              required
              disabled={loading}
              style={{ width: '100%', padding: '0 16px', height: '50px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', color: '#0f172a', transition: 'all 0.2s', boxSizing: 'border-box' }}
            />
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Gunakan nama yang mudah dikenali</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Jam Masuk */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} /> Jam Masuk <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="time"
                name="check_in_time"
                value={formData.check_in_time}
                onChange={handleChange}
                required
                disabled={loading}
                style={{ width: '100%', padding: '0 16px', height: '50px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', color: '#0f172a', transition: 'all 0.2s', boxSizing: 'border-box' }}
              />
            </div>

            {/* Jam Pulang */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} /> Jam Pulang <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="time"
                name="check_out_time"
                value={formData.check_out_time}
                onChange={handleChange}
                required
                disabled={loading}
                style={{ width: '100%', padding: '0 16px', height: '50px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', color: '#0f172a', transition: 'all 0.2s', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Grace Period */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Timer size={16} /> Grace Period (Menit) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                name="grace_period"
                value={formData.grace_period}
                onChange={handleChange}
                placeholder="Contoh: 10"
                min="0"
                required
                disabled={loading}
                style={{ flex: 1, padding: '0 16px', height: '50px', borderRadius: '12px 0 0 12px', border: '1px solid #cbd5e1', borderRight: 'none', background: '#fff', fontSize: '1rem', color: '#0f172a', transition: 'all 0.2s', boxSizing: 'border-box' }}
              />
              <div style={{ height: '50px', display: 'flex', alignItems: 'center', padding: '0 20px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '0 12px 12px 0', fontSize: '0.9rem', fontWeight: 600, color: '#475569', boxSizing: 'border-box' }}>
                Menit
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Toleransi keterlambatan dalam hitungan menit</p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              style={{ flex: 1, height: '60px', borderRadius: '20px', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 10px 20px rgba(10, 122, 62, 0.2)' }}
            >
              {loading ? "Menyimpan..." : isUpdate ? "Simpan Perubahan" : "Buat Jadwal"}
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{ flex: 1, height: '60px', borderRadius: '20px', fontWeight: 700, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
            >
              Batal
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
};

export default WorkScheduleForm;
