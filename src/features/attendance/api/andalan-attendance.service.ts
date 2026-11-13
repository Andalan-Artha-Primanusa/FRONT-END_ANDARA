import { api } from "@/shared/api/httpClient";

export type AndalanAttendanceLocation = {
  id: string | number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  project_id?: string | null;
  location_code?: string | null;
  department?: string | null;
  is_default?: boolean;
  is_active?: boolean;
};

const currentLegacyUserId = () => {
  try {
    const raw = sessionStorage.getItem("user");
    const user = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    return String(user.user_id ?? user.id ?? "");
  } catch {
    return "";
  }
};

const extractData = (response: any) => response?.data?.data ?? response?.data;

export type BiometricAction = "register" | "authenticate";

export type WebAuthnOptionsResponse = {
  publicKey: Record<string, any>;
};

export const andalanAttendanceService = {
  async locations(): Promise<AndalanAttendanceLocation[]> {
    const response = await api.get("/presentation/legacy/attendance/locations", { params: { active_only: true } });
    const payload = extractData(response);
    return Array.isArray(payload) ? payload : [];
  },

  async today() {
    const response = await api.get(`/presentation/legacy/attendance/${encodeURIComponent(currentLegacyUserId())}/today`);
    return extractData(response);
  },

  async history(page = 1, perPage = 10) {
    const response = await api.get(`/presentation/legacy/attendance/${encodeURIComponent(currentLegacyUserId())}/history`, {
      params: { page, per_page: perPage },
    });
    return extractData(response);
  },

  async biometricOptions(action: BiometricAction): Promise<WebAuthnOptionsResponse> {
    const response = await api.get(`/presentation/legacy/attendance/${encodeURIComponent(currentLegacyUserId())}/biometric/options`, {
      params: { action },
    });
    return extractData(response) as WebAuthnOptionsResponse;
  },

  async biometricRegister(credential: Record<string, any>) {
    const response = await api.post(`/presentation/legacy/attendance/${encodeURIComponent(currentLegacyUserId())}/biometric/register`, {
      credential,
    });
    return extractData(response);
  },

  async biometricVerify(credential: Record<string, any>): Promise<{ biometric_token: string; expires_in: number }> {
    const response = await api.post(`/presentation/legacy/attendance/${encodeURIComponent(currentLegacyUserId())}/biometric/verify`, {
      credential,
    });
    return extractData(response) as { biometric_token: string; expires_in: number };
  },

  async checkIn(latitude: number, longitude: number, biometricToken?: string) {
    const response = await api.post(`/presentation/legacy/attendance/${encodeURIComponent(currentLegacyUserId())}/check-in`, {
      latitude,
      longitude,
      biometric_token: biometricToken,
    });
    return extractData(response);
  },

  async checkOut(latitude?: number, longitude?: number, biometricToken?: string) {
    const response = await api.post(`/presentation/legacy/attendance/${encodeURIComponent(currentLegacyUserId())}/check-out`, {
      latitude,
      longitude,
      biometric_token: biometricToken,
    });
    return extractData(response);
  },
};
