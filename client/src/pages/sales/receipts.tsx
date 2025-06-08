import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, FileText, Calendar, User, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "wouter";

export default function Receipts() {
  const { t } = useLanguage();
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // For now, we'll use empty data since this is a placeholder
  const receipts: any[] = [];
  const isLoading = false;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "ร่าง", variant: "secondary" as const },
      issued: { label: "ออกแล้ว", variant: "default" as const },
      cancelled: { label: "ยกเลิก", variant: "destructive" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodBadge = (method: string) => {
    const methodConfig = {
      cash: { label: "เงินสด", variant: "outline" as const },
      transfer: { label: "โอนเงิน", variant: "outline" as const },
      check: { label: "เช็ค", variant: "outline" as const },
      card: { label: "บัตรเครดิต", variant: "outline" as const },
    };
    
    const config = methodConfig[method as keyof typeof methodConfig] || methodConfig.cash;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-full mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                ใบเสร็จรับเงิน
              </h1>
              <p className="text-gray-600 mt-1">จัดการใบเสร็จรับเงินทั้งหมด</p>
            </div>
            <Button 
              onClick={() => navigate('/sales/receipts/new')}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              สร้างใบเสร็จรับเงินใหม่
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="ค้นหาเลขที่ใบเสร็จรับเงิน หรือลูกค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Receipts Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">เลขที่ใบเสร็จ</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">ลูกค้า</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">วันที่</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">วิธีชำระ</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">สถานะ</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">ยอดชำระ</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-700">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : receipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? "ไม่พบข้อมูลที่ค้นหา" : "ยังไม่มีใบเสร็จรับเงิน"}
                    </td>
                  </tr>
                ) : (
                  receipts.map((receipt: any) => (
                    <tr key={receipt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {receipt.receiptNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{receipt.customerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">
                            {new Date(receipt.date).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getPaymentMethodBadge(receipt.paymentMethod)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(receipt.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-medium text-gray-900">
                          ฿{(receipt.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
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
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-orange-600">0</div>
              <div className="text-sm text-gray-600">ใบเสร็จรับเงินทั้งหมด</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">ออกแล้ว</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">0</div>
              <div className="text-sm text-gray-600">ยกเลิก</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">฿0.00</div>
              <div className="text-sm text-gray-600">ยอดชำระรวม</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}