import { useState, useEffect } from "react";
import { ChartLine, Calculator, Package, Users, Settings, Shield, ChevronRight, ChevronDown, ShoppingCart, Settings2, Network, Calendar, ClipboardList, FileText, UserCheck, X } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { usePermissions } from "@/hooks/usePermissions";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface Tenant {
  id: string;
  name: string;
  companyName: string;
  logo: string | null;
  isActive: boolean;
  settings: any;
  createdAt: string;
  updatedAt: string;
}

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const [location] = useLocation();
  const { t } = useLanguage();
  const { canAccess } = usePermissions();
  const [expandedSales, setExpandedSales] = useState(false);
  const [expandedProduction, setExpandedProduction] = useState(false);

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const currentTenant = tenants && user ? tenants.find((t: Tenant) => t.id === user.tenantId) : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isCollapsed) return;

      const sidebar = document.getElementById('sidebar');
      if (sidebar && !sidebar.contains(event.target as Node)) {
        setExpandedSales(false);
        setExpandedProduction(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCollapsed]);

  const toggleSalesMenu = () => {
    if (isCollapsed) return;
    setExpandedSales(!expandedSales);
    setExpandedProduction(false);
  };

  const toggleProductionMenu = () => {
    if (isCollapsed) return;
    setExpandedProduction(!expandedProduction);
    setExpandedSales(false);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      setExpandedSales(false);
      setExpandedProduction(false);
    }
  };

  const salesSubMenu = [
    ...(canAccess("quotations", "read") ? [{ name: "ใบเสนอราคา", href: "/sales/quotations", icon: FileText }] : []),
    ...(canAccess("invoices", "read") ? [{ name: "ใบส่งสินค้า/ใบแจ้งหนี้", href: "/sales/invoices", icon: FileText }] : []),
    ...(canAccess("tax_invoices", "read") ? [{ name: "ใบกำกับภาษี", href: "/sales/tax-invoices", icon: FileText }] : []),
    ...(canAccess("receipts", "read") ? [{ name: "ใบเสร็จรับเงิน", href: "/sales/receipts", icon: FileText }] : []),
  ];

  const productionSubMenu = [
    ...(canAccess("production_calendar", "read") ? [{ name: "ปฏิทินการทำงาน", href: "/production/calendar", icon: Calendar }] : []),
    ...(canAccess("organization", "read") ? [{ name: "แผนผังหน่วยงาน", href: "/production/organization", icon: Network }] : []),
    ...(canAccess("work_queue_planning", "read") ? [{ name: "วางแผนและคิวงาน", href: "/production/work-queue-planning", icon: Calendar }] : []),
    ...(canAccess("work_orders", "read") ? [{ name: "ใบสั่งงาน", href: "/production/work-orders", icon: ClipboardList }] : []),
    ...(canAccess("daily_work_log", "read") ? [{ name: "บันทึกงานประจำวัน", href: "/production/daily-work-log", icon: FileText }] : []),
  ];

  const navigation = [
    { name: t("nav.dashboard"), href: "/", icon: ChartLine },
    ...(canAccess("accounting", "read") ? [{ name: t("nav.accounting"), href: "/accounting", icon: Calculator }] : []),
    ...(canAccess("inventory", "read") ? [{ name: t("nav.inventory"), href: "/inventory", icon: Package }] : []),
    ...(canAccess("customers", "read") ? [{ name: t("nav.customers"), href: "/customers", icon: Users }] : []),
    ...(canAccess("master_data", "read") ? [{ name: t("nav.master_data"), href: "/master-data", icon: Settings }] : []),
    ...(canAccess("production_reports", "read") ? [{ name: t("nav.reports"), href: "/production/production-reports", icon: FileText }] : []),
    ...(canAccess("user_management", "read") ? [{ name: "จัดการผู้ใช้และสิทธิ์", href: "/user-management", icon: Shield }] : []),
    ...(canAccess("user_management", "read") ? [{ name: "จัดการสิทธิ์เข้าถึงหน้า", href: "/page-access-management", icon: Settings }] : []),
    ...(canAccess("user_management", "read") ? [{ name: "ทดสอบระบบสิทธิ์", href: "/access-demo", icon: Shield }] : []),
  ];

  const handleLogout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("tenant");
    window.location.href = "/login";
  };

  return (
    <aside id="sidebar" className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg border-r border-gray-200 flex flex-col transition-all duration-300`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-white" />
            </div>
            {!isCollapsed && (
              <span className="font-inter font-semibold text-lg text-gray-900">ProductionPro</span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            title={isCollapsed ? "ขยายเมนู" : "ย่อเมนู"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>
        
        {!isCollapsed && currentTenant && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-medium">องค์กร</p>
            <p className="text-sm font-semibold text-blue-900">{currentTenant.companyName}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href} className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? "bg-primary text-white" 
                    : "text-gray-600 hover:bg-gray-100"
                }`} title={isCollapsed ? item.name : undefined}>
                  <Icon className="w-5 h-5" />
                  {!isCollapsed && <span className="font-medium">{item.name}</span>}
                </Link>
              </li>
            );
          })}
          
          {/* Sales Menu - Always visible */}
          <li>
            <button
              onClick={toggleSalesMenu}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} w-full px-3 py-2 rounded-lg transition-colors ${
                location.startsWith("/sales") 
                  ? "bg-primary text-white" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title={isCollapsed ? t("nav.sales") : undefined}
            >
              <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                <ShoppingCart className="w-5 h-5" />
                {!isCollapsed && <span className="font-medium">{t("nav.sales")}</span>}
              </div>
              {!isCollapsed && (expandedSales ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              ))}
            </button>
          
            {expandedSales && !isCollapsed && salesSubMenu.length > 0 && (
              <ul className="mt-2 ml-8 space-y-1">
                {salesSubMenu.map((subItem) => {
                  const isSubActive = location === subItem.href;
                  const SubIcon = subItem.icon;
                  
                  return (
                    <li key={subItem.name}>
                      <Link href={subItem.href} className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                        isSubActive 
                          ? "bg-blue-100 text-blue-700" 
                          : "text-gray-600 hover:bg-gray-100"
                      }`}>
                        <SubIcon className="w-4 h-4" />
                        <span className="font-medium">{subItem.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>

          {/* Production Menu - Always visible */}
          <li>
            <button
              onClick={toggleProductionMenu}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} w-full px-3 py-2 rounded-lg transition-colors ${
                location.startsWith("/production") 
                  ? "bg-primary text-white" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title={isCollapsed ? "วางแผนการผลิต" : undefined}
            >
              <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                <Settings2 className="w-5 h-5" />
                {!isCollapsed && <span className="font-medium">วางแผนการผลิต</span>}
              </div>
              {!isCollapsed && (expandedProduction ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              ))}
            </button>
            
            {expandedProduction && !isCollapsed && productionSubMenu.length > 0 && (
              <ul className="mt-2 ml-8 space-y-1">
                {productionSubMenu.map((subItem) => {
                  const isSubActive = location === subItem.href;
                  const SubIcon = subItem.icon;
                  
                  return (
                    <li key={subItem.name}>
                      <Link href={subItem.href} className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                        isSubActive 
                          ? "bg-green-100 text-green-700" 
                          : "text-gray-600 hover:bg-gray-100"
                      }`}>
                        <SubIcon className="w-4 h-4" />
                        <span className="font-medium">{subItem.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200">
        {!isCollapsed ? (
          <>
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.firstName || ''} {user?.lastName || ''}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.username || ''}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              ออกจากระบบ
            </button>
          </>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="ออกจากระบบ"
          >
            <UserCheck className="w-5 h-5 mx-auto" />
          </button>
        )}
      </div>
    </aside>
  );
}