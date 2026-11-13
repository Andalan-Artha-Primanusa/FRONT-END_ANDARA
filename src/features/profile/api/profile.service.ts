import { api } from "@/shared/api/httpClient";
import type { Profile, ProfilePayload } from "../types/profile.types";

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const toProfile = (value: unknown): Profile | null => {
  const record = toRecord(value);
  const id = record.id;

  if (typeof id !== "string" && typeof id !== "number") {
    return null;
  }

  return record as Profile;
};

const extractPayload = (raw: unknown) => {
  const root = toRecord(raw);
  return root.data ?? raw;
};

const extractProfilesList = (raw: unknown): Profile[] => {
  const payload = extractPayload(raw);

  if (Array.isArray(payload)) {
    return payload.map(toProfile).filter((item): item is Profile => item !== null);
  }

  const payloadRecord = toRecord(payload);
  const candidates = [payloadRecord.items, payloadRecord.rows, payloadRecord.profiles, payloadRecord.data];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(toProfile).filter((item): item is Profile => item !== null);
    }
  }

  return [];
};

const extractSingleProfile = (raw: unknown): Profile | null => {
  const payload = extractPayload(raw);
  const direct = toProfile(payload);

  if (direct) {
    return direct;
  }

  const payloadRecord = toRecord(payload);
  const nestedCandidates = [payloadRecord.profile, payloadRecord.user, payloadRecord.result];

  for (const candidate of nestedCandidates) {
    const nestedProfile = toProfile(candidate);
    if (nestedProfile) {
      return nestedProfile;
    }
  }

  return null;
};

export const getProfiles = async () => {
  const response = await api.get("/profiles");
  return {
    profiles: extractProfilesList(response.data),
    raw: response.data,
  };
};

export const createProfile = async (payload: ProfilePayload) => {
  const response = await api.post("/profiles", payload);
  return {
    profile: extractSingleProfile(response.data),
    raw: response.data,
  };
};

export const getProfileDetail = async (id: string) => {
  const response = await api.get(`/profiles/${id}`);
  return {
    profile: extractSingleProfile(response.data),
    raw: response.data,
  };
};

export const updateProfile = async (id: string, payload: ProfilePayload) => {
  const response = await api.put(`/profiles/${id}`, payload);
  return {
    profile: extractSingleProfile(response.data),
    raw: response.data,
  };
};

export const deleteProfile = async (id: string) => {
  const response = await api.delete(`/profiles/${id}`);
  return {
    raw: response.data,
  };
};
