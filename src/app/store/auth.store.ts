import { create } from 'zustand';
import type { AuthUser, Role, Permission, CompanyContext } from '@/shared/types/rbac.types';

export type SelectedCompanyId = number | "all" | null;

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  allowedMenuKeys: string[];
  menuKeysLoaded: boolean;
  selectedCompanyId: SelectedCompanyId;
  companyContext: CompanyContext | null;
  setAuth: (user: AuthUser, token: string | null) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
  setAllowedMenuKeys: (keys: string[]) => void;
  setMenuKeysLoaded: (loaded: boolean) => void;
  setSelectedCompanyId: (companyId: SelectedCompanyId) => void;
  setCompanyContext: (context: CompanyContext | null) => void;
}

const getStoredUser = (): AuthUser | null => {
  const rawUser = sessionStorage.getItem("user");

  if (!rawUser) return null;

  try {
    const parsed = JSON.parse(rawUser) as Record<string, unknown>;
    
    const roles: Role[] = Array.isArray(parsed.roles) ? (parsed.roles as Role[]) : [];

    let fallbackRoleName: string | null = null;
    if (typeof parsed.role_name === "string") {
      fallbackRoleName = parsed.role_name.trim().toLowerCase();
    } else if (typeof parsed.role === "string") {
      fallbackRoleName = parsed.role.trim().toLowerCase();
    } else if (typeof parsed.position === "string") {
      fallbackRoleName = parsed.position.trim().toLowerCase();
    }

    const normalizedRoles: Role[] =
      roles.length > 0
        ? roles
        : fallbackRoleName
          ? [{ id: 0, name: fallbackRoleName, display_name: fallbackRoleName }]
          : [];
    
    let permissions: Permission[] = Array.isArray(parsed.permissions) ? (parsed.permissions as Permission[]) : [];
    if (permissions.length === 0 && normalizedRoles.length > 0) {
      const permMap = new Map<string, Permission>();
      for (const role of normalizedRoles) {
        if (Array.isArray(role.permissions)) {
          for (const perm of role.permissions as Permission[]) {
            if (perm.name && !permMap.has(perm.name)) {
              permMap.set(perm.name, perm);
            }
          }
        }
      }
      permissions = Array.from(permMap.values());
    }
    
    return {
      ...(parsed as unknown as AuthUser),
      id: typeof parsed.id === 'number' ? parsed.id : 0,
      name: typeof parsed.name === 'string' ? parsed.name : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      roles: normalizedRoles,
      permissions,
    };
  } catch {
    return null;
  }
};

const getStoredToken = (): string | null => sessionStorage.getItem("token");

const getStoredAllowedMenuKeys = (): string[] => {
  const raw = sessionStorage.getItem("allowedMenuKeys");
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const getStoredSelectedCompanyId = (): SelectedCompanyId => {
  const raw = sessionStorage.getItem("selectedCompanyId");
  if (!raw) return null;
  if (raw === "all") return "all";
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  token: getStoredToken(),
  // Legacy SQL Server login may intentionally return no Sanctum token.
  // A persisted user is still a valid presentation session in that mode.
  isAuthenticated: Boolean(getStoredToken() || getStoredUser()),
  allowedMenuKeys: getStoredAllowedMenuKeys(),
  menuKeysLoaded: getStoredAllowedMenuKeys().length > 0,
  selectedCompanyId: getStoredSelectedCompanyId(),
  companyContext: null,
  setAuth: (user: AuthUser, token: string | null) => {
    const authUser: AuthUser = {
      ...user,
      roles: user.roles ?? [],
      permissions: user.permissions ?? [],
    };
    if (token) {
      sessionStorage.setItem("token", token);
    } else {
      sessionStorage.removeItem("token");
    }
    sessionStorage.setItem("user", JSON.stringify(authUser));
    set({ user: authUser, token, isAuthenticated: true });
  },
  updateUser: (user: AuthUser) => {
    const authUser: AuthUser = {
      ...user,
      roles: user.roles ?? [],
      permissions: user.permissions ?? [],
    };
    sessionStorage.setItem("user", JSON.stringify(authUser));
    set({ user: authUser });
  },
  setAllowedMenuKeys: (keys: string[]) => {
    sessionStorage.setItem("allowedMenuKeys", JSON.stringify(keys));
    set({ allowedMenuKeys: keys });
  },
  setMenuKeysLoaded: (loaded: boolean) => {
    set({ menuKeysLoaded: loaded });
  },
  setSelectedCompanyId: (companyId: SelectedCompanyId) => {
    if (companyId === null) {
      sessionStorage.removeItem("selectedCompanyId");
    } else {
      sessionStorage.setItem("selectedCompanyId", String(companyId));
    }
    set({ selectedCompanyId: companyId });
  },
  setCompanyContext: (context: CompanyContext | null) => {
    set({ companyContext: context });
  },
  logout: () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("allowedMenuKeys");
    sessionStorage.removeItem("selectedCompanyId");
    set({ user: null, token: null, isAuthenticated: false, allowedMenuKeys: [], menuKeysLoaded: false, selectedCompanyId: null, companyContext: null });
  },
}));
