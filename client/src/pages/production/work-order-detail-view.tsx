import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer, User, Calendar, Package, Clock, Phone, Mail, MapPin, FileText } from "lucide-react";
import { WorkOrder, Customer, WorkType, SubJob } from "@shared/schema";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function WorkOrderDetailView() {
  const [, params] = useRoute("/production/work-orders/:id/view");
  const [, setLocation] = useLocation();
  const workOrderId = params?.id;

  // Fetch work order detail
  const { data: workOrder, isLoading: isLoadingWorkOrder } = useQuery<WorkOrder>({
    queryKey: [`/api/work-orders/${workOrderId}`],
    enabled: !!workOrderId,
  });

  // Fetch customers
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Fetch work types
  const { data: workTypes = [] } = useQuery<WorkType[]>({
    queryKey: ["/api/work-types"],
  });

  // Fetch departments
  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["/api/departments"],
  });

  // Fetch colors
  const { data: colors = [] } = useQuery<any[]>({
    queryKey: ["/api/colors"],
  });

  // Fetch sizes
  const { data: sizes = [] } = useQuery<any[]>({
    queryKey: ["/api/sizes"],
  });

  // Fetch work steps
  const { data: workSteps = [] } = useQuery<any[]>({
    queryKey: ["/api/work-steps"],
  });

  // Use sub jobs from work order response
  const subJobs = (workOrder as any)?.sub_jobs || [];

  if (isLoadingWorkOrder) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">ไม่พบใบสั่งงาน</div>
      </div>
    );
  }

  const customer = customers.find(c => c.id === workOrder.customerId);
  const workType = workTypes.find(wt => wt.id === workOrder.workTypeId);

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
      default: return status || 'ไม่ระบุ';
    }
  };

  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 1: return 'สูงมาก';
      case 2: return 'สูง';
      case 3: return 'ปานกลาง';
      case 4: return 'ต่ำ';
      case 5: return 'ต่ำมาก';
      default: return 'ปานกลาง';
    }
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'ไม่ระบุ';
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return format(date, 'dd MMMM yyyy', { locale: th });
    } catch (error) {
      return 'ไม่ระบุ';
    }
  };

  const handlePrint = () => {
    window.open(`/production/work-orders/${workOrderId}/print`, '_blank');
  };

  // Helper functions to find data by ID
  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    return department?.name || 'ไม่ระบุ';
  };

  const getWorkStepName = (workStepId: string) => {
    const workStep = workSteps.find(ws => ws.id === workStepId);
    return workStep?.name || 'ไม่ระบุ';
  };

  const getColorName = (colorId: number) => {
    const color = colors.find(c => c.id === colorId);
    return color?.name || 'ไม่ระบุ';
  };

  const getSizeName = (sizeId: number) => {
    const size = sizes.find(s => s.id === sizeId);
    return size?.name || 'ไม่ระบุ';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/production/work-orders/view')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับ
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              รายละเอียดใบสั่งงาน: {workOrder.orderNumber}
            </h1>
            <p className="text-gray-600">
              โหมดดูอย่างเดียว - ไม่สามารถแก้ไขได้
            </p>
          </div>
        </div>
        <Button
          onClick={handlePrint}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          พิมพ์
        </Button>
      </div>

      {/* Combined Information Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            ข้อมูลใบสั่งงาน
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* ข้อมูลทั่วไป */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              ข้อมูลทั่วไป
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">วันที่สร้าง:</label>
                  <p className="mt-1 text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(workOrder.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">กำหนดส่ง:</label>
                  <p className="mt-1 text-gray-900 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {formatDate(workOrder.deliveryDate)}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">ประเภทงาน:</label>
                  <p className="mt-1 text-gray-900">{workType?.name || 'ไม่ระบุ'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">สถานะ:</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(workOrder.status)}>
                      {getStatusText(workOrder.status)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* ข้อมูลลูกค้า */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              ข้อมูลลูกค้า
            </h3>
            {customer ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">ชื่อลูกค้า:</label>
                    <p className="mt-1 text-gray-900">{customer.name}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">บริษัท:</label>
                    <p className="mt-1 text-gray-900">{customer.companyName || 'ไม่ระบุ'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">ไม่พบข้อมูลลูกค้า</p>
            )}
          </div>

          <Separator />

          {/* รายการสินค้า */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              รายการสินค้า
            </h3>
            {subJobs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">ชื่อสินค้า</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">แผนก</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">ขั้นตอน</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">สี</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">ขนาด</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">จำนวน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subJobs.map((subJob: any, index: number) => {
                      return (
                        <tr key={subJob.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2">
                            {subJob.product_name || 'ไม่ระบุ'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {getDepartmentName(subJob.department_id)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {getWorkStepName(subJob.work_step_id)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {getColorName(subJob.color_id)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {getSizeName(subJob.size_id)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {subJob.quantity}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">ไม่มีรายการสินค้า</p>
            )}
          </div>

          {/* หมายเหตุ */}
          {workOrder.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">หมายเหตุ</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{workOrder.notes}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}