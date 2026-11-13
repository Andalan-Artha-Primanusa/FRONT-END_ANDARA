import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { PageHeader } from "@/shared/ui";
import { showToast } from '@/shared/ui/toast';
import { Briefcase, Users, ChevronLeft } from "lucide-react";
import { api } from "@/shared/api/httpClient";
import { getEmployeeDetail, updateEmployee } from "@/features/employee/api/employee.service";
import { getAllLocations } from "@/features/location/api/location.service";
import { getAllUsers } from "@/features/admin/api/admin.service";
import { getAllWorkSchedules } from "@/features/work-schedule/api/work-schedule.service";
import { companyService } from "@/features/company/api/company.service";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";
import type { EmployeeUpdatePayload } from "@/features/employee/types/employee.types";
import EmployeeForm, { DEFAULT_FORM } from "./components/EmployeeForm";
import type { EmployeeFormState } from "./components/EmployeeForm";
import "@/shared/styles/CrudPage.css";
import "../dashboard/overview/OverviewPage.css";

const EmployeeEditPage = () => {
  const navigate = useNavigate();
  const { id: routeEmployeeId } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const canUpdateEmployee = RBACUtils.hasPermission(user, [PERMISSIONS.EMPLOYEE_UPDATE, PERMISSIONS.ADMIN_ACCESS]);

  const [updateForm, setUpdateForm] = useState<EmployeeFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

  // Metadata State
  const [allLocations, setAllLocations] = useState<Record<string, any>[]>([]);
  const [allUsers, setAllUsers] = useState<Record<string, any>[]>([]);
  const [allSchedules, setAllSchedules] = useState<Record<string, any>[]>([]);
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [allCompanies, setAllCompanies] = useState<Record<string, any>[]>([]);

  const loadMetadata = async () => {
    try {
      const locs = await getAllLocations();
      setAllLocations(Array.isArray(locs.items) ? locs.items : []);

      const usersResult = await getAllUsers(1, 100);
      setAllUsers(usersResult.items);

      const schedResult = await getAllWorkSchedules();
      setAllSchedules(schedResult.items);

      const companies = await companyService.list();
      setAllCompanies(companies);

      const deptRes = await api.get('/organization/master-data');
      // Deeply check for departments array
      const rawDepts = deptRes.data?.data?.departments || deptRes.data?.departments || [];
      setAllDepartments(Array.isArray(rawDepts) ? rawDepts : []);
    } catch (err) {
      console.error("Failed to load metadata:", err);
    }
  };

  useEffect(() => {
    if (!user) return;

    if (!canUpdateEmployee) {
      showToast("Anda tidak memiliki izin mengubah data karyawan.", "error");
      navigate("/employees", { replace: true });
      return;
    }

    void loadMetadata();
  }, [canUpdateEmployee, navigate, user]);

  useEffect(() => {
    if (!user) return;
    if (!canUpdateEmployee) return;
    if (!routeEmployeeId) return;
    let cancelled = false;

    const loadUpdateDetail = async () => {
      setLoading(true);

      try {
        const result = await getEmployeeDetail(routeEmployeeId);
        if (cancelled) return;

        const hireDate = result?.hire_date ? result.hire_date.split("T")[0] : "";
        const salary = result?.salary ? String(Math.floor(Number(result.salary))) : "";
        
        const formatId = (val: any) => (val === null || val === undefined) ? "" : String(val);

        setUpdateForm({
          id: String(result?.id ?? routeEmployeeId),
          name: String(result?.user?.name ?? ""),
          user_id: formatId(result?.user_id),
          company_id: formatId(result?.company_id),
          employee_code: String(result?.employee_code ?? ""),
          position: String(result?.position ?? ""),
          department: String(result?.department ?? ""),
          hire_date: hireDate,
          probation_end_date: result?.probation_end_date ? result.probation_end_date.split("T")[0] : "",
          status: result?.status ?? "pending",
          salary: salary,
          location_id: formatId(result?.location_id),
          manager_id: formatId(result?.manager_id),
          work_schedule_id: formatId(result?.work_schedule_id),
        });
      } catch (error: unknown) {
        if (cancelled) return;
        showToast(`Gagal: ${error}`, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadUpdateDetail();
    return () => { cancelled = true; };
  }, [canUpdateEmployee, routeEmployeeId, user]);

  const handleUpdate = async () => {
    if (!canUpdateEmployee) {
      showToast("Anda tidak memiliki izin mengubah data karyawan.", "error");
      return;
    }

    const targetId = updateForm.id;
    if (!targetId) {
      showToast("Gagal: ID tidak ditemukan.", 'error');
      return;
    }

    setLoading(true);
    showToast("Memperbarui data karyawan...", 'info');

    try {
      const payload: EmployeeUpdatePayload = {
        name: updateForm.name,
        user_id: updateForm.user_id ? Number(updateForm.user_id) : undefined,
        company_id: updateForm.company_id ? Number(updateForm.company_id) : undefined,
        employee_code: updateForm.employee_code || undefined,
        hire_date: updateForm.hire_date || undefined,
        position: updateForm.position || undefined,
        department: updateForm.department || undefined,
        salary: updateForm.salary ? Number(updateForm.salary) : undefined,
        status: updateForm.status || "pending",
        probation_end_date: updateForm.probation_end_date || undefined,
        location_id: updateForm.location_id ? Number(updateForm.location_id) : undefined,
        manager_id: updateForm.manager_id ? Number(updateForm.manager_id) : undefined,
        work_schedule_id: updateForm.work_schedule_id ? Number(updateForm.work_schedule_id) : undefined,
      };

      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined)
      ) as EmployeeUpdatePayload;

      await updateEmployee(targetId, cleanPayload);
      navigate("/employees");
    } catch (error: any) {
      if (error.type === "validation" && error.errors) {
        const validationErrors = error.errors;
        const messages = Object.values(validationErrors).flat().join(", ");
        showToast(`Gagal: ${messages}`, 'error');
      } else {
        showToast(error.message || "Gagal memperbarui data karyawan", 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Update Data Karyawan"
        subtitle={`Perbarui informasi karyawan: ID ${updateForm.id || routeEmployeeId}`}
        badge={{ icon: Users, label: "People Center" }}
        actions={
          <button className="btn-outline" onClick={() => navigate("/employees")} disabled={loading}>
            <ChevronLeft size={18} />
            Kembali ke Daftar
          </button>
        }
        style={{ marginBottom: '2rem' }}
      />

      <Card className="control-card" glass>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: 'var(--color-primary-dark)', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Briefcase size={18} style={{ color: 'var(--color-primary)' }} />
            Form Data Karyawan
          </h3>
        </div>

        <EmployeeForm
          formData={updateForm}
          setFormData={setUpdateForm}
          allUsers={allUsers}
          allDepartments={allDepartments}
          allCompanies={allCompanies}
          allLocations={allLocations}
          allSchedules={allSchedules}
          onSubmit={handleUpdate}
          loading={loading}
          isUpdate={true}
        />
      </Card>
    </div>
  );
};

export default EmployeeEditPage;
