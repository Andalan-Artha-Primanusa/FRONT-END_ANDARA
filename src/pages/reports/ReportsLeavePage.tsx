import React, { useState, useEffect, useMemo } from 'react';
import { CalendarDays, CheckCircle, XCircle, Clock, Users, TrendingUp, RefreshCw, PieChart as PieIcon, ClipboardList } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';
import { api } from '@/shared/api/httpClient';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/payroll/PayrollShared.css';
import './ReportsDashboardPage.css';

type Rec = Record<string, unknown>;
const toRec = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {});
const extractArr = (raw: unknown): Rec[] => {
  const payload = (() => { const r = toRec(raw); return r.data ?? raw; })(  );
  if (Array.isArray(payload)) return payload.filter((i): i is Rec => !!i && typeof i === 'object');
  const r = toRec(payload);
  for (const k of ['items','rows','data','results']) { const c = r[k]; if (Array.isArray(c)) return c.filter((i): i is Rec => !!i && typeof i === 'object'); }
  return [];
};
const getStr = (rec: Rec, keys: string[]) => { for (const k of keys) { const v = rec[k]; if (typeof v === 'string' && v.trim()) return v.trim(); } return ''; };
const getNum = (v: unknown) => { if (typeof v === 'number' && Number.isFinite(v)) return v; if (typeof v === 'string') { const p = Number(v); if (Number.isFinite(p)) return p; } return 0; };

const TT = { contentStyle: { backgroundColor:'#fff', border:'1px solid var(--color-primary-light)', borderRadius:'8px' }, labelStyle: { color:'var(--color-primary-dark)', fontWeight:'bold' as const } };
// const COLORS = ['var(--color-primary)','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

