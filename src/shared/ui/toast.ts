import { toast } from "react-hot-toast";

/**
 * Global Toast Helper
 * Use this to trigger toasts from anywhere (components, services, interceptors)
 */
export const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) return;

  switch (type) {
    case "success":
      return toast.success(cleanMessage);
    case "error":
      return toast.error(cleanMessage);
    default:
      return toast(cleanMessage);
  }
};
