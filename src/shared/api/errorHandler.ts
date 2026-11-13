import type { AxiosError } from "axios";

export type ApiErrorType = "validation" | "general" | "unauthorized";

export interface ApiError {
  type: ApiErrorType;
  message: string;
  errors?: Record<string, string>;
}

const EN_TO_ID: Record<string, string> = {
  "Payroll has already been processed": "Payroll sudah diproses",
  "Payroll is not in draft status": "Payroll bukan dalam status draft",
  "Payroll not found": "Payroll tidak ditemukan",
  "Forbidden": "Anda tidak memiliki izin",
  "You cannot access this payroll": "Anda tidak dapat mengakses payroll ini",
  "You are not authorized": "Anda tidak memiliki izin",
  "No payroll data available": "Tidak ada data payroll",
  "Payroll data retrieved successfully": "Data payroll berhasil diambil",
  "Leave request has already been processed": "Pengajuan cuti sudah diproses",
  "Failed to": "Gagal",
  "success": "berhasil",
  "created": "dibuat",
  "updated": "diperbarui",
  "deleted": "dihapus",
  "saved": "disimpan",
  "approved": "disetujui",
  "rejected": "ditolak",
  "Pending": "Menunggu",
  "Active": "Aktif",
  "Inactive": "Tidak Aktif",
};

const translateMessage = (msg: string): string => {
  if (EN_TO_ID[msg]) return EN_TO_ID[msg];
  for (const [en, id] of Object.entries(EN_TO_ID)) {
    if (msg.toLowerCase().includes(en.toLowerCase())) {
      return msg.replace(new RegExp(en, 'gi'), id);
    }
  }
  return msg;
};

/**
 * Standardize error response from Axios
 */
export const parseApiError = (error: unknown): ApiError => {
  const axiosError = error as AxiosError<any>;
  const status = axiosError.response?.status;
  const data = axiosError.response?.data;
  let message = "";

  // 1. Unauthorized
  if (status === 401) {
    message = data?.message || "Sesi anda telah berakhir. Silahkan login kembali.";
    return { type: "unauthorized", message: translateMessage(message) };
  }

    // 2. Validation Error
  if (status === 422) {
    let detailMessage = data?.message || "Data yang diinput tidak valid.";
    if (data?.errors && typeof data.errors === 'object') {
       const errors = data.errors as Record<string, string[]>;
       const errorList = Object.values(errors).flat();
       if (errorList.length > 0) {
          detailMessage += "\n• " + errorList.join("\n• ");
       }
    }
    return { type: "validation", message: translateMessage(detailMessage), errors: data?.errors || {} };
  }

  if (status === 403) {
    message = data?.message && data.message !== "Forbidden"
      ? data.message
      : "Anda tidak memiliki izin untuk melakukan aksi ini.";
    return { type: "general", message: translateMessage(message) };
  }

  // 3. General Error
  message = data?.message || axiosError.message || "Terjadi kesalahan pada server.";
  return { type: "general", message: translateMessage(message) };
};

/**
 * Helper to get only the message string from an error
 */
export const getErrorMessage = (error: unknown): string => {
  return parseApiError(error).message;
};
