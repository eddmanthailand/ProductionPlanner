import { useState, useEffect } from "react";
import { getStoredUser, getStoredTenant, isAuthenticated, type User, type Tenant } from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated()) {
      const storedUser = getStoredUser();
      const storedTenant = getStoredTenant();
      setUser(storedUser);
      setTenant(storedTenant);
    }
    setIsLoading(false);
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
