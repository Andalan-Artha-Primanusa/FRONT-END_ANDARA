import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card, PageHeader } from "@/shared/ui";
import { Button } from "@/shared/ui/Button";
import { ErrorState, LoadingState } from "@/shared/ui/DataStateDisplay";
import { getEmployeeDetail, deleteEmployee } from "@/features/employee/api/employee.service";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";
import { useAuthStore } from "@/app/store/auth.store";
import { showToast } from "@/shared/ui/toast";

export default function EmployeeDeletePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [employee, setEmployee] = useState<Awaited<ReturnType<typeof getEmployeeDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = RBACUtils.hasPermission(user, [PERMISSIONS.EMPLOYEE_DELETE, PERMISSIONS.ADMIN_ACCESS]);

  useEffect(() => {
    if (!id) return;
    void getEmployeeDetail(id)
      .then(setEmployee)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Gagal memuat data karyawan"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id || !canDelete) return;
    setDeleting(true);
    try {
      await deleteEmployee(id);
      showToast("Karyawan berhasil dihapus", "success");
      navigate("/employees", { replace: true });
    } catch (reason: unknown) {
      showToast(reason instanceof Error ? reason.message : "Gagal menghapus karyawan", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingState message="Memuat data karyawan..." />;
  if (error || !employee) return <ErrorState message="Data karyawan tidak ditemukan" error={error ?? undefined} onRetry={() => window.location.reload()} />;

  const name = employee.user?.name || employee.employee_code || `Karyawan #${employee.id}`;

  return (
    <div className="crud-page">
      <PageHeader title="Hapus Karyawan" subtitle="Konfirmasi penghapusan data karyawan." badge={{ icon: Trash2, label: "Employee Center" }} />
      <Card>
        <h2>{name}</h2>
        <p>Data ini akan dihapus secara permanen. Pastikan tindakan ini sudah sesuai izin dan kebijakan perusahaan.</p>
        {!canDelete && <p role="alert">Anda tidak memiliki izin untuk menghapus karyawan.</p>}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
          <Button type="button" variant="secondary" onClick={() => navigate(`/employees/${id}`)} disabled={deleting}>
            <ArrowLeft size={16} /> Batal
          </Button>
          {canDelete && <Button type="button" variant="danger" onClick={() => void handleDelete()} loading={deleting}>
            <Trash2 size={16} /> Hapus Karyawan
          </Button>}
        </div>
      </Card>
    </div>
  );
}
