import { useEffect, useState, useMemo } from "react";
import {
  Eye,
  Pencil,
  Plus,
  Trash2,
  AlertCircle,
  User,
  MapPin,
  Heart,
  GraduationCap,
  CreditCard,
  Shield,
  Building2,
  Search,
  RefreshCw,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { useProfiles } from "@/features/profile/hooks/useProfiles";
import type { Profile, ProfilePayload } from "@/features/profile/types/profile.types";
import "./ProfilesPage.css";

type ProfileFormState = ProfilePayload & { id: string };

const DEFAULT_FORM: ProfileFormState = {
  id: "",
  phone: "",
  address: "",
  city: "",
  province: "",
  postal_code: "",
  birth_date: "",
  gender: "",
  marital_status: "",
  religion: "",
  nationality: "",
  id_number: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relation: "",
  current_address: "",
  permanent_address: "",
  bank_name: "",
  bank_account_number: "",
  bank_account_name: "",
  tax_number: "",
  last_education: "",
  institution_name: "",
  graduation_year: "",
  profile_photo_path: "",
};

const FIELD_GROUPS = [
  {
    title: "Informasi Pribadi",
    icon: <User size={18} />,
    fields: ["gender", "marital_status", "birth_date", "religion", "nationality", "id_number"] as const,
  },
  {
    title: "Alamat & Kontak",
    icon: <MapPin size={18} />,
    fields: ["phone", "city", "province", "postal_code", "address", "current_address", "permanent_address"] as const,
  },
  {
    title: "Kontak Darurat",
    icon: <Heart size={18} />,
    fields: ["emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation"] as const,
  },
  {
    title: "Informasi Finansial",
    icon: <CreditCard size={18} />,
    fields: ["bank_name", "bank_account_number", "bank_account_name", "tax_number"] as const,
  },
  {
    title: "Latar Belakang Pendidikan",
    icon: <GraduationCap size={18} />,
    fields: ["last_education", "institution_name", "graduation_year"] as const,
  },
];

const getStringValue = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const mapProfileToForm = (profile: Profile): ProfileFormState => ({
  id: getStringValue(profile.id),
  phone: getStringValue(profile.phone),
  address: getStringValue(profile.address),
  city: getStringValue(profile.city),
  province: getStringValue(profile.province),
  postal_code: getStringValue(profile.postal_code),
  birth_date: getStringValue(profile.birth_date),
  gender: getStringValue(profile.gender),
  marital_status: getStringValue(profile.marital_status),
  religion: getStringValue(profile.religion),
  nationality: getStringValue(profile.nationality),
  id_number: getStringValue(profile.id_number),
  emergency_contact_name: getStringValue(profile.emergency_contact_name),
  emergency_contact_phone: getStringValue(profile.emergency_contact_phone),
  emergency_contact_relation: getStringValue(profile.emergency_contact_relation),
  current_address: getStringValue(profile.current_address),
  permanent_address: getStringValue(profile.permanent_address),
  bank_name: getStringValue(profile.bank_name),
  bank_account_number: getStringValue(profile.bank_account_number),
  bank_account_name: getStringValue(profile.bank_account_name),
  tax_number: getStringValue(profile.tax_number),
  last_education: getStringValue(profile.last_education),
  institution_name: getStringValue(profile.institution_name),
  graduation_year: getStringValue(profile.graduation_year),
  profile_photo_path: getStringValue(profile.profile_photo_path),
});

const asDisplay = (value: unknown) => {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.length > 0 ? `${value.length} items` : "-";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidates = [record.name, record.title, record.phone, record.address, record.city, record.province, record.id];
    const firstPrimitive = candidates.find(
      (candidate) => candidate !== null && candidate !== undefined && typeof candidate !== "object"
    );
    return firstPrimitive ? String(firstPrimitive) : "-";
  }
  return String(value);
};

