import React from "react";
import { useAuthStore } from "@/app/store/auth.store";
import { Card } from "@/shared/ui/Card";
import { LoadingState } from "@/shared/ui/DataStateDisplay";
import { Shield } from "lucide-react";
import { RBACUtils } from "@/shared/hooks/rbac";

interface MenuRouteGuardProps {
  menuKey: string;
  children: React.ReactNode;
}

/**
 * MenuRouteGuard Component
 * 
 * Pengaman rute berbasis source of truth dari backend. 
 * Otomatis memvalidasi ketersediaan menuKey di dalam allowedMenuKeys.
 */
export const MenuRouteGuard: React.FC<MenuRouteGuardProps> = ({ menuKey, children }) => {
  const user = useAuthStore((state) => state.user);
  const allowedMenuKeys = useAuthStore((state) => state.allowedMenuKeys);
  const menuKeysLoaded = useAuthStore((state) => state.menuKeysLoaded);

  // Loading state: keys belum selesai di-fetch
  if (!menuKeysLoaded) {
    return <LoadingState message="Memeriksa otorisasi..." />;
  }

  // Otorisasi berhasil jika menuKey eksplisit terdaftar,
  // sesuai source of truth dari backend `/user/menus`.
  const presentationMode = Boolean(user && user.roles.length === 0 && user.permissions.length === 0);
  const isAllowed = presentationMode || RBACUtils.isSuperAdmin(user) || allowedMenuKeys.includes(menuKey);

  if (!isAllowed) {
    return (
      <div className="crud-page" style={{ padding: "3rem 1rem", maxWidth: "700px", margin: "0 auto" }}>
        <Card
          style={{
            background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
            border: "1px solid #fecdd3",
            borderRadius: "16px",
            boxShadow: "0 10px 25px -5px rgba(225, 29, 72, 0.1)",
            color: "#9f1239",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "2.5rem 2rem", textAlign: "center" }}>
            <div
              style={{
                background: "#ffe4e6",
                borderRadius: "50%",
                display: "inline-flex",
                padding: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <Shield size={40} color="#e11d48" />
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem", color: "#881337" }}>
              Akses Menu Terbatas
            </h1>
            <p style={{ fontSize: "0.95rem", lineHeight: 1.5, opacity: 0.9, marginBottom: "1.5rem" }}>
              Sistem otorisasi terpusat memblokir akses ke halaman ini. Kunci menu 
              <code style={{ background: "#fecdd3", padding: "0.2rem 0.5rem", borderRadius: "4px", margin: "0 0.3rem", fontWeight: 600 }}>
                {menuKey}
              </code> 
              tidak terdaftar dalam otorisasi sesi Anda.
            </p>
            <div style={{ fontSize: "0.85rem", color: "#be123c", borderTop: "1px solid #fecdd3", paddingTop: "1rem" }}>
              Silakan hubungi Administrator jika Anda memerlukan penugasan peran pada menu ini.
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default MenuRouteGuard;
