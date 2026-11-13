import { useAuthStore } from "@/app/store/auth.store";
import { showToast } from "@/shared/ui/toast";

export const forceLogout = (message: string = "Logout Berhasil") => {
  useAuthStore.getState().logout();
  showToast(message, "success");

  // Reset tema ke light mode agar halaman login/register selalu terang
  localStorage.setItem('theme', 'light');
  document.documentElement.dataset.theme = 'light';

  // Berikan jeda agar toast terlihat sebelum halaman direfresh/diarahkan
  setTimeout(() => {
    window.location.href = "/login";
  }, 1000);
};