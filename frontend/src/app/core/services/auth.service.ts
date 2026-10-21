import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthUser { id: string; organizationId: string; name: string; email: string; role: string; }
export interface LoginResponse { success: boolean; data: { token: string; user: AuthUser }; }

const API = 'http://localhost:5000/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'pcms-token';
  private readonly userKey = 'pcms-user';

  constructor(private http: HttpClient) {}

  login(credentials: { organizationCode: string; email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API}/auth/login`, credentials).pipe(tap(response => {
      localStorage.setItem(this.tokenKey, response.data.token);
      localStorage.setItem(this.userKey, JSON.stringify(response.data.user));
    }));
  }

  logout(): Observable<unknown> {
    return this.http.post(`${API}/auth/logout`, {}).pipe(tap(() => this.clearSession()));
  }

  clearSession(): void { localStorage.removeItem(this.tokenKey); localStorage.removeItem(this.userKey); }
  get token(): string | null { return localStorage.getItem(this.tokenKey); }
  get user(): AuthUser | null {
    try { return JSON.parse(localStorage.getItem(this.userKey) ?? 'null') as AuthUser | null; } catch { return null; }
  }
  get isAuthenticated(): boolean { return Boolean(this.token); }
}
