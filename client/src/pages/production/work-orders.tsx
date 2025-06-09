import { useState, useEffect } from "react";
import { ClipboardList, Plus, Edit2, Trash2, FileText, Users, Calendar, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface WorkOrder {
  id: string;
  orderNumber: string;
  quotationId: number | null;
  customerId: number;
  customerName: string;
  customerTaxId: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  title: string;
  description: string | null;
  totalAmount: string;
  status: string;
  priority: number;
  workTypeId: number | null;
  startDate: string | null;
  deliveryDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  assignedTeamId: string | null;
  notes: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

interface Quotation {
  id: number;
  quotationNumber: string;
  customerId: number;
  customerName: string;
  title: string;
  description: string | null;
  totalAmount: string;
  status: string;
  validUntil: string;
  createdAt: string;
}

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  taxId: string;
  address: string;
  type: string;
  status: string;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  leader: string;
  status: string;
}

export default function WorkOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newWorkOrder, setNewWorkOrder] = useState({
    title: "",
    description: "",
    customerId: "",
    quotationId: "",
    priority: 3,
    startDate: "",
    dueDate: "",
    assignedTeamId: "",
    notes: ""
  });

  // Auto-login for development
  useEffect(() => {
    const autoLogin = async () => {
      try {
        await apiRequest("/api/auth/login", "POST", {
          username: "demo",
          password: "demo"
        });
      } catch (error) {
        console.log("Auto-login failed, user may already be logged in");
      }
    };
    autoLogin();
  }, []);

  // Queries
  const { data: workOrders = [], isLoading: workOrdersLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: quotations = [] } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: workTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/work-types"],
  });

  // Mutations
  const createWorkOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/work-orders", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "สำเร็จ",
        description: "สร้างใบสั่งงานแล้ว",
      });
    },
  });

  const updateWorkOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...updateData } = data;
      return await apiRequest(`/api/work-orders/${id}`, "PUT", updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setIsEditOpen(false);
      setEditingWorkOrder(null);
      toast({
        title: "สำเร็จ",
        description: "อัปเดตใบสั่งงานแล้ว",
      });
    },
  });

  const deleteWorkOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/work-orders/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({
        title: "สำเร็จ",
        description: "ลบใบสั่งงานแล้ว",
      });
    },
  });

  // Helper functions
  const resetForm = () => {
    setNewWorkOrder({
      title: "",
      description: "",
      customerId: "",
      quotationId: "",
      priority: 3,
      startDate: "",
      dueDate: "",
      assignedTeamId: "",
      notes: ""
    });
    setSelectedQuotation(null);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "approved": return "bg-blue-100 text-blue-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: number): string => {
    switch (priority) {
      case 1: return "bg-red-100 text-red-800";
      case 2: return "bg-orange-100 text-orange-800";
      case 3: return "bg-yellow-100 text-yellow-800";
      case 4: return "bg-blue-100 text-blue-800";
      case 5: return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCustomerName = (customerId: number): string => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : "ไม่ระบุลูกค้า";
  };

  const getTeamName = (teamId: string | null): string => {
    if (!teamId) return "ยังไม่กำหนดทีม";
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : "ไม่ระบุทีม";
  };

  const getWorkTypeName = (workTypeId: number | null): string => {
    if (!workTypeId) return "-";
    const workType = workTypes.find((wt: any) => wt.id === workTypeId);
    return workType ? workType.name : "-";
  };

  const handleQuotationSelect = (quotationId: string) => {
    if (!quotationId || quotationId === "none") {
      setSelectedQuotation(null);
      setNewWorkOrder(prev => ({
        ...prev,
        quotationId: "",
        title: "",
        description: "",
        customerId: ""
      }));
      return;
    }

    const quotation = quotations.find(q => q.id === parseInt(quotationId));
    if (quotation) {
      setSelectedQuotation(quotation);
      setNewWorkOrder(prev => ({
        ...prev,
        quotationId: quotationId,
        title: quotation.title,
        description: quotation.description || "",
        customerId: quotation.customerId.toString()
      }));
    }
  };

  const handleCreateWorkOrder = () => {
    if (!newWorkOrder.title || !newWorkOrder.customerId) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกข้อมูลที่จำเป็น",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      ...newWorkOrder,
      customerId: parseInt(newWorkOrder.customerId),
      quotationId: newWorkOrder.quotationId ? parseInt(newWorkOrder.quotationId) : null,
    };

    createWorkOrderMutation.mutate(orderData);
  };

  const handleEditWorkOrder = (workOrder: WorkOrder) => {
    // Navigate to edit form with work order ID
    window.location.href = `/production/work-orders/edit/${workOrder.id}`;
  };

  const handleUpdateWorkOrder = () => {
    if (!editingWorkOrder) return;

    updateWorkOrderMutation.mutate({
      id: editingWorkOrder.id,
      title: editingWorkOrder.title,
      description: editingWorkOrder.description,
      status: editingWorkOrder.status,
      priority: editingWorkOrder.priority,
      startDate: editingWorkOrder.startDate,
      dueDate: editingWorkOrder.dueDate,
      assignedTeamId: editingWorkOrder.assignedTeamId,
      notes: editingWorkOrder.notes
    });
  };

  const handleDeleteWorkOrder = (id: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบใบสั่งงานนี้?")) {
      deleteWorkOrderMutation.mutate(id);
    }
  };

  // Filter work orders
  const filteredWorkOrders = workOrders.filter(order => {
    const orderNumber = order.orderNumber || "";
    const title = order.title || "";
    const customerName = order.customerName || "";
    
    const matchesSearch = orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalOrders = workOrders.length;
  const draftOrders = workOrders.filter(o => o.status === "draft").length;
  const approvedOrders = workOrders.filter(o => o.status === "approved").length;
  const inProgressOrders = workOrders.filter(o => o.status === "in_progress").length;
  const completedOrders = workOrders.filter(o => o.status === "completed").length;

  if (workOrdersLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-blue-600" />
            ใบสั่งงาน
          </h1>
          <p className="text-gray-600 mt-2">จัดการใบสั่งงานการผลิต สร้างจากใบเสนอราคาหรือสร้างใหม่</p>
        </div>
        <Button
          onClick={() => window.location.href = "/production/work-orders/new"}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          สร้างใบสั่งงาน
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ทั้งหมด</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">ใบสั่งงานทั้งหมด</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ร่าง</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftOrders}</div>
            <p className="text-xs text-muted-foreground">รอการอนุมัติ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">อนุมัติแล้ว</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedOrders}</div>
            <p className="text-xs text-muted-foreground">พร้อมเริ่มงาน</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">กำลังดำเนินการ</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressOrders}</div>
            <p className="text-xs text-muted-foreground">งานที่กำลังทำ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">เสร็จแล้ว</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrders}</div>
            <p className="text-xs text-muted-foreground">งานที่เสร็จสิ้น</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ค้นหาเลขที่ใบสั่งงาน, ชื่องาน, หรือลูกค้า..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="กรองตามสถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="draft">ร่าง</SelectItem>
            <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
            <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
            <SelectItem value="completed">เสร็จแล้ว</SelectItem>
            <SelectItem value="cancelled">ยกเลิก</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Work Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-900">เลขที่ Job</th>
                  <th className="text-left p-4 font-medium text-gray-900">ชื่องาน</th>
                  <th className="text-left p-4 font-medium text-gray-900">ลูกค้า</th>
                  <th className="text-left p-4 font-medium text-gray-900">วันกำหนดส่ง</th>
                  <th className="text-left p-4 font-medium text-gray-900">ประเภทงาน</th>
                  <th className="text-right p-4 font-medium text-gray-900">ยอดรวม</th>
                  <th className="text-center p-4 font-medium text-gray-900">สถานะ</th>
                  <th className="text-center p-4 font-medium text-gray-900">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkOrders.length > 0 ? (
                  filteredWorkOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium text-blue-600">{order.orderNumber}</td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{order.title}</div>
                          {order.description && (
                            <div className="text-sm text-gray-500 mt-1">{order.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{order.customerName}</td>
                      <td className="p-4">
                        {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('th-TH') : "ยังไม่กำหนด"}
                      </td>
                      <td className="p-4">
                        {getWorkTypeName(order.workTypeId)}
                      </td>
                      <td className="p-4 text-right font-medium">
                        ฿{parseFloat(order.totalAmount).toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status === "draft" && "ร่าง"}
                          {order.status === "approved" && "อนุมัติแล้ว"}
                          {order.status === "in_progress" && "กำลังดำเนินการ"}
                          {order.status === "completed" && "เสร็จแล้ว"}
                          {order.status === "cancelled" && "ยกเลิก"}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditWorkOrder(order)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteWorkOrder(order.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีใบสั่งงาน</h3>
                      <p className="text-gray-600 mb-4">เริ่มต้นด้วยการสร้างใบสั่งงานใหม่</p>
                      <Button onClick={() => window.location.href = "/production/work-orders/new"}>
                        <Plus className="h-4 w-4 mr-2" />
                        สร้างใบสั่งงานแรก
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Work Order Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>สร้างใบสั่งงานใหม่</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div>
              <label className="text-sm font-medium">อ้างอิงใบเสนอราคา (ไม่บังคับ)</label>
              <Select value={newWorkOrder.quotationId} onValueChange={handleQuotationSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกใบเสนอราคา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">สร้างใหม่ (ไม่อ้างอิง)</SelectItem>
                  {quotations.filter(q => q.status === "approved").map((quotation) => (
                    <SelectItem key={quotation.id} value={quotation.id.toString()}>
                      {quotation.quotationNumber} - {quotation.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">ชื่องาน</label>
              <Input
                value={newWorkOrder.title}
                onChange={(e) => setNewWorkOrder({...newWorkOrder, title: e.target.value})}
                placeholder="ระบุชื่องาน"
              />
            </div>

            <div>
              <label className="text-sm font-medium">รายละเอียด</label>
              <Input
                value={newWorkOrder.description}
                onChange={(e) => setNewWorkOrder({...newWorkOrder, description: e.target.value})}
                placeholder="รายละเอียดงาน"
              />
            </div>

            <div>
              <label className="text-sm font-medium">ลูกค้า</label>
              <Select 
                value={newWorkOrder.customerId} 
                onValueChange={(value) => setNewWorkOrder({...newWorkOrder, customerId: value})}
                disabled={!!selectedQuotation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกลูกค้า" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">ลำดับความสำคัญ</label>
                <Select 
                  value={newWorkOrder.priority.toString()} 
                  onValueChange={(value) => setNewWorkOrder({...newWorkOrder, priority: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - สูงสุด</SelectItem>
                    <SelectItem value="2">2 - สูง</SelectItem>
                    <SelectItem value="3">3 - ปานกลาง</SelectItem>
                    <SelectItem value="4">4 - ต่ำ</SelectItem>
                    <SelectItem value="5">5 - ต่ำสุด</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">ทีมที่รับผิดชอบ</label>
                <Select 
                  value={newWorkOrder.assignedTeamId} 
                  onValueChange={(value) => setNewWorkOrder({...newWorkOrder, assignedTeamId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกทีม" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">วันที่เริ่ม</label>
                <Input
                  type="date"
                  value={newWorkOrder.startDate}
                  onChange={(e) => setNewWorkOrder({...newWorkOrder, startDate: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium">วันที่กำหนดเสร็จ</label>
                <Input
                  type="date"
                  value={newWorkOrder.dueDate}
                  onChange={(e) => setNewWorkOrder({...newWorkOrder, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">หมายเหตุ</label>
              <Input
                value={newWorkOrder.notes}
                onChange={(e) => setNewWorkOrder({...newWorkOrder, notes: e.target.value})}
                placeholder="หมายเหตุเพิ่มเติม"
              />
            </div>

            {selectedQuotation && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">ข้อมูลจากใบเสนอราคา</h4>
                <div className="text-sm text-blue-800">
                  <p><span className="font-medium">เลขที่:</span> {selectedQuotation.quotationNumber}</p>
                  <p><span className="font-medium">ลูกค้า:</span> {selectedQuotation.customerName}</p>
                  <p><span className="font-medium">จำนวนเงิน:</span> {parseFloat(selectedQuotation.totalAmount).toLocaleString()} บาท</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleCreateWorkOrder} disabled={createWorkOrderMutation.isPending}>
                {createWorkOrderMutation.isPending ? "กำลังสร้าง..." : "สร้างใบสั่งงาน"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Work Order Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>แก้ไขใบสั่งงาน</DialogTitle>
          </DialogHeader>
          {editingWorkOrder && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="text-sm font-medium">ชื่องาน</label>
                <Input
                  value={editingWorkOrder.title}
                  onChange={(e) => setEditingWorkOrder({...editingWorkOrder, title: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium">รายละเอียด</label>
                <Input
                  value={editingWorkOrder.description || ""}
                  onChange={(e) => setEditingWorkOrder({...editingWorkOrder, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">สถานะ</label>
                  <Select 
                    value={editingWorkOrder.status} 
                    onValueChange={(value) => setEditingWorkOrder({...editingWorkOrder, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">ร่าง</SelectItem>
                      <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                      <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                      <SelectItem value="completed">เสร็จแล้ว</SelectItem>
                      <SelectItem value="cancelled">ยกเลิก</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">ลำดับความสำคัญ</label>
                  <Select 
                    value={editingWorkOrder.priority.toString()} 
                    onValueChange={(value) => setEditingWorkOrder({...editingWorkOrder, priority: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - สูงสุด</SelectItem>
                      <SelectItem value="2">2 - สูง</SelectItem>
                      <SelectItem value="3">3 - ปานกลาง</SelectItem>
                      <SelectItem value="4">4 - ต่ำ</SelectItem>
                      <SelectItem value="5">5 - ต่ำสุด</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">ทีมที่รับผิดชอบ</label>
                <Select 
                  value={editingWorkOrder.assignedTeamId || ""} 
                  onValueChange={(value) => setEditingWorkOrder({...editingWorkOrder, assignedTeamId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกทีม" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">วันที่เริ่ม</label>
                  <Input
                    type="date"
                    value={editingWorkOrder.startDate || ""}
                    onChange={(e) => setEditingWorkOrder({...editingWorkOrder, startDate: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">วันที่กำหนดเสร็จ</label>
                  <Input
                    type="date"
                    value={editingWorkOrder.dueDate || ""}
                    onChange={(e) => setEditingWorkOrder({...editingWorkOrder, dueDate: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">หมายเหตุ</label>
                <Input
                  value={editingWorkOrder.notes || ""}
                  onChange={(e) => setEditingWorkOrder({...editingWorkOrder, notes: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleUpdateWorkOrder} disabled={updateWorkOrderMutation.isPending}>
                  {updateWorkOrderMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}