const formatDate = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatCurrency = (value: unknown) => {
  if (typeof value === "number") {
    return `Rp ${value.toLocaleString("id-ID")}`;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return `Rp ${parsed.toLocaleString("id-ID")}`;
    }
    return value;
  }

  return "-";
};

const toTitle = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return "-";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

// ========== VALIDATION UTILITIES ==========
type ValidationError = {
  field: string;
  message: string;
};

const validatePhone = (phone: string): string | null => {
  if (!phone.trim()) return null;
  const phoneRegex = /^(\+62|0)[0-9]{9,12}$/;
  if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
    return "Format nomor telepon tidak valid. Gunakan format +62 atau 0 diikuti 9-12 digit.";
  }
  return null;
};

const validateBirthDate = (birthDate: string): string | null => {
  if (!birthDate.trim()) return null;
  
  const date = new Date(birthDate);
  const today = new Date();
  
  if (Number.isNaN(date.getTime())) {
    return "Format tanggal lahir tidak valid.";
  }
  
  if (date > today) {
    return "Tanggal lahir tidak bisa melebihi hari ini.";
  }
  
  const age = today.getFullYear() - date.getFullYear();
  const month = today.getMonth() - date.getMonth();
  const day = today.getDate() - date.getDate();
  
  const actualAge = month < 0 || (month === 0 && day < 0) ? age - 1 : age;
  
  if (actualAge < 16) {
    return "Usia minimal harus 16 tahun.";
  }
  
  if (actualAge > 100) {
    return "Tanggal lahir tidak valid (usia terlalu tua).";
  }
  
  return null;
};

const validateIdNumber = (idNumber: string): string | null => {
  if (!idNumber.trim()) return null;
  if (!/^\d{16}$/.test(idNumber)) {
    return "Nomor ID harus 16 digit angka.";
  }
  return null;
};

const validateTaxNumber = (taxNumber: string): string | null => {
  if (!taxNumber.trim()) return null;
  if (!/^\d{15}$/.test(taxNumber)) {
    return "Nomor pajak harus 15 digit angka.";
  }
  return null;
};

const validateBankAccountNumber = (accountNumber: string): string | null => {
  if (!accountNumber.trim()) return null;
  if (!/^\d{10,20}$/.test(accountNumber)) {
    return "Nomor rekening bank harus 10-20 digit angka.";
  }
  return null;
};

const validateGraduationYear = (year: string): string | null => {
  if (!year.trim()) return null;
  const yearNum = parseInt(year, 10);
  const currentYear = new Date().getFullYear();
  
  if (Number.isNaN(yearNum)) {
    return "Tahun kelulusan harus berupa angka.";
  }
  
  if (yearNum > currentYear) {
    return `Tahun kelulusan tidak bisa melebihi tahun ${currentYear}.`;
  }
  
  if (yearNum < 1950) {
    return "Tahun kelulusan tidak valid (terlalu lama).";
  }
  
  return null;
};

const validatePostalCode = (postalCode: string): string | null => {
  if (!postalCode.trim()) return null;
  if (!/^\d{5}$/.test(postalCode)) {
    return "Kode pos harus 5 digit angka.";
  }
  return null;
};

const GENDER_ENUMS = ["male", "female", "other"] as const;
const MARITAL_STATUS_ENUMS = ["single", "married", "divorced", "widowed"] as const;

const normalizeGender = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  const map: Record<string, string> = {
    "laki": "male",
    "laki-laki": "male",
    "pria": "male",
    "perempuan": "female",
    "wanita": "female",
  };

  return map[normalized] ?? normalized;
};

const normalizeMaritalStatus = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  const map: Record<string, string> = {
    "lajang": "single",
    "belum menikah": "single",
    "menikah": "married",
    "cerai": "divorced",
    "janda": "widowed",
    "duda": "widowed",
  };

  return map[normalized] ?? normalized;
};

const validateEmergencyContactRelation = (relation: string): string | null => {
  if (!relation.trim()) return null;
  
  // Relation should not be a phone number pattern
  if (/^\+?[0-9][\d\s\-()]+$/.test(relation.replace(/\s/g, ''))) {
    return "Hubungan tidak boleh berupa nomor telepon. Gunakan format seperti 'Ibu', 'Ayah', 'Saudara', dst.";
  }
  
  return null;
};

