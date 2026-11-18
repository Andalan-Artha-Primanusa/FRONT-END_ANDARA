import type { AuthUser } from "@/shared/types/rbac.types";
import type { ApiMenuNode, MenuItem } from "./menu";
import { mapApiMenuTree } from "./menu";
import { api } from "@/shared/api/httpClient";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";

let cachePromise: Promise<string[]> | null = null;
let treeCachePromise: Promise<MenuItem[]> | null = null;
let presentationTreeCache: Promise<MenuItem[]> | null = null;

const PRESENTATION_MENU_FALLBACK: ApiMenuNode[] = [
  { key: 'presentation.dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
  {
    key: 'presentation.mobile', label: 'Menu Mobile', icon: 'Smartphone', path: '/andalan/mobile', children: [
      { key: 'presentation.mobile.news', label: 'Berita (Mobile)', icon: 'Newspaper', path: '/andalan/mobile/news' },
      { key: 'presentation.mobile.roster', label: 'Roster (Mobile)', icon: 'CalendarDays', path: '/andalan/mobile/roster' },
      { key: 'presentation.mobile.leave', label: 'Cuti & Izin (Mobile)', icon: 'FileText', path: '/andalan/mobile/leave' },
      { key: 'presentation.mobile.reimburse', label: 'Reimburse (Mobile)', icon: 'Wallet', path: '/andalan/mobile/reimburse' },
      { key: 'presentation.mobile.trips', label: 'Perjalanan Dinas (Mobile)', icon: 'CalendarDays', path: '/andalan/mobile/trips' },
    ],
  },
  { key: 'presentation.kpi', label: 'KPI & Kinerja (Mobile)', icon: 'Target', path: '/andalan/kpi' },
  {
    key: 'presentation.workforce', label: 'Menu Workforce', icon: 'Briefcase', path: '/andalan/workforce/payroll', children: [
      { key: 'presentation.workforce.payroll', label: 'Payroll (Mobile)', icon: 'Banknote', path: '/andalan/workforce/payroll' },
      { key: 'presentation.workforce.training', label: 'Training (Mobile)', icon: 'GraduationCap', path: '/andalan/workforce/training' },
      { key: 'presentation.workforce.assets', label: 'Asset (Mobile)', icon: 'Briefcase', path: '/andalan/workforce/assets' },
      { key: 'presentation.workforce.overtime', label: 'Overtime (Mobile)', icon: 'Clock', path: '/andalan/workforce/overtime' },
      { key: 'presentation.workforce.documents', label: 'Dokumen (Mobile)', icon: 'FileText', path: '/andalan/workforce/documents' },
    ],
  },
  { key: 'presentation.employees', label: 'Manajemen Karyawan', icon: 'Users', path: '/employees' },
  { key: 'presentation.attendance.monitoring', label: 'Monitoring Clock In/Out', icon: 'Clock', path: '/attendance/monitoring' },
  { key: 'presentation.attendance.check-in', label: 'Testing Clock In', icon: 'Clock', path: '/attendance/check-in' },
  { key: 'presentation.attendance.check-out', label: 'Testing Clock Out', icon: 'Clock', path: '/attendance/check-out' },
  { key: 'presentation.reimbursements', label: 'Manajemen Reimburse', icon: 'Receipt', path: '/reimbursements' },
  { key: 'presentation.kpis', label: 'KPI & Kinerja', icon: 'Target', path: '/kpis' },
  { key: 'presentation.master-data', label: 'Departemen & Posisi', icon: 'Building2', path: '/organization/master-data' },
  { key: 'presentation.locations', label: 'Lokasi', icon: 'MapPin', path: '/locations' },
];

const collectMenuKeys = (items: { key: string; children?: { key: string; children?: any[] }[] }[]): string[] =>
  items.flatMap((item) => [item.key, ...collectMenuKeys(item.children ?? [])]);

const stripAdminKeys = (keys: string[]): string[] => {
  return keys;
};

const computeFromAssignments = (
  items: { key: string; assigned_role_ids: number[] }[],
  user: AuthUser
): string[] | null => {
  if (!items.length) return null;
  const userRoleIds = new Set(user.roles.map((r) => r.id));
  const keys = items
    .filter((m) => m.assigned_role_ids.some((rid: number) => userRoleIds.has(rid)))
    .map((m) => m.key);
  return keys.length ? keys : null;
};

/**
 * Mengambil allowedMenuKeys terpusat dan memastikan sinkronisasi absolut dengan auth.store
 */
export const fetchAllowedMenuKeys = async (user: AuthUser | null = null): Promise<string[]> => {
  const storeKeys = useAuthStore.getState().allowedMenuKeys;
  if (storeKeys.length > 0) {
    useAuthStore.getState().setMenuKeysLoaded(true);
    return storeKeys;
  }
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    if (!user?.roles?.length) {
      try {
        type PresentationMenuNode = { key: string; children?: PresentationMenuNode[] };
        const presentation = await api.get<{ data?: PresentationMenuNode[] }>("/presentation/menus");
        const collectKeys = (items: PresentationMenuNode[]): string[] =>
          items.flatMap((item) => [item.key, ...collectKeys(item.children ?? [])]);
        const keys = collectKeys(presentation.data?.data ?? []);
        const fallbackKeys = collectMenuKeys(PRESENTATION_MENU_FALLBACK);
        const safeKeys = keys.length ? keys : fallbackKeys;
        useAuthStore.getState().setAllowedMenuKeys(safeKeys);
        useAuthStore.getState().setMenuKeysLoaded(true);
        return safeKeys;
      } catch {
        const fallbackKeys = collectMenuKeys(PRESENTATION_MENU_FALLBACK);
        useAuthStore.getState().setAllowedMenuKeys(fallbackKeys);
        useAuthStore.getState().setMenuKeysLoaded(true);
        return fallbackKeys;
      }
    }

    // Sumber kebenaran = backend. Kedua request ini tidak saling bergantung,
    // jadi jalankan bersamaan agar latency SQL Server tidak terakumulasi.
    const [permissionResult, assignmentResult] = await Promise.allSettled([
      api.get<{ data?: string[] }>("/user/menus"),
      api.get<{ data?: { items?: { key: string; assigned_role_ids: number[] }[] } }>(
        "/admin/menus",
        { validateStatus: () => true }
      ),
    ]);

    const permissionKeys = permissionResult.status === "fulfilled"
      ? stripAdminKeys(Array.isArray(permissionResult.value.data?.data) ? permissionResult.value.data.data : [])
      : [];

    // Batasan tambahan: hanya menu yang di-assign ke role user.
    const assignmentResponse = assignmentResult.status === "fulfilled" ? assignmentResult.value : null;
    const assignmentKeys = assignmentResponse?.status === 200
      ? computeFromAssignments(assignmentResponse.data?.data?.items ?? [], user)
      : null;

    // intersection: menu harus lolos permission filter (backend) DAN role assignment (bila ada).
    const effectiveKeys =
      assignmentKeys === null
        ? permissionKeys
        : permissionKeys.filter((key) => assignmentKeys!.includes(key));

    useAuthStore.getState().setAllowedMenuKeys(effectiveKeys);
    useAuthStore.getState().setMenuKeysLoaded(true);
    return effectiveKeys;
  })();

  try {
    return await cachePromise;
  } finally {
    cachePromise = null;
  }
};

