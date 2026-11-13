import {
  fetchUserMenus,
  getGoogleAuthRedirect,
  handleGoogleAuthCallback,
  login,
  logout,
  register,
} from "../api/auth.service";
import type { RegisterPayload } from "../api/auth.service";
import { useAuthStore } from "@/app/store/auth.store";
import type { AuthUser, Role, Permission } from "@/shared/types/rbac.types";

const TOKEN_KEYS = ["token", "access_token", "jwt", "bearer_token"];
const USER_KEYS = ["user", "user_info", "userData", "profile"];

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const getFirstExistingValue = (source: UnknownRecord, keys: string[]): unknown => {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return null;
};

const normalizeRoleValue = (value: unknown): Role | null => {
  if (typeof value === "string" && value.trim().length > 0) {
    return { id: 0, name: value.trim().toLowerCase(), display_name: value.trim() };
  }

  if (value && typeof value === "object") {
    const role = value as UnknownRecord;
    const roleName = role.name || role.slug || role.role_name;

    if (typeof roleName === "string" && roleName.trim().length > 0) {
      const rawPermissions = Array.isArray(role.permissions) ? role.permissions : [];
      return {
        id: typeof role.id === 'number' ? role.id : 0,
        name: roleName.trim().toLowerCase(),
        display_name: typeof role.display_name === 'string' ? role.display_name : roleName,
        description: typeof role.description === 'string' ? role.description : undefined,
        permissions: rawPermissions.map((p: unknown) => {
          const perm = toRecord(p);
          const pName = typeof perm.name === 'string' ? perm.name : '';
          return {
            id: typeof perm.id === 'number' ? perm.id : 0,
            name: pName,
            display_name: typeof perm.display_name === 'string' ? perm.display_name : pName,
            description: typeof perm.description === 'string' ? perm.description : undefined,
          };
        }),
        created_at: typeof role.created_at === 'string' ? role.created_at : undefined,
        updated_at: typeof role.updated_at === 'string' ? role.updated_at : undefined,
      };
    }
  }

  return null;
};

/**
 * Normalisasi data user dan token dari response API
 */
const extractAuthFromResponse = (data: unknown) => {
  const root = toRecord(data);
  const responseData = toRecord(root.data ?? root);
  const nestedData = toRecord(responseData.data);

  const user =
    getFirstExistingValue(responseData, USER_KEYS) ??
    getFirstExistingValue(nestedData, USER_KEYS) ??
    null;

  // Normalisasi roles dan permissions
  if (user && typeof user === "object") {
    const userObj = user as UnknownRecord;
    const normalizedRoles: Role[] = [];

    if (Array.isArray(userObj.roles)) {
      for (const role of userObj.roles) {
        const normalizedRole = normalizeRoleValue(role);
        if (normalizedRole) {
          normalizedRoles.push(normalizedRole);
        }
      }
    }

    if (normalizedRoles.length === 0) {
      const fallbackRole =
        normalizeRoleValue(userObj.role) ||
        normalizeRoleValue(userObj.role_name) ||
        normalizeRoleValue(userObj.position);

      if (fallbackRole) {
        normalizedRoles.push(fallbackRole);
      }
    }

    userObj.roles = normalizedRoles;

    const allPermissions = new Map<string, Permission>();
    for (const role of normalizedRoles) {
      if (Array.isArray(role.permissions)) {
        for (const permission of role.permissions) {
          if (permission.name && !allPermissions.has(permission.name)) {
            allPermissions.set(permission.name, permission);
          }
        }
      }
    }

    if (Array.isArray(userObj.permissions)) {
      for (const p of userObj.permissions) {
        const permission = toRecord(p);
        const pName = typeof permission.name === 'string' ? permission.name : '';
        if (pName && !allPermissions.has(pName)) {
          allPermissions.set(pName, {
            id: typeof permission.id === 'number' ? permission.id : 0,
            name: pName,
            display_name: typeof permission.display_name === 'string' ? permission.display_name : pName,
            description: typeof permission.description === 'string' ? permission.description : undefined,
          });
        }
      }
    }

    userObj.permissions = Array.from(allPermissions.values());
  }

  const rawToken =
    getFirstExistingValue(responseData, TOKEN_KEYS) ??
    getFirstExistingValue(nestedData, TOKEN_KEYS) ??
    getFirstExistingValue(root, TOKEN_KEYS);

  const token = typeof rawToken === "string" ? rawToken : null;

  return { user, token };
};

