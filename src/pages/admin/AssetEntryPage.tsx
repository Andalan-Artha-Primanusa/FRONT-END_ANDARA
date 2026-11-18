import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/app/store/auth.store';
import AssetManagementPage from './AssetManagementPage';

/** Routes presentation users to the presentation asset view; admin users keep the protected asset manager. */
export default function AssetEntryPage() {
  const user = useAuthStore((state) => state.user);
  const isPresentation = Boolean(user && user.roles.length === 0 && user.permissions.length === 0);
  return isPresentation ? <Navigate to="/andalan/workforce/assets" replace /> : <AssetManagementPage />;
}
