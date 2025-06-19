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

// รายการหน้าทั้งหมดในระบบ
export const allPages = [
  { url: '/dashboard', name: 'แดชบอร์ด', category: 'main' },
  { url: '/sales/quotations', name: 'ใบเสนอราคา', category: 'sales' },
  { url: '/sales/invoices', name: 'ใบแจ้งหนี้', category: 'sales' },
  { url: '/sales/tax-invoices', name: 'ใบกำกับภาษี', category: 'sales' },
  { url: '/sales/receipts', name: 'ใบเสร็จรับเงิน', category: 'sales' },
  { url: '/production/calendar', name: 'ปฏิทินการผลิต', category: 'production' },
  { url: '/production/organization', name: 'โครงสร้างองค์กร', category: 'production' },
  { url: '/production/work-queue-planning', name: 'วางแผนคิวงาน', category: 'production' },
  { url: '/production/work-orders', name: 'ใบสั่งงาน', category: 'production' },
  { url: '/production/daily-work-log', name: 'บันทึกการทำงานรายวัน', category: 'production' },
  { url: '/accounting', name: 'ระบบบัญชี', category: 'accounting' },
  { url: '/inventory', name: 'สินค้าและบริการ', category: 'inventory' },
  { url: '/customers', name: 'ลูกค้า', category: 'customers' },
  { url: '/master-data', name: 'ข้อมูลหลัก', category: 'master_data' },
  { url: '/reports/production', name: 'รายงานการผลิต', category: 'reports' },
  { url: '/users', name: 'จัดการผู้ใช้', category: 'users' },
];

export function usePageNavigation() {
  const { user } = useAuth();
  
  const { data: pageAccesses = [] } = useQuery<PageAccess[]>({
    queryKey: ["/api/roles", user?.roleId, "page-access"],
    enabled: !!user?.roleId,
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

  // ฟังก์ชันสำหรับแสดงเมนูที่สามารถเข้าถึงได้
  const getAccessiblePages = () => {
    return allPages.filter(page => canAccessPage(page.url));
  };

  // ฟังก์ชันจัดกลุ่มหน้าตามหมวดหมู่
  const getPagesByCategory = (category: string) => {
    return allPages.filter(page => 
      page.category === category && canAccessPage(page.url)
    );
  };

  // ฟังก์ชันตรวจสอบว่ามีสิทธิ์เข้าถึงหมวดหมู่หรือไม่
  const canAccessCategory = (category: string): boolean => {
    return getPagesByCategory(category).length > 0;
  };

  return {
    getPageAccess,
    canAccessPage,
    getPagePermissions,
    getAccessiblePages,
    getPagesByCategory,
    canAccessCategory,
    allPages
  };
}