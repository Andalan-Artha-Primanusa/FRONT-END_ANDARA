import { useEffect, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, PageHeader } from "@/shared/ui";
import { Button } from "@/shared/ui/Button";
import { ErrorState, LoadingState } from "@/shared/ui/DataStateDisplay";
import { getLocationDetail } from "@/features/location/api/location.service";
import { getReimbursementDetail } from "@/features/reimbursement/api/reimbursement.service";
import { getLeaveDetail } from "@/features/leave/api/leave.service";
import { payrollService } from "@/features/payroll/api/payroll.service";
import { trainingService } from "@/features/training/api/training.service";
import { assetService } from "@/features/assets/api/asset.service";

type Resource = "location" | "reimbursement" | "leave" | "payroll" | "training" | "asset";
const loaders: Record<Resource, (id: string) => Promise<any>> = { location: getLocationDetail, reimbursement: getReimbursementDetail, leave: getLeaveDetail, payroll: payrollService.getPayrollDetail, training: trainingService.getProgram, asset: assetService.getAsset };
const titles: Record<Resource, string> = { location: "Detail Lokasi", reimbursement: "Detail Reimburse", leave: "Detail Pengajuan Cuti", payroll: "Detail Payroll", training: "Detail Program Training", asset: "Detail Asset" };
const editPaths: Record<Resource, (id: string) => string> = { location: (id) => `/locations/edit/${id}`, reimbursement: () => "/reimbursements", leave: (id) => `/leave/requests/edit/${id}`, payroll: () => "/payroll/list", training: (id) => `/training/programs/edit/${id}`, asset: (id) => `/assets/edit/${id}` };
const listPaths: Record<Resource, string> = { location: "/locations", reimbursement: "/reimbursements", leave: "/leave/requests", payroll: "/payroll/list", training: "/training/programs", asset: "/assets" };

export default function ResourceDetailPage({ resource }: { resource: Resource }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (id) void loaders[resource](id).then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Gagal memuat detail")); }, [id, resource]);
  if (!id || error) return <ErrorState message="Detail tidak tersedia" error={error ?? "ID tidak valid"} onRetry={() => window.location.reload()} />;
  if (!data) return <LoadingState message="Memuat detail..." />;
  const entries = Object.entries(data).filter(([key, value]) => !["__typename"].includes(key) && (typeof value !== "object" || value === null));
  return <div className="crud-page"><PageHeader title={titles[resource]} subtitle="Informasi lengkap dan metadata data." actions={<div style={{ display: "flex", gap: "0.5rem" }}><Button type="button" variant="secondary" onClick={() => navigate(listPaths[resource])}><ArrowLeft size={16} /> Kembali</Button><Button type="button" variant="primary" onClick={() => navigate(editPaths[resource](id))}><Pencil size={16} /> Edit</Button></div>} /><Card><dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>{entries.map(([key, value]) => <div key={key}><dt style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>{key.replace(/_/g, " ")}</dt><dd style={{ margin: "0.25rem 0 0", fontWeight: 600 }}>{String(value ?? "-")}</dd></div>)}</dl></Card></div>;
}
