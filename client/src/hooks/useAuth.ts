import { useState, useEffect } from "react";

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  teamId?: string;
  tenantId: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");
        
        if (token && userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error("Auth check error:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/login";
  };

  const hasRole = (role: string) => {
    return user?.role === role;
  };

  const hasTeamAccess = (teamId: string) => {
    if (user?.role === 'admin') return true;
    return user?.teamId === teamId;
  };

  const canAccessAllTeams = () => {
    return user?.role === 'admin' || user?.role === 'manager';
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout,
    hasRole,
    hasTeamAccess,
    canAccessAllTeams
  };
}