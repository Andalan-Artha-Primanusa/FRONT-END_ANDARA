import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { PageHeader } from "@/shared/ui";
import { showToast } from '@/shared/ui/toast';
import { Briefcase, Users, ChevronLeft } from "lucide-react";
import { api } from "@/shared/api/httpClient";
import { createEmployee } from "@/features/employee/api/employee.service";
import { getAllLocations } from "@/features/location/api/location.service";
import { getAllUsers } from "@/features/admin/api/admin.service";
import { getAllWorkSchedules } from "@/features/work-schedule/api/work-schedule.service";
import { companyService } from "@/features/company/api/company.service";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";
import { PERMISSIONS } from "@/shared/types/rbac.types";
import type { EmployeeCreatePayload } from "@/features/employee/types/employee.types";
import EmployeeForm, { DEFAULT_FORM } from "./components/EmployeeForm";
import type { EmployeeFormState } from "./components/EmployeeForm";
import "@/shared/styles/CrudPage.css";
import "../dashboard/overview/OverviewPage.css";

const EmployeeCreatePage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const selectedCompanyId = useAuthStore((state) => state.selectedCompanyId);
  const canCreateEmployee = RBACUtils.hasPermission(user, [PERMISSIONS.EMPLOYEE_CREATE, PERMISSIONS.ADMIN_ACCESS]);

  const [createForm, setCreateForm] = useState<EmployeeFormState>(DEFAULT_FORM);
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

      if (selectedCompanyId && selectedCompanyId !== "all") {
        setCreateForm((current) => (
          current.company_id
            ? current
            : { ...current, company_id: String(selectedCompanyId) }
        ));
      }

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

    if (!canCreateEmployee) {
      showToast("Anda tidak memiliki izin menambah karyawan.", "error");
      navigate("/employees", { replace: true });
      return;
    }

    void loadMetadata();
  }, [canCreateEmployee, navigate, user]);

  const handleCreate = async () => {
    if (!canCreateEmployee) {
      showToast("Anda tidak memiliki izin menambah karyawan.", "error");
      return;
    }

    // Client-side validation
    if (!createForm.user_id) {
      showToast("Gagal: Silakan pilih pengguna terlebih dahulu.", 'error');
      return;
    }

    setLoading(true);
    showToast("Menyimpan data karyawan...", 'info');

    try {
      const payload: EmployeeCreatePayload = {
        user_id: createForm.user_id ? Number(createForm.user_id) : null, 
        company_id: createForm.company_id ? Number(createForm.company_id) : null,
        manager_id: createForm.manager_id ? Number(createForm.manager_id) : null,
        employee_code: createForm.employee_code || "",
        position: createForm.position || "",
        department: createForm.department || "",
        status: createForm.status || "pending",
        hire_date: createForm.hire_date || "",
        probation_end_date: createForm.probation_end_date || null,
        salary: createForm.salary ? Number(createForm.salary) : 0,
        location_id: createForm.location_id ? Number(createForm.location_id) : null,
        work_schedule_id: createForm.work_schedule_id ? Number(createForm.work_schedule_id) : null,
      };

      await createEmployee(payload);
      setCreateForm(DEFAULT_FORM);
      navigate("/employees");
    } catch (error: any) {
      if (error.type === "validation" && error.errors) {
        const validationErrors = error.errors;
        const messages = Object.values(validationErrors).flat().join(", ");
        showToast(`Gagal: ${messages}`, 'error');
      } else {
        showToast(error.message || "Gagal membuat data karyawan", 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Tambah Karyawan"
        subtitle="Input data jabatan dan penempatan karyawan baru"
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
          formData={createForm}
          setFormData={setCreateForm}
          allUsers={allUsers}
          allDepartments={allDepartments}
          allCompanies={allCompanies}
          allLocations={allLocations}
          allSchedules={allSchedules}
          onSubmit={handleCreate}
          loading={loading}
          isUpdate={false}
        />
      </Card>
    </div>
  );
};

export default EmployeeCreatePage;
