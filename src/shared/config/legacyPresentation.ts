export const isLegacyPresentationSession = (): boolean => {
  if (typeof window === "undefined") return false;

  const hasToken = Boolean(sessionStorage.getItem("token"));
  if (hasToken) return false;

  try {
    const rawUser = sessionStorage.getItem("user");
    if (!rawUser) return false;
    const user = JSON.parse(rawUser) as { roles?: unknown[]; permissions?: unknown[] };
    return (!Array.isArray(user.roles) || user.roles.length === 0) &&
      (!Array.isArray(user.permissions) || user.permissions.length === 0);
  } catch {
    return false;
  }
};
