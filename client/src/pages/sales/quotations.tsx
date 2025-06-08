import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Eye, FileText, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "wouter";

interface Quotation {
  id: number;
  quotationNumber: string;
  customerId: number;
  projectName?: string;
  date: string;
  validUntil: string;
  status: string;
  subtotal: number;
  grandTotal: number;
  customer?: {
    name: string;
    companyName: string;
  };
}

export default function Quotations() {
  const { t } = useLanguage();
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Queries
  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['/api/quotations'],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers'],
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/quotations/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "ลบใบเสนอราคาเรียบร้อยแล้ว",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      setShowDeleteDialog(false);
      setSelectedQuotation(null);
    },
    onError: () => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบใบเสนอราคาได้",
        variant: "destructive",
      });
    }
  });

  // Filter quotations based on search term
  const filteredQuotations = Array.isArray(quotations) ? quotations.filter((quotation: any) => {
    const customer = Array.isArray(customers) ? customers.find((c: any) => c.id === quotation.customerId) : null;
    return (
      quotation.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quotation.projectName && quotation.projectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer && (
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.companyName.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
  }) : [];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "ร่าง", variant: "secondary" as const },
      sent: { label: "ส่งแล้ว", variant: "default" as const },
      approved: { label: "อนุมัติ", variant: "default" as const },
      rejected: { label: "ปฏิเสธ", variant: "destructive" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant} className="text-xs px-2 py-0 h-5">{config.label}</Badge>;
  };

  const getCustomerName = (customerId: number) => {
    if (!Array.isArray(customers)) return "ไม่ระบุลูกค้า";
    const customer = customers.find((c: any) => c.id === customerId);
    return customer ? `${customer.name} - ${customer.companyName}` : "ไม่ระบุลูกค้า";
  };

  const handleEdit = (quotation: Quotation) => {
    // Navigate to edit form with quotation data
    navigate(`/sales/quotations/edit/${quotation.id}`);
  };

  const handleDelete = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedQuotation) {
      deleteMutation.mutate(selectedQuotation.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-full mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                ใบเสนอราคา
              </h1>
              <p className="text-gray-600 mt-1">จัดการใบเสนอราคาทั้งหมด</p>
            </div>
            <Button 
              onClick={() => navigate('/sales/quotations/new')}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              สร้างใบเสนอราคาใหม่
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="ค้นหาเลขที่ใบเสนอราคา, ชื่อโปรเจค หรือลูกค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Quotations Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-4 text-left text-sm font-medium text-gray-700 w-[12%]">เลขที่</th>
                  <th className="px-3 py-4 text-left text-sm font-medium text-gray-700 w-[15%]">ลูกค้า</th>
                  <th className="px-3 py-4 text-left text-sm font-medium text-gray-700 w-[20%]">ชื่อโปรเจค</th>
                  <th className="px-3 py-4 text-left text-sm font-medium text-gray-700 w-[10%]">วันที่</th>
                  <th className="px-3 py-4 text-left text-sm font-medium text-gray-700 w-[10%]">หมดอายุ</th>
                  <th className="px-3 py-4 text-left text-sm font-medium text-gray-700 w-[8%]">สถานะ</th>
                  <th className="px-3 py-4 text-right text-sm font-medium text-gray-700 w-[12%]">ยอดรวม</th>
                  <th className="px-3 py-4 text-center text-sm font-medium text-gray-700 w-[13%]">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? "ไม่พบข้อมูลที่ค้นหา" : "ยังไม่มีใบเสนอราคา"}
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map((quotation: any) => (
                    <tr key={quotation.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {quotation.quotationNumber}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-900 text-sm truncate">{getCustomerName(quotation.customerId)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-gray-900 text-sm truncate" title={quotation.projectName || "-"}>
                          {quotation.projectName || "-"}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-gray-900 text-sm">
                          {new Date(quotation.date).toLocaleDateString('th-TH', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: '2-digit' 
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-gray-900 text-sm">
                          {new Date(quotation.validUntil).toLocaleDateString('th-TH', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: '2-digit' 
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {getStatusBadge(quotation.status)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="font-medium text-gray-900 text-sm">
                          ฿{(quotation.grandTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(quotation)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(quotation)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {filteredQuotations.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{filteredQuotations.length}</div>
                <div className="text-sm text-gray-600">ใบเสนอราคาทั้งหมด</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {filteredQuotations.filter((q: any) => q.status === 'approved').length}
                </div>
                <div className="text-sm text-gray-600">อนุมัติแล้ว</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {filteredQuotations.filter((q: any) => q.status === 'sent').length}
                </div>
                <div className="text-sm text-gray-600">ส่งแล้ว</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  ฿{filteredQuotations.reduce((sum: number, q: any) => sum + (q.grandTotal || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-600">มูลค่ารวม</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              คุณต้องการลบใบเสนอราคา <strong>{selectedQuotation?.quotationNumber}</strong> หรือไม่?
            </p>
            <p className="text-sm text-red-600 mt-2">
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "กำลังลบ..." : "ลบ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}