export const clearMenuCache = () => {
  cachePromise = null;
  treeCachePromise = null;
  presentationTreeCache = null;
  useAuthStore.getState().setAllowedMenuKeys([]);
  useAuthStore.getState().setMenuKeysLoaded(false);
};

export const fetchUserMenuTree = async (user: AuthUser | null = null): Promise<MenuItem[]> => {
  if (!user?.roles?.length) {
    if (presentationTreeCache) return presentationTreeCache;
    presentationTreeCache = Promise.resolve(mapApiMenuTree(PRESENTATION_MENU_FALLBACK));
    return presentationTreeCache;
  }
  if (treeCachePromise) return treeCachePromise;

  treeCachePromise = (async () => {
    const res = await api.get<{ data?: ApiMenuNode[] }>("/user/menu-tree");
    return mapApiMenuTree(Array.isArray(res.data?.data) ? res.data.data : []);
  })();

  try {
    return await treeCachePromise;
  } finally {
    treeCachePromise = null;
  }
};

const filterByKeys = (items: MenuItem[], allowedKeys: Set<string>, user: AuthUser): MenuItem[] => {
  const isSuperAdmin = RBACUtils.isSuperAdmin(user);
  return items
    .filter((item) => isSuperAdmin || !item.menuKey || allowedKeys.has(item.menuKey))
    .map((item) => ({
      ...item,
      subItems: item.subItems ? filterByKeys(item.subItems, allowedKeys, user) : undefined,
    }))
    .filter((item) => !item.subItems || item.subItems.length > 0);
};

/**
 * Menyaring menu item secara dinamis menggunakan Single Source of Truth dari auth.store
 */
export const filterMenuItems = (
  user: AuthUser | null,
  items: MenuItem[],
  allowedKeys?: string[]
): MenuItem[] => {
  if (!user) return [];

  const effectiveKeys = allowedKeys !== undefined
    ? allowedKeys
    : useAuthStore.getState().allowedMenuKeys;

  if (effectiveKeys.length === 0) return [];

  return filterByKeys(items, new Set(effectiveKeys), user);
};
