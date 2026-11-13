import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/app/store/auth.store";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui";
import { showToast } from '@/shared/ui/toast';
import { getErrorMessage } from "@/shared/api/errorHandler";
import { RBACUtils } from "@/shared/hooks/rbac";
import { Download, FileSpreadsheet, RefreshCw, ShieldAlert, Upload, UploadCloud, CheckCircle2, FileText, Users } from "lucide-react";
import {
  importEmployees,
  importUsers,
} from "@/features/admin/api/admin-batch1.service";
import { getAllRoles } from "@/features/admin/api/admin.service";

import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "./AdminCrudPages.css";



const AdminImportPage = () => {
  const user = useAuthStore((state) => state.user);
  const canAccess = RBACUtils.hasPermission(user, "admin.import.execute");

  if (!canAccess) {
    return (
      <div className="crud-page">
        <PageHeader
          title="Akses Ditolak"
          subtitle="Anda tidak memiliki izin untuk mengakses halaman ini."
          badge={{ icon: ShieldAlert, label: "Admin Center" }}
        />
        <div className="">
          <Card glass style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#64748b' }}>Silakan hubungi Administrator untuk mendapatkan akses.</p>
            <a
              href={(import.meta.env.VITE_BASE_URL ? import.meta.env.VITE_BASE_URL : "") + "/import_user_employee_template.txt"}
              download
              style={{ marginTop: '1rem', color: '#6366f1', textDecoration: 'underline', fontSize: 14, display: 'inline-block' }}
            >
              Download Template Gabungan (TXT)
            </a>
          </Card>
        </div>
      </div>
    );
  }

  const [userFile, setUserFile] = useState<File | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [employeeFile, setEmployeeFile] = useState<File | null>(null);
  const [submittingUsers, setSubmittingUsers] = useState(false);
  const [submittingEmployees, setSubmittingEmployees] = useState(false);
  const [userImportResult, setUserImportResult] = useState<string | null>(null);
  const [employeeImportResult, setEmployeeImportResult] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<{ name: string; display_name: string }[]>([]);

  useEffect(() => {
    getAllRoles(1, 100).then((res) => {
      const roles = res.items.map((r: any) => ({
        name: r.name,
        display_name: r.display_name || r.name,
      }));
      setAvailableRoles(roles);
      if (!userRole && roles.length > 0) {
        setUserRole(roles[0].name);
      }
    }).catch(() => {
      setAvailableRoles([{ name: "employee", display_name: "Employee" }]);
      setUserRole("employee");
    });
  }, []);


  const summaryStats = useMemo(() => {
    const uploadedCount = [userFile, employeeFile].filter(Boolean).length;
    return [
      { label: "Template", subtitle: "Unduh format import terbaru", value: "2", tone: "blue" as const },
      { label: "File Dipilih", subtitle: "Upload users dan employees", value: String(uploadedCount), tone: "green" as const },
      { label: "Form Aktif", subtitle: "Users dan employees import", value: "2", tone: "purple" as const },
    ];
  }, [userFile, employeeFile]);

  const handleDownloadUserTemplate = () => {
    const link = document.createElement("a");
    link.href = "/template_users_final.csv";
    link.download = "template_users_final.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDownloadEmployeeTemplate = () => {
    const link = document.createElement("a");
    link.href = "/template_employee_final.csv";
    link.download = "template_employee_final.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleImportUsers = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userFile) {
      showToast("Silakan pilih file pengguna terlebih dahulu.", "error");
      return;
    }

    setSubmittingUsers(true);
    setUserImportResult(null);

    try {
      const result = await importUsers(userFile, userRole);
      setUserImportResult(JSON.stringify(result, null, 2));
      showToast("Import pengguna berhasil diproses.", "success");
      setUserFile(null);
      setUserRole(availableRoles[0]?.name || "employee");
    } catch (error: unknown) {
      showToast(getErrorMessage(error as any), "error");
    } finally {
      setSubmittingUsers(false);
    }
  };

  const handleImportEmployees = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!employeeFile) {
      showToast("Silakan pilih file karyawan terlebih dahulu.", "error");
      return;
    }

    setSubmittingEmployees(true);
    setEmployeeImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", employeeFile);

      const result = await importEmployees(formData);
      setEmployeeImportResult(JSON.stringify(result, null, 2));
      showToast("Import karyawan berhasil diproses.", "success");
      setEmployeeFile(null);
    } catch (error: unknown) {
      showToast(getErrorMessage(error as any), "error");
    } finally {
      setSubmittingEmployees(false);
    }
  };

  return (
    <div className="crud-page">
      {/* Header */}
      <PageHeader
        title="Import Data"
        subtitle="Unduh template, unggah file users maupun employees, dan tinjau hasil proses import langsung dari halaman admin."
        badge={{ icon: UploadCloud, label: "Admin Center" }}
        actions={
          <button className="btn-outline" onClick={() => {
            setUserFile(null);
            setEmployeeFile(null);
            setUserImportResult(null);
            setEmployeeImportResult(null);
          }}>
            <RefreshCw size={16} />
            Reset
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="employee-summary-wrapper">
        {summaryStats.map((card) => {
          const Icon = card.tone === "blue" ? Download : card.tone === "green" ? FileSpreadsheet : Upload;

          return (
            <div key={card.label} className="employee-summary-card">
              <div className="employee-summary-header">
                <div>
                  <p className="employee-summary-label">{card.label}</p>
                  <p className="employee-summary-subtitle">{card.subtitle}</p>
                </div>
                <div className={`employee-summary-icon-wrapper employee-icon-${card.tone}`}>
                  <Icon size={28} />
                </div>
              </div>
              <div className={`employee-summary-value employee-value-${card.tone}`}>{card.value}</div>
              <p className="employee-summary-trend">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Import Section */}
      <div className="import-grid">
        {/* Download Templates Card */}
        <Card className="import-template-card">
          <div className="import-card-header">
            <div className="import-card-icon icon-blue">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="import-card-title">Template Import</h3>
              <p className="import-card-subtitle">Unduh format yang sesuai</p>
            </div>
          </div>
          <div className="import-template-buttons">
            <Button
              variant="outline"
              size="md"
              onClick={handleDownloadUserTemplate}
              className="template-btn-blue"
            >
              <Download size={16} />
              Template User
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={handleDownloadEmployeeTemplate}
              className="template-btn-green"
            >
              <Download size={16} />
              Template Employee
            </Button>
          </div>
          <p className="import-card-note">
            Pastikan file mengikuti struktur kolom pada template untuk menghindari error saat import.
          </p>
        </Card>

        {/* Import Users Card */}
        <Card className="import-form-card">
          <div className="import-card-header">
            <div className="import-card-icon icon-purple">
              <Users size={24} />
            </div>
            <div>
              <h3 className="import-card-title">Import Users</h3>
              <p className="import-card-subtitle">
                {userFile ? userFile.name : "Pilih file CSV/Excel"}
              </p>
            </div>
          </div>

          <form onSubmit={handleImportUsers} className="import-form">
            <div className="form-group">
              <label>File Users</label>
              <div className={`file-upload-area ${userFile ? 'file-selected' : ''}`}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(event) => setUserFile(event.target.files?.[0] || null)}
                  id="user-file-input"
                  className="file-input-hidden"
                />
                <label htmlFor="user-file-input" className="file-upload-label">
                  <Upload size={20} />
                  <span>{userFile ? "Ganti File" : "Pilih File"}</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Role Users</label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="crud-input"
              >
                {availableRoles.map((r) => (
                  <option key={r.name} value={r.name}>{r.display_name}</option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <Button type="submit" variant="primary" size="md" disabled={submittingUsers || !userFile}>
                <Users size={16} />
                {submittingUsers ? "Mengimport..." : "Import Users"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setUserFile(null);
                  setUserImportResult(null);
                }}
                disabled={submittingUsers}
              >
                <RefreshCw size={16} />
                Reset
              </Button>
            </div>
          </form>

          {userImportResult !== null && (
            <div className="import-result">
              <div className="import-result-header">
                <CheckCircle2 size={16} />
                <span>Hasil Import</span>
              </div>
              <pre className="crud-response">{userImportResult}</pre>
            </div>
          )}
        </Card>

        {/* Import Employees Card */}
        <Card className="import-form-card">
          <div className="import-card-header">
            <div className="import-card-icon icon-green">
              <UploadCloud size={24} />
            </div>
            <div>
              <h3 className="import-card-title">Import Employees</h3>
              <p className="import-card-subtitle">
                {employeeFile ? employeeFile.name : "Pilih file CSV/Excel"}
              </p>
            </div>
          </div>

          <form onSubmit={handleImportEmployees} className="import-form">
            <div className="form-group">
              <label>File Employees</label>
              <div className={`file-upload-area ${employeeFile ? 'file-selected' : ''}`}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(event) => setEmployeeFile(event.target.files?.[0] || null)}
                  id="employee-file-input"
                  className="file-input-hidden"
                />
                <label htmlFor="employee-file-input" className="file-upload-label">
                  <Upload size={20} />
                  <span>{employeeFile ? "Ganti File" : "Pilih File"}</span>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <Button type="submit" variant="primary" size="md" disabled={submittingEmployees || !employeeFile}>
                <Upload size={16} />
                {submittingEmployees ? "Mengimport..." : "Import Employees"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setEmployeeFile(null);
                  setEmployeeImportResult(null);
                }}
                disabled={submittingEmployees}
              >
                <RefreshCw size={16} />
                Reset
              </Button>
            </div>
          </form>

          {employeeImportResult !== null && (
            <div className="import-result">
              <div className="import-result-header">
                <CheckCircle2 size={16} />
                <span>Hasil Import</span>
              </div>
              <pre className="crud-response">{employeeImportResult}</pre>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminImportPage;