const mkMonth = (raw: string) => { const d = new Date(raw); if (Number.isNaN(d.getTime())) return null; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const fmtMonth = (k: string) => { const [y,m] = k.split('-'); return new Date(Number(y),Number(m)-1,1).toLocaleDateString('id-ID',{month:'short',year:'numeric'}); };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _MetricCard: React.FC<{ label: string; sub: string; value: string; tone: string; icon: React.ElementType }> = ({ label, sub, value, tone, icon: Icon }) => (
  <Card className="report-metric-card" glass>
    <div className="report-metric-header">
      <div><span className="report-metric-label">{label}</span><p className="report-metric-sublabel">{sub}</p></div>
      <span className={`report-metric-icon report-metric-icon--${tone}`}><Icon size={20} /></span>
    </div>
    <div className="report-metric-value">{value}</div>
    <div className="report-metric-change neutral">Live data</div>
  </Card>
);

const ReportsLeavePage: React.FC = () => {
  const [records, setRecords] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => { setLoading(true); setError(null); try { setRecords(extractArr((await api.get('/leaves')).data)); } catch(e){ setError(e instanceof Error ? e.message : 'Error'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);

  const pending  = useMemo(() => records.filter(r => getStr(r,['status']).toLowerCase()==='pending').length, [records]);
  const approved = useMemo(() => records.filter(r => ['approved','accepted'].includes(getStr(r,['status']).toLowerCase())).length, [records]);
  const rejected = useMemo(() => records.filter(r => ['rejected','declined'].includes(getStr(r,['status']).toLowerCase())).length, [records]);
  const _totalDays = useMemo(() => records.reduce((s,r)=>s+getNum(r.total_days??r.days),0), [records]);
  const _uniqueEmps = useMemo(() => new Set(records.map(r=>getStr(r,['employee_id','user_id']))).size, [records]);

  const leaveTypeData = useMemo(() => { const m = new Map<string,number>(); records.forEach(r=>{ const t=getStr(r,['type','leave_type','leaveType'])||'Unknown'; m.set(t,(m.get(t)||0)+1); }); return [...m].map(([name,value])=>({name,value})); }, [records]);
  const statusData = useMemo(() => [{name:'Pending',value:pending},{name:'Approved',value:approved},{name:'Rejected',value:rejected}].filter(d=>d.value>0), [pending,approved,rejected]);
  const monthlyTrend = useMemo(() => {
    const m = new Map<string,{pending:number;approved:number;rejected:number}>();
    records.forEach(r => { const raw = getStr(r,['start_date','created_at']); if(!raw) return; const k = mkMonth(raw); if(!k) return; const cur=m.get(k)||{pending:0,approved:0,rejected:0}; const s=getStr(r,['status']).toLowerCase(); if(s==='pending') cur.pending++; else if(s==='approved'||s==='accepted') cur.approved++; else if(s==='rejected'||s==='declined') cur.rejected++; m.set(k,cur); });
    return [...m.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>({month:fmtMonth(k),...v}));
  }, [records]);
  const daysByType = useMemo(() => { const m = new Map<string,number>(); records.forEach(r=>{ const t=getStr(r,['type','leave_type','leaveType'])||'Unknown'; m.set(t,(m.get(t)||0)+getNum(r.total_days??r.days)); }); return [...m].map(([name,value])=>({name,value})); }, [records]);

  return (
    <div className="reports-dashboard">
      <PageHeader
        title="Laporan Cuti"
        subtitle="Analisis pengajuan cuti, status persetujuan, dan distribusi jenis cuti karyawan."
        badge={{ icon: ClipboardList, label: "Laporan & Analitik" }}
        actions={
          <button className="btn-outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Segarkan
          </button>
        }
      />

      {error && <p className="reports-error">{error}</p>}

      <div className="leave-requests-wrapper">
        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Total Pengajuan</p>
              <p className="leave-summary-subtitle">Semua records</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-blue">
              <CalendarDays size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-blue">{records.length}</div>
          <p className="leave-summary-trend">Total Cuti</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Disetujui</p>
              <p className="leave-summary-subtitle">Cuti disetujui</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-green">
              <CheckCircle size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-green">{approved}</div>
          <p className="leave-summary-trend">Cuti Disetujui</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Menunggu</p>
              <p className="leave-summary-subtitle">Menunggu persetujuan</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-orange">
              <Clock size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-orange">{pending}</div>
          <p className="leave-summary-trend">Menunggu</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Ditolak</p>
              <p className="leave-summary-subtitle">Cuti ditolak</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-red">
              <XCircle size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-red">{rejected}</div>
          <p className="leave-summary-trend">Cuti Ditolak</p>
        </div>
      </div>

      <div className="reports-charts-section">
        <div className="reports-charts-grid">
          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><TrendingUp size={16}/> Tren Pengajuan Cuti Bulanan</h2>
            <p className="reports-chart-subtitle">Jumlah pengajuan per bulan berdasarkan status</p>
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyTrend} margin={{top:10,right:30,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)"/>
                  <XAxis dataKey="month" stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/><YAxis stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/>
                  <Tooltip {...TT}/><Legend wrapperStyle={{paddingTop:'20px'}}/>
                  <Area type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gA)" name="Approved"/>
                  <Area type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#gP)" name="Pending"/>
                  <Area type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#gR)" name="Rejected"/>
                </AreaChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">{loading?'Memuat...':'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>

          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><PieIcon size={16}/> Status Cuti</h2>
            <p className="reports-chart-subtitle">Proporsi approved, pending, dan rejected</p>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip {...TT}/><Legend wrapperStyle={{paddingTop:'20px'}}/>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({name,value})=>`${name}: ${value}`}>
                    {statusData.map((_,i)=><Cell key={i} fill={['#f59e0b','#10b981','#ef4444'][i%3]}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">{loading?'Memuat...':'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>

          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><CalendarDays size={16}/> Distribusi Jenis Cuti</h2>
            <p className="reports-chart-subtitle">Jumlah pengajuan per jenis cuti</p>
            {leaveTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={leaveTypeData} margin={{top:10,right:30,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)"/>
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/><YAxis stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/>
                  <Tooltip {...TT} cursor={{fill:'rgba(10, 122, 62,0.1)'}}/>
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[8,8,0,0]} name="Jumlah"/>
                </BarChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">{loading?'Memuat...':'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>

          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><TrendingUp size={16}/> Total Hari per Jenis Cuti</h2>
            <p className="reports-chart-subtitle">Kumulatif hari cuti per tipe</p>
            {daysByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={daysByType} margin={{top:10,right:30,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)"/>
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/><YAxis stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/>
                  <Tooltip {...TT} cursor={{fill:'rgba(10, 122, 62,0.1)'}}/>
                  <Bar dataKey="value" fill="#8b5cf6" radius={[8,8,0,0]} name="Hari"/>
                </BarChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">{loading?'Memuat...':'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportsLeavePage;
