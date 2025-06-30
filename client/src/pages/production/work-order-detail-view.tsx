import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import Layout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Printer, FileText, User, Calendar, Package, MapPin, Phone, Mail } from "lucide-react";
import { Link } from "wouter";
import { WorkOrder, Customer, WorkType, SubJob } from "@shared/schema";
import WorkOrderAttachments from "@/components/WorkOrderAttachments";

export default function WorkOrderDetailView() {
  const [, params] = useRoute("/production/work-orders/:id/view");
  const workOrderId = params?.id;

  // Fetch work order
  const { data: workOrder, isLoading } = useQuery<WorkOrder>({
    queryKey: ["/api/work-orders", workOrderId],
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

  // Fetch sub jobs
  const { data: subJobs = [] } = useQuery<SubJob[]>({
    queryKey: ["/api/work-orders", workOrderId, "sub-jobs"],
    enabled: !!workOrderId,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">กำลังโหลดข้อมูล...</div>
        </div>
      </Layout>
    );
  }

  if (!workOrder) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-500">ไม่พบใบสั่งงาน</p>
        </div>
      </Layout>
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

  const handlePrint = () => {
    window.open(`/production/work-orders/${workOrderId}/print`, '_blank');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/production/work-orders">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับ
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                รายละเอียดใบสั่งงาน
              </h1>
              <p className="text-gray-600 mt-1">{workOrder.orderNumber}</p>
            </div>
          </div>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            พิมพ์ใบสั่งงาน
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">ข้อมูลทั่วไป</TabsTrigger>
            <TabsTrigger value="sub-jobs">รายการสินค้า</TabsTrigger>
            <TabsTrigger value="attachments">ไฟล์แนบ</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="grid gap-6">
              {/* Work Order Info */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        {workOrder.orderNumber}
                        <Badge className={`${getStatusColor(workOrder.status)} border-0`}>
                          {getStatusText(workOrder.status)}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(workOrder.priority)}>
                          {getPriorityText(workOrder.priority)}
                        </Badge>
                      </CardTitle>
                      <h2 className="text-xl font-medium text-gray-900 mt-2">{workOrder.title}</h2>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">ประเภทงาน:</span>
                        <span>{workType?.name || 'ไม่ระบุ'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">วันที่สร้าง:</span>
                        <span>{new Date(workOrder.createdAt).toLocaleDateString('th-TH')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">กำหนดส่ง:</span>
                        <span>{workOrder.deliveryDate ? new Date(workOrder.deliveryDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">ยอดรวมทั้งหมด:</span>
                        <span className="text-lg font-bold text-green-600 ml-2">
                          ฿{parseFloat(workOrder.totalAmount).toLocaleString()}
                        </span>
                      </div>
                      {workOrder.completedDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">วันที่เสร็จสิ้น:</span>
                          <span>{new Date(workOrder.completedDate).toLocaleDateString('th-TH')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {workOrder.description && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-medium mb-2">รายละเอียดงาน</h3>
                        <p className="text-gray-600 whitespace-pre-wrap">{workOrder.description}</p>
                      </div>
                    </>
                  )}

                  {workOrder.notes && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-medium mb-2">หมายเหตุ</h3>
                        <p className="text-gray-600 whitespace-pre-wrap">{workOrder.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Customer Info */}
              {customer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      ข้อมูลลูกค้า
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium">ชื่อลูกค้า:</span>
                          <span className="ml-2">{customer.name}</span>
                        </div>
                        {customer.companyName && (
                          <div>
                            <span className="font-medium">บริษัท:</span>
                            <span className="ml-2">{customer.companyName}</span>
                          </div>
                        )}
                        {customer.taxId && (
                          <div>
                            <span className="font-medium">เลขประจำตัวผู้เสียภาษี:</span>
                            <span className="ml-2">{customer.taxId}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {customer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                            <span className="text-sm">{customer.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sub-jobs">
            <Card>
              <CardHeader>
                <CardTitle>รายการสินค้า</CardTitle>
              </CardHeader>
              <CardContent>
                {subJobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    ยังไม่มีรายการสินค้า
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">ลำดับ</th>
                          <th className="text-left py-2">ชื่อสินค้า</th>
                          <th className="text-center py-2">จำนวน</th>
                          <th className="text-right py-2">ราคาต่อหน่วย</th>
                          <th className="text-right py-2">ราคารวม</th>
                          <th className="text-center py-2">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subJobs.map((subJob, index) => (
                          <tr key={subJob.id} className="border-b">
                            <td className="py-2">{index + 1}</td>
                            <td className="py-2">{subJob.productName}</td>
                            <td className="py-2 text-center">{subJob.quantity}</td>
                            <td className="py-2 text-right">
                              ฿{parseFloat(subJob.unitPrice).toLocaleString()}
                            </td>
                            <td className="py-2 text-right">
                              ฿{(subJob.quantity * parseFloat(subJob.unitPrice)).toLocaleString()}
                            </td>
                            <td className="py-2 text-center">
                              <Badge className={getStatusColor(subJob.status)}>
                                {getStatusText(subJob.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attachments">
            <WorkOrderAttachments workOrderId={workOrderId!} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}