import type { AuthUser } from "@/shared/types/rbac.types";
import type { ApiMenuNode, MenuItem } from "./menu";
import { mapApiMenuTree } from "./menu";
import { api } from "@/shared/api/httpClient";
import { useAuthStore } from "@/app/store/auth.store";
import { RBACUtils } from "@/shared/hooks/rbac";

let cachePromise: Promise<string[]> | null = null;
let treeCachePromise: Promise<MenuItem[]> | null = null;

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
        useAuthStore.getState().setAllowedMenuKeys(keys);
        useAuthStore.getState().setMenuKeysLoaded(true);
        return keys;
      } catch {
        useAuthStore.getState().setAllowedMenuKeys([]);
      }
      useAuthStore.getState().setMenuKeysLoaded(true);
      return [];
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
  useAuthStore.getState().setAllowedMenuKeys([]);
  useAuthStore.getState().setMenuKeysLoaded(false);
};

export const fetchUserMenuTree = async (user: AuthUser | null = null): Promise<MenuItem[]> => {
  if (!user?.roles?.length) {
    const res = await api.get<{ data?: ApiMenuNode[] }>("/presentation/menus");
    return mapApiMenuTree(Array.isArray(res.data?.data) ? res.data.data : []);
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
