import { useEffect, useState } from 'react';
import { promotionService } from '@/features/organization/api/promotion.service';
import { api } from '@/shared/api/httpClient';

const unwrap = (r: any) => r?.data?.data ?? r?.data ?? [];
const list = (r: any) => { const d = unwrap(r); return d?.data ?? d?.promotions ?? d ?? []; };

export default function PromotionCareerPage() {
  const [rows, setRows] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ employee_id: '', new_position: '', new_department: '', new_salary: '', reason: '', effective_date: '' });
  const load = async () => { setLoading(true); try { setRows(list(await promotionService.getPromotions({ per_page: 100 }))); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); await promotionService.createPromotion({ ...form, employee_id: Number(form.employee_id), new_salary: form.new_salary ? Number(form.new_salary) : undefined }); setForm({ employee_id:'',new_position:'',new_department:'',new_salary:'',reason:'',effective_date:'' }); await load(); };
  const note = (label: string) => window.prompt(label) ?? '';
  return <div className="crud-page"><div className="page-header"><div><h1>Promotion & Career</h1><p>Kelola pengajuan promosi, approval, dan laporan.</p></div><button className="btn btn-secondary" onClick={() => void load()}>Segarkan</button></div>
    <div className="card" style={{ padding: 20, marginBottom: 20 }}><h2>Ajukan Promosi</h2><form onSubmit={submit} className="form-grid">
      {Object.entries({employee_id:'ID Karyawan',new_position:'Posisi Baru',new_department:'Departemen Baru',new_salary:'Gaji Baru',effective_date:'Tanggal Berlaku',reason:'Alasan'}).map(([k,l]) => <label key={k}>{l}<input required={['employee_id','new_position','effective_date','reason'].includes(k)} type={k==='effective_date'?'date':k==='new_salary'?'number':'text'} value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></label>)}
      <button className="btn btn-primary" type="submit">Ajukan</button></form></div>
    <div className="card" style={{ padding: 20 }}><h2>Daftar Pengajuan</h2>{loading ? <p>Memuat...</p> : <div className="table-responsive"><table className="data-table"><thead><tr><th>Karyawan</th><th>Posisi Baru</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>{r.employee?.user?.name ?? r.employee_id}</td><td>{r.to_value}</td><td>{r.status}</td><td>{r.status==='pending' && <><button className="btn btn-primary" onClick={async()=>{await promotionService.approvePromotion(r.id);await load();}}>Approve</button> <button className="btn btn-danger" onClick={async()=>{await promotionService.rejectPromotion(r.id,note('Catatan penolakan'));await load();}}>Reject</button></>}{r.status==='approved' && r.report_status==='submitted' && <><button className="btn btn-primary" onClick={async()=>{await promotionService.approveReport(r.id);await load();}}>Approve Laporan</button> <button className="btn btn-danger" onClick={async()=>{await promotionService.rejectReport(r.id,{rejection_reason:note('Alasan penolakan laporan')});await load();}}>Reject Laporan</button></>}</td></tr>)}</tbody></table></div>}</div></div>;
}
