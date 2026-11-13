import React from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { Sidebar } from '@/widgets/layout/Sidebar';
import { Header } from '@/widgets/layout/Header';
import { useAuthStore } from '@/app/store/auth.store';
import { consumeCompanyScopeToast } from '@/shared/utils/companyScope';
import { showToast } from '@/shared/ui/toast';
import type { MenuItem } from '@/shared/config/menu';
import { fetchAllowedMenuKeys, clearMenuCache, fetchUserMenuTree } from '@/shared/config/menuFilter';
import { RouteSuspenseFallback } from '@/shared/ui';
import NotFoundPage from '@/pages/error/NotFoundPage';

const routePrefetchers: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('@/pages/dashboard/overview/OverviewPage'),
  '/attendance': () => import('@/pages/attendance/AttendanceOverviewPage'),
  '/attendance/history': () => import('@/pages/attendance/AttendanceHistoryPage'),
  '/attendance/monitoring': () => import('@/pages/attendance/AttendanceMonitoringPage'),
  '/leave/requests': () => import('@/pages/leave/LeaveRequestsPage'),
  '/leave/approval': () => import('@/pages/leave/LeaveApprovalPage'),
  '/leave/calendar': () => import('@/pages/leave/LeaveCalendarPage'),
  '/kpis': () => import('@/pages/admin/AdminKpiPage'),
  '/my/kpi': () => import('@/pages/ess/MyKpiPage'),
  '/my/payroll': () => import('@/pages/ess/MyPayrollPage'),
  '/my/reimbursements': () => import('@/pages/ess/MyReimbursementsPage'),
  '/leave/my-leave': () => import('@/pages/ess/MyLeavesPage'),
  '/employees': () => import('@/pages/employee/EmployeesPage'),
  '/employees/update/:id': () => import('@/pages/employee/EmployeeEditPage'),
  '/profiles': () => import('@/pages/profiles/ProfilesPage'),
  '/reimbursements': () => import('@/pages/reimbursements/ReimbursementsManagementPage'),
  '/payroll/list': () => import('@/pages/payroll/PayrollListPage'),
  '/payroll': () => import('@/pages/payroll/PayrollDashboard'),
  '/locations': () => import('@/pages/locations/LocationsPage'),
  '/admin/users': () => import('@/pages/admin/AdminUsersPage'),
  '/admin/roles': () => import('@/pages/admin/AdminRolesPage'),
  '/admin/permissions': () => import('@/pages/admin/AdminPermissionsPage'),
};

