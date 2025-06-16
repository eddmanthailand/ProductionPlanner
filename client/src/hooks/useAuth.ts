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
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");
        
        console.log("Auth check - token exists:", !!token, "user data exists:", !!userData);
        
        if (token && userData) {
          // Verify token with server
          try {
            const response = await fetch("/api/auth/me", {
              headers: {
                "Authorization": `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const serverUser = await response.json();
              setUser(serverUser);
              console.log("Auth verified with server:", serverUser.username);
            } else {
              console.log("Token invalid, clearing auth data");
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              setUser(null);
            }
          } catch (err) {
            console.log("Server verification failed, clearing auth data");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setUser(null);
          }
        } else {
          console.log("No auth data found");
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
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