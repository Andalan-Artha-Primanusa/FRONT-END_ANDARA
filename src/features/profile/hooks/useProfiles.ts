import { useState } from "react";
import {
  createProfile,
  deleteProfile,
  getProfileDetail,
  getProfiles,
  updateProfile,
} from "../api/profile.service";
import type { Profile, ProfilePayload } from "../types/profile.types";

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const getErrorMessage = (error: unknown, fallback: string) => {
  const parsedError = toRecord(error);
  const response = toRecord(parsedError.response);
  const responseData = toRecord(response.data);
  const responseErrors = toRecord(responseData.errors);

  // 🔒 SECURITY: Don't log sensitive error details to console
  
  if (typeof responseData.message === "string" && responseData.message.trim()) {
    return responseData.message;
  }

  const firstError = Object.values(responseErrors).find((value) => typeof value === "string");
  if (typeof firstError === "string" && firstError.trim()) {
    return firstError;
  }

  if (typeof parsedError.message === "string" && parsedError.message.trim()) {
    return parsedError.message;
  }

  return fallback;
};

const toPrettyText = (payload: unknown) =>
  typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);

export const useProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [responseText, setResponseText] = useState("");
  const [statusMessage, setStatusMessage] = useState("Ready to call API");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProfiles = async (options?: {
    preserveResponse?: boolean;
    preserveStatus?: boolean;
    silentLoading?: boolean;
  }) => {
    if (!options?.silentLoading) {
      setLoading(true);
    }
    setErrorMessage(null);
    if (!options?.preserveStatus) {
      setStatusMessage("Memuat profiles...");
    }

    try {
      const result = await getProfiles();
      setProfiles(result.profiles);
      if (!options?.preserveResponse) {
        setResponseText(toPrettyText(result.raw));
      }
      if (!options?.preserveStatus) {
        setStatusMessage("Profiles berhasil dimuat.");
      }
      return result.profiles;
    } catch (error) {
      const message = getErrorMessage(error, "Gagal memuat profiles.");
      setErrorMessage(message);
      setStatusMessage("Gagal memuat profiles.");
      setResponseText(message);
      throw error;
    } finally {
      if (!options?.silentLoading) {
        setLoading(false);
      }
    }
  };

  const createNewProfile = async (payload: ProfilePayload) => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage("Membuat profile...");

    try {
      const result = await createProfile(payload);
      setSelectedProfile(result.profile);
      setResponseText(toPrettyText(result.raw));
      setStatusMessage("Profile berhasil dibuat.");
      await loadProfiles({ preserveResponse: true, preserveStatus: true, silentLoading: true });
      return result.profile;
    } catch (error) {
      const message = getErrorMessage(error, "Gagal membuat profile.");
      setErrorMessage(message);
      setStatusMessage("Gagal membuat profile.");
      setResponseText(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getProfileById = async (id: string) => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage("Memuat detail profile...");

    try {
      const result = await getProfileDetail(id);
      setSelectedProfile(result.profile);
      setResponseText(toPrettyText(result.raw));
      setStatusMessage("Detail profile berhasil dimuat.");
      return result.profile;
    } catch (error) {
      const message = getErrorMessage(error, "Gagal memuat detail profile.");
      setErrorMessage(message);
      setStatusMessage("Gagal memuat detail profile.");
      setResponseText(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfileById = async (id: string, payload: ProfilePayload) => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage("Mengupdate profile...");

    try {
      const result = await updateProfile(id, payload);
      setSelectedProfile(result.profile);
      setResponseText(toPrettyText(result.raw));
      setStatusMessage("Profile berhasil diupdate.");
      await loadProfiles({ preserveResponse: true, preserveStatus: true, silentLoading: true });
      return result.profile;
    } catch (error) {
      const message = getErrorMessage(error, "Gagal mengupdate profile.");
      setErrorMessage(message);
      setStatusMessage("Gagal mengupdate profile.");
      setResponseText(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteProfileById = async (id: string) => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage("Menghapus profile...");

    try {
      const result = await deleteProfile(id);
      setSelectedProfile(null);
      setResponseText(toPrettyText(result.raw));
      setStatusMessage("Profile berhasil dihapus.");
      await loadProfiles({ preserveResponse: true, preserveStatus: true, silentLoading: true });
    } catch (error) {
      const message = getErrorMessage(error, "Gagal menghapus profile.");
      setErrorMessage(message);
      setStatusMessage("Gagal menghapus profile.");
      setResponseText(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    profiles,
    selectedProfile,
    responseText,
    statusMessage,
    errorMessage,
    loading,
    loadProfiles,
    createNewProfile,
    getProfileById,
    updateProfileById,
    deleteProfileById,
  };
};
