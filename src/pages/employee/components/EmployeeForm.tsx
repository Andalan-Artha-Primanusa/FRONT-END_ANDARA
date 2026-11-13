import React from "react";
import { Button } from "@/shared/ui/Button";

export type EmployeeFormState = {
  id: string;
  name: string;
  user_id: string;
  company_id: string;
  employee_code: string;
  position: string;
  department: string;
  hire_date: string;
  probation_end_date: string;
  status: string;
  salary: string;
  location_id: string;
  manager_id: string;
  work_schedule_id: string;
};

export const DEFAULT_FORM: EmployeeFormState = {
  id: "",
  name: "",
  user_id: "",
  company_id: "",
  employee_code: "",
  position: "",
  department: "",
  hire_date: "",
  probation_end_date: "",
  status: "pending",
  salary: "",
  location_id: "",
  manager_id: "",
  work_schedule_id: "",
};

export interface EmployeeFormProps {
  formData: EmployeeFormState;
  setFormData: React.Dispatch<React.SetStateAction<EmployeeFormState>>;
  allUsers: Record<string, any>[];
  allDepartments: any[];
  allCompanies: Record<string, any>[];
  allLocations: Record<string, any>[];
  allSchedules: Record<string, any>[];
  onSubmit: () => void;
  loading: boolean;
  isUpdate?: boolean;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  formData,
  setFormData,
  allUsers,
  allDepartments,
  allCompanies,
  allLocations,
  allSchedules,
  onSubmit,
  loading,
  isUpdate,
}) => {
  return (
    <>
      {/* Section 1: Akun & Personal */}
      <div className="form-section" style={{ marginBottom: "2rem" }}>
        <h4 style={{ color: "var(--color-primary)", marginBottom: "1rem", fontSize: "0.9rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
          I. INFORMASI AKUN & PERSONAL
        </h4>
        <div className="form-grid">
          <div className="form-group">
            <span>NAMA LENGKAP</span>
            <input
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nama lengkap karyawan"
              disabled={!isUpdate && !!formData.user_id} // Disable if user selected
            />
          </div>

          {!isUpdate && (
            <div className="form-group">
              <span>USER SYSTEM</span>
              <select
                className="form-input"
                value={formData.user_id}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedUser = allUsers.find(u => String(u.id) === String(selectedId));
                  setFormData((prev) => ({ 
                    ...prev, 
                    user_id: selectedId,
                    name: selectedUser ? selectedUser.name : prev.name 
                  }));
                }}
              >
                <option value="">Pilih User</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <span>KODE KARYAWAN</span>
            <input
              className="form-input"
              value={formData.employee_code}
              onChange={(e) => setFormData((prev) => ({ ...prev, employee_code: e.target.value }))}
              placeholder="Contoh: EMP-001"
              disabled={isUpdate}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Posisi & Organisasi */}
      <div className="form-section" style={{ marginBottom: "2rem" }}>
        <h4 style={{ color: "var(--color-primary)", marginBottom: "1rem", fontSize: "0.9rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
          II. POSISI & ORGANISASI
        </h4>
        <div className="form-grid">
          <div className="form-group">
            <span>COMPANY</span>
            <select
              className="form-input"
              value={formData.company_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, company_id: e.target.value }))}
            >
              <option value="">Pilih Company</option>
              {allCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} {company.code ? `(${company.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <span>JABATAN</span>
            <input
              className="form-input"
              value={formData.position}
              onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
              placeholder="Contoh: Manager"
            />
          </div>

          <div className="form-group">
            <span>DEPARTEMEN</span>
            <select
              className="form-input"
              value={formData.department}
              onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
            >
              <option value="">Pilih Departemen</option>
              {allDepartments.map((dept, index) => {
                const label = typeof dept === 'string' ? dept : dept.name || dept.label;
                const value = typeof dept === 'string' ? dept : dept.id || dept.code;
                return (
                  <option key={index} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group">
            <span>LOKASI KERJA</span>
            <select
              className="form-input"
              value={formData.location_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, location_id: e.target.value }))}
            >
              <option value="">Pilih Lokasi</option>
              {allLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <span>MANAGER (Direct Supervisor)</span>
            <select
              className="form-input"
              value={formData.manager_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, manager_id: e.target.value }))}
            >
              <option value="">Tanpa Manager</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <span>JADWAL KERJA</span>
            <select
              className="form-input"
              value={formData.work_schedule_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, work_schedule_id: e.target.value }))}
            >
              <option value="">Pilih Jadwal</option>
              {allSchedules.map((sched) => (
                <option key={sched.id} value={sched.id}>
                  {sched.name} ({sched.start_time} - {sched.end_time})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 3: Status & Penggajian */}
      <div className="form-section">
        <h4 style={{ color: "var(--color-primary)", marginBottom: "1rem", fontSize: "0.9rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
          III. STATUS & PENGGAJIAN
        </h4>
        <div className="form-grid">
          <div className="form-group">
            <span>STATUS KARYAWAN</span>
            <select
              className="form-input"
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="pending">Pending (Masa Percobaan)</option>
              <option value="active">Active (Karyawan Tetap)</option>
              <option value="inactive">Inactive (Resigned/Terminated)</option>
            </select>
          </div>

          <div className="form-group">
            <span>TANGGAL BERGABUNG</span>
            <input
              type="date"
              className="form-input"
              value={formData.hire_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, hire_date: e.target.value }))}
              disabled={isUpdate}
            />
          </div>
          
          <div className="form-group">
            <span>MASA PERCOBAAN SELESAI</span>
            <input
              type="date"
              className="form-input"
              value={formData.probation_end_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, probation_end_date: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <span>GAJI POKOK (Rp)</span>
            <input
              type="text"
              inputMode="numeric"
              className="form-input"
              value={formData.salary ? Number(formData.salary).toLocaleString("id-ID") : ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, salary: e.target.value.replace(/\D/g, "") }))}
              placeholder="Contoh: 8.500.000"
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="form-actions" style={{ justifyContent: "flex-end", marginTop: "32px" }}>
        <Button variant="primary" size="lg" onClick={onSubmit} disabled={loading} className="btn-pill">
          {loading ? "Menyimpan..." : isUpdate ? "Update Data Karyawan" : "Simpan Karyawan Baru"}
        </Button>
      </div>
    </>
  );
};

export default EmployeeForm;