const validateForm = (formState: ProfileFormState): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Required field validations - only phone and address
  const requiredFields: Array<keyof ProfileFormState> = ["phone", "address"];
  
  requiredFields.forEach((field) => {
    if (!formState[field] || !String(formState[field]).trim()) {
      errors.push({ field, message: `${toTitle(field)} wajib diisi.` });
    }
  });

  // Phone validation
  if (formState.phone) {
    const phoneError = validatePhone(formState.phone);
    if (phoneError) errors.push({ field: "phone", message: phoneError });
  }

  // Birth date validation
  if (formState.birth_date) {
    const birthDateError = validateBirthDate(formState.birth_date);
    if (birthDateError) errors.push({ field: "birth_date", message: birthDateError });
  }

  // Gender enum validation
  if (formState.gender) {
    const gender = normalizeGender(formState.gender);
    if (!GENDER_ENUMS.includes(gender as (typeof GENDER_ENUMS)[number])) {
      errors.push({ field: "gender", message: "Gender harus salah satu dari: male, female, other." });
    }
  }

  // Marital status enum validation
  if (formState.marital_status) {
    const maritalStatus = normalizeMaritalStatus(formState.marital_status);
    if (!MARITAL_STATUS_ENUMS.includes(maritalStatus as (typeof MARITAL_STATUS_ENUMS)[number])) {
      errors.push({ field: "marital_status", message: "Marital status harus salah satu dari: single, married, divorced, widowed." });
    }
  }

  // ID Number validation
  if (formState.id_number) {
    const idError = validateIdNumber(formState.id_number);
    if (idError) errors.push({ field: "id_number", message: idError });
  }

  // Tax Number validation
  if (formState.tax_number) {
    const taxError = validateTaxNumber(formState.tax_number);
    if (taxError) errors.push({ field: "tax_number", message: taxError });
  }

  // Bank Account Number validation
  if (formState.bank_account_number) {
    const accountError = validateBankAccountNumber(formState.bank_account_number);
    if (accountError) errors.push({ field: "bank_account_number", message: accountError });
  }

  // Graduation Year validation
  if (formState.graduation_year) {
    const yearError = validateGraduationYear(formState.graduation_year);
    if (yearError) errors.push({ field: "graduation_year", message: yearError });
  }

  // Postal Code validation (optional field)
  if (formState.postal_code) {
    const postalError = validatePostalCode(formState.postal_code);
    if (postalError) errors.push({ field: "postal_code", message: postalError });
  }

  // Emergency Contact Phone
  if (formState.emergency_contact_phone) {
    const emgPhoneError = validatePhone(formState.emergency_contact_phone);
    if (emgPhoneError) errors.push({ field: "emergency_contact_phone", message: emgPhoneError });
  }

  // Emergency Contact Relation
  if (formState.emergency_contact_relation) {
    const relationError = validateEmergencyContactRelation(formState.emergency_contact_relation);
    if (relationError) errors.push({ field: "emergency_contact_relation", message: relationError });
  }

  return errors;
};

