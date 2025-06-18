import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Users, 
  Package, 
  ShoppingCart, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign
} from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  pendingQuotations: number;
  todayProduction: number;
}

export default function Dashboard() {
  // Fetch dashboard statistics
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      // Mock data for now - replace with actual API calls
      return {
        totalOrders: 125,
        pendingOrders: 23,
        completedOrders: 102,
        totalRevenue: 2500000,
        totalCustomers: 45,
        totalProducts: 120,
        pendingQuotations: 8,
        todayProduction: 15
      };
    }
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["/api/recent-orders"],
    queryFn: async () => {
      // Mock data for recent orders
      return [
        { id: "ORD-001", customer: "บริษัท ABC จำกัด", amount: 125000, status: "pending" },
        { id: "ORD-002", customer: "ร้าน XYZ", amount: 75000, status: "completed" },
        { id: "ORD-003", customer: "บริษัท DEF จำกัด", amount: 200000, status: "in_progress" },
        { id: "ORD-004", customer: "ร้าน GHI", amount: 50000, status: "pending" },
      ];
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'เสร็จสิ้น';
      case 'pending': return 'รอดำเนินการ';
      case 'in_progress': return 'กำลังดำเนินการ';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">แดชบอร์ด</h1>
        <p className="text-gray-600">ภาพรวมระบบจัดการธุรกิจ</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ยอดขายรวม</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">+20.1% จากเดือนที่แล้ว</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">คำสั่งซื้อทั้งหมด</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">รอดำเนินการ {stats?.pendingOrders || 0} รายการ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ลูกค้าทั้งหมด</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">+5 ลูกค้าใหม่เดือนนี้</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">การผลิตวันนี้</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayProduction || 0}</div>
            <p className="text-xs text-muted-foreground">งานที่เสร็จสิ้น</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>คำสั่งซื้อล่าสุด</CardTitle>
            <CardDescription>
              รายการคำสั่งซื้อที่เพิ่งเข้ามาใหม่
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders?.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{order.id}</p>
                    <p className="text-sm text-gray-600">{order.customer}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-medium">{formatCurrency(order.amount)}</p>
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusText(order.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/sales">
                <Button variant="outline" className="w-full">
                  ดูทั้งหมด
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>เมนูหลัก</CardTitle>
            <CardDescription>
              เข้าถึงฟังก์ชันหลักได้อย่างรวดเร็ว
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/sales/quotations/new">
              <Button className="w-full justify-start" variant="outline">
                <ShoppingCart className="mr-2 h-4 w-4" />
                สร้างใบเสนอราคา
              </Button>
            </Link>
            
            <Link href="/production/work-orders/new">
              <Button className="w-full justify-start" variant="outline">
                <Package className="mr-2 h-4 w-4" />
                สร้างใบสั่งผลิต
              </Button>
            </Link>
            
            <Link href="/customers">
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                จัดการลูกค้า
              </Button>
            </Link>
            
            <Link href="/production/calendar">
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                ปฏิทินการผลิต
              </Button>
            </Link>

            <Link href="/reports">
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                รายงาน
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ใบเสนอราคารอดำเนินการ</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.pendingQuotations || 0}</div>
            <Link href="/sales/quotations">
              <Button variant="link" className="p-0 h-auto">
                ดูรายละเอียด →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">งานผลิตที่เสร็จสิ้น</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.completedOrders || 0}</div>
            <Link href="/production">
              <Button variant="link" className="p-0 h-auto">
                ดูรายละเอียด →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">สินค้าในคลัง</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.totalProducts || 0}</div>
            <Link href="/inventory">
              <Button variant="link" className="p-0 h-auto">
                ดูรายละเอียด →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}