import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { WorkOrder, Customer, WorkType, SubJob } from "@shared/schema";

export default function WorkOrderPrint() {
  const [, params] = useRoute("/production/work-orders/:id/print");
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

  useEffect(() => {
    if (workOrder && !isLoading) {
      // Auto print when data is loaded
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [workOrder, isLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">ไม่พบใบสั่งงาน</div>
      </div>
    );
  }

  const customer = customers.find(c => c.id === workOrder.customerId);
  const workType = workTypes.find(wt => wt.id === workOrder.workTypeId);

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

  const totalAmount = subJobs.reduce((sum, subJob) => 
    sum + (subJob.quantity * parseFloat(subJob.unitPrice)), 0
  );

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
        
        @page {
          size: A4;
          margin: 1cm;
        }
      `}</style>

      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ใบสั่งงาน</h1>
        <p className="text-gray-600">Work Order</p>
      </div>

      {/* Work Order Info */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-800">ข้อมูลใบสั่งงาน</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 font-medium text-gray-600 w-32">เลขที่:</td>
                <td className="py-1 font-bold">{workOrder.orderNumber}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium text-gray-600">สถานะ:</td>
                <td className="py-1">{getStatusText(workOrder.status)}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium text-gray-600">ความสำคัญ:</td>
                <td className="py-1">{getPriorityText(workOrder.priority)}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium text-gray-600">ประเภทงาน:</td>
                <td className="py-1">{workType?.name || 'ไม่ระบุ'}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium text-gray-600">วันที่สร้าง:</td>
                <td className="py-1">{new Date(workOrder.createdAt).toLocaleDateString('th-TH')}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium text-gray-600">กำหนดส่ง:</td>
                <td className="py-1">
                  {workOrder.deliveryDate ? new Date(workOrder.deliveryDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-800">ข้อมูลลูกค้า</h2>
          {customer ? (
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 font-medium text-gray-600 w-32">ชื่อลูกค้า:</td>
                  <td className="py-1">{customer.name}</td>
                </tr>
                {customer.companyName && (
                  <tr>
                    <td className="py-1 font-medium text-gray-600">บริษัท:</td>
                    <td className="py-1">{customer.companyName}</td>
                  </tr>
                )}
                {customer.taxId && (
                  <tr>
                    <td className="py-1 font-medium text-gray-600">เลขประจำตัวผู้เสียภาษี:</td>
                    <td className="py-1">{customer.taxId}</td>
                  </tr>
                )}
                {customer.phone && (
                  <tr>
                    <td className="py-1 font-medium text-gray-600">โทรศัพท์:</td>
                    <td className="py-1">{customer.phone}</td>
                  </tr>
                )}
                {customer.email && (
                  <tr>
                    <td className="py-1 font-medium text-gray-600">อีเมล:</td>
                    <td className="py-1">{customer.email}</td>
                  </tr>
                )}
                {customer.address && (
                  <tr>
                    <td className="py-1 font-medium text-gray-600 align-top">ที่อยู่:</td>
                    <td className="py-1">{customer.address}</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">ไม่มีข้อมูลลูกค้า</p>
          )}
        </div>
      </div>

      {/* Work Order Title and Description */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">รายละเอียดงาน</h2>
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-medium text-lg mb-2">{workOrder.title}</h3>
          {workOrder.description && (
            <p className="text-gray-700 whitespace-pre-wrap">{workOrder.description}</p>
          )}
        </div>
      </div>

      {/* Sub Jobs Table */}
      {subJobs.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">รายการสินค้า</h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">ลำดับ</th>
                <th className="border border-gray-300 px-3 py-2 text-left">ชื่อสินค้า</th>
                <th className="border border-gray-300 px-3 py-2 text-center">จำนวน</th>
                <th className="border border-gray-300 px-3 py-2 text-right">ราคาต่อหน่วย</th>
                <th className="border border-gray-300 px-3 py-2 text-right">ราคารวม</th>
                <th className="border border-gray-300 px-3 py-2 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {subJobs.map((subJob, index) => (
                <tr key={subJob.id}>
                  <td className="border border-gray-300 px-3 py-2 text-center">{index + 1}</td>
                  <td className="border border-gray-300 px-3 py-2">{subJob.productName}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{subJob.quantity}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    ฿{parseFloat(subJob.unitPrice).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    ฿{(subJob.quantity * parseFloat(subJob.unitPrice)).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {getStatusText(subJob.status)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={4} className="border border-gray-300 px-3 py-2 text-right">
                  ยอดรวมทั้งหมด:
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  ฿{totalAmount.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {workOrder.notes && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">หมายเหตุ</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-gray-700 whitespace-pre-wrap">{workOrder.notes}</p>
          </div>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-300">
        <div className="text-center">
          <div className="border-b border-gray-400 mb-2 pb-8"></div>
          <p className="text-sm font-medium">ผู้สั่งงาน</p>
          <p className="text-xs text-gray-600">วันที่: ..................</p>
        </div>
        <div className="text-center">
          <div className="border-b border-gray-400 mb-2 pb-8"></div>
          <p className="text-sm font-medium">ผู้อนุมัติ</p>
          <p className="text-xs text-gray-600">วันที่: ..................</p>
        </div>
        <div className="text-center">
          <div className="border-b border-gray-400 mb-2 pb-8"></div>
          <p className="text-sm font-medium">ผู้รับงาน</p>
          <p className="text-xs text-gray-600">วันที่: ..................</p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 text-xs text-gray-500">
        <p>พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</p>
      </div>
    </div>
  );
}