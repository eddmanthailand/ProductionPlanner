import { useState } from "react";
import { ClipboardList, Plus, Edit2, Eye, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WorkOrder {
  id: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  unit: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  assignedTo: string;
  startDate: string;
  dueDate: string;
  progress: number;
  notes: string;
  materials: Material[];
}

interface Material {
  id: string;
  name: string;
  required: number;
  unit: string;
  available: number;
  status: "sufficient" | "shortage" | "ordered";
}

export default function WorkOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [workOrders] = useState<WorkOrder[]>([
    {
      id: "WO001",
      orderNumber: "WO2025-001",
      productName: "ชุดบอดี้สูทผ้าลูกไม้",
      quantity: 208,
      unit: "ตัว",
      priority: "high",
      status: "in-progress",
      assignedTo: "ทีมผลิต A",
      startDate: "2025-06-08",
      dueDate: "2025-06-15",
      progress: 65,
      notes: "ลูกค้า CURVF - ต้องการคุณภาพดี ส่งภายในกำหนด",
      materials: [
        { id: "M001", name: "ผ้าลูกไม้", required: 250, unit: "หลา", available: 200, status: "shortage" },
        { id: "M002", name: "ซิป", required: 208, unit: "เส้น", available: 300, status: "sufficient" },
        { id: "M003", name: "เข็มขัด", required: 208, unit: "เส้น", available: 150, status: "shortage" }
      ]
    },
    {
      id: "WO002",
      orderNumber: "WO2025-002",
      productName: "เสื้อยืดพิมพ์ลาย",
      quantity: 100,
      unit: "ตัว",
      priority: "medium",
      status: "pending",
      assignedTo: "ทีมผลิต B",
      startDate: "2025-06-10",
      dueDate: "2025-06-17",
      progress: 0,
      notes: "รอวัตถุดิบเข้า",
      materials: [
        { id: "M004", name: "ผ้าเสื้อยืด", required: 120, unit: "หลา", available: 80, status: "ordered" },
        { id: "M005", name: "หมึกพิมพ์", required: 5, unit: "กิโลกรัม", available: 10, status: "sufficient" }
      ]
    },
    {
      id: "WO003",
      orderNumber: "WO2025-003",
      productName: "กางเกงยีนส์",
      quantity: 50,
      unit: "ตัว",
      priority: "low",
      status: "completed",
      assignedTo: "ทีมผลิต A",
      startDate: "2025-06-01",
      dueDate: "2025-06-07",
      progress: 100,
      notes: "เสร็จสิ้นตามกำหนดเวลา",
      materials: [
        { id: "M006", name: "ผ้ายีนส์", required: 75, unit: "หลา", available: 100, status: "sufficient" },
        { id: "M007", name: "กระดุม", required: 300, unit: "ชิ้น", available: 500, status: "sufficient" }
      ]
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "in-progress": return <AlertCircle className="w-4 h-4" />;
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "cancelled": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getMaterialStatusColor = (status: string) => {
    switch (status) {
      case "sufficient": return "bg-green-100 text-green-800";
      case "shortage": return "bg-red-100 text-red-800";
      case "ordered": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredOrders = workOrders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-blue-600" />
            ใบสั่งงาน
          </h1>
          <p className="text-gray-600 mt-1">จัดการและติดตามใบสั่งผลิต</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          สร้างใบสั่งงานใหม่
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">รอดำเนินการ</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {workOrders.filter(wo => wo.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">กำลังผลิต</p>
                <p className="text-2xl font-bold text-blue-600">
                  {workOrders.filter(wo => wo.status === 'in-progress').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">เสร็จสิ้น</p>
                <p className="text-2xl font-bold text-green-600">
                  {workOrders.filter(wo => wo.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ความคืบหน้าเฉลี่ย</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(workOrders.reduce((sum, wo) => sum + wo.progress, 0) / workOrders.length)}%
                </p>
              </div>
              <ClipboardList className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="ค้นหาใบสั่งงาน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="pending">รอดำเนินการ</SelectItem>
                <SelectItem value="in-progress">กำลังผลิต</SelectItem>
                <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                <SelectItem value="cancelled">ยกเลิก</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="ความสำคัญ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกระดับ</SelectItem>
                <SelectItem value="urgent">เร่งด่วน</SelectItem>
                <SelectItem value="high">สูง</SelectItem>
                <SelectItem value="medium">ปานกลาง</SelectItem>
                <SelectItem value="low">ต่ำ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders List */}
      <div className="space-y-4">
        {filteredOrders.map(order => (
          <Card key={order.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order Info */}
                <div className="lg:col-span-2">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {order.orderNumber}
                      </h3>
                      <p className="text-gray-600 mb-2">{order.productName}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>จำนวน: {order.quantity.toLocaleString()} {order.unit}</span>
                        <span>มอบหมาย: {order.assignedTo}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(order.priority)}>
                        {order.priority}
                      </Badge>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{order.status}</span>
                      </Badge>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">ความคืบหน้า</span>
                      <span className="text-sm font-medium text-gray-900">{order.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(order.progress)}`}
                        style={{ width: `${order.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">วันที่เริ่ม:</span>
                      <span className="ml-2 text-gray-600">
                        {new Date(order.startDate).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">กำหนดส่งมอบ:</span>
                      <span className="ml-2 text-gray-600">
                        {new Date(order.dueDate).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">หมายเหตุ:</span>
                      <p className="text-sm text-gray-600 mt-1">{order.notes}</p>
                    </div>
                  )}
                </div>

                {/* Materials */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">วัตถุดิบที่ต้องการ</h4>
                  <div className="space-y-2">
                    {order.materials.map(material => (
                      <div key={material.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">{material.name}</span>
                          <Badge className={getMaterialStatusColor(material.status)}>
                            {material.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div>ต้องการ: {material.required.toLocaleString()} {material.unit}</div>
                          <div>มีในสต็อก: {material.available.toLocaleString()} {material.unit}</div>
                        </div>
                        {material.status === 'shortage' && (
                          <div className="mt-2 text-xs text-red-600">
                            ขาด: {(material.required - material.available).toLocaleString()} {material.unit}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  ดูรายละเอียด
                </Button>
                <Button variant="outline" size="sm">
                  <Edit2 className="w-4 h-4 mr-2" />
                  แก้ไข
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบใบสั่งงาน</h3>
            <p className="text-gray-500">ลองเปลี่ยนเงื่อนไขการค้นหาหรือสร้างใบสั่งงานใหม่</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}