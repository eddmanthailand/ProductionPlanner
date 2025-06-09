import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import TenantSelector from "@/components/tenant/tenant-selector";
import { 
  ChartLine, 
  Settings2, 
  Calculator, 
  Package, 
  FileText, 
  Users, 
  Settings,
  LogOut,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Calendar,
  Network,
  ClipboardList,
  GanttChart,
  BarChart3
} from "lucide-react";
import { logout } from "@/lib/auth";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, tenant } = useAuth();
  const { t } = useLanguage();
  const [expandedSales, setExpandedSales] = useState(location.startsWith("/sales"));
  const [expandedProduction, setExpandedProduction] = useState(location.startsWith("/production"));
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-expand menus when user navigates to respective pages
  useEffect(() => {
    if (location.startsWith("/sales")) {
      setExpandedSales(true);
    }
    if (location.startsWith("/production")) {
      setExpandedProduction(true);
    }
  }, [location]);

  const toggleSalesMenu = () => {
    if (!isCollapsed) {
      setExpandedSales(!expandedSales);
    }
  };

  const toggleProductionMenu = () => {
    if (!isCollapsed) {
      setExpandedProduction(!expandedProduction);
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      setExpandedSales(false); // Close menus when collapsing
      setExpandedProduction(false);
    }
  };

  const salesSubMenu = [
    { name: "ใบเสนอราคา", href: "/sales/quotations", icon: FileText },
    { name: "ใบส่งสินค้า/ใบแจ้งหนี้", href: "/sales/invoices", icon: FileText },
    { name: "ใบกำกับภาษี", href: "/sales/tax-invoices", icon: FileText },
    { name: "ใบเสร็จรับเงิน", href: "/sales/receipts", icon: FileText },
  ];

  const productionSubMenu = [
    { name: "ปฏิทินการทำงาน", href: "/production/calendar", icon: Calendar },
    { name: "แผนผังหน่วยงาน", href: "/production/organization", icon: Network },
    { name: "วางแผนและคิวงาน", href: "/production/work-queue", icon: GanttChart },
    { name: "ใบสั่งงาน", href: "/production/work-orders", icon: ClipboardList },
    { name: "รายงานแผนผลิต", href: "/production/reports", icon: BarChart3 },
  ];

  const navigation = [
    { name: t("nav.dashboard"), href: "/", icon: ChartLine },
    { name: t("nav.accounting"), href: "/accounting", icon: Calculator },
    { name: t("nav.inventory"), href: "/inventory", icon: Package },
    { name: t("nav.customers"), href: "/customers", icon: Users },
    { name: t("nav.master_data"), href: "/master-data", icon: Settings },
    { name: t("nav.reports"), href: "/reports", icon: FileText },
    { name: t("nav.users"), href: "/users", icon: Users },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg border-r border-gray-200 flex flex-col transition-all duration-300`}>
      {/* Brand and Tenant Selector */}
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
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>
        
        {!isCollapsed && <TenantSelector />}
      </div>

      {/* Navigation */}
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
          
          {/* Sales Menu with Submenu */}
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
            
            {expandedSales && !isCollapsed && (
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

          {/* Production Planning Menu with Submenu */}
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
            
            {expandedProduction && !isCollapsed && (
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

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        {!isCollapsed ? (
          <>
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t("nav.logout")}</span>
            </button>
          </>
        ) : (
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={t("nav.logout")}
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
