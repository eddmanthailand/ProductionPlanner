import { apiRequest } from "./queryClient";

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  tenant: Tenant | null;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest("POST", "/api/auth/login", { username, password });
  const data = await response.json();
  
  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    if (data.tenant) {
      localStorage.setItem("tenant", JSON.stringify(data.tenant));
    }
  }
  
  return data;
}

export async function register(userData: {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
}): Promise<User> {
  const response = await apiRequest("POST", "/api/auth/register", userData);
  return await response.json();
}

export function logout(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("tenant");
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function getStoredUser(): User | null {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
}

export function getStoredTenant(): Tenant | null {
  const tenantStr = localStorage.getItem("tenant");
  return tenantStr ? JSON.parse(tenantStr) : null;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
