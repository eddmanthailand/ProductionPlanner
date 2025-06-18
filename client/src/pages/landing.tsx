import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, BarChart3, Calendar } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            ระบบจัดการธุรกิจ
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            ระบบจัดการธุรกิจครบวงจร สำหรับการขาย การผลิต การวางแผน และการบัญชี
          </p>
          <Button 
            onClick={handleLogin} 
            size="lg" 
            className="text-lg px-8 py-3"
          >
            เข้าสู่ระบบ
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="text-center">
              <Building2 className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <CardTitle>การจัดการลูกค้า</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                จัดการข้อมูลลูกค้า สร้างใบเสนอราคา และติดตามยอดขาย
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Users className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <CardTitle>การจัดการทีม</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                จัดการแผนก ทีมงาน และติดตามประสิทธิภาพการผลิต
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-purple-600 mb-4" />
              <CardTitle>รายงานและวิเคราะห์</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                รายงานการผลิต การขาย และการเงินแบบเรียลไทม์
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Calendar className="h-12 w-12 mx-auto text-orange-600 mb-4" />
              <CardTitle>การวางแผนผลิต</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                วางแผนการผลิต จัดการคิว และติดตามความคืบหน้า
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500 dark:text-gray-400">
          <p>ระบบจัดการธุรกิจสมัยใหม่ เพื่อประสิทธิภาพสูงสุด</p>
        </div>
      </div>
    </div>
  );
}