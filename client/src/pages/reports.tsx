import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, TrendingUp } from "lucide-react";

export default function Reports() {
  const { t } = useLanguage();
  const reportTypes = [
    {
      title: "รายงานการผลิต",
      description: "สรุปผลการผลิตและประสิทธิภาพ",
      icon: TrendingUp,
      color: "bg-blue-100 text-blue-600"
    },
    {
      title: "รายงานทางการเงิน",
      description: "รายรับรายจ่ายและกำไรขาดทุน",
      icon: FileText,
      color: "bg-green-100 text-green-600"
    },
    {
      title: "รายงานสินค้าคงคลัง",
      description: "สถานะสต็อกและการเคลื่อนไหว",
      icon: Calendar,
      color: "bg-orange-100 text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">รายงาน</h1>
        <p className="text-gray-600">สร้างและดาวน์โหลดรายงานต่างๆ เพื่อวิเคราะห์ผลการดำเนินงาน</p>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportTypes.map((report, index) => {
          const Icon = report.icon;
          
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${report.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{report.title}</h3>
                    <p className="text-sm text-gray-600">{report.description}</p>
                  </div>
                </div>
                <Button className="w-full" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  สร้างรายงาน
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>รายงานล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">ยังไม่มีรายงานที่สร้างไว้</p>
            <p className="text-sm text-gray-400">รายงานที่สร้างจะแสดงที่นี่</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