export const useAuth = () => {
  const setAuth = useAuthStore.getState().setAuth;
  const setAllowedMenuKeys = useAuthStore.getState().setAllowedMenuKeys;
  const setMenuKeysLoaded = useAuthStore.getState().setMenuKeysLoaded;

  const syncDynamicMenus = async () => {
    try {
      const keys = await fetchUserMenus();
      setAllowedMenuKeys(keys);
      setMenuKeysLoaded(true);
    } catch {
      setMenuKeysLoaded(true);
    }
  };

  const handleLogin = async (payload: { email: string; password: string }) => {
    try {
      const resData = await login(payload);
      const { user, token } = extractAuthFromResponse(resData);

      if (!user) {
        throw { type: "general", message: "Data user tidak valid" };
      }

      setAuth(user as AuthUser, token);
      if (token) {
        await syncDynamicMenus();
      } else {
        setMenuKeysLoaded(true);
      }
      return { user, token };
    } catch (error: unknown) {
      const err = toRecord(error);
      if (err.type === "validation") {
        return { success: false, errors: err.errors };
      }
      throw error;
    }
  };

  const handleRegister = async (payload: RegisterPayload) => {
    try {
      const resData = await register(payload);
      const { user, token } = extractAuthFromResponse(resData);

      if (!token || !user) {
        throw { type: "general", message: "Data user atau token tidak valid" };
      }

      setAuth(user as AuthUser, token);
      await syncDynamicMenus();
      return { user, token };
    } catch (error: unknown) {
      const err = toRecord(error);
      if (err.type === "validation") {
        return { success: false, errors: err.errors };
      }
      throw error;
    }
  };

  const handleGoogleLogin = async () => {
    const responseData = await getGoogleAuthRedirect();
    const data = toRecord(responseData?.data ?? responseData);
    const redirectUrl = data?.url ?? data?.redirect_url ?? data?.redirectUrl ?? null;

    if (!redirectUrl) {
      throw new Error("URL redirect Google tidak ditemukan");
    }

    return redirectUrl as string;
  };

  const handleGoogleCallback = async (searchParams: URLSearchParams) => {
    const directToken = searchParams.get("token");
    const directUserStr = searchParams.get("user");

    if (directToken && directUserStr) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(directUserStr));
        const userWithRoles = extractAuthFromResponse({ data: { user: parsedUser } }).user || parsedUser;
        setAuth(userWithRoles as AuthUser, directToken);
        await syncDynamicMenus();
        return { user: userWithRoles, token: directToken };
      } catch (e) {
        console.error("Failed to parse user from URL params", e);
      }
    }

    const code = searchParams.get("code");
    if (!code) throw new Error("Parameter code OAuth tidak ditemukan");

    const resData = await handleGoogleAuthCallback({
      code,
      state: searchParams.get("state") ?? undefined,
      scope: searchParams.get("scope") ?? undefined,
      authuser: searchParams.get("authuser") ?? undefined,
      prompt: searchParams.get("prompt") ?? undefined,
    });

    const { user, token } = extractAuthFromResponse(resData);
    if (!token || !user) {
      throw new Error("Token atau User SSO tidak ditemukan");
    }

    setAuth(user as AuthUser, token);
    await syncDynamicMenus();
    return { user, token };
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Tetap terhapus di tingkat client melalui interceptor/store
    }
  };

  return {
    handleLogin,
    handleRegister,
    handleGoogleLogin,
    handleGoogleCallback,
    handleLogout,
  };
};
