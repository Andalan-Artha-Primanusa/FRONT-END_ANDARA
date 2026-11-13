import React from 'react';
import { BarChart3, Clock3, CircleCheckBig, CircleX } from 'lucide-react';

interface LeaveSummaryProps {
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

const StatCard: React.FC<{ label: string; value: number | string; sub: string; tone: string; icon: any }> = ({ label, value, sub, tone, icon: Icon }) => (
  <div className="leave-summary-card">
    <div className="leave-summary-header">
      <div>
        <p className="leave-summary-label">{label}</p>
        <p className="leave-summary-subtitle">{sub}</p>
      </div>
      <div className={`leave-summary-icon-wrapper leave-icon-${tone}`}>
        <Icon size={28} />
      </div>
    </div>
    <div className={`leave-summary-value leave-value-${tone}`}>{value}</div>
    <p className="leave-summary-trend">Data periode ini</p>
  </div>
);

export const LeaveSummary: React.FC<LeaveSummaryProps> = ({ stats }) => {
  return (
    <div className="leave-requests-wrapper">
      <StatCard label="Total Pengajuan" value={stats.total} sub="Request cuti terdaftar" tone="blue" icon={BarChart3} />
      <StatCard label="Menunggu" value={stats.pending} sub="Perlu ditinjau" tone="orange" icon={Clock3} />
      <StatCard label="Disetujui" value={stats.approved} sub="Status final" tone="green" icon={CircleCheckBig} />
      <StatCard label="Ditolak" value={stats.rejected} sub="Tidak disetujui" tone="red" icon={CircleX} />
    </div>
  );
};