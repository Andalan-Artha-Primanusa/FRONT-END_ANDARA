import React, { useState, useEffect, useMemo } from 'react';
import { Briefcase, CheckCircle, Clock, Users, TrendingUp, RefreshCw, BarChart3, PieChart as PieIcon, Package } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
const getNum = (v: unknown) => { if (typeof v === 'number' && Number.isFinite(v)) return v; if (typeof v === 'string') { const p = Number(v); if (Number.isFinite(p)) return p; } return 0; };

const TT = { contentStyle: { backgroundColor:'#fff', border:'1px solid var(--color-primary-light)', borderRadius:'8px' }, labelStyle: { color:'var(--color-primary-dark)', fontWeight:'bold' as const } };
const COLORS = ['var(--color-primary)','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _MetricCard: React.FC<{label:string;sub:string;value:string;tone:string;icon:React.ElementType}> = ({label,sub,value,tone,icon:Icon}) => (
  <Card className="report-metric-card" glass>
    <div className="report-metric-header">
      <div><span className="report-metric-label">{label}</span><p className="report-metric-sublabel">{sub}</p></div>
      <span className={`report-metric-icon report-metric-icon--${tone}`}><Icon size={20}/></span>
    </div>
    <div className="report-metric-value">{value}</div>
    <div className="report-metric-change neutral">Live data</div>
  </Card>
);

const ReportsAssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<Rec[]>([]);
  const [assignments, setAssignments] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [aRes, assRes] = await Promise.allSettled([api.get('/assets'), api.get('/assets/assignments')]);
      setAssets(aRes.status === 'fulfilled' ? extractArr(aRes.value.data) : []);
      setAssignments(assRes.status === 'fulfilled' ? extractArr(assRes.value.data) : []);
    } catch(e){ setError(e instanceof Error ? e.message : 'Error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const active    = useMemo(() => assets.filter(a => ['active','available'].includes(getStr(a,['status']).toLowerCase())).length, [assets]);
  const assigned  = useMemo(() => assets.filter(a => getStr(a,['status']).toLowerCase() === 'assigned').length, [assets]);
  const maintenance = useMemo(() => assets.filter(a => ['maintenance','repair'].includes(getStr(a,['status']).toLowerCase())).length, [assets]);
  const _totalValue = useMemo(() => assets.reduce((s,a) => s + getNum(a.cost ?? a.value ?? a.purchase_cost), 0), [assets]);
  const _uniqueAssignees = useMemo(() => new Set(assignments.map(a => getStr(a,['employee_id','user_id']))).size, [assignments]);

  const categoryData = useMemo(() => {
    const m = new Map<string,number>();
    assets.forEach(a => { const c = getStr(a,['category','asset_category']) || 'Lainnya'; m.set(c,(m.get(c)||0)+1); });
    return [...m].map(([name,value]) => ({name,value}));
  }, [assets]);

  const statusData = useMemo(() => {
    const m = new Map<string,number>();
    assets.forEach(a => { const s = getStr(a,['status']) || 'Unknown'; m.set(s,(m.get(s)||0)+1); });
    return [...m].map(([name,value]) => ({name: name.charAt(0).toUpperCase()+name.slice(1),value}));
  }, [assets]);

  const valueByCategory = useMemo(() => {
    const m = new Map<string,number>();
    assets.forEach(a => { const c = getStr(a,['category','asset_category']) || 'Lainnya'; m.set(c,(m.get(c)||0)+getNum(a.cost??a.value??a.purchase_cost)); });
    return [...m].map(([name,value]) => ({name,value}));
  }, [assets]);

  const assignmentByDept = useMemo(() => {
    const m = new Map<string,number>();
    assignments.forEach(a => { const d = getStr(a,['department','department_name']) || 'Unassigned'; m.set(d,(m.get(d)||0)+1); });
    return [...m].map(([name,value]) => ({name,value}));
  }, [assignments]);

  const fmtRp = (n: number) => `Rp ${(n || 0).toLocaleString("id-ID")}`;

  return (
    <div className="reports-dashboard">
      <PageHeader
        title="Laporan Aset"
        subtitle="Analisis inventaris aset perusahaan, status, kategori, dan penugasan ke karyawan."
        badge={{ icon: Package, label: "Laporan & Analitik" }}
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
              <p className="leave-summary-label">Total Aset</p>
              <p className="leave-summary-subtitle">Semua inventaris</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-blue">
              <Briefcase size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-blue">{assets.length}</div>
          <p className="leave-summary-trend">Total Aset</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Tersedia / Aktif</p>
              <p className="leave-summary-subtitle">Aset aktif</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-green">
              <CheckCircle size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-green">{active}</div>
          <p className="leave-summary-trend">Aset Aktif</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Ditugaskan</p>
              <p className="leave-summary-subtitle">Aset pada karyawan</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-orange">
              <Users size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-orange">{assigned}</div>
          <p className="leave-summary-trend">Aset Ditugaskan</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Maintenance</p>
              <p className="leave-summary-subtitle">Dalam perbaikan</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-red">
              <Clock size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-red">{maintenance}</div>
          <p className="leave-summary-trend">Aset Maintenance</p>
        </div>
      </div>

      <div className="reports-charts-section">
        <div className="reports-charts-grid">
          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><BarChart3 size={16}/> Aset per Kategori</h2>
            <p className="reports-chart-subtitle">Distribusi jumlah aset berdasarkan kategori</p>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryData} margin={{top:10,right:30,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)"/>
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/><YAxis stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/>
                  <Tooltip {...TT} cursor={{fill:'rgba(10, 122, 62,0.1)'}}/>
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[8,8,0,0]} name="Jumlah Aset"/>
                </BarChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">{loading?'Memuat...':'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>

          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><PieIcon size={16}/> Status Aset</h2>
            <p className="reports-chart-subtitle">Proporsi status dari seluruh inventaris</p>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip {...TT}/><Legend wrapperStyle={{paddingTop:'20px'}}/>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({name,value})=>`${name}: ${value}`}>
                    {statusData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">{loading?'Memuat...':'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>

          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><TrendingUp size={16}/> Nilai Aset per Kategori</h2>
            <p className="reports-chart-subtitle">Total estimasi nilai aset berdasarkan kategori</p>
            {valueByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={valueByCategory} margin={{top:10,right:30,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)"/>
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/><YAxis stroke="var(--color-primary-dark)" style={{fontSize:'12px'}} tickFormatter={(v:number)=>Intl.NumberFormat('id-ID',{notation:'compact'}).format(v)}/>
                  <Tooltip {...TT} formatter={(v:any)=>fmtRp(Number(v))} cursor={{fill:'rgba(10, 122, 62,0.1)'}}/>
                  <Bar dataKey="value" fill="#8b5cf6" radius={[8,8,0,0]} name="Nilai (Rp)"/>
                </BarChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">{loading?'Memuat...':'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>

          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><Users size={16}/> Penugasan Aset per Departemen</h2>
            <p className="reports-chart-subtitle">Jumlah aset yang ditugaskan per departemen</p>
            {assignmentByDept.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={assignmentByDept} margin={{top:10,right:30,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)"/>
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/><YAxis stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/>
                  <Tooltip {...TT} cursor={{fill:'rgba(10, 122, 62,0.1)'}}/>
                  <Bar dataKey="value" fill="#06b6d4" radius={[8,8,0,0]} name="Jumlah Penugasan"/>
                </BarChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">{loading?'Memuat...':'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportsAssetsPage;
