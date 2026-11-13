import { api } from "@/shared/api/httpClient";

export type AndalanNews = {
  id: string | number;
  title?: string | null;
  summary?: string | null;
  content?: string | null;
  category?: string | null;
  cover_image_url?: string | null;
  published_at?: string | null;
};

export type AndalanNewsPayload = {
  title: string;
  summary?: string;
  content?: string;
  category?: string;
  cover_image_url?: string;
  is_published?: boolean;
  published_at?: string;
  created_by_user_id?: string;
};

export type AndalanRoster = {
  id: string | number;
  roster_date?: string | null;
  user_id?: string | null;
  salary_number?: string | null;
  employee_id?: string | null;
  employee_name?: string | null;
  leave_type?: string | null;
  roster_type?: string | null;
  status?: string | null;
  notes?: string | null;
};

export type AndalanRosterPayload = {
  roster_date: string;
  user_id?: string;
  salary_number?: string;
  employee_id?: string;
  employee_name: string;
  roster_type?: string;
  leave_type?: string;
  status?: "planned" | "approved" | "cancelled";
  notes?: string;
  created_by_user_id?: string;
};

export type AndalanRequest = {
  id: string | number;
  leave_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  total_days?: number | null;
  title?: string | null;
  category?: string | null;
  amount?: number | string | null;
  expense_date?: string | null;
  purpose?: string | null;
  destination?: string | null;
  estimated_amount?: number | string | null;
  description?: string | null;
  status?: string | null;
};

const payload = (response: { data?: unknown }) => {
  const root = response.data && typeof response.data === "object" ? response.data as Record<string, unknown> : {};
  return root.data ?? response.data;
};

const list = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

export const getAndalanNews = async () => list<AndalanNews>(payload(await api.get("/presentation/andalan/mobile/news?limit=50")));
export const createAndalanNews = async (data: AndalanNewsPayload) => payload(await api.post("/presentation/andalan/mobile/news", data));
export const updateAndalanNews = async (id: string | number, data: AndalanNewsPayload & { updated_by_user_id?: string }) => payload(await api.put(`/presentation/andalan/mobile/news/${id}`, data));
export const getAndalanRoster = async () => list<AndalanRoster>(payload(await api.get("/presentation/andalan/mobile/roster")));
export const createAndalanRoster = async (data: AndalanRosterPayload) => payload(await api.post("/presentation/andalan/mobile/roster", data));
export const updateAndalanRoster = async (id: string | number, data: AndalanRosterPayload & { updated_by_user_id?: string }) => payload(await api.put(`/presentation/andalan/mobile/roster/${id}`, data));

export const getAndalanRequests = async (userId: string) => {
  const encodedUser = encodeURIComponent(userId);
  const [leaves, reimbursements, trips] = await Promise.all([
    api.get(`/presentation/andalan/mobile/leaves/${encodedUser}`),
    api.get(`/presentation/andalan/mobile/reimbursements/${encodedUser}`),
    api.get(`/presentation/andalan/mobile/business-trips/${encodedUser}`),
  ]);

  return {
    leaves: list<AndalanRequest>(payload(leaves)),
    reimbursements: list<AndalanRequest>(payload(reimbursements)),
    trips: list<AndalanRequest>(payload(trips)),
  };
};
