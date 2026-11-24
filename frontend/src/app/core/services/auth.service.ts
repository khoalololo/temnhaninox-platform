import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/api.models';
import {
  AuthResponse,
  CreateVatProfileRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  UserProfile,
  VatProfile,
} from '../models/auth.models';

const TOKEN_KEY = 'tni_token';
const USER_KEY = 'tni_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(this.readStoredToken());
  private readonly _currentUser = signal<AuthResponse | null>(this.readStoredUser());

  readonly token = this._token.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly isAdmin = computed(() => this._currentUser()?.role === 'ADMIN');

  login(payload: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>('/api/v1/auth/login', payload).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.persistAuth(res.data);
        }
      })
    );
  }

  register(payload: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>('/api/v1/auth/register', payload).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.persistAuth(res.data);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._currentUser.set(null);
    this.router.navigate(['/']);
  }

  getProfile(): Observable<ApiResponse<UserProfile>> {
    return this.http.get<ApiResponse<UserProfile>>('/api/v1/users/me');
  }

  updateProfile(payload: UpdateProfileRequest): Observable<ApiResponse<UserProfile>> {
    return this.http.put<ApiResponse<UserProfile>>('/api/v1/users/me', payload).pipe(
      tap((res) => {
        if (res.success && res.data) {
          const current = this._currentUser();
          if (current) {
            const updated: AuthResponse = { ...current, fullName: res.data.fullName };
            localStorage.setItem(USER_KEY, JSON.stringify(updated));
            this._currentUser.set(updated);
          }
        }
      })
    );
  }

  getVatProfiles(): Observable<ApiResponse<VatProfile[]>> {
    return this.http.get<ApiResponse<VatProfile[]>>('/api/v1/users/me/vat-profiles');
  }

  createVatProfile(payload: CreateVatProfileRequest): Observable<ApiResponse<VatProfile>> {
    return this.http.post<ApiResponse<VatProfile>>('/api/v1/users/me/vat-profiles', payload);
  }

  deleteVatProfile(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`/api/v1/users/me/vat-profiles/${id}`);
  }

  private persistAuth(auth: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, auth.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(auth));
    this._token.set(auth.accessToken);
    this._currentUser.set(auth);
  }

  private readStoredToken(): string | null {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  }

  private readStoredUser(): AuthResponse | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthResponse;
    } catch {
      return null;
    }
  }
}