const flattenPaths = (items: MenuItem[]): string[] => {
  const result: string[] = [];

  for (const item of items) {
    if (item.path) {
      result.push(item.path);
    }

    if (item.subItems?.length) {
      result.push(...flattenPaths(item.subItems));
    }
  }

  return result;
};

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);
  const [allMenuPaths, setAllMenuPaths] = React.useState<string[]>([]);
  const [availablePaths, setAvailablePaths] = React.useState<string[]>([]);
  const [allowedKeys, setAllowedKeys] = React.useState<string[] | undefined>();
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const outlet = useOutlet();

  // Detect screen size and auto-manage sidebar state
  React.useEffect(() => {
    const checkSize = () => {
      const w = window.innerWidth;
      const mobile = w < 768;
      const tablet = w >= 768 && w < 1024;
      setIsMobile(mobile);
      setIsTablet(tablet);
      // Auto-collapse on tablet, close drawer on mobile when resizing to desktop
      if (w >= 1024) {
        setIsMobileOpen(false);
        setCollapsed(false);
      } else if (tablet) {
        setIsMobileOpen(false);
        setCollapsed(true);
      } else if (mobile) {
        setIsMobileOpen(false);
      }
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  React.useEffect(() => {
    if (!user) return;
    fetchAllowedMenuKeys(user).then(setAllowedKeys);
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    const pending = consumeCompanyScopeToast();
    if (pending) showToast(pending, "success");
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const apiMenus = await fetchUserMenuTree(user);
        setAllMenuPaths(Array.from(new Set(flattenPaths(apiMenus))));
        const keys = allowedKeys || await fetchAllowedMenuKeys(user);
        setAvailablePaths(keys.length ? Array.from(new Set(flattenPaths(apiMenus))) : []);
      } catch (error) {
        console.error("Failed to load route menu tree:", error);
        setAllMenuPaths([]);
        setAvailablePaths([]);
      }
    };
    load();
  }, [user, allowedKeys]);

  React.useEffect(() => {
    const handler = () => {
      clearMenuCache();
      fetchAllowedMenuKeys(user).then((keys) => {
        setAllowedKeys(keys);
      });
    };
    window.addEventListener('menu-cache-cleared', handler);
    return () => window.removeEventListener('menu-cache-cleared', handler);
  }, [user]);

  const isRouteBlocked = React.useMemo(() => {
    if (allowedKeys === undefined) return false;
    if (!user) return false;
    return allMenuPaths.includes(location.pathname) && !availablePaths.includes(location.pathname);
  }, [allowedKeys, user, allMenuPaths, availablePaths, location.pathname]);

  React.useEffect(() => {
    const prioritizedPaths = ['/dashboard', ...availablePaths]
      .filter((path, index, arr) => arr.indexOf(path) === index)
      .filter((path) => path !== location.pathname)
      .slice(0, 10);

    const prefetchVisiblePages = async () => {
      const shouldMeasure = import.meta.env.DEV && typeof performance !== 'undefined';
      const measurePrefix = `prefetch:${location.pathname}`;
      const startTime = shouldMeasure ? performance.now() : 0;

      if (shouldMeasure) {
        performance.mark(`${measurePrefix}:start`);
      }

      const tasks: Promise<unknown>[] = [];

      for (const path of prioritizedPaths) {
        const prefetch = routePrefetchers[path];
        if (prefetch) {
          tasks.push(prefetch());
        }
      }

      if (tasks.length > 0) {
        await Promise.allSettled(tasks);
      }

      if (shouldMeasure) {
        performance.mark(`${measurePrefix}:end`);
        performance.measure(`${measurePrefix}:duration`, `${measurePrefix}:start`, `${measurePrefix}:end`);
      }
    };

    const w = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    let timeoutId: number | null = null;
    let idleId: number | null = null;

    if (typeof w.requestIdleCallback === 'function') {
      idleId = w.requestIdleCallback(() => {
        void prefetchVisiblePages();
      }, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(() => {
        void prefetchVisiblePages();
      }, 700);
    }

    return () => {
      if (idleId !== null && typeof w.cancelIdleCallback === 'function') {
        w.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [availablePaths, location.pathname]);

  const toggleSidebar = () => {
    if (isMobile || isTablet) {
      // On mobile/tablet: toggle drawer open/close
      setIsMobileOpen((prev) => !prev);
    } else {
      // On desktop: toggle collapse
      setCollapsed((prev) => !prev);
    }
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  return (
    <div className="dashboard-layout">
      {/* Overlay backdrop for mobile/tablet */}
      <div
        className={`sidebar-overlay ${isMobileOpen ? 'visible' : ''}`}
        onClick={closeMobileSidebar}
        aria-hidden="true"
      />
      <Sidebar collapsed={collapsed} isMobileOpen={isMobileOpen} onClose={closeMobileSidebar} />
      <div className="dashboard-main">
        <Header toggleSidebar={toggleSidebar} />
        <main className="dashboard-content">
          <React.Suspense fallback={<RouteSuspenseFallback />}>
            {/* Menu/permission loading should not block the page itself. Backend
                APIs remain the source of truth for authorization. */}
            {isRouteBlocked ? <NotFoundPage /> : (outlet || <NotFoundPage />)}
          </React.Suspense>
        </main>
      </div>
    </div>
  );
};
