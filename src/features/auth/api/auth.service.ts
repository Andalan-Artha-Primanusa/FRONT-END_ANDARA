import { api } from "@/shared/api/httpClient";
import { forceLogout } from "@/shared/utils/auth";

/* =========================
   TYPES
 ========================= */
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface GoogleAuthCallbackPayload {
  code: string;
  state?: string;
  scope?: string;
  authuser?: string;
  prompt?: string;
}

export interface UserMenusResponse {
  success: boolean;
  message: string;
  data: string[];
}

/* =========================
   API CALL
 ========================= */
/**
 * Login user
 */
export const login = async (payload: LoginPayload) => {
  const response = await api.post("/login", payload);
  return response.data;
};

/**
 * Register user
 */
export const register = async (payload: RegisterPayload) => {
  const response = await api.post("/register", payload);
  return response.data;
};

/**
 * Get Google SSO redirect URL
 */
export const getGoogleAuthRedirect = async () => {
  const response = await api.get("/auth/google");
  return response.data;
};

/**
 * Handle Google SSO callback
 */
export const handleGoogleAuthCallback = async (payload: GoogleAuthCallbackPayload) => {
  const response = await api.get("/auth/google/callback", { params: payload });
  return response.data;
};

/**
 * Logout user
 */
export const logout = async () => {
  try {
    await api.post("/logout");
  } finally {
    forceLogout(); 
  }
};

/**
 * Verify current token
 */
export const verifyToken = async () => {
  const response = await api.get("/me");
  return response.data;
};

/**
 * Fetch dynamic allowed menu keys for current user
 */
export const fetchUserMenus = async (): Promise<string[]> => {
  const response = await api.get<UserMenusResponse>("/user/menus");
  const data = response.data?.data;
  return Array.isArray(data) ? data : [];
};

/**
 * Request reset password link
 */
export const forgotPassword = async (payload: ForgotPasswordPayload) => {
  const response = await api.post('/forgot-password', payload);
  return response.data;
};

/**
 * Reset password using token
 */
export const resetPassword = async (payload: ResetPasswordPayload) => {
  const response = await api.post('/reset-password', payload);
  return response.data;
};

export const changePassword = async (payload: ChangePasswordPayload) => {
  const response = await api.post('/change-password', payload);
  return response.data;
};
