import { useState, useEffect } from "react";
import { getStoredUser, getStoredTenant, isAuthenticated, type User, type Tenant } from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (isAuthenticated()) {
        const storedUser = getStoredUser();
        const storedTenant = getStoredTenant();
        setUser(storedUser);
        setTenant(storedTenant);
      } else {
        // Auto-login for development
        try {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: "demo",
              password: "demo123"
            }),
          });

          if (response.ok) {
            const data = await response.json();
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            if (data.tenant) {
              localStorage.setItem("tenant", JSON.stringify(data.tenant));
            }
            setUser(data.user);
            setTenant(data.tenant);
          }
        } catch (error) {
          console.log("Auto-login failed, proceeding without authentication");
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const updateTenant = (newTenant: Tenant) => {
    setTenant(newTenant);
    localStorage.setItem("tenant", JSON.stringify(newTenant));
  };

  return {
    user,
    tenant,
    isLoading,
    isAuthenticated: isAuthenticated(),
    updateTenant
  };
}
