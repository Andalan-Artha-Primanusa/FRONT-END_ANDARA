import React, { useState, useEffect, useMemo } from 'react';
import { Users, UserCheck, UserMinus, UserPlus, Briefcase, RefreshCw, BarChart3, PieChart as PieIcon, TrendingUp, UserCircle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';
import { api } from '@/shared/api/httpClient';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/payroll/PayrollShared.css';
import './ReportsDashboardPage.css';

type Rec = Record<string, unknown>;
const toRec = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {});
const extractArr = (raw: unknown): Rec[] => {
  const payload = (() => { const r = toRec(raw); return r.data ?? raw; })();
  if (Array.isArray(payload)) return payload.filter((i): i is Rec => !!i && typeof i === 'object');
  const r = toRec(payload);
  for (const k of ['items','rows','data','results']) { const c = r[k]; if (Array.isArray(c)) return c.filter((i): i is Rec => !!i && typeof i === 'object'); }
  return [];
};
const getStr = (rec: Rec, keys: string[]) => { for (const k of keys) { const v = rec[k]; if (typeof v === 'string' && v.trim()) return v.trim(); } return ''; };

const TT = { contentStyle: { backgroundColor:'#fff', border:'1px solid var(--color-primary-light)', borderRadius:'8px' }, labelStyle: { color:'var(--color-primary-dark)', fontWeight:'bold' as const } };
const COLORS = ['var(--color-primary)','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#f97316'];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _MetricCard: React.FC<{label:string;sub:string;value:string;tone:string;icon:React.ElementType}> = ({label,sub,value,tone,icon:Icon}) => (
  <Card className="report-metric-card" glass>
    <div className="report-metric-header">
      <div><span className="report-metric-label">{label}</span><p className="report-metric-sublabel">{sub}</p></div>
      <span className={`report-metric-icon report-metric-icon--${tone}`}><Icon size={20}/></span>
    </div>
    <div className="report-metric-value">{value}</div>
    <div className="report-metric-change neutral">Data Karyawan</div>
  </Card>
);

