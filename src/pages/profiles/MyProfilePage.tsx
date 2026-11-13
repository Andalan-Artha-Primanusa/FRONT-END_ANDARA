import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Contact,
  MapPin,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { useAuthStore } from "@/app/store/auth.store";
import { Card, PageHeader } from "@/shared/ui";
import { ErrorState, LoadingState } from "@/shared/ui/DataStateDisplay";
import { api } from "@/shared/api/httpClient";
import type { Role } from "@/shared/types/rbac.types";
import "@/shared/styles/CrudPage.css";
import "./ProfilesPage.css";

type RecordValue = Record<string, unknown>;

type MobileProfileContext = {
  account?: RecordValue | null;
  employee?: RecordValue | null;
  attendance_location?: RecordValue | null;
  leave_balances?: RecordValue[];
};

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === "object" ? (value as RecordValue) : {};

const textValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  return String(value);
};

const firstValue = (...values: unknown[]) =>
  values.find((value) => value !== null && value !== undefined && value !== "");

const relationName = (value: unknown) => {
  if (value && typeof value === "object") {
    const record = asRecord(value);
    return firstValue(record.name, record.display_name, record.title);
  }
  return value;
};

const dateValue = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
};

const ProfileField = ({ label, value }: { label: string; value: unknown }) => (
  value === null || value === undefined || value === "" ? null : (
    <div className="profile-card-item">
      <span className="profile-card-label">{label}</span>
      <span className="profile-card-value">{textValue(value)}</span>
    </div>
  )
);

const MyProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [profileData, setProfileData] = useState<RecordValue | null>(null);
  const [mobileContext, setMobileContext] = useState<MobileProfileContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const legacyUserId = String((user as RecordValue).user_id ?? user.id ?? "");
        const endpoint = token
          ? "/my/profile"
          : `/presentation/legacy/profile/${encodeURIComponent(legacyUserId)}`;
        const [response, mobileResponse] = await Promise.all([
          api.get(endpoint),
          api.get(`/presentation/andalan/mobile/profile/${encodeURIComponent(legacyUserId)}`).catch(() => null),
        ]);
        const payload = asRecord(response.data?.data ?? response.data);
        const mobilePayload = mobileResponse ? asRecord(mobileResponse.data?.data ?? mobileResponse.data) : null;

        if (!cancelled) {
          setProfileData(payload);
          setMobileContext(mobilePayload as MobileProfileContext | null);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setProfileData({});
          setMobileContext(null);
          const responseError = asRecord(error);
          setErrorMessage(textValue(responseError.message ?? "Profil lengkap belum dapat dimuat."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [token, user]);

  const view = useMemo(() => {
    const raw = asRecord(profileData);
    const legacy = Boolean(raw.account || raw.employee_detail);
    const account = asRecord(raw.account ?? raw.user ?? user);
    const profile = legacy ? {} : asRecord(raw.profile ?? raw);
    const employee = asRecord(raw.employee ?? account.employee ?? user?.employee);
    const employeeDetail = asRecord(raw.employee_detail);
    const profileUser = asRecord(profile.user);
    const employeeUser = asRecord(employee.user);
    const roles = (Array.isArray(account.roles) ? account.roles : user?.roles ?? []) as Role[];

    return {
      legacy,
      account,
      profile,
      employee,
      employeeDetail,
      name: firstValue(account.name, profileUser.name, employeeUser.name, employee.CompleteName, user?.name),
      email: firstValue(account.email, profileUser.email, employeeUser.email, employee.EmailAddress, user?.email),
      phone: firstValue(profile.phone, employee.CellPhoneNumber),
      employeeCode: firstValue(employee.employee_code, employee.Employee_ID),
      department: relationName(firstValue(employee.department, employee.departmentRel, employee.Department)),
      position: relationName(firstValue(employee.position, employee.positionRel, employee.PositionDesc)),
      location: firstValue(employee.InputLocation, employee.PlaceOfApp, employee.ProjectID, employee.location),
      status: firstValue(employee.status_employee, employee.status, account.is_active ? "Aktif" : "Tidak aktif"),
      roles,
    };
  }, [profileData, user]);

  if (loading && !profileData) {
    return (
      <div className="crud-page profiles-page">
        <PageHeader title="Profile Saya" subtitle="Memuat data profil dari database..." badge={{ icon: UserCircle, label: "Akun Saya" }} />
        <Card className="profile-details-card"><LoadingState message="Memuat profil lengkap..." /></Card>
      </div>
    );
  }

  const { account, profile, employee, employeeDetail, roles } = view;
  const mobileEmployee = asRecord(mobileContext?.employee);
  const mobileLocation = asRecord(mobileContext?.attendance_location);
  const mobileBalances = Array.isArray(mobileContext?.leave_balances) ? mobileContext.leave_balances : [];

  return (
    <div className="crud-page profiles-page">
      <PageHeader
        title={textValue(view.name)}
        subtitle="Informasi akun, data pekerjaan, dan biodata yang tersimpan di database."
        badge={{ icon: UserCircle, label: view.legacy ? "MINEPRO Profile" : "Akun Saya" }}
      />

      {errorMessage && (
        <Card className="profile-details-card">
          <ErrorState message="Sebagian data profil belum tersedia" error={errorMessage} />
        </Card>
      )}

      <div className="profile-new-cards profile-card-sections--stack">
        <Card className="profile-details-card">
          <div className="profile-card-section-header">
            <div className="profile-card-section-icon"><UserCircle size={20} /></div>
            <h2>Identitas Akun</h2>
          </div>
          <div className="profile-details-grid">
            <ProfileField label="Nama Lengkap" value={view.name} />
            <ProfileField label="User ID" value={firstValue(account.user_id, account.id, user?.id)} />
            <ProfileField label="Email" value={view.email} />
            <ProfileField label="Nomor Telepon" value={view.phone} />
            <ProfileField label="Role" value={roles.length > 0 ? roles.map((role) => role.display_name || role.name).join(", ") : firstValue(account.role_id, "-")} />
            <ProfileField label="Status Akun" value={account.is_active ?? employee.status} />
            <ProfileField label="Login Pertama" value={account.is_first_login} />
            <ProfileField label="Status Password" value={user?.must_change_password ? "Wajib reset password" : "Aktif"} />
          </div>
        </Card>

        <Card className="profile-details-card">
          <div className="profile-card-section-header">
            <div className="profile-card-section-icon"><BriefcaseBusiness size={20} /></div>
            <h2>Data Pekerjaan</h2>
          </div>
          <div className="profile-details-grid">
            <ProfileField label="Employee Code" value={view.employeeCode} />
            <ProfileField label="Department" value={view.department} />
            <ProfileField label="Jabatan" value={view.position} />
            <ProfileField label="Lokasi / Project" value={view.location} />
            <ProfileField label="Status Karyawan" value={view.status} />
            <ProfileField label="Status Hire" value={employee.status_hire} />
            <ProfileField label="Tanggal Masuk" value={dateValue(firstValue(employee.hire_date, employee.tgl_hire))} />
            <ProfileField label="Tanggal Aktif" value={dateValue(employee.tgl_AktifKerja)} />
            <ProfileField label="Tanggal Resign" value={dateValue(firstValue(employee.termination_date, employee.tgl_resign))} />
            <ProfileField label="Salary Number" value={employee.Salary_Number} />
            <ProfileField label="Position Reference" value={employee.PositionRef} />
            <ProfileField label="Atasan" value={relationName(employee.manager)} />
          </div>
        </Card>

        <Card className="profile-details-card">
          <div className="profile-card-section-header">
            <div className="profile-card-section-icon"><Contact size={20} /></div>
            <h2>Data Pribadi</h2>
          </div>
          <div className="profile-details-grid">
            <ProfileField label="Nama Panggilan" value={employee.NickName} />
            <ProfileField label="Tempat Lahir" value={employee.PlaceOfBirth} />
            <ProfileField label="Tanggal Lahir" value={dateValue(firstValue(profile.birth_date, employee.DateOfBirth))} />
            <ProfileField label="Jenis Kelamin" value={firstValue(profile.gender, employee.Sex)} />
            <ProfileField label="Agama" value={firstValue(profile.religion, employee.Religion)} />
            <ProfileField label="Kewarganegaraan" value={firstValue(profile.nationality, employee.Citizenship)} />
            <ProfileField label="Status Pernikahan" value={firstValue(profile.marital_status, employee.MaritalStatus)} />
            <ProfileField label="Golongan Darah" value={employee.BloodGroup} />
            <ProfileField label="Tinggi Badan" value={employee.Height ? `${employee.Height} cm` : undefined} />
            <ProfileField label="Berat Badan" value={employee.Weight ? `${employee.Weight} kg` : undefined} />
            <ProfileField label="Nomor Identitas" value={profile.id_number} />
          </div>
        </Card>

        <Card className="profile-details-card">
          <div className="profile-card-section-header">
            <div className="profile-card-section-icon"><MapPin size={20} /></div>
            <h2>Kontak & Alamat</h2>
          </div>
          <div className="profile-details-grid">
            <ProfileField label="Alamat Saat Ini" value={firstValue(profile.current_address, profile.address)} />
            <ProfileField label="Alamat KTP" value={firstValue(profile.permanent_address, employeeDetail.AlamatKTP)} />
            <ProfileField label="Kota" value={profile.city} />
            <ProfileField label="Provinsi" value={profile.province} />
            <ProfileField label="Kode Pos" value={firstValue(profile.postal_code, employeeDetail.KodePos)} />
            <ProfileField label="Lokasi Input" value={employee.InputLocation} />
            <ProfileField label="Project ID" value={employee.ProjectID} />
            <ProfileField label="Server ID" value={employee.ServerID} />
            <ProfileField label="Tempat Penempatan" value={employee.PlaceOfApp} />
          </div>
        </Card>

        <Card className="profile-details-card">
          <div className="profile-card-section-header">
            <div className="profile-card-section-icon"><ShieldCheck size={20} /></div>
            <h2>Kontak Darurat, Pendidikan & Administrasi</h2>
          </div>
          <div className="profile-details-grid">
            <ProfileField label="Nama Kontak Darurat" value={profile.emergency_contact_name} />
            <ProfileField label="Telepon Darurat" value={profile.emergency_contact_phone} />
            <ProfileField label="Hubungan Darurat" value={profile.emergency_contact_relation} />
            <ProfileField label="Pendidikan Terakhir" value={profile.last_education} />
            <ProfileField label="Institusi" value={profile.institution_name} />
            <ProfileField label="Tahun Lulus" value={profile.graduation_year} />
            <ProfileField label="Bank" value={profile.bank_name} />
            <ProfileField label="Nomor Rekening" value={firstValue(profile.bank_account_number, employeeDetail.NoRekBank)} />
            <ProfileField label="Nama Pemilik Rekening" value={profile.bank_account_name} />
            <ProfileField label="NPWP" value={firstValue(profile.tax_number, employeeDetail.NPWP)} />
            <ProfileField label="Nomor BPJS" value={employeeDetail.NoBPJS} />
            <ProfileField label="BPJS Kesehatan" value={employeeDetail.BPJSKesehatan} />
            <ProfileField label="Dana Pensiun" value={employeeDetail.NoDanaPensiun} />
            <ProfileField label="Grade / Golongan" value={firstValue(employeeDetail.Grade, employeeDetail.Golongan, employeeDetail.detail_Grade, employeeDetail.grade)} />
            <ProfileField label="Tanggal Grade" value={dateValue(firstValue(employeeDetail.TglGrade, employeeDetail.detail_TglGrade))} />
            <ProfileField label="Tanggal Masuk Group" value={dateValue(firstValue(employeeDetail.TglMasukGroup, employeeDetail.detail_TglMasukGroup))} />
            <ProfileField label="Kelompok Karyawan" value={firstValue(employeeDetail.KelompokKaryawan, employeeDetail.detail_KelompokKaryawan, employeeDetail.kelompok_karyawan)} />
            <ProfileField label="Cost Center" value={firstValue(employeeDetail.CostCenterText, employeeDetail.CostCenter, employeeDetail.detail_CostCenterText, employeeDetail.cost_center_text, employeeDetail.detail_CostCenter)} />
            <ProfileField label="Atasan Langsung" value={firstValue(employeeDetail.AtasanLangsung, employeeDetail.detail_AtasanLangsung, employeeDetail.atasan_langsung)} />
          </div>
        </Card>

        {mobileContext && (
          <Card className="profile-details-card">
            <div className="profile-card-section-header">
              <div className="profile-card-section-icon"><ShieldCheck size={20} /></div>
              <h2>ANDALAN Mobile & Absensi</h2>
            </div>
            <div className="profile-details-grid">
              <ProfileField label="Sumber Data" value="MINEPRO SQL Server" />
              <ProfileField label="Project Mobile" value={mobileEmployee.project_id} />
              <ProfileField label="Kode Lokasi Absensi" value={mobileEmployee.location_code} />
              <ProfileField label="Lokasi Absensi" value={mobileLocation.name} />
              <ProfileField label="Radius Absensi" value={mobileLocation.radius_meters ? `${mobileLocation.radius_meters} meter` : undefined} />
              <ProfileField label="Koordinat Lokasi" value={mobileLocation.latitude && mobileLocation.longitude ? `${mobileLocation.latitude}, ${mobileLocation.longitude}` : undefined} />
              <ProfileField label="Saldo Cuti Tahun Berjalan" value={mobileBalances.length > 0 ? mobileBalances.map((balance) => `${textValue(balance.leave_type)}: ${textValue(balance.available_days)} hari`).join(" • ") : undefined} />
            </div>
          </Card>
        )}
      </div>

    </div>
  );
};

export default MyProfilePage;
