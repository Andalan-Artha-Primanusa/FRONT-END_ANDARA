import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, CheckCircle, Users, TrendingUp, RefreshCw, BarChart3, PieChart as PieIcon, DollarSign } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
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
const fmtMonth = (period: string) => { if (!period) return period; const [y,m] = period.split('-'); const d = new Date(Number(y),Number(m)-1,1); return Number.isNaN(d.getTime()) ? period : d.toLocaleDateString('id-ID',{month:'short',year:'numeric'}); };
const fmtRp = (n: number) => `Rp ${(n || 0).toLocaleString("id-ID")}`;

const MetricCard: React.FC<{label:string;sub:string;value:string;tone:string;icon:React.ElementType}> = ({label,sub,value,tone,icon:Icon}) => (
  <Card className="report-metric-card" glass>
    <div className="report-metric-header">
      <div><span className="report-metric-label">{label}</span><p className="report-metric-sublabel">{sub}</p></div>
      <span className={`report-metric-icon report-metric-icon--${tone}`}><Icon size={20}/></span>
    </div>
    <div className="report-metric-value">{value}</div>
    <div className="report-metric-change neutral">Live data</div>
  </Card>
);

const ReportsPayrollPage: React.FC = () => {
  const [records, setRecords] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState("");

  const load = async () => { 
    setLoading(true); 
    setError(null); 
    try { 
      const response = await api.get('/payroll');
      setRecords(extractArr(response.data)); 
    } catch(e){ 
      setError(e instanceof Error ? e.message : 'Error'); 
    } finally { 
      setLoading(false); 
    } 
  };

  useEffect(() => { void load(); }, []);

  const filteredRecords = useMemo(() => {
    if (!filterPeriod) return records;
    return records.filter(r => getStr(r, ['period']).includes(filterPeriod));
  }, [records, filterPeriod]);

  const paid    = useMemo(() => filteredRecords.filter(r=>['paid','approved'].includes(getStr(r,['status']).toLowerCase())).length, [filteredRecords]);
  const totalNet  = useMemo(() => filteredRecords.reduce((s,r)=>s+getNum(r.net_salary??r.total_salary??r.amount),0), [filteredRecords]);
  const uniqueEmps = useMemo(() => new Set(filteredRecords.map(r=>getStr(r,['employee_id','user_id']))).size, [filteredRecords]);

  const statusData = useMemo(() => {
    const m = new Map<string,number>(); filteredRecords.forEach(r=>{ const s=getStr(r,['status'])||'Unknown'; m.set(s,(m.get(s)||0)+1); });
    return [...m].map(([name,value])=>({name:name.charAt(0).toUpperCase()+name.slice(1),value}));
  }, [filteredRecords]);

  const periodTimeline = useMemo(() => {
    const m = new Map<string,{paid:number;pending:number;total:number;net:number}>();
    filteredRecords.forEach(r => {
      const period = getStr(r,['period'])||'Unknown';
      const cur = m.get(period)||{paid:0,pending:0,total:0,net:0};
      const s = getStr(r,['status']).toLowerCase();
      if(s==='paid'||s==='approved') cur.paid++; else cur.pending++;
      cur.total++;
      cur.net += getNum(r.net_salary??r.total_salary??r.amount);
      m.set(period,cur);
    });
    return [...m.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([period,v])=>({month:fmtMonth(period),...v}));
  }, [filteredRecords]);

  const netByPeriod = useMemo(() => periodTimeline.map(p=>({month:p.month,net:p.net})), [periodTimeline]);

  const deptData = useMemo(() => {
    const m = new Map<string,number>(); filteredRecords.forEach(r=>{ const d=getStr(r,['department','department_name'])||'Unassigned'; m.set(d,(m.get(d)||0)+getNum(r.net_salary??r.total_salary??r.amount)); });
    return [...m].map(([name,value])=>({name,value}));
  }, [filteredRecords]);

  const availablePeriods = useMemo(() => {
    return Array.from(new Set(records.map(r => getStr(r, ['period'])))).filter(Boolean).sort();
  }, [records]);

  return (
    <div className="reports-dashboard">
      <PageHeader
        title="Analitik Data Payroll"
        subtitle="Dashboard analisis data payroll yang telah diproses. Lacak tren nominal gaji, status pembayaran per periode, dan distribusi pengeluaran."
        badge={{ icon: Wallet, label: "Analitik" }}
        actions={
          <button className="btn-outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Segarkan
          </button>
        }
      />

      <div className="reports-filter-bar">
        <label><TrendingUp size={16} style={{ marginRight: '8px' }} /> Filter Periode</label>
        <select 
          value={filterPeriod} 
          onChange={(e) => setFilterPeriod(e.target.value)}
        >
          <option value="">Semua Periode</option>
          {availablePeriods.map(p => (
            <option key={p} value={p}>{fmtMonth(p)}</option>
          ))}
        </select>
        {filterPeriod && (
          <Button variant="ghost" size="sm" onClick={() => setFilterPeriod("")}>Reset</Button>
        )}
      </div>

      {error && <p className="reports-error">{error}</p>}

      <div className="leave-requests-wrapper">
        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Total Records</p>
              <p className="leave-summary-subtitle">Seluruh entri</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-blue">
              <BarChart3 size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-blue">{filteredRecords.length}</div>
          <p className="leave-summary-trend">Total Records</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Gaji Bersih</p>
              <p className="leave-summary-subtitle">Akumulasi periode ini</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-cyan">
              <DollarSign size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-cyan">{fmtRp(totalNet)}</div>
          <p className="leave-summary-trend">Total Gaji</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Dibayar</p>
              <p className="leave-summary-subtitle">Status Paid/Approved</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-green">
              <CheckCircle size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-green">{paid}</div>
          <p className="leave-summary-trend">Payroll Dibayar</p>
        </div>

        <div className="leave-summary-card">
          <div className="leave-summary-header">
            <div>
              <p className="leave-summary-label">Karyawan</p>
              <p className="leave-summary-subtitle">Jumlah penerima unik</p>
            </div>
            <div className="leave-summary-icon-wrapper leave-icon-red">
              <Users size={28} />
            </div>
          </div>
          <div className="leave-summary-value leave-value-red">{uniqueEmps}</div>
          <p className="leave-summary-trend">Karyawan</p>
        </div>
      </div>

      <div className="reports-charts-section">
        <div className="reports-charts-grid">
          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><BarChart3 size={18} color="var(--color-primary)" /> Status Payroll per Periode</h2>
            <p className="reports-chart-subtitle">Perbandingan jumlah payroll Paid vs Pending</p>
            {periodTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={periodTimeline} margin={{top:10,right:30,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)"/>
                  <XAxis dataKey="month" stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/><YAxis stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/>
                  <Tooltip {...TT}/><Legend wrapperStyle={{paddingTop:'20px'}}/>
                  <Bar dataKey="paid" stackId="a" fill="#10b981" radius={[4,4,0,0]} name="Dibayar"/>
                  <Bar dataKey="pending" stackId="a" fill="#f59e0b" radius={[0,0,0,0]} name="Pending"/>
                </BarChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">{loading?'Memuat...':'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>

          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><Wallet size={18} color="var(--color-primary)" /> Tren Nominal Payroll</h2>
            <p className="reports-chart-subtitle">Total net salary yang diproses per bulan</p>
            {netByPeriod.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={netByPeriod} margin={{top:10,right:30,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)"/>
                  <XAxis dataKey="month" stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/><YAxis stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/>
                  <Tooltip {...TT} formatter={(v:any)=>fmtRp(Number(v))}/>
                  <Line type="monotone" dataKey="net" stroke="var(--color-primary)" strokeWidth={3} dot={{r:5, fill:'var(--color-primary)', strokeWidth:2, stroke:'#fff'}} activeDot={{r:7}} name="Net Salary"/>
                </LineChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">{loading?'Memuat...':'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>

          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><PieIcon size={18} color="var(--color-primary)" /> Proporsi Status</h2>
            <p className="reports-chart-subtitle">Pembagian status payroll keseluruhan</p>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip {...TT}/><Legend wrapperStyle={{paddingTop:'20px'}}/>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({name,value})=>`${name}: ${value}`}>
                    {statusData.map((_,i)=><Cell key={i} fill={['#10b981','#f59e0b','var(--color-primary)','#ef4444','#8b5cf6'][i%5]}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">{loading?'Memuat...':'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>

          <Card className="reports-chart-card" glass>
            <h2 className="reports-chart-title"><Users size={18} color="var(--color-primary)" /> Pengeluaran per Departemen</h2>
            <p className="reports-chart-subtitle">Distribusi biaya gaji berdasarkan departemen</p>
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptData} margin={{top:10,right:30,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10, 122, 62,0.1)"/>
                  <XAxis dataKey="name" stroke="var(--color-primary-dark)" style={{fontSize:'12px'}}/><YAxis stroke="var(--color-primary-dark)" style={{fontSize:'12px'}} tickFormatter={(v:number)=>Intl.NumberFormat('id-ID',{notation:'compact'}).format(v)}/>
                  <Tooltip {...TT} formatter={(v:any)=>fmtRp(Number(v))} cursor={{fill:'rgba(10, 122, 62,0.1)'}}/>
                  <Bar dataKey="value" fill="#8b5cf6" radius={[6,6,0,0]} name="Total Salary"/>
                </BarChart>
              </ResponsiveContainer>
            ):(<div className="reports-chart-empty">{loading?'Memuat...':'Belum ada data untuk company aktif ini.'}</div>)}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportsPayrollPage;
