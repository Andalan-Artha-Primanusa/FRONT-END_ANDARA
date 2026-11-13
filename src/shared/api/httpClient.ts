import axios from "axios";
import { parseApiError } from "./errorHandler";
import { showToast } from "../ui/toast";

const configuredBaseUrl = import.meta.env.VITE_API_URL;

export const getApiBaseUrl = () => {
  if (!configuredBaseUrl) {
    throw new Error("VITE_API_URL wajib di-set. Tidak ada fallback production URL di frontend.");
  }

  return configuredBaseUrl.replace(/\/$/, "");
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || "30000", 10),
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  const selectedCompanyId = sessionStorage.getItem("selectedCompanyId");

  if (token && typeof token === "string" && token.length > 0) {
    config.headers = config.headers ?? {};

    if (typeof (config.headers as any).set === 'function') {
      (config.headers as any).set('Authorization', `Bearer ${token}`);
    } else {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }

  if (selectedCompanyId) {
    config.headers = config.headers ?? {};

    if (typeof (config.headers as any).set === 'function') {
      (config.headers as any).set('X-Company-Id', selectedCompanyId);
    } else {
      (config.headers as any)['X-Company-Id'] = selectedCompanyId;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Standardize the error using our global parser
    const parsedError = parseApiError(error);

    // 1. Handle Unauthorized (401)
    if (parsedError.type === "unauthorized" && sessionStorage.getItem("token")) {
      showToast(parsedError.message, "error");
      
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    }

    // Note: General errors are NOT shown here to avoid double toasts.
    // Each page handles its own error display in try-catch blocks.

    // Return the standard parsed error object
    return Promise.reject(parsedError);
  }
);
