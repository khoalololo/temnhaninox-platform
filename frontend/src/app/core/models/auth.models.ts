export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthApiResponse {
  accessToken: string;
  tokenType: string;
  expiresInMs: number;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  defaultAddress?: string;
  role: UserRole;
  createdAt?: string;
}

export interface AdminCustomer extends UserProfile {
  isActive: boolean;
}

export interface UpdateProfileRequest {
  fullName: string;
  phone?: string;
  defaultAddress?: string;
}

export interface VatProfile {
  id: string;
  companyName: string;
  taxCode: string;
  companyAddress: string;
  isDefault?: boolean;
}

export interface CreateVatProfileRequest {
  companyName: string;
  taxCode: string;
  companyAddress: string;
  isDefault?: boolean;
}
