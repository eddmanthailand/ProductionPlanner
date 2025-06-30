import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, Printer, Search, FileText, Calendar, User, Package, Clock, Info } from "lucide-react";
import { WorkOrder, Customer, WorkType } from "@shared/schema";

export default function WorkOrderView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  // Fetch work orders
  const { data: workOrders = [], isLoading: isLoadingWorkOrders } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  // Fetch customers
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Fetch work types
  const { data: workTypes = [] } = useQuery<WorkType[]>({
    queryKey: ["/api/work-types"],
  });

  // Filter work orders based on search term
  const filteredWorkOrders = workOrders.filter(wo =>
    wo.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wo.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCustomerName = (customerId: number | null) => {
    if (!customerId) return 'ไม่ระบุ';
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'ไม่ระบุ';
  };

  const getWorkTypeName = (workTypeId: number | null) => {
    if (!workTypeId) return 'ไม่ระบุ';
    const workType = workTypes.find(wt => wt.id === workTypeId);
    return workType?.name || 'ไม่ระบุ';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'in_production': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'รอดำเนินการ';
      case 'approved': return 'อนุมัติแล้ว';
      case 'in_production': return 'กำลังผลิต';
      case 'completed': return 'เสร็จสิ้น';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-blue-100 text-blue-800';
      case 5: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 1: return 'สูงมาก';
      case 2: return 'สูง';
      case 3: return 'ปานกลาง';
      case 4: return 'ต่ำ';
      case 5: return 'ต่ำมาก';
      default: return 'ไม่ระบุ';
    }
  };

  const handleViewDetails = (workOrderId: string) => {
    setLocation(`/production/work-orders/${workOrderId}/view`);
  };

  const handlePrint = (workOrderId: string) => {
    // Open print view in new window
    window.open(`/production/work-orders/${workOrderId}/print`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            ดูใบสั่งงาน
          </h1>
          <p className="text-gray-600 mt-1">แสดงและพิมพ์ใบสั่งงาน (โหมดดูอย่างเดียว)</p>
        </div>
      </div>

      {/* Read-only Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-medium text-blue-900">โหมดดูอย่างเดียว</h3>
            <p className="text-sm text-blue-700">
              หน้านี้สำหรับดูและพิมพ์ใบสั่งงานเท่านั้น ไม่สามารถสร้างใหม่หรือแก้ไขได้
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="ค้นหาเลขที่ใบสั่งงาน, ชื่องาน, หรือลูกค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Work Orders List */}
      <div className="space-y-4">
        {isLoadingWorkOrders ? (
          <div className="text-center py-8">
            <div className="text-lg">กำลังโหลดข้อมูล...</div>
          </div>
        ) : filteredWorkOrders.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'ไม่พบใบสั่งงานที่ตรงกับคำค้นหา' : 'ไม่มีใบสั่งงาน'}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredWorkOrders.map((workOrder) => (
            <Card key={workOrder.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {workOrder.orderNumber}
                      </CardTitle>
                      <Badge className={getStatusColor(workOrder.status)}>
                        {getStatusText(workOrder.status)}
                      </Badge>
                      <Badge className={getPriorityColor(workOrder.priority)}>
                        {getPriorityText(workOrder.priority)}
                      </Badge>
                    </div>
                    <h3 className="text-md font-medium text-gray-800">{workOrder.title}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(workOrder.id)}
                      className="flex items-center gap-2 text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4" />
                      ดูรายละเอียด
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrint(workOrder.id)}
                      className="flex items-center gap-2 text-green-600 border-green-600 hover:bg-green-50"
                    >
                      <Printer className="w-4 h-4" />
                      พิมพ์ใบสั่งงาน
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">ลูกค้า:</span>
                    <span className="font-medium">{getCustomerName(workOrder.customerId)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">ประเภท:</span>
                    <span className="font-medium">{getWorkTypeName(workOrder.workTypeId)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">วันที่สร้าง:</span>
                    <span className="font-medium">
                      {new Date(workOrder.createdAt).toLocaleDateString('th-TH')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">กำหนดส่ง:</span>
                    <span className="font-medium">
                      {workOrder.deliveryDate 
                        ? new Date(workOrder.deliveryDate).toLocaleDateString('th-TH')
                        : 'ไม่ระบุ'
                      }
                    </span>
                  </div>
                </div>
                
                {workOrder.description && (
                  <>
                    <Separator className="my-3" />
                    <div className="text-sm text-gray-600">
                      <strong>รายละเอียด:</strong> {workOrder.description}
                    </div>
                  </>
                )}
                
                <Separator className="my-3" />
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-900">
                    ยอดรวม: ฿{parseFloat(workOrder.totalAmount).toLocaleString()}
                  </span>
                  {workOrder.notes && (
                    <span className="text-gray-500">หมายเหตุ: {workOrder.notes}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}