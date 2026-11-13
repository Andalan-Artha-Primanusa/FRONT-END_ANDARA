import React from 'react';
import { Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface AttendanceSummaryProps {
  stats: {
    total: number;
    present: number;
    late: number;
    absent: number;
  };
}

const StatCard: React.FC<{ label: string; value: number | string; sub: string; tone: string; icon: any }> = ({ label, value, sub, tone, icon: Icon }) => (
  <div className="attendance-summary-card">
    <div className="attendance-summary-header">
      <div>
        <p className="attendance-summary-label">{label}</p>
        <p className="attendance-summary-subtitle">{sub}</p>
      </div>
      <div className={`attendance-summary-icon-wrapper attendance-icon-${tone}`}>
        <Icon size={28} />
      </div>
    </div>
    <div className={`attendance-summary-value attendance-value-${tone}`}>{value}</div>
    <p className="attendance-summary-trend">Data saat ini</p>
  </div>
);

export const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({ stats }) => {
  return (
    <div className="attendance-summary-wrapper">
      <StatCard label="Total Karyawan" value={stats.total} sub="Terdaftar di sistem" tone="blue" icon={Users} />
      <StatCard label="Hadir" value={stats.present} sub="Sudah absen masuk" tone="green" icon={CheckCircle} />
      <StatCard label="Terlambat" value={stats.late} sub="Melewati masa toleransi" tone="orange" icon={Clock} />
      <StatCard label="Absen" value={stats.absent} sub="Belum ada catatan" tone="red" icon={AlertTriangle} />
    </div>
  );
};
