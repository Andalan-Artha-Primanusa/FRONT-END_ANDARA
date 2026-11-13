import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthSession } from "./useAuthSession";
import { useAuthStore } from "@/app/store/auth.store";
import { LoadingState } from "@/shared/ui/DataStateDisplay";

interface ProtectedRouteProps {
  role?: string[];
}

/**
 * ProtectedRoute Component
 *
 * Protects routes by checking if user has a valid authentication token
 * and optionally verifying their role.
 */
export const ProtectedRoute = ({ role }: ProtectedRouteProps) => {
  const authStatus = useAuthSession();
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (authStatus === "checking") {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState message="Memeriksa sesi..." />
      </div>
    );
  }

  if (authStatus !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  if (user?.must_change_password && location.pathname !== "/force-reset-password") {
    return <Navigate to="/force-reset-password" replace />;
  }

  // Role check if provided
  if (role && role.length > 0) {
    const userRoles = user?.roles?.map((r) => r.name) || [];
    const hasRole = role.some((r) => userRoles.includes(r));

    if (!hasRole) {
      // Redirect to home or an unauthorized page
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
