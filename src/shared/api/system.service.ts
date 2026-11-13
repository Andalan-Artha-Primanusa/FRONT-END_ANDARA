import { api } from "@/shared/api/httpClient";

export const getHealthCheck = async () => {
  const response = await api.get("/");
  return {
    payload: response.data,
    raw: response.data,
  };
};
