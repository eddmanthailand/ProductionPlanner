import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Package, DollarSign, Calendar, Activity } from "lucide-react";

export default function Dashboard() {
  const { t } = useLanguage();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">แดชบอร์ด</h1>
        <p className="text-gray-600">ยินดีต้อนรับ! นี่คือสถานการณ์การดำเนินงานในวันนี้</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ยอดขายวันนี้</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿125,430</div>
            <p className="text-xs text-muted-foreground">
              +12.5% จากเมื่อวาน
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ลูกค้าใหม่</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +8 จากสัปดาห์ที่แล้ว
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">คำสั่งซื้อใหม่</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">
              +2 จากเมื่อวาน
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ยอดขายเดือนนี้</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿2,847,320</div>
            <p className="text-xs text-muted-foreground">
              +18.2% จากเดือนที่แล้ว
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Schedule */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                แผนการผลิตวันนี้
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">เสื้อโปโล สีน้ำเงิน</h4>
                    <p className="text-sm text-gray-600">100 ตัว</p>
                  </div>
                  <div className="text-sm font-medium text-blue-600">กำลังผลิต</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">กางเกงยีนส์ ขาสั้น</h4>
                    <p className="text-sm text-gray-600">50 ตัว</p>
                  </div>
                  <div className="text-sm font-medium text-green-600">เสร็จแล้ว</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">เสื้อยืด สีขาว</h4>
                    <p className="text-sm text-gray-600">75 ตัว</p>
                  </div>
                  <div className="text-sm font-medium text-yellow-600">รอคิว</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                กิจกรรมล่าสุด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">ใบเสนอราคาใหม่</p>
                    <p className="text-xs text-gray-600">บริษัท ABC จำกัด</p>
                    <p className="text-xs text-gray-500">5 นาทีที่แล้ว</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">ลูกค้าใหม่ลงทะเบียน</p>
                    <p className="text-xs text-gray-600">คุณสมชาย ใจดี</p>
                    <p className="text-xs text-gray-500">15 นาทีที่แล้ว</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">การผลิตเสร็จสิ้น</p>
                    <p className="text-xs text-gray-600">เสื้อโปโล 50 ตัว</p>
                    <p className="text-xs text-gray-500">1 ชั่วโมงที่แล้ว</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>สรุปการเงิน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">รายได้รวม</span>
                <span className="font-semibold text-green-600">฿2,847,320</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">ค่าใช้จ่าย</span>
                <span className="font-semibold text-red-600">฿1,523,180</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">กำไรสุทธิ</span>
                <span className="font-semibold text-blue-600">฿1,324,140</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">อัตรากำไร</span>
                  <span className="font-bold text-lg text-green-600">46.5%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>การดำเนินการด่วน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 text-center bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <span className="text-sm font-medium">สร้างใบเสนอราคา</span>
              </button>
              <button className="p-4 text-center bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <span className="text-sm font-medium">เพิ่มลูกค้าใหม่</span>
              </button>
              <button className="p-4 text-center bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <span className="text-sm font-medium">ดูรายงาน</span>
              </button>
              <button className="p-4 text-center bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <span className="text-sm font-medium">จัดการการผลิต</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
