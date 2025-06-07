import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import TenantSelector from "@/components/tenant/tenant-selector";
import { 
  ChartLine, 
  Settings2, 
  Calculator, 
  Package, 
  FileText, 
  Users, 
  Settings,
  LogOut
} from "lucide-react";
import { logout } from "@/lib/auth";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartLine },
  { name: "วางแผนการผลิต", href: "/production", icon: Settings2 },
  { name: "ระบบบัญชี", href: "/accounting", icon: Calculator },
  { name: "สินค้าคงคลัง", href: "/inventory", icon: Package },
  { name: "รายงาน", href: "/reports", icon: FileText },
  { name: "จัดการผู้ใช้", href: "/users", icon: Users },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, tenant } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Brand and Tenant Selector */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Settings2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-inter font-semibold text-lg text-gray-900">ProductionPro</span>
        </div>
        
        <TenantSelector />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? "bg-primary text-white" 
                      : "text-gray-600 hover:bg-gray-100"
                  }`}>
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
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
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
}
