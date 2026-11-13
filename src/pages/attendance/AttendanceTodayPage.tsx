import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui';
import { showToast } from '@/shared/ui/toast';
import { api } from '@/shared/api/httpClient';
import { Clock } from 'lucide-react';
import './AttendancePages.css';

const AttendanceTodayPage = () => {
  const [today, setToday] = useState<Record<string, any> | null>(null);
  const [status, setStatus] = useState('Memuat data hari ini...');
  const [loading, setLoading] = useState(false);


  const loadToday = async () => {
    setLoading(true);
    setStatus('Mengambil data hari ini...');
    try {
      const result = await api.get('/attendance/today');
      const payload = result.data?.data ?? result.data;
      if (payload) setToday(payload);
      setStatus('Attendance hari ini berhasil dimuat.');
    } catch (error: any) {
      setStatus('Gagal memuat data hari ini.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadToday();
  }, []);

  return (
    <div className="attendance-page">
      <PageHeader
        title="Attendance Today"
        subtitle="Ringkasan kehadiran hari ini dan waktu kerja saat ini."
        badge={{ icon: Clock, label: 'Today' }}
        actions={
          <div className="attendance-status-card">
            <Clock size={22} />
            <div>
              <p>Status</p>
              <strong>{status}</strong>
            </div>
          </div>
        }
      />

      <Card className="attendance-today-card" glass>
        <div className="attendance-action-row">
          <Button variant="primary" size="sm" onClick={() => void loadToday()} disabled={loading}>
            {loading ? 'Memuat...' : 'Refresh Today'}
          </Button>
        </div>

        {today ? (
          <div className="attendance-today-grid">
            {Object.entries(today).map(([key, value]) => (
              <div key={key} className="attendance-today-item">
                <span className="attendance-key">{key}</span>
                <strong>{String(value)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="attendance-empty">Tidak ada data untuk hari ini.</p>
        )}
      </Card>
    </div>
  );
};

export default AttendanceTodayPage;
