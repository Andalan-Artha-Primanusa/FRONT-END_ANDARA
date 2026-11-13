const STORAGE_KEY = "company-scope-pending-toast";

export const queueCompanyScopeToast = (companyLabel: string) => {
  sessionStorage.setItem(STORAGE_KEY, companyLabel);
};

export const consumeCompanyScopeToast = (): string | null => {
  const label = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  return label && label.trim() ? `Scope company diubah ke ${label}` : null;
};