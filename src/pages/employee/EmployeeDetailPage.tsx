import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Briefcase, CalendarDays, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { api } from "@/shared/api/httpClient";
import { LoadingState, ErrorState } from "@/shared/ui/DataStateDisplay";
import { Card, PageHeader } from "@/shared/ui";
import "./EmployeeDetailPage.css";

type FieldValue = string | number | boolean | null | undefined;
type FieldMap = Record<string, FieldValue>;

interface DetailResponse {
  employee: FieldMap & {
    CompleteName?: string;
    EmailAddress?: string;
    Employee_ID?: string;
    InputLocation?: string;
    ProjectID?: string;
    PositionDesc?: string;
    Department?: string;
    CellPhoneNumber?: string;
    ServerID?: string;
    PlaceOfApp?: string;
    tgl_hire?: string;
    status_employee?: string;
  };
  employee_detail: FieldMap;
}

const fieldLabel = (key: string) => key
  .replace(/^detail_/, "")
  .replace(/_/g, " ")
  .replace(/([a-z])([A-Z])/g, "$1 $2")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const fieldValue = (value: FieldValue) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  return String(value);
};

const DetailFields = ({ fields }: { fields: FieldMap }) => (
  <div className="employee-detail-fields">
    {Object.entries(fields).map(([key, value]) => (
      <div className="employee-detail-field" key={key}>
        <span>{fieldLabel(key)}</span>
        <strong>{fieldValue(value)}</strong>
      </div>
    ))}
  </div>
);

const EmployeeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get<{ data: DetailResponse }>(`employees/${id}`)
      .then((response) => {
        if (active) setData(response.data.data);
      })
      .catch((reason) => {
        if (active) setError(reason?.message || "Detail karyawan gagal dimuat");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [id]);

  const employee = data?.employee;
  const summary = useMemo(() => [
    { icon: Mail, label: "Email", value: employee?.EmailAddress },
    { icon: Phone, label: "No. HP", value: employee?.CellPhoneNumber },
    { icon: Briefcase, label: "Jabatan", value: employee?.PositionDesc },
    { icon: MapPin, label: "SITE", value: employee?.InputLocation || employee?.ProjectID || employee?.ServerID || employee?.PlaceOfApp },
    { icon: CalendarDays, label: "Tanggal masuk", value: employee?.tgl_hire },
    { icon: UserRound, label: "Status", value: employee?.status_employee },
  ], [employee]);

  if (loading) return <LoadingState message="Memuat seluruh data karyawan..." />;
  if (error || !data || !employee) return <ErrorState message="Detail karyawan tidak tersedia" error={error || "Data kosong"} onRetry={() => window.location.reload()} />;

  return (
    <div className="crud-page employee-detail-page">
      <PageHeader
        title={employee.CompleteName || employee.Employee_ID || "Detail Karyawan"}
        subtitle={`Seluruh data dari SQL Server untuk employee ${employee.Employee_ID || id}`}
        badge={{ icon: UserRound, label: "Employee Detail" }}
        actions={<button className="btn-outline" onClick={() => navigate("/employees")}><ArrowLeft size={16} /> Kembali</button>}
      />

      <Card className="employee-detail-card">
        <div className="employee-detail-summary">
          {summary.map(({ icon: Icon, label, value }) => (
            <div className="employee-summary-item" key={label}>
              <Icon size={18} />
              <div><span>{label}</span><strong>{fieldValue(value)}</strong></div>
            </div>
          ))}
        </div>
      </Card>

      <section className="employee-record-section">
        <div className="employee-record-heading"><h2>Data ms_hr_employee</h2><span>{Object.keys(employee).length} field</span></div>
        <Card><DetailFields fields={employee} /></Card>
      </section>

      <section className="employee-record-section">
        <div className="employee-record-heading"><h2>Data ms_hr_employee_detail</h2><span>{Object.keys(data.employee_detail).length} field</span></div>
        <Card>
          {Object.keys(data.employee_detail).length > 0
            ? <DetailFields fields={data.employee_detail} />
            : <p className="employee-empty-detail">Belum ada data detail untuk employee ini.</p>}
        </Card>
      </section>
    </div>
  );
};

export default EmployeeDetailPage;
