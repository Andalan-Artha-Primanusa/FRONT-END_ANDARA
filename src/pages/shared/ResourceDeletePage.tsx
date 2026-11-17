import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card, PageHeader } from "@/shared/ui";
import { Button } from "@/shared/ui/Button";
import { LoadingState, ErrorState } from "@/shared/ui/DataStateDisplay";
import { showToast } from "@/shared/ui/toast";
import { getLocationDetail, deleteLocation } from "@/features/location/api/location.service";
import { getReimbursementDetail, deleteReimbursement } from "@/features/reimbursement/api/reimbursement.service";
import { getLeaveDetail, deleteLeaveRequest } from "@/features/leave/api/leave.service";
import { payrollService } from "@/features/payroll/api/payroll.service";
import { trainingService } from "@/features/training/api/training.service";
import { assetService } from "@/features/assets/api/asset.service";

type Resource = "location" | "reimbursement" | "leave" | "payroll" | "training" | "asset";

const config: Record<Resource, { title: string; subtitle: string; load: (id: string) => Promise<unknown>; remove: (id: string) => Promise<unknown>; label: (data: any) => string }> = {
  location: { title: "Hapus Lokasi", subtitle: "Konfirmasi penghapusan lokasi.", load: getLocationDetail, remove: deleteLocation, label: (data) => data?.name || `Lokasi #${data?.id}` },
  reimbursement: { title: "Hapus Reimburse", subtitle: "Konfirmasi penghapusan pengajuan reimburse.", load: getReimbursementDetail, remove: deleteReimbursement, label: (data) => data?.title || `Reimburse #${data?.id}` },
  leave: { title: "Hapus Pengajuan Cuti", subtitle: "Konfirmasi pembatalan pengajuan cuti.", load: getLeaveDetail, remove: deleteLeaveRequest, label: (data) => data?.leave_type?.name || `Pengajuan #${data?.id}` },
  payroll: { title: "Hapus Payroll", subtitle: "Konfirmasi penghapusan data payroll.", load: payrollService.getPayrollDetail, remove: payrollService.deletePayroll, label: (data) => data?.employee?.user?.name || `Payroll #${data?.id}` },
  training: { title: "Hapus Program Training", subtitle: "Konfirmasi penghapusan program training.", load: trainingService.getProgram, remove: trainingService.deleteProgram, label: (data) => data?.title || data?.name || `Training #${data?.id}` },
  asset: { title: "Hapus Asset", subtitle: "Konfirmasi penghapusan asset.", load: assetService.getAsset, remove: assetService.deleteAsset, label: (data) => data?.name || data?.asset_code || `Asset #${data?.id}` },
};

export default function ResourceDeletePage({ resource }: { resource: Resource }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = config[resource];

  useEffect(() => {
    if (!id) return;
    void current.load(id).then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Gagal memuat data")).finally(() => setLoading(false));
  }, [current, id]);

  if (loading) return <LoadingState message="Memuat data..." />;
  if (error || !data) return <ErrorState message="Data tidak ditemukan" error={error ?? undefined} onRetry={() => window.location.reload()} />;

  const handleDelete = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await current.remove(id);
      showToast("Data berhasil dihapus", "success");
      navigate(resource === "location" ? "/locations" : resource === "reimbursement" ? "/reimbursements" : resource === "leave" ? "/leave/requests" : resource === "payroll" ? "/payroll/list" : resource === "training" ? "/training/programs" : "/assets", { replace: true });
    } catch (reason: unknown) {
      showToast(reason instanceof Error ? reason.message : "Gagal menghapus data", "error");
    } finally { setSaving(false); }
  };

  const backPath = resource === "location" ? `/locations/edit/${id}` : resource === "leave" ? `/leave/requests/view/${id}` : resource === "training" ? `/training/programs/edit/${id}` : resource === "asset" ? `/assets/edit/${id}` : resource === "reimbursement" ? "/reimbursements" : "/payroll/list";
  return <div className="crud-page"><PageHeader title={current.title} subtitle={current.subtitle} badge={{ icon: Trash2, label: "Konfirmasi" }} /><Card><h2>{current.label(data)}</h2><p>Data ini akan dihapus secara permanen dan tidak dapat dipulihkan.</p><div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}><Button type="button" variant="secondary" onClick={() => navigate(backPath)} disabled={saving}><ArrowLeft size={16} /> Batal</Button><Button type="button" variant="danger" onClick={() => void handleDelete()} loading={saving}><Trash2 size={16} /> Hapus</Button></div></Card></div>;
}
