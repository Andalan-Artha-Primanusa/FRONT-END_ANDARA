import { api } from "@/shared/api/httpClient";
import { extractArrayPayload, extractPayload, parsePaginatedResponse, type PaginationParams } from "@/shared/api/pagination";
import { isLegacyPresentationSession } from "@/shared/config/legacyPresentation";
import type { LocationCreatePayload, LocationItem, LocationUpdatePayload } from "../types/location.types";

const isLocationItem = (item: unknown): item is LocationItem =>
  item !== null && typeof item === "object";

export const getLocationsPage = async (page = 1, perPage = 10, params: PaginationParams = {}) => {
  if (isLegacyPresentationSession()) {
    const response = await api.get("/presentation/legacy/attendance/locations");
    const allItems = extractArrayPayload(response.data, isLocationItem);
    const search = String(params.search ?? "").trim().toLowerCase();
    const filtered = search
      ? allItems.filter((item) => `${item.name ?? ""} ${item.id ?? ""}`.toLowerCase().includes(search))
      : allItems;
    const start = (page - 1) * perPage;
    const items = filtered.slice(start, start + perPage);
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    return { items, totalPages, total: filtered.length, currentPage: page, raw: response.data };
  }
  const response = await api.get("/locations", { params: { ...params, page, per_page: perPage } });
  const parsed = parsePaginatedResponse(response.data, isLocationItem);
  return {
    items: parsed.items,
    totalPages: parsed.totalPages,
    total: parsed.total,
    currentPage: parsed.currentPage,
    raw: response.data,
  };
};

export const getAllLocations = async () => {
  let page = 1;
  const perPage = 100;
  const items: LocationItem[] = [];

  while (page <= 50) {
    const result = await getLocationsPage(page, perPage);
    items.push(...result.items);
    if (page >= result.totalPages) break;
    page += 1;
  }

  return { items, raw: items };
};

export const getActiveLocations = async () => {
  const response = await api.get("/attendance/locations");
  return {
    items: extractArrayPayload(response.data, isLocationItem),
    raw: response.data,
  };
};

export const createLocation = async (payload: LocationCreatePayload) => {
  if (isLegacyPresentationSession()) {
    const response = await api.post("/presentation/legacy/attendance/locations", {
      ...payload,
      radius_meters: payload.radius,
      location_name: payload.name,
    });
    return { raw: response.data };
  }
  const response = await api.post("/locations", payload);
  return { raw: response.data };
};

export const getLocationDetail = async (id: string) => {
  if (isLegacyPresentationSession()) {
    const response = await api.get(`/presentation/legacy/attendance/locations`);
    const items = extractArrayPayload(response.data, isLocationItem);
    return { payload: items.find((item) => String(item.id) === id), raw: response.data };
  }
  const response = await api.get(`/locations/${id}`);
  return {
    payload: extractPayload(response.data),
    raw: response.data,
  };
};

export const updateLocation = async (id: string, payload: LocationUpdatePayload) => {
  if (isLegacyPresentationSession()) {
    const response = await api.put(`/presentation/legacy/attendance/locations/${id}`, {
      ...payload,
      radius_meters: payload.radius,
      location_name: payload.name,
    });
    return { raw: response.data };
  }
  const response = await api.put(`/locations/${id}`, payload);
  return { raw: response.data };
};

export const deleteLocation = async (id: string) => {
  if (isLegacyPresentationSession()) {
    const response = await api.delete(`/presentation/legacy/attendance/locations/${id}`);
    return { raw: response.data };
  }
  const response = await api.delete(`/locations/${id}`);
  return { raw: response.data };
};
