import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, Printer, Search, FileText, Calendar, User, Package, Clock } from "lucide-react";
import { WorkOrder, Customer, WorkType } from "@shared/schema";

export default function WorkOrderView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  // Fetch work orders
  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
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
      case 1: return 'bg-red-100 text-red-800 border-red-200';
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4: return 'bg-green-100 text-green-800 border-green-200';
      case 5: return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              ดูใบสั่งงาน
            </h1>
            <p className="text-gray-600 mt-1">แสดงและพิมพ์ใบสั่งงาน</p>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาด้วยเลขที่ใบสั่งงาน, ชื่องาน, หรือลูกค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Work Orders List */}
        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">กำลังโหลดข้อมูล...</div>
              </CardContent>
            </Card>
          ) : filteredWorkOrders.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">
                    {searchTerm ? 'ไม่พบใบสั่งงานที่ตรงกับการค้นหา' : 'ยังไม่มีใบสั่งงาน'}
                  </p>
                  {searchTerm && (
                    <p className="text-sm text-gray-400">
                      ลองค้นหาด้วยคำอื่น หรือเครียร์การค้นหา
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredWorkOrders.map((workOrder) => (
              <Card key={workOrder.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">
                          {workOrder.orderNumber}
                        </CardTitle>
                        <Badge className={`${getStatusColor(workOrder.status)} border-0`}>
                          {getStatusText(workOrder.status)}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(workOrder.priority)}>
                          {getPriorityText(workOrder.priority)}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-gray-900">{workOrder.title}</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(workOrder.id)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        ดูรายละเอียด
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrint(workOrder.id)}
                        className="flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        พิมพ์
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>ลูกค้า: {getCustomerName(workOrder.customerId)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Package className="w-4 h-4" />
                      <span>ประเภท: {getWorkTypeName(workOrder.workTypeId)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>กำหนดส่ง: {workOrder.deliveryDate ? new Date(workOrder.deliveryDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>สร้างเมื่อ: {new Date(workOrder.createdAt).toLocaleDateString('th-TH')}</span>
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
    </Layout>
  );
}