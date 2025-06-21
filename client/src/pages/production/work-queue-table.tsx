import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Users, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface WorkQueueItem {
  id: number;
  teamId: string;
  teamName: string;
  workOrderId: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  quantity: number;
  startDate: string;
  endDate: string;
  status: string;
  estimatedDays: number;
}

export default function WorkQueueTable() {
  const [refreshKey, setRefreshKey] = useState(0);

  // ดึงข้อมูลแผนการผลิตจาก localStorage หรือ API
  const { data: workQueues = [], isLoading, refetch } = useQuery<WorkQueueItem[]>({
    queryKey: ["/api/work-queue-table", refreshKey],
    queryFn: async () => {
      // ตรวจสอบ localStorage ก่อน
      const savedPlan = localStorage.getItem('calculatedProductionPlan');
      if (savedPlan) {
        return JSON.parse(savedPlan);
      }
      
      // หากไม่มีข้อมูลใน localStorage ให้คืนค่าเป็น array ว่าง
      return [];
    },
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "รอดำเนินการ", variant: "secondary" as const },
      in_progress: { label: "กำลังดำเนินการ", variant: "default" as const },
      completed: { label: "เสร็จสิ้น", variant: "default" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-blue-600" />
            ตารางคิวงาน
          </h1>
          <p className="text-gray-600 mt-1">แสดงตารางคิวงานของแต่ละทีมพร้อมวันเริ่มงานและวันจบงาน</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          รีเฟรช
        </Button>
      </div>

      {/* Work Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            ตารางคิวงานทีมการผลิต
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">กำลังโหลดข้อมูล...</p>
            </div>
          ) : workQueues.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">ยังไม่มีข้อมูลคิวงาน</p>
              <p className="text-sm text-gray-400">กรุณาไปที่หน้า "วางแผนและคิวงาน" เพื่อคำนวณแผนการผลิตก่อน</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ทีม</TableHead>
                    <TableHead>เลขที่ใบสั่งงาน</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead>สินค้า</TableHead>
                    <TableHead className="text-center">จำนวน</TableHead>
                    <TableHead className="text-center">วันเริ่มงาน</TableHead>
                    <TableHead className="text-center">วันจบงาน</TableHead>
                    <TableHead className="text-center">ระยะเวลา (วัน)</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workQueues.map((item) => (
                    <TableRow key={`${item.teamId}-${item.id}`}>
                      <TableCell className="font-medium">{item.teamName}</TableCell>
                      <TableCell>{item.orderNumber}</TableCell>
                      <TableCell>{item.customerName}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center">{formatDate(item.startDate)}</TableCell>
                      <TableCell className="text-center">{formatDate(item.endDate)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-4 h-4" />
                          {item.estimatedDays}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {workQueues.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">งานทั้งหมด</p>
                  <p className="text-2xl font-bold">{workQueues.length}</p>
                </div>
                <CalendarDays className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">ทีมที่ใช้งาน</p>
                  <p className="text-2xl font-bold">
                    {new Set(workQueues.map(item => item.teamId)).size}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">วันทำงานรวม</p>
                  <p className="text-2xl font-bold">
                    {workQueues.reduce((sum, item) => sum + item.estimatedDays, 0)}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}