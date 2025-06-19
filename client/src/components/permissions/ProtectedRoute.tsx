import React from "react";
import { useUserPermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: Array<{resource: string, action: string}>;
  resource?: string;
  action?: string;
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredPermissions,
  resource,
  action,
  requireAll = true,
  fallback 
}: ProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading: permissionsLoading } = useUserPermissions();

  // Show loading while checking authentication and permissions
  if (authLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>กำลังตรวจสอบสิทธิ์การเข้าถึง...</span>
        </div>
      </div>
    );
  }

  // User not authenticated
  if (!user) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาเข้าสู่ระบบก่อน
        </AlertDescription>
      </Alert>
    );
  }

  // Normalize permissions to array format
  const permissions = requiredPermissions || (resource && action ? [{resource, action}] : []);
  
  // Check permissions
  const hasRequiredPermissions = permissions.length === 0 || (requireAll 
    ? (hasAllPermissions && hasAllPermissions(permissions))
    : (hasAnyPermission && hasAnyPermission(permissions)));

  if (!hasRequiredPermissions) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">สิทธิ์ที่ต้องการ:</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                {permissions.map((perm, index) => (
                  <li key={index}>
                    {perm.resource} - {perm.action}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}

// Convenience wrapper for single permission check
interface ProtectedComponentProps {
  children: React.ReactNode;
  resource: string;
  action: string;
  fallback?: React.ReactNode;
}

export function ProtectedComponent({ children, resource, action, fallback }: ProtectedComponentProps) {
  return (
    <ProtectedRoute 
      requiredPermissions={[{resource, action}]}
      requireAll={true}
      fallback={fallback}
    >
      {children}
    </ProtectedRoute>
  );
}

// Hook for conditional rendering based on permissions
export function usePermissionCheck() {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useUserPermissions();

  const canAccess = (resource: string, action: string) => hasPermission(resource, action);
  
  const canAccessAny = (permissions: Array<{resource: string, action: string}>) => 
    hasAnyPermission(permissions);
    
  const canAccessAll = (permissions: Array<{resource: string, action: string}>) => 
    hasAllPermissions(permissions);

  return {
    canAccess,
    canAccessAny,
    canAccessAll,
  };
}