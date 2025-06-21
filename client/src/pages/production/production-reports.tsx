import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function ProductionReports() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            รายงานการผลิต
          </h1>
          <p className="text-gray-600 mt-1">รายงานและวิเคราะห์ข้อมูลการผลิต</p>
        </div>
      </div>

      {/* Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>รายงานการผลิต</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">หน้าว่างสำหรับรายงานการผลิต</p>
            <p className="text-sm text-gray-400">จะเพิ่มรายงานตามที่กำหนด</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}