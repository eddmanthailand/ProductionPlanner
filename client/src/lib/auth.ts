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
  user: User;
  tenant: Tenant | null;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest("POST", "/api/auth/login", { username, password });
  const data = await response.json();
  
  // Session-based auth - browser handles cookies automatically
  console.log("Login successful:", data.user.username);
  
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

export async function logout(): Promise<void> {
  try {
    // Call the server logout endpoint to destroy session
    await apiRequest("POST", "/api/auth/logout");
    console.log("Session logout successful");
  } catch (error) {
    console.log("Server logout failed:", error);
  } finally {
    // Redirect to login page
    window.location.href = '/login';
  }
}
