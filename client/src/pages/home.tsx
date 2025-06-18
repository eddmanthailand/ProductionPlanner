import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              ระบบจัดการธุรกิจ
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              ยินดีต้อนรับ {user?.firstName} {user?.lastName}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <User className="h-4 w-4" />
              {user?.email}
            </div>
            <Button 
              onClick={handleLogout} 
              variant="outline"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              ออกจากระบบ
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>การขาย</CardTitle>
              <CardDescription>จัดการลูกค้าและใบเสนอราคา</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => window.location.href = '/sales'}>
                เข้าสู่หน้าการขาย
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>การผลิต</CardTitle>
              <CardDescription>วางแผนและติดตามการผลิต</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => window.location.href = '/production'}>
                เข้าสู่หน้าการผลิต
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>คลังสินค้า</CardTitle>
              <CardDescription>จัดการสต็อกและวัตถุดิบ</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => window.location.href = '/inventory'}>
                เข้าสู่หน้าคลังสินค้า
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลหลัก</CardTitle>
              <CardDescription>จัดการข้อมูลพื้นฐาน</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => window.location.href = '/master-data'}>
                เข้าสู่หน้าข้อมูลหลัก
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>รายงาน</CardTitle>
              <CardDescription>ดูรายงานและสถิติ</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => window.location.href = '/reports'}>
                เข้าสู่หน้ารายงาน
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>การเงิน</CardTitle>
              <CardDescription>จัดการรายรับรายจ่าย</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => window.location.href = '/accounting'}>
                เข้าสู่หน้าการเงิน
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}