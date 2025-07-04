import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export type AccessLevel = 'none' | 'read' | 'edit' | 'create';

interface PageAccess {
  id: number;
  roleId: number;
  pageName: string;
  pageUrl: string;
  accessLevel: AccessLevel;
}

// ฟังก์ชันตรวจสอบสิทธิ์ตามลำดับชั้น
export function hasPermission(userAccessLevel: AccessLevel, requiredLevel: AccessLevel): boolean {
  const hierarchy: Record<AccessLevel, number> = {
    'none': 0,
    'view': 1,
    'edit': 2,
    'create': 3
  };

  return hierarchy[userAccessLevel] >= hierarchy[requiredLevel];
}

export function usePageAccess(pageUrl: string) {
  const { user } = useAuth();
  
  const { data: pageAccesses = [] } = useQuery<PageAccess[]>({
    queryKey: ["/api/roles", user?.roleId, "page-access"],
    enabled: !!user?.roleId,
  });

  const getAccessLevel = (): AccessLevel => {
    // ADMIN role (roleId = 1) has full access to everything
    if (user?.roleId === 1) {
      return 'create';
    }
    
    const access = pageAccesses.find(pa => pa.pageUrl === pageUrl);
    return access?.accessLevel || 'none';
  };

  const canView = (): boolean => {
    const accessLevel = getAccessLevel();
    return hasPermission(accessLevel, 'view');
  };

  const canEdit = (): boolean => {
    const accessLevel = getAccessLevel();
    return hasPermission(accessLevel, 'edit');
  };

  const canCreate = (): boolean => {
    const accessLevel = getAccessLevel();
    return hasPermission(accessLevel, 'create');
  };

  const canDelete = (): boolean => {
    const accessLevel = getAccessLevel();
    return hasPermission(accessLevel, 'create'); // สร้าง = ทำได้ทุกอย่างรวมถึงลบ
  };

  return {
    accessLevel: getAccessLevel(),
    canView,
    canEdit,
    canCreate,
    canDelete,
    hasPermission: (requiredLevel: AccessLevel) => hasPermission(getAccessLevel(), requiredLevel)
  };
}