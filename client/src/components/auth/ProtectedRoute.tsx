import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredTeam?: string;
}

export function ProtectedRoute({ children, requiredRole, requiredTeam }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, hasRole, hasTeamAccess, canAccessAllTeams } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
      return;
    }

    if (!loading && isAuthenticated && user) {
      // Check role access
      if (requiredRole && !hasRole(requiredRole)) {
        setLocation("/unauthorized");
        return;
      }

      // Check team access
      if (requiredTeam && !canAccessAllTeams() && !hasTeamAccess(requiredTeam)) {
        setLocation("/unauthorized");
        return;
      }
    }
  }, [loading, isAuthenticated, user, requiredRole, requiredTeam, hasRole, hasTeamAccess, canAccessAllTeams, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}