// ========== ERROR MODAL COMPONENT ==========
type ErrorModalProps = {
  errors: ValidationError[];
  isOpen: boolean;
  onClose: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ErrorModal = ({ errors, isOpen, onClose }: ErrorModalProps) => {
  if (!isOpen || errors.length === 0) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Validasi Data Gagal" size="md" footer={<Button variant="primary" size="md" onClick={onClose}>Perbaiki Data</Button>}>
      <p className="error-modal-subtitle">Terdapat {errors.length} kesalahan yang perlu diperbaiki:</p>
      <div className="error-list">
        {errors.map((error, index) => (
          <div key={index} className="error-item">
            <span className="error-field">{error.field.replace(/_/g, " ").toUpperCase()}</span>
            <span className="error-message">{error.message}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
};

// ========== TYPES & UTILS ==========
type InfoItem = {
  label: string;
  value: string;
};

// ========== SECTION CARD COMPONENT ==========
type SectionCardProps = {
  icon: React.ReactNode;
  title: string;
  items: InfoItem[] | null;
  children?: React.ReactNode;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SectionCard = ({ icon, title, items, children }: SectionCardProps) => {
  return (
    <div className="profile-card-section">
      <div className="profile-card-section-header">
        <div className="profile-card-section-icon">{icon}</div>
        <h4>{title}</h4>
      </div>
      {items && items.length > 0 ? (
        <div className="profile-card-grid">
          {items.map((item) => (
            <div key={item.label} className="profile-card-item">
              <span className="profile-card-label">{item.label}</span>
              <span className="profile-card-value">{item.value}</span>
            </div>
          ))}
        </div>
      ) : children ? (
        <div className="profile-card-content">{children}</div>
      ) : (
        <p className="activity-placeholder">No data available.</p>
      )}
    </div>
  );
};

const buildDetailSections = (profile: Profile) => {
  const roles = Array.isArray(profile.roles) ? profile.roles : [];
  const primaryRole = roles[0];
  const permissions = Array.isArray(primaryRole?.permissions) ? primaryRole.permissions : [];
  const userRoles = Array.isArray(profile.user?.roles) ? profile.user.roles : [];

  const personalInfo: InfoItem[] = [
    { label: "Full Name", value: asDisplay(profile.user?.name) },
    { label: "Email", value: asDisplay(profile.user?.email) },
    { label: "Phone", value: asDisplay(profile.phone) },
    { label: "Birth Date", value: formatDate(profile.birth_date) },
    { label: "Gender", value: toTitle(profile.gender) },
    { label: "Marital Status", value: toTitle(profile.marital_status) },
    { label: "Religion", value: asDisplay(profile.religion) },
    { label: "Nationality", value: asDisplay(profile.nationality) },
    { label: "NIK / ID Number", value: asDisplay(profile.id_number) },
    { label: "Tax Number", value: asDisplay(profile.tax_number) },
  ];

  const addressInfo: InfoItem[] = [
    { label: "Address", value: asDisplay(profile.address) },
    { label: "Current Address", value: asDisplay(profile.current_address) },
    { label: "Permanent Address", value: asDisplay(profile.permanent_address) },
    { label: "City", value: asDisplay(profile.city) },
    { label: "Province", value: asDisplay(profile.province) },
    { label: "Postal Code", value: asDisplay(profile.postal_code) },
  ];

  const emergencyInfo: InfoItem[] = [
    { label: "Contact Name", value: asDisplay(profile.emergency_contact_name) },
    { label: "Contact Phone", value: asDisplay(profile.emergency_contact_phone) },
    { label: "Relation", value: toTitle(profile.emergency_contact_relation) },
  ];

  const bankInfo: InfoItem[] = [
    { label: "Bank Name", value: asDisplay(profile.bank_name) },
    { label: "Account Number", value: asDisplay(profile.bank_account_number) },
    { label: "Account Name", value: asDisplay(profile.bank_account_name) },
  ];

  const educationInfo: InfoItem[] = [
    { label: "Last Education", value: asDisplay(profile.last_education) },
    { label: "Institution", value: asDisplay(profile.institution_name) },
    { label: "Graduation Year", value: asDisplay(profile.graduation_year) },
  ];

  const employeeInfo: InfoItem[] = [
    { label: "Employee Code", value: asDisplay(profile.employee?.employee_code) },
    { label: "Position", value: asDisplay(profile.employee?.position) },
    { label: "Department", value: asDisplay(profile.employee?.department) },
    { label: "Hire Date", value: formatDate(profile.employee?.hire_date) },
    { label: "Salary", value: formatCurrency(profile.employee?.salary) },
    { label: "Manager", value: asDisplay(profile.employee?.manager?.name) },
  ];

  const systemInfo: InfoItem[] = [
    { label: "Profile ID", value: asDisplay(profile.id) },
    { label: "User ID", value: asDisplay(profile.user_id) },
    { label: "Location ID", value: asDisplay(profile.user?.location_id) },
    { label: "Created At", value: formatDate(profile.created_at) },
    { label: "Updated At", value: formatDate(profile.updated_at) },
    { label: "Photo Path", value: asDisplay(profile.profile_photo_path) },
  ];

  const roleNames = roles.map((role) => role.name).filter(Boolean).join(", ") || "-";
  const userRoleNames = userRoles.map((role) => role.name).filter(Boolean).join(", ") || "-";
  const permissionNames = permissions.map((permission) => permission.name).filter(Boolean).join(", ") || "-";

  return {
    personalInfo,
    addressInfo,
    emergencyInfo,
    bankInfo,
    educationInfo,
    employeeInfo,
    systemInfo,
    roleNames,
    userRoleNames,
    permissionNames,
  };
};

const ProfilesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: routeProfileId } = useParams<{ id: string }>();
  const isAddPage = location.pathname === "/profiles/add";
  const isViewPage = location.pathname.startsWith("/profiles/view/");
  const isUpdatePage = location.pathname.startsWith("/profiles/update/");

  const {
    profiles,
    selectedProfile,
    statusMessage: _statusMessage,
    errorMessage,
    loading,
    loadProfiles,
    createNewProfile,
    getProfileById,
    updateProfileById,
    deleteProfileById,
  } = useProfiles();

  const [createForm, setCreateForm] = useState<ProfileFormState>(DEFAULT_FORM);
  const [updateForm, setUpdateForm] = useState<ProfileFormState>(DEFAULT_FORM);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  // Filter & Search states
  const [searchText, setSearchText] = useState("");
  const [_filterStatus, _setFilterStatus] = useState("all");
  const [_showFilters, _setShowFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");

  // Sorting
  const [sortBy, setSortBy] = useState<"id" | "name" | "hire_date">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and Search Logic
  const filteredProfiles = useMemo(() => {
    let filtered = [...profiles];

    // Search filter
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter((p) => 
        (p.user?.name?.toLowerCase().includes(search)) ||
        (String(p.id).toLowerCase().includes(search)) ||
        (p.employee?.employee_code?.toLowerCase().includes(search))
      );
    }

    // Department filter
    if (selectedDepartment) {
      filtered = filtered.filter((p) => p.employee?.department === selectedDepartment);
    }

    // Position filter
    if (selectedPosition) {
      filtered = filtered.filter((p) => p.employee?.position === selectedPosition);
    }

    return filtered;
  }, [profiles, searchText, selectedDepartment, selectedPosition]);

  // Sorting Logic
  const sortedProfiles = useMemo(() => {
    const sorted = [...filteredProfiles];

    sorted.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      switch (sortBy) {
        case "name":
          compareA = a.user?.name?.toLowerCase() || "";
          compareB = b.user?.name?.toLowerCase() || "";
          break;
        case "hire_date":
          compareA = a.employee?.hire_date || "";
          compareB = b.employee?.hire_date || "";
          break;
        case "id":
        default:
          compareA = String(a.id || "");
          compareB = String(b.id || "");
      }

      if (compareA < compareB) return sortOrder === "asc" ? -1 : 1;
      if (compareA > compareB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredProfiles, sortBy, sortOrder]);

  // Pagination Logic
  const paginatedProfiles = sortedProfiles;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_totalPages, setTotalPages] = useState(1);

  // Get unique departments/positions for filters
  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    profiles.forEach(p => {
      if (p.employee?.department) depts.add(p.employee.department);
    });
    return Array.from(depts).sort();
  }, [profiles]);

  const uniquePositions = useMemo(() => {
    const positions = new Set<string>();
    profiles.forEach(p => {
      if (p.employee?.position) positions.add(p.employee.position);
    });
    return Array.from(positions).sort();
  }, [profiles]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _profileSummaryCards = useMemo(
    () => [
      {
        label: "Total Profiles",
        subtitle: "Semua data profil karyawan",
        value: String(profiles.length),
        change: "Seluruh data yang tersimpan",
        tone: "blue" as const,
        icon: User,
      },
      {
        label: "Filtered Results",
        subtitle: "Hasil pencarian saat ini",
        value: String(sortedProfiles.length),
        change: `${paginatedProfiles.length} data di halaman ini`,
        tone: "green" as const,
        icon: Search,
      },
      {
        label: "Departments",
        subtitle: "Departemen unik yang aktif",
        value: String(uniqueDepartments.length),
        change: "Distribusi struktur kerja",
        tone: "orange" as const,
        icon: Building2,
      },
      {
        label: "Positions",
        subtitle: "Jabatan unik yang tersedia",
        value: String(uniquePositions.length),
        change: "Lapisan peran organisasi",
        tone: "purple" as const,
        icon: Shield,
      },
    ],
    [paginatedProfiles.length, profiles.length, sortedProfiles.length, uniqueDepartments.length, uniquePositions.length]
);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedDepartment, selectedPosition, sortBy, sortOrder]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _clearFilters = () => {
    setSearchText("");
    setSelectedDepartment("");
    setSelectedPosition("");
    setSortBy("name");
    setSortOrder("asc");
  };

  useEffect(() => {
    if (isAddPage || isViewPage || isUpdatePage) {
      return;
    }

    void loadProfiles();
  }, [isAddPage, isViewPage, isUpdatePage]);

  useEffect(() => {
    if (!isViewPage && !isUpdatePage) {
      return;
    }

    if (!routeProfileId) {
      setValidationMessage("Profile ID tidak ditemukan di URL.");
      return;
    }

    const loadDetail = async () => {
      setValidationMessage(null);
      const profile = await getProfileById(routeProfileId);

      if (!profile) {
        setValidationMessage("Detail profile tidak ditemukan.");
        return;
      }

      if (isUpdatePage) {
        setUpdateForm(mapProfileToForm(profile));
      }
    };

    void loadDetail();
  }, [isViewPage, isUpdatePage, routeProfileId]);

  // View Page
  if (isViewPage) {
    const profile = selectedProfile;
    return (
      <div className="crud-page">
        <PageHeader
          title="Detail Profil"
          subtitle="Lihat informasi lengkap profil karyawan."
          badge={{ icon: User, label: "HR Management" }}
          actions={
            <>
              <button className="btn-outline" onClick={() => navigate("/profiles")}>
                Kembali
              </button>
              <button className="btn-primary" onClick={() => navigate(`/profiles/update/${routeProfileId}`)}>
                <Pencil size={16} />
                Edit
              </button>
            </>
          }
        />

        <div className="">
          <Card className="table-card" glass>
            <div className="table-header-bar">
              <h3>Data Profil</h3>
              <span className="table-count">ID: {profile?.id}</span>
            </div>
            <div className="table-card-inner">
              <div className="detail-view">
                <div className="detail-row">
                  <span className="detail-label">Nama</span>
                  <span className="detail-value">{profile?.user?.name || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{profile?.user?.email || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Telepon</span>
                  <span className="detail-value">{profile?.phone || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Alamat</span>
                  <span className="detail-value">{profile?.address || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Departemen</span>
                  <span className="detail-value">{profile?.employee?.department || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Jabatan</span>
                  <span className="detail-value">{profile?.employee?.position || '-'}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Update Page
  if (isUpdatePage) {
    return (
      <div className="crud-page">
        <PageHeader
          title="Edit Profil"
          subtitle="Ubah informasi profil karyawan."
          badge={{ icon: User, label: "HR Management" }}
          actions={
            <button className="btn-outline" onClick={() => navigate("/profiles")} disabled={loading}>
              Batal
            </button>
          }
        />

        {errorMessage && (
          <Alert type="error" message={errorMessage} onClose={() => {}} dismissible />
        )}

        <div className="">
          <div className="form-grid">
            <Card className="table-card" glass>
              <div className="table-header-bar">
                <h3>Edit Profil</h3>
                <span className="table-count">Formulir</span>
              </div>
              <div className="table-card-inner">
                <div className="crud-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Telepon</label>
                      <input
                        type="text"
                        value={updateForm.phone}
                        onChange={(e) => handleUpdateChange('phone', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Alamat</label>
                      <input
                        type="text"
                        value={updateForm.address}
                        onChange={(e) => handleUpdateChange('address', e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <Button variant="primary" onClick={() => void handleUpdate()} disabled={loading}>
                      Simpan Perubahan
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateChange = (key: keyof ProfileFormState, value: string) => {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
    setValidationMessage(null);
  };

  const handleUpdateChange = (key: keyof ProfileFormState, value: string) => {
    setUpdateForm((prev) => ({ ...prev, [key]: value }));
    setValidationMessage(null);
  };

  const getPayload = (formState: ProfileFormState): ProfilePayload => {
    // Filter out empty strings and convert to proper types
    const payload: Record<string, unknown> = {};
    
    (Object.keys(DEFAULT_FORM) as Array<keyof ProfileFormState>).forEach((key) => {
      // Skip the 'id' field - it should never be sent to the backend
      if (key === "id") {
        return;
      }

      // Skip excluded fields not accepted by backend
      if (["city", "province", "postal_code"].includes(key)) {
        return;
      }

      const value = formState[key];
      const trimmedValue = typeof value === "string" ? value.trim() : value;
      
      // Skip empty values
      if (trimmedValue === "" || trimmedValue === null || trimmedValue === undefined) {
        return;
      }

      // Handle type conversions
      if (key === "graduation_year") {
        const parsed = parseInt(trimmedValue as string, 10);
        if (!Number.isNaN(parsed)) {
          payload[key] = parsed;
        }
      } else if (key === "gender") {
        payload[key] = normalizeGender(String(trimmedValue));
      } else if (key === "marital_status") {
        payload[key] = normalizeMaritalStatus(String(trimmedValue));
      } else {
        payload[key] = trimmedValue;
      }
    });

    return payload as unknown as ProfilePayload;
  };

  const requireId = (idValue: string) => {
    const id = idValue.trim();
    if (!id) {
      setValidationMessage("Profile ID wajib diisi.");
      return null;
    }
    return id;
  };

  const handleCreate = async () => {
    setValidationMessage(null);
    setValidationErrors([]);

    // Validate form
    const errors = validateForm(createForm);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsErrorModalOpen(true);
      return;
    }

    const profile = await createNewProfile(getPayload(createForm));
    if (profile) {
      setCreateForm(DEFAULT_FORM);
      navigate("/profiles");
    }
  };

  const handleUpdate = async () => {
    const id = requireId(updateForm.id);
    if (!id) return;

    setValidationMessage(null);
    setValidationErrors([]);

    // Validate form
    const errors = validateForm(updateForm);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsErrorModalOpen(true);
      return;
    }

    const payload = getPayload(updateForm);
    
    // Check if there's at least one field to update
    if (Object.keys(payload).length === 0) {
      setValidationMessage("Tidak ada data yang berubah untuk diupdate.");
      return;
    }

    const profile = await updateProfileById(id, payload);
    if (profile) {
      setUpdateForm(DEFAULT_FORM);
      navigate("/profiles");
    }
  };

  const handleDelete = async (idValue: string) => {
    const id = requireId(idValue);
    if (!id) return;

    await deleteProfileById(id);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _detailSections = selectedProfile ? buildDetailSections(selectedProfile) : null;

  if (isAddPage) {
    return (
      <div className="crud-page">
        <PageHeader
          title="Tambah Profil Baru"
          subtitle="Lengkapi informasi profil karyawan."
          badge={{ icon: User, label: "HR Management" }}
          actions={
            <button className="btn-outline" onClick={() => navigate("/profiles")} disabled={loading}>
              Kembali
            </button>
          }
        />

        {errorMessage && (
          <Alert type="error" message={errorMessage} onClose={() => {}} dismissible />
        )}

        <div className="">
          <div className="form-grid">
            <Card className="table-card" glass>
              <div className="table-header-bar">
                <h3>Data Profil</h3>
                <span className="table-count">Formulir</span>
              </div>
              <div className="table-card-inner">
                <div className="crud-form">
                  {FIELD_GROUPS.map((group) => (
                    <div key={group.title} className="form-section">
                      <h4>{group.title}</h4>
                      <div className="form-grid">
                        {group.fields.map((field) => (
                          <div key={field} className="form-group">
                            <label>{field.replace(/_/g, ' ').toUpperCase()}</label>
                            {field === "gender" ? (
                              <select
                                value={createForm[field]}
                                onChange={(event) => handleCreateChange(field, event.target.value)}
                                className="form-input"
                              >
                                <option value="">Pilih</option>
                                <option value="male">Laki-laki</option>
                                <option value="female">Perempuan</option>
                              </select>
                            ) : field === "marital_status" ? (
                              <select
                                value={createForm[field]}
                                onChange={(event) => handleCreateChange(field, event.target.value)}
                                className="form-input"
                              >
                                <option value="">Pilih</option>
                                <option value="single">Single</option>
                                <option value="married">Married</option>
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={createForm[field]}
                                onChange={(event) => handleCreateChange(field, event.target.value)}
                                className="form-input"
                                placeholder={field.replace(/_/g, ' ')}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="form-actions">
                    <Button variant="primary" onClick={() => void handleCreate()} disabled={loading}>
                      <Plus size={16} />
                      Simpan Profil
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Main List Page
  return (
    <div className="crud-page">
      <PageHeader
        title="Kelola Profil Karyawan"
        subtitle="Kelola profil dan data karyawan perusahaan."
        badge={{ icon: User, label: "HR Management" }}
        actions={
          <>
            <button className="btn-outline" onClick={() => void loadProfiles()}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button className="btn-primary" onClick={() => navigate('/profiles/add')}>
              <Plus size={16} />
              Tambah Profil
            </button>
          </>
        }
      />

      {errorMessage && (
        <Alert type="error" message={errorMessage} onClose={() => {}} dismissible />
      )}

      <div className="">
        <div className="wuw-header">
          <div className="wuw-header-top">
            <div className="wuw-title-area">
              <h3>Daftar Karyawan</h3>
              <span className="wuw-count-badge">{profiles.length} karyawan</span>
            </div>
          </div>
        </div>

        <div className="table-card">
          <div className="table-card-inner">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Profil</th>
                  <th>ID</th>
                  <th>Departemen</th>
                  <th>Jabatan</th>
                  <th>Bergabung</th>
                  <th className="th-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                      Memuat...
                    </td>
                  </tr>
                ) : profiles.length > 0 ? (
                  profiles.map((p: any) => (
                    <tr key={p.id}>
                      <td>
                        <div className="cell-name">
                          <span className="cell-name-text">{p.user?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td><span className="cell-tag">{p.employee?.employee_id || p.id}</span></td>
                      <td>{p.employee?.department || '-'}</td>
                      <td>{p.employee?.position || '-'}</td>
                      <td>{p.employee?.hire_date ? formatDate(p.employee.hire_date) : '-'}</td>
                      <td className="td-center">
                        <button className="btn-icon" onClick={() => navigate(`/profiles/view/${p.id}`)} title="View">
                          <Eye size={16} />
                        </button>
                        <button className="btn-icon" onClick={() => navigate(`/profiles/update/${p.id}`)} title="Edit">
                          <Pencil size={16} />
                        </button>
                        <button className="btn-icon btn-danger" onClick={() => void handleDelete(String(p.id))} title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">Tidak ada data.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilesPage;
                      
