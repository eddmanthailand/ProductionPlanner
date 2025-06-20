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
    'read': 1,
    'edit': 2,
    'create': 3
  };

  return hierarchy[userAccessLevel] >= hierarchy[requiredLevel];
}

// การจัดกลุ่มหน้าตามหมวดหมู่
const pageCategories = {
  'sales': [
    '/sales/quotations',
    '/sales/invoices', 
    '/sales/tax-invoices',
    '/sales/receipts'
  ],
  'production': [
    '/production/calendar',
    '/production/organization',
    '/production/work-queue-planning', 
    '/production/work-orders',
    '/production/daily-work-log'
  ],
  'accounting': ['/accounting'],
  'inventory': ['/inventory'],
  'customers': ['/customers'],
  'master_data': ['/master-data'],
  'reports': ['/reports/production'],
  'users': ['/users']
};

export function usePageNavigation() {
  const { user } = useAuth();
  
  const { data: pageAccesses = [] } = useQuery<PageAccess[]>({
    queryKey: ["/api/roles", user?.roleId, "page-access"],
    enabled: !!user?.roleId,
    queryFn: async () => {
      console.log("Fetching page access for role:", user?.roleId);
      const res = await fetch(`/api/roles/${user?.roleId}/page-access`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch page access: ${res.status}`);
      }
      const data = await res.json();
      console.log("Page access data:", data);
      return data;
    }
  });

  // ฟังก์ชันตรวจสอบสิทธิ์การเข้าถึงหน้า
  const getPageAccess = (pageUrl: string): AccessLevel => {
    // ADMIN role (roleId = 1) has full access to everything
    if (user?.roleId === 1) {
      return 'create';
    }
    
    const access = pageAccesses.find(pa => pa.pageUrl === pageUrl);
    return access?.accessLevel || 'none';
  };

  // ฟังก์ชันตรวจสอบว่าสามารถเข้าถึงหน้าได้หรือไม่
  const canAccessPage = (pageUrl: string): boolean => {
    const accessLevel = getPageAccess(pageUrl);
    return hasPermission(accessLevel, 'read');
  };

  // ฟังก์ชันตรวจสอบระดับสิทธิ์สำหรับการทำงาน
  const getPagePermissions = (pageUrl: string) => {
    const accessLevel = getPageAccess(pageUrl);
    
    return {
      canRead: hasPermission(accessLevel, 'read'),
      canEdit: hasPermission(accessLevel, 'edit'),
      canCreate: hasPermission(accessLevel, 'create'),
      canDelete: hasPermission(accessLevel, 'create'), // สร้าง = ทำได้ทุกอย่างรวมถึงลบ
      accessLevel
    };
  };

  // ฟังก์ชันจัดกลุ่มหน้าตามหมวดหมู่ - ใช้ข้อมูลจาก database
  const getPagesByCategory = (category: string): Array<{url: string, name: string, category: string, accessLevel: AccessLevel}> => {
    const categoryPages = pageCategories[category as keyof typeof pageCategories] || [];
    
    return pageAccesses
      .filter(pa => categoryPages.includes(pa.pageUrl))
      .filter(pa => hasPermission(pa.accessLevel, 'read'))
      .map(pa => ({
        url: pa.pageUrl,
        name: pa.pageName,
        category: category,
        accessLevel: pa.accessLevel
      }));
  };

  // ฟังก์ชันตรวจสอบว่ามีสิทธิ์เข้าถึงหมวดหมู่หรือไม่
  const canAccessCategory = (category: string): boolean => {
    return getPagesByCategory(category).length > 0;
  };

  // ฟังก์ชันสำหรับแสดงเมนูที่สามารถเข้าถึงได้
  const getAccessiblePages = (): Array<{url: string, name: string, accessLevel: AccessLevel}> => {
    return pageAccesses
      .filter(pa => hasPermission(pa.accessLevel, 'read'))
      .map(pa => ({
        url: pa.pageUrl,
        name: pa.pageName,
        accessLevel: pa.accessLevel
      }));
  };

  return {
    getPageAccess,
    canAccessPage,
    getPagePermissions,
    getAccessiblePages,
    getPagesByCategory,
    canAccessCategory,
    pageAccesses
  };
}