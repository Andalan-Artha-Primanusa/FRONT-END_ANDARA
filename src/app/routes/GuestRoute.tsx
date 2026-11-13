import { Navigate, Outlet } from "react-router-dom";
import { useAuthSession } from "./useAuthSession";

const GuestRoute = () => {
  const authStatus = useAuthSession();

  if (authStatus === "checking") return null;

  if (authStatus === "authenticated") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
};

export default GuestRoute;