import { useState, useEffect } from "react";
import { ChartLine, Calculator, Package, Users, Settings, Shield, ChevronRight, ChevronDown, ShoppingCart, Settings2, Network, Calendar, ClipboardList, FileText, UserCheck, X, BarChart3, Bot } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

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
  const { canAccessCategory, getPagesByCategory, canAccessPage } = usePageNavigation();
  const { user, logout } = useAuth();
  const [expandedSales, setExpandedSales] = useState(false);
  const [expandedProduction, setExpandedProduction] = useState(false);
  const [expandedReports, setExpandedReports] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const currentTenant = tenants && user ? tenants.find((t: Tenant) => t.id === user.tenantId) : null;

  // Manual toggle for better UX
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Click outside handler for mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isCollapsed) return;
      
      const sidebar = document.getElementById('sidebar');
      const target = event.target as Element;
      
      if (sidebar && !sidebar.contains(target)) {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          setIsCollapsed(true);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCollapsed, setIsCollapsed]);

  return (
    <>
      {/* Mobile backdrop */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Toggle Button for Desktop and Mobile */}
      {isCollapsed && (
        <button
          onClick={toggleSidebar}
          className="fixed left-2 top-4 z-50 p-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 dark:from-blue-600 dark:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-800 shadow-lg rounded-lg border border-blue-300 dark:border-blue-400 transition-all duration-200 transform hover:scale-105"
          title="เปิดเมนู"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}
      
      <div
        id="sidebar"
        className={`${
          isCollapsed ? '-translate-x-full md:translate-x-0 md:w-16' : 'translate-x-0 w-64'
        } fixed top-0 left-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg transition-all duration-300 ease-in-out z-50 md:static md:z-auto flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <ChartLine className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentTenant?.companyName || "บริษัท"}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {currentTenant?.name || "ระบบจัดการ"}
                </p>
              </div>
            </div>
          )}
          
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 dark:from-blue-600 dark:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-800 text-white shadow-md transition-all duration-200 transform hover:scale-105"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <X className="w-4 h-4 md:hidden" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Dashboard - แสดงเสมอ */}
          {canAccessPage('/dashboard') && (
            <Link
              href="/dashboard"
              className={`flex items-center py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors ${
                location === '/dashboard' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
              }`}
            >
              <ChartLine className="w-5 h-5" />
              {!isCollapsed && <span className="ml-3">{t("nav.dashboard")}</span>}
            </Link>
          )}

          {/* Sales Menu - แสดงเฉพาะเมื่อมีสิทธิ์เข้าถึงหน้าในหมวดนี้ */}
          {canAccessCategory("sales") && (
            <div className="space-y-1">
              <button
                onClick={() => setExpandedSales(!expandedSales)}
                className={`w-full text-left flex items-center justify-between py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors ${
                  location.startsWith('/sales') ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                }`}
              >
                <div className="flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-3" />
                  {!isCollapsed && <span>{t("nav.sales")}</span>}
                </div>
                {!isCollapsed && (expandedSales ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
              </button>

              {/* Sales submenu - แสดงเฉพาะหน้าที่มีสิทธิ์เข้าถึง */}
              {expandedSales && !isCollapsed && (
                <div className="ml-8 space-y-1">
                  {getPagesByCategory("sales").map(page => (
                    <Link
                      key={page.url}
                      href={page.url}
                      className={`block py-2 px-3 text-sm text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors ${
                        location === page.url ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                      }`}
                    >
                      {page.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Production Menu - แสดงเฉพาะเมื่อมีสิทธิ์เข้าถึงหน้าในหมวดนี้ */}
          {canAccessCategory("production") && (
            <div className="space-y-1">
              <button
                onClick={() => setExpandedProduction(!expandedProduction)}
                className={`w-full text-left flex items-center justify-between py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors ${
                  location.startsWith('/production') ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                }`}
              >
                <div className="flex items-center">
                  <Settings2 className="w-5 h-5 mr-3" />
                  {!isCollapsed && <span>{t("nav.production")}</span>}
                </div>
                {!isCollapsed && (expandedProduction ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
              </button>

              {/* Production submenu - แสดงเฉพาะหน้าที่มีสิทธิ์เข้าถึง */}
              {expandedProduction && !isCollapsed && (
                <div className="ml-8 space-y-1">
                  {getPagesByCategory("production").map(page => (
                    <Link
                      key={page.url}
                      href={page.url}
                      className={`block py-2 px-3 text-sm text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors ${
                        location === page.url ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                      }`}
                    >
                      {page.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Accounting - แสดงเฉพาะเมื่อมีสิทธิ์เข้าถึง */}
          {canAccessPage('/accounting') && (
            <Link
              href="/accounting"
              className={`flex items-center py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors ${
                location === '/accounting' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
              }`}
            >
              <Calculator className="w-5 h-5" />
              {!isCollapsed && <span className="ml-3">{t("nav.accounting")}</span>}
            </Link>
          )}

          {/* Inventory - แสดงเฉพาะเมื่อมีสิทธิ์เข้าถึง */}
          {canAccessPage('/inventory') && (
            <Link
              href="/inventory"
              className={`flex items-center py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors ${
                location === '/inventory' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
              }`}
            >
              <Package className="w-5 h-5" />
              {!isCollapsed && <span className="ml-3">{t("nav.inventory")}</span>}
            </Link>
          )}

          {/* Customers - แสดงเฉพาะเมื่อมีสิทธิ์เข้าถึง */}
          {canAccessPage('/customers') && (
            <Link
              href="/customers"
              className={`flex items-center py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors ${
                location === '/customers' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
              }`}
            >
              <Users className="w-5 h-5" />
              {!isCollapsed && <span className="ml-3">{t("nav.customers")}</span>}
            </Link>
          )}

          {/* Master Data - แสดงเฉพาะเมื่อมีสิทธิ์เข้าถึง */}
          {canAccessPage('/master-data') && (
            <Link
              href="/master-data"
              className={`flex items-center py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors ${
                location === '/master-data' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
              }`}
            >
              <Network className="w-5 h-5" />
              {!isCollapsed && <span className="ml-3">{t("nav.master_data")}</span>}
            </Link>
          )}

          {/* Production Reports with Submenu */}
          {(canAccessPage('/production/team-revenue-report') || canAccessPage('/production/work-queue-table') || canAccessPage('/production/work-orders')) && (
            <div className="relative">
              <button
                onClick={() => {
                  if (isCollapsed) return;
                  setExpandedReports(!expandedReports);
                }}
                className={`w-full flex items-center justify-between py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors ${
                  location.startsWith('/production/team-revenue-report') || location.startsWith('/production/work-queue-table') || location.startsWith('/production/work-orders') ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                }`}
              >
                <div className="flex items-center">
                  <ChartLine className="w-5 h-5" />
                  {!isCollapsed && <span className="ml-3">รายงานการผลิต</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${expandedReports ? 'rotate-180' : ''}`}
                  />
                )}
              </button>
              
              {!isCollapsed && expandedReports && (
                <div className="ml-8 mt-1 space-y-1">
                  {canAccessPage('/production/team-revenue-report') && (
                    <Link
                      href="/production/team-revenue-report"
                      className={`block py-2 px-3 text-sm text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors ${
                        location === '/production/team-revenue-report' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                      }`}
                    >
                      รายได้ทีมผลิต
                    </Link>
                  )}
                  {canAccessPage('/production/work-queue-table') && (
                    <Link
                      href="/production/work-queue-table"
                      className={`block py-2 px-3 text-sm text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors ${
                        location === '/production/work-queue-table' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                      }`}
                    >
                      ตารางคิวงาน
                    </Link>
                  )}
                  {canAccessPage('/production/work-orders') && (
                    <Link
                      href="/production/work-orders/view"
                      className={`block py-2 px-3 text-sm text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors ${
                        location === '/production/work-orders/view' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                      }`}
                    >
                      ดูใบสั่งงาน
                    </Link>
                  )}

                </div>
              )}
            </div>
          )}

          {/* AI Chatbot */}
          <Link
            href="/ai-chatbot"
            className={`flex items-center py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors ${
              location === '/ai-chatbot' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
            }`}
          >
            <Bot className="w-5 h-5" />
            {!isCollapsed && <span className="ml-3">AI ผู้ช่วย</span>}
          </Link>

          {/* AI Settings */}
          <Link
            href="/ai-settings"
            className={`flex items-center py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors ${
              location === '/ai-settings' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
            }`}
          >
            <Settings className="w-5 h-5" />
            {!isCollapsed && <span className="ml-3">การตั้งค่า AI</span>}
          </Link>

          {/* User Management - แสดงเฉพาะเมื่อมีสิทธิ์เข้าถึง */}
          {canAccessPage('/user-management') && (
            <div className="relative">
              <button
                onClick={() => {
                  if (isCollapsed) return;
                  setUserManagementOpen(!userManagementOpen);
                }}
                className={`w-full flex items-center justify-between py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors ${
                  location.startsWith('/user-management') || location.startsWith('/page-access-management') ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                }`}
              >
                <div className="flex items-center">
                  <Shield className="w-5 h-5" />
                  {!isCollapsed && <span className="ml-3">จัดการผู้ใช้</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${userManagementOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </button>
              
              {!isCollapsed && userManagementOpen && (
                <div className="ml-8 mt-1 space-y-1">
                  <Link
                    href="/user-management"
                    className={`block py-2 px-3 text-sm text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors ${
                      location === '/user-management' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                    }`}
                  >
                    จัดการผู้ใช้และสิทธิ์
                  </Link>
                  <Link
                    href="/page-access-management"
                    className={`block py-2 px-3 text-sm text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors ${
                      location === '/page-access-management' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                    }`}
                  >
                    จัดการสิทธิ์การเข้าถึงหน้า
                  </Link>
                  <Link
                    href="/notifications-test"
                    className={`block py-2 px-3 text-sm text-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors ${
                      location === '/notifications-test' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                    }`}
                  >
                    🔔 ทดสอบการแจ้งเตือน
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-gray-600" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.firstName || ''} {user?.lastName || ''}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.username || ''}</p>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <button
              onClick={logout}
              className="w-full mt-3 flex items-center py-2 px-3 text-sm text-red-600 rounded-lg hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
            >
              <span>{t("nav.logout")}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}