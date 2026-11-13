import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui';
import { TrendingUp, Calendar, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { getAttendanceHistory, getTodayAttendance } from '@/features/ess/api/ess.service';
import '@/shared/styles/CrudPage.css';

const AttendanceOverviewPage = () => {
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    attendanceRate: 0,
    totalWorkingDays: 0,
    workHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const toRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  const extractArrayPayload = (raw: unknown): Record<string, unknown>[] => {
    const root = toRecord(raw);
    const payload = root.data ?? raw;
    if (Array.isArray(payload)) {
      return payload.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }
    const payloadRecord = toRecord(payload);
    const candidates = [payloadRecord.items, payloadRecord.rows, payloadRecord.data, payloadRecord.results];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
      }
    }
    return [];
  };

  const getStringValue = (record: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    }
    return '';
  };

  const getNumericValue = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  };

  const parseTimeToMinutes = (value: unknown) => {
    if (typeof value !== 'string') return null;
    const timeMatch = value.match(/(\d{2}):(\d{2})/);
    if (!timeMatch) return null;
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  };

  const isPresentRecord = (record: Record<string, unknown>) => {
    const status = getStringValue(record, ['status', 'attendance_status', 'state']).toLowerCase();
    if (status.includes('present') || status.includes('hadir') || status.includes('approved')) return true;
    if (status.includes('absent') || status.includes('tidak')) return false;
    return Boolean(getStringValue(record, ['check_in', 'checkIn', 'date', 'attendance_date']).trim());
  };

  const isLateRecord = (record: Record<string, unknown>) => {
    const status = getStringValue(record, ['status', 'attendance_status', 'state']).toLowerCase();
    if (status.includes('late') || status.includes('terlambat')) return true;
    const lateValue = getNumericValue(record.late_minutes) ?? getNumericValue(record.late_minute);
    if (lateValue !== null) return lateValue > 0;
    const checkInMinutes = parseTimeToMinutes(record.check_in ?? record.checkIn);
    if (checkInMinutes === null) return false;
    return checkInMinutes > (8 * 60 + 5);
  };

  const calcWorkMinutes = (record: Record<string, unknown>) => {
    const explicitMinutes = getNumericValue(record.work_minutes) ?? getNumericValue(record.workHours) ?? getNumericValue(record.work_hours) ?? getNumericValue(record.total_minutes);
    if (explicitMinutes !== null) return explicitMinutes;
    const checkInMinutes = parseTimeToMinutes(record.check_in ?? record.checkIn);
    const checkOutMinutes = parseTimeToMinutes(record.check_out ?? record.checkOut);
    if (checkInMinutes === null || checkOutMinutes === null || checkOutMinutes < checkInMinutes) return 0;
    return checkOutMinutes - checkInMinutes;
  };

  const loadAttendanceOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const [historyResult, todayResult] = await Promise.all([getAttendanceHistory(), getTodayAttendance()]);
      const history = extractArrayPayload(historyResult.raw ?? historyResult.items);
      const todayPayload = toRecord(todayResult.raw ?? todayResult.payload);
      const todayRecord = todayPayload.data && typeof todayPayload.data === 'object' ? toRecord(todayPayload.data) : todayPayload;
      const present = history.filter((record) => isPresentRecord(record)).length;
      const absent = history.filter((record) => {
        const status = getStringValue(record, ['status', 'attendance_status', 'state']).toLowerCase();
        return status.includes('absent') || status.includes('tidak');
      }).length;
      const late = history.filter((record) => isLateRecord(record)).length;
      const workMinutes = history.reduce((total, record) => total + calcWorkMinutes(record), 0);
      const todayAttendanceRate = getNumericValue(todayRecord.attendance_rate ?? todayRecord.rate ?? todayRecord.present_rate) ?? 0;
      const totalWorkingDays = history.length || getNumericValue(todayRecord.total_working_days) || getNumericValue(todayRecord.totalWorkingDays) || 0;
      setAttendanceStats({
        present,
        absent,
        late,
        attendanceRate: todayAttendanceRate || (totalWorkingDays > 0 ? Math.round((present / totalWorkingDays) * 100) : 0),
        totalWorkingDays,
        workHours: Math.round(workMinutes / 60),
      });
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Gagal memuat data attendance';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAttendanceOverview();
  }, []);

  const summaryCards = [
    { label: 'Tingkat Kehadiran', subtitle: 'Persentase kehadiran bulan ini', value: `${attendanceStats.attendanceRate}%`, tone: 'blue', icon: TrendingUp, change: 'Rate kehadiran aktif' },
    { label: 'Hari Hadir', subtitle: 'Total hari kehadiran', value: `${attendanceStats.present}/${attendanceStats.totalWorkingDays}`, tone: 'green', icon: Calendar, change: 'Dari total hari kerja' },
    { label: 'Hari Tidak Hadir', subtitle: 'Total hari tidak hadir', value: String(attendanceStats.absent), tone: 'red', icon: AlertCircle, change: 'Perlu perhatian lanjut' },
    { label: 'Keterlambatan', subtitle: 'Total hari terlambat', value: String(attendanceStats.late), tone: 'orange', icon: Clock, change: 'Check-in lewat jadwal' },
    { label: 'Total Jam Kerja', subtitle: 'Jam kerja bulan ini', value: `${attendanceStats.workHours}h`, tone: 'purple', icon: Clock, change: 'Akumulasi bulan ini' },
  ];

  return (
    <div className="crud-page">
      {/* Header */}
      <PageHeader
        title="Attendance Dashboard"
        subtitle="Overview of attendance statistics and daily logs."
        badge={{ icon: Calendar, label: 'Attendance Center' }}
        scope
        style={{ marginBottom: 'var(--space-6)' }}
        actions={
          <Button variant="outline" size="md" onClick={() => void loadAttendanceOverview()} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="page-alert page-alert--error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="summary-card" glass>
              <div className="summary-card__header">
                <div>
                  <span className="summary-card__label">{card.label}</span>
                  <p className="summary-card__subtitle">{card.subtitle}</p>
                </div>
                <span className={`summary-card__icon summary-card__icon--${card.tone}`}>
                  <Icon size={20} />
                </span>
              </div>
              <div className={`summary-card__value summary-card__value--${card.tone}`}>
                {loading ? '...' : card.value}
              </div>
              <div className="summary-card__change">{card.change}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AttendanceOverviewPage;
