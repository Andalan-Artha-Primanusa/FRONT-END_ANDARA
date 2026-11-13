import React from 'react';
import { Card } from '@/shared/ui/Card';
import { Wallet, Clock, CheckCircle, XCircle, CreditCard } from 'lucide-react';

interface ReimbursementStatsProps {
  stats: {
    total_count: number;
    total_amount: number;
    draft_count: number;
    submitted_count: number;
    approved_count: number;
    paid_count: number;
    rejected_count: number;
    [key: string]: any;
  };
}

export const ReimbursementStats: React.FC<ReimbursementStatsProps> = ({ stats }) => {
  const formatCurrency = (amount: number) => `Rp ${(amount || 0).toLocaleString("id-ID")}`;

  const statCards = [
    { label: 'Total Pengajuan', value: stats.total_count, icon: Wallet, tone: 'blue', sub: formatCurrency(stats.total_amount) },
    { label: 'Menunggu Approval', value: stats.submitted_count, icon: Clock, tone: 'orange', sub: 'Submitted status' },
    { label: 'Disetujui', value: stats.approved_count, icon: CheckCircle, tone: 'green', sub: 'Awaiting payment' },
    { label: 'Dibayarkan', value: stats.paid_count, icon: CreditCard, tone: 'purple', sub: 'Completed' },
    { label: 'Ditolak', value: stats.rejected_count, icon: XCircle, tone: 'red', sub: 'Rejected' },
  ];

  const getToneColors = (tone: string) => {
    switch (tone) {
      case 'blue': return { bg: '#eff6ff', icon: 'var(--color-primary)' };
      case 'orange': return { bg: '#fff7ed', icon: '#f59e0b' };
      case 'green': return { bg: '#f0fdf4', icon: '#10b981' };
      case 'purple': return { bg: '#faf5ff', icon: '#8b5cf6' };
      case 'red': return { bg: '#fef2f2', icon: '#ef4444' };
      default: return { bg: '#f8fafc', icon: '#64748b' };
    }
  };

  return (
    <div className="reimb-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      {statCards.map((stat) => {
        const Icon = stat.icon;
        const colors = getToneColors(stat.tone);
        return (
          <Card key={stat.label} glass style={{ padding: '1.25rem', border: `1px solid ${colors.bg}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>{stat.label}</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{stat.value}</div>
              </div>
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px',
                background: colors.bg,
                color: colors.icon
              }}>
                <Icon size={20} />
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: colors.icon, fontWeight: 500, background: `${colors.icon}10`, padding: '4px 8px', borderRadius: '4px', width: 'fit-content' }}>
              {stat.sub}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
