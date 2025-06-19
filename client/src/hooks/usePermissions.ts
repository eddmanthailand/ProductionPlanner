import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface Permission {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  module: string;
  action: string;
  resource: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export function usePermissions() {
  const { user } = useAuth();
  
  const { data: permissions = [], isLoading } = useQuery<Permission[]>({
    queryKey: ["/api/permissions"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    permissions,
    isLoading,
  };
}

export function useUserPermissions(userId?: number) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  const { data: userPermissions = [], isLoading } = useQuery<Permission[]>({
    queryKey: ["/api/users", targetUserId, "permissions"],
    enabled: !!targetUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const hasPermission = (resource: string, action: string): boolean => {
    return userPermissions.some((permission: Permission) => 
      permission.resource === resource && permission.action === action && permission.isActive
    );
  };

  const hasAnyPermission = (permissions: Array<{resource: string, action: string}>): boolean => {
    return permissions.some(({ resource, action }) => hasPermission(resource, action));
  };

  const hasAllPermissions = (permissions: Array<{resource: string, action: string}>): boolean => {
    return permissions.every(({ resource, action }) => hasPermission(resource, action));
  };

  return {
    userPermissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}

export function useRolePermissions(roleId: number) {
  const { data: rolePermissions = [], isLoading } = useQuery({
    queryKey: ["/api/roles", roleId, "permissions"],
    enabled: !!roleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    rolePermissions,
    isLoading,
  };
}