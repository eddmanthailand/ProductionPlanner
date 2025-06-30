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

  // Fetch sub jobs progress data
  const { data: subJobsProgress = [] } = useQuery<any[]>({
    queryKey: [`/api/sub-jobs/progress/${workOrderId}`],
    enabled: !!workOrderId,
    staleTime: 0,
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

  // Helper function to get progress data for a sub job
  const getSubJobProgress = (subJobId: number) => {
    const progress = subJobsProgress.find(p => p.id === subJobId);
    return progress || { 
      progressPercentage: 0, 
      quantityCompleted: 0, 
      quantityRemaining: 0 
    };
  };

  // Group sub jobs by department
  const groupedSubJobs = subJobs.reduce((groups: any, subJob: any) => {
    const departmentName = getDepartmentName(subJob.department_id);
    if (!groups[departmentName]) {
      groups[departmentName] = [];
    }
    groups[departmentName].push(subJob);
    return groups;
  }, {});

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
          {/* ข้อมูลทั่วไปและลูกค้า */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">วันที่สร้าง</label>
                <p className="mt-1 text-gray-900 font-medium">{formatDate(workOrder.createdAt)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">กำหนดส่ง</label>
                <p className="mt-1 text-gray-900 font-medium">{formatDate(workOrder.deliveryDate)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">ประเภทงาน</label>
                <p className="mt-1 text-gray-900 font-medium">{workType?.name || 'ไม่ระบุ'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">สถานะ</label>
                <div className="mt-1">
                  <Badge className={getStatusColor(workOrder.status)} variant="secondary">
                    {getStatusText(workOrder.status)}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t border-blue-200">
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">ชื่อลูกค้า</label>
                <p className="mt-1 text-gray-900 font-medium">{customer?.name || 'ไม่ระบุ'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">บริษัท</label>
                <p className="mt-1 text-gray-900 font-medium">{customer?.companyName || 'ไม่ระบุ'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* รายการสินค้า */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Package className="w-5 h-5" />
              รายการสินค้า
            </h3>
            {Object.keys(groupedSubJobs).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedSubJobs).map(([departmentName, departmentSubJobs]: [string, any]) => (
                  <div key={departmentName} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Department Header */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                      <h4 className="text-white font-semibold text-lg flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        แผนก {departmentName}
                      </h4>
                    </div>
                    
                    {/* Products Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ชื่อสินค้า</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ขั้นตอน</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">สี</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ขนาด</th>
                            <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">จำนวน</th>
                            <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">ความคืบหน้า</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {departmentSubJobs.map((subJob: any, index: number) => {
                            const progress = getSubJobProgress(subJob.id);
                            const progressPercentage = progress.progressPercentage || 0;
                            const quantityCompleted = progress.quantityCompleted || 0;
                            const quantityTotal = subJob.quantity || 0;
                            
                            return (
                              <tr key={subJob.id} className="hover:bg-blue-50 transition-colors duration-200">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {subJob.product_name || 'ไม่ระบุ'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {getWorkStepName(subJob.work_step_id)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-4 h-4 rounded-full border border-gray-300"
                                      style={{ backgroundColor: colors.find(c => c.id === subJob.color_id)?.code || '#f3f4f6' }}
                                    ></div>
                                    <span className="text-sm text-gray-900">{getColorName(subJob.color_id)}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {getSizeName(subJob.size_id)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 text-sm font-semibold">
                                    {subJob.quantity}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <div className="flex flex-col items-center gap-2">
                                    {/* Progress Bar */}
                                    <div className="w-full max-w-[120px] bg-gray-200 rounded-full h-2.5">
                                      <div 
                                        className={`h-2.5 rounded-full transition-all duration-300 ${
                                          progressPercentage >= 100 ? 'bg-green-500' :
                                          progressPercentage >= 50 ? 'bg-blue-500' :
                                          progressPercentage > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                                        }`}
                                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                      ></div>
                                    </div>
                                    {/* Progress Text */}
                                    <div className="text-xs text-gray-600">
                                      <span className="font-semibold">{progressPercentage.toFixed(1)}%</span>
                                      <br />
                                      <span className="text-gray-500">
                                        {quantityCompleted}/{quantityTotal}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">ไม่มีรายการสินค้า</p>
              </div>
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