const ReportsEmployeePage: React.FC = () => {
  const [employees, setEmployees] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/employees');
      setEmployees(extractArr(res.data));
    } catch(e){ setError(e instanceof Error ? e.message : 'Error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const total = employees.length;
  const active = useMemo(() => employees.filter(e => String(e.status).toLowerCase() === 'active').length, [employees]);
  const probation = useMemo(() => employees.filter(e => String(e.status).toLowerCase() === 'pending' || String(e.status).toLowerCase() === 'probation').length, [employees]);
  const inactive = useMemo(() => employees.filter(e => String(e.status).toLowerCase() === 'inactive' || String(e.status).toLowerCase() === 'resigned').length, [employees]);

  // Chart: Headcount by Department
  const deptData = useMemo(() => {
    const m = new Map<string,number>();
    employees.forEach(e => { const d = getStr(e,['department']) || 'Unassigned'; m.set(d,(m.get(d)||0)+1); });
    return [...m].map(([name,value]) => ({name,value})).sort((a,b)=>b.value-a.value);
  }, [employees]);

  // Chart: Gender Distribution
  const genderData = useMemo(() => {
    const m = new Map<string,number>();
    employees.forEach(e => { 
        const g = (getStr(e,['gender']) || 'Unknown').toLowerCase();
        const label = g === 'male' || g === 'laki-laki' ? 'Laki-laki' : (g === 'female' || g === 'perempuan' ? 'Perempuan' : 'Lainnya');
        m.set(label,(m.get(label)||0)+1); 
    });
    return [...m].map(([name,value]) => ({name,value}));
  }, [employees]);

  // Chart: Employment Status Distribution
  const statusData = useMemo(() => {
    const m = new Map<string,number>();
    employees.forEach(e => { 
        const s = getStr(e,['employment_status','status']) || 'Kontrak';
        m.set(s,(m.get(s)||0)+1); 
    });
    return [...m].map(([name,value]) => ({name,value}));
  }, [employees]);

  // Chart: Join Date Trends (Monthly)
  const growthData = useMemo(() => {
    const m = new Map<string,number>();
    employees.forEach(e => {
      const d = getStr(e,['hire_date','join_date']);
      if(d) {
        const month = d.substring(0,7); // YYYY-MM
        m.set(month,(m.get(month)||0)+1);
      }
    });
    return [...m].map(([name,value]) => ({name,value})).sort((a,b)=>a.name.localeCompare(b.name));
  }, [employees]);

  return (
    <div className="reports-dashboard">
      <PageHeader
        title="Laporan SDM (Human Capital)"
        subtitle="Analisis demografi karyawan, distribusi departemen, pertumbuhan headcount, dan status kepegawaian."
        badge={{ icon: UserCircle, label: "Laporan & Analitik" }}
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
              <p className="leave-summary-label">Total Karyawan</p>
              <p className="leave-summary-subtitle">Semua database</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-blue">
              <Users size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-blue">{total}</div>
          <p className="leave-summary-trend">Total Karyawan</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Karyawan Aktif</p>
              <p className="leave-summary-subtitle">Status bekerja</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-green">
              <UserCheck size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-green">{active}</div>
          <p className="leave-summary-trend">Karyawan Aktif</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Masa Percobaan</p>
              <p className="leave-summary-subtitle">Probation/Pending</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-orange">
              <UserPlus size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-orange">{probation}</div>
          <p className="leave-summary-trend">Masa Percobaan</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Resigned / Non-Aktif</p>
              <p className="leave-summary-subtitle">Riwayat keluar</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-red">
              <UserMinus size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-red">{inactive}</div>
          <p className="leave-summary-trend">Non-Aktif</p>
        </div>
      </div>

      <div className="reports-charts-section">
        <div className="reports-charts-grid">
          {/* Headcount by Dept */}
          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><BarChart3 size={16}/> Karyawan per Departemen</h2>
            <p className="reports-chart-subtitle">Distribusi jumlah karyawan berdasarkan unit kerja</p>
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptData} layout="vertical" margin={{top:10,right:30,left:40,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)" horizontal={false}/>
                  <XAxis type="number" stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/>
                  <YAxis dataKey="name" type="category" stroke="var(--color-primary-dark)" style={{fontSize:'12px'}} width={100}/>
                  <Tooltip {...TT} cursor={{fill:'rgba(10, 122, 62,0.1)'}}/>
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[0,8,8,0]} name="Headcount"/>
                </BarChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>)}
          </Card>

          {/* Gender Distribution */}
          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><PieIcon size={16}/> Diversitas Gender</h2>
            <p className="reports-chart-subtitle">Proporsi Laki-laki dan Perempuan</p>
            {genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip {...TT}/><Legend verticalAlign="bottom" height={36}/>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({name,value})=>`${name}: ${value}`}>
                    {genderData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>)}
          </Card>

          {/* Employment Status */}
          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><BarChart3 size={16}/> Status Kepegawaian</h2>
            <p className="reports-chart-subtitle">Distribusi Karyawan Tetap, Kontrak, dll</p>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusData} margin={{top:10,right:30,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)"/>
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/><YAxis stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/>
                  <Tooltip {...TT} cursor={{fill:'rgba(10, 122, 62,0.1)'}}/>
                  <Bar dataKey="value" fill="#10b981" radius={[8,8,0,0]} name="Jumlah"/>
                </BarChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>)}
          </Card>

          {/* Hire Trends */}
          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><TrendingUp size={16}/> Tren Rekrutmen</h2>
            <p className="reports-chart-subtitle">Jumlah karyawan bergabung per bulan</p>
            {growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={growthData} margin={{top:10,right:30,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)"/>
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/><YAxis stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/>
                  <Tooltip {...TT}/>
                  <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="rgba(139,92,246,0.2)" strokeWidth={3} name="Karyawan Baru"/>
                </AreaChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">Belum ada data untuk company aktif ini.</div>)}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportsEmployeePage;
