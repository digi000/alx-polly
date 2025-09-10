export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error?: string;
}
