export interface LocationItem {
  id: string | number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  department?: string;
  location_code?: string;
  project_id?: string;
  description?: string;
  is_default?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LocationCreatePayload {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  department?: string;
  location_code?: string;
  project_id?: string;
  description?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface LocationUpdatePayload {
  name: string;
  latitude?: number;
  longitude?: number;
  radius: number;
  department?: string;
  location_code?: string;
  project_id?: string;
  description?: string;
  is_default?: boolean;
  is_active?: boolean;
}
