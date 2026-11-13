// ========================
// PAYLOAD
// ========================
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

// ========================
// USER
// ========================
export interface User {
  id: number;
  name: string;
  email: string;
  role: {
    name: string;
  };
}

// ========================
// RESPONSE
// ========================
export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}