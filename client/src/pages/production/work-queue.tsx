import { useState } from "react";
import { Calendar, Clock, Users, Plus, Edit2, Trash2, AlertCircle, CheckCircle2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface WorkQueue {
  id: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  priority: number;
  teamId: string;
  tenantId: string;
  estimatedDays: string;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Team {
  id: string;
  departmentId: string;
  name: string;
  leader: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  teamId: string;
  tenantId: string;
  count: number;
  averageWage: string;
  overheadPercentage: string;
  managementPercentage: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: string;
  isRecurring: boolean;
  tenantId: string;
  createdAt: string;
}

export default function WorkQueueManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddWorkOpen, setIsAddWorkOpen] = useState(false);
  const [isEditWorkOpen, setIsEditWorkOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<WorkQueue | null>(null);
  const [newWork, setNewWork] = useState({
    orderNumber: "",
    productName: "",
    quantity: 1,
    priority: 1,
    teamId: "",
    notes: "",
    status: "pending"
  });

  // Queries
  const { data: workQueues = [], isLoading: workQueuesLoading } = useQuery<WorkQueue[]>({
    queryKey: ["/api/work-queues"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
  });

  // Mutations
  const createWorkMutation = useMutation({
    mutationFn: async (workData: any) => {
      const response = await fetch("/api/work-queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workData),
      });
      if (!response.ok) throw new Error("Failed to create work queue");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues"] });
      setIsAddWorkOpen(false);
      setNewWork({
        orderNumber: "",
        productName: "",
        quantity: 1,
        priority: 1,
        teamId: "",
        notes: "",
        status: "pending"
      });
      toast({
        title: "สำเร็จ",
        description: "เพิ่มงานในคิวแล้ว",
      });
    },
  });

  const updateWorkMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...updateData } = data;
      const response = await fetch(`/api/work-queues/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error("Failed to update work queue");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues"] });
      setIsEditWorkOpen(false);
      setEditingWork(null);
      toast({
        title: "สำเร็จ",
        description: "อัปเดตงานแล้ว",
      });
    },
  });

  const deleteWorkMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/work-queues/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete work queue");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues"] });
      toast({
        title: "สำเร็จ",
        description: "ลบงานออกจากคิวแล้ว",
      });
    },
  });

  // Helper functions
  const calculateWorkingDays = (startDate: Date, days: number): Date => {
    const result = new Date(startDate);
    let addedDays = 0;
    
    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      
      // Skip Sundays (0 = Sunday)
      if (result.getDay() === 0) continue;
      
      // Skip holidays
      const dateStr = result.toISOString().split('T')[0];
      const isHoliday = holidays.some(holiday => holiday.date === dateStr);
      if (isHoliday) continue;
      
      addedDays++;
    }
    
    return result;
  };

  const calculateEstimatedDays = (quantity: number, teamId: string): number => {
    // For now, using a simple calculation based on team capacity
    // This should be enhanced with actual production capacity data
    const teamEmployees = employees.filter(emp => emp.teamId === teamId);
    if (teamEmployees.length === 0) return Math.ceil(quantity / 10); // Default 10 pieces per day
    
    const totalEmployees = teamEmployees.reduce((sum, emp) => sum + emp.count, 0);
    const estimatedCapacityPerDay = totalEmployees * 10; // Assume 10 pieces per employee per day
    
    return Math.ceil(quantity / estimatedCapacityPerDay);
  };

  const getTeamName = (teamId: string): string => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : "ไม่ระบุทีม";
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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "in_progress": return <Play className="h-4 w-4" />;
      case "completed": return <CheckCircle2 className="h-4 w-4" />;
      case "cancelled": return <Pause className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleAddWork = () => {
    if (!newWork.orderNumber || !newWork.productName || !newWork.teamId) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกข้อมูลที่จำเป็น",
        variant: "destructive",
      });
      return;
    }

    const estimatedDays = calculateEstimatedDays(newWork.quantity, newWork.teamId);
    const startDate = new Date();
    const expectedEndDate = calculateWorkingDays(startDate, estimatedDays);

    createWorkMutation.mutate({
      ...newWork,
      estimatedDays: estimatedDays.toString(),
      startDate: startDate.toISOString().split('T')[0],
      expectedEndDate: expectedEndDate.toISOString().split('T')[0]
    });
  };

  const handleEditWork = (work: WorkQueue) => {
    setEditingWork(work);
    setIsEditWorkOpen(true);
  };

  const handleUpdateWork = () => {
    if (!editingWork) return;

    updateWorkMutation.mutate({
      id: editingWork.id,
      ...editingWork
    });
  };

  const handleDeleteWork = (id: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?")) {
      deleteWorkMutation.mutate(id);
    }
  };

  const totalTasks = workQueues.length;
  const pendingTasks = workQueues.filter(w => w.status === "pending").length;
  const inProgressTasks = workQueues.filter(w => w.status === "in_progress").length;
  const completedTasks = workQueues.filter(w => w.status === "completed").length;

  if (workQueuesLoading) {
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
            <Calendar className="h-8 w-8 text-blue-600" />
            คิวงานและกำลังการผลิต
          </h1>
          <p className="text-gray-600 mt-2">จัดการคิวงาน คำนวณวันที่เสร็จ และกำหนดลำดับความสำคัญ</p>
        </div>
        <Button
          onClick={() => setIsAddWorkOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          เพิ่มงานใหม่
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">งานทั้งหมด</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              รวมงานในระบบ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">รอดำเนินการ</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground">
              งานที่ยังไม่เริ่ม
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">กำลังดำเนินการ</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTasks}</div>
            <p className="text-xs text-muted-foreground">
              งานที่กำลังทำ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">เสร็จแล้ว</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              งานที่เสร็จสิ้น
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Work Queue List */}
      <div className="space-y-4">
        {workQueues.length > 0 ? (
          workQueues.map((work: WorkQueue) => (
            <Card key={work.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{work.orderNumber}</h3>
                    <Badge className={getPriorityColor(work.priority)}>
                      ลำดับ {work.priority}
                    </Badge>
                    <Badge className={getStatusColor(work.status)}>
                      {getStatusIcon(work.status)}
                      <span className="ml-1">
                        {work.status === "pending" && "รอดำเนินการ"}
                        {work.status === "in_progress" && "กำลังดำเนินการ"}
                        {work.status === "completed" && "เสร็จแล้ว"}
                        {work.status === "cancelled" && "ยกเลิก"}
                      </span>
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">สินค้า:</span> {work.productName}
                    </div>
                    <div>
                      <span className="font-medium">จำนวน:</span> {work.quantity.toLocaleString()} ชิ้น
                    </div>
                    <div>
                      <span className="font-medium">ทีม:</span> {getTeamName(work.teamId)}
                    </div>
                    <div>
                      <span className="font-medium">ประมาณ:</span> {work.estimatedDays} วัน
                    </div>
                    <div>
                      <span className="font-medium">เริ่ม:</span> {work.startDate || "ยังไม่เริ่ม"}
                    </div>
                    <div>
                      <span className="font-medium">คาดเสร็จ:</span> {work.expectedEndDate || "ไม่ระบุ"}
                    </div>
                  </div>
                  {work.notes && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">หมายเหตุ:</span> {work.notes}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditWork(work)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteWork(work.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีงานในคิว</h3>
            <p className="text-gray-600 mb-4">เริ่มต้นด้วยการเพิ่มงานใหม่เข้าสู่คิว</p>
            <Button onClick={() => setIsAddWorkOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มงานแรก
            </Button>
          </Card>
        )}
      </div>

      {/* Add Work Dialog */}
      <Dialog open={isAddWorkOpen} onOpenChange={setIsAddWorkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มงานใหม่</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">เลขที่คำสั่งซื้อ</label>
              <Input
                value={newWork.orderNumber}
                onChange={(e) => setNewWork({...newWork, orderNumber: e.target.value})}
                placeholder="PO-001"
              />
            </div>
            <div>
              <label className="text-sm font-medium">ชื่อสินค้า</label>
              <Input
                value={newWork.productName}
                onChange={(e) => setNewWork({...newWork, productName: e.target.value})}
                placeholder="เสื้อยืดคอกลม"
              />
            </div>
            <div>
              <label className="text-sm font-medium">จำนวน</label>
              <Input
                type="number"
                value={newWork.quantity}
                onChange={(e) => setNewWork({...newWork, quantity: parseInt(e.target.value) || 1})}
                min="1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">ลำดับความสำคัญ</label>
              <Select value={newWork.priority.toString()} onValueChange={(value) => setNewWork({...newWork, priority: parseInt(value)})}>
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
              <Select value={newWork.teamId} onValueChange={(value) => setNewWork({...newWork, teamId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกทีม" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team: Team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">หมายเหตุ</label>
              <Input
                value={newWork.notes}
                onChange={(e) => setNewWork({...newWork, notes: e.target.value})}
                placeholder="หมายเหตุเพิ่มเติม"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddWorkOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleAddWork} disabled={createWorkMutation.isPending}>
                {createWorkMutation.isPending ? "กำลังเพิ่ม..." : "เพิ่มงาน"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Work Dialog */}
      <Dialog open={isEditWorkOpen} onOpenChange={setIsEditWorkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขงาน</DialogTitle>
          </DialogHeader>
          {editingWork && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">เลขที่คำสั่งซื้อ</label>
                <Input
                  value={editingWork.orderNumber}
                  onChange={(e) => setEditingWork({...editingWork, orderNumber: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">ชื่อสินค้า</label>
                <Input
                  value={editingWork.productName}
                  onChange={(e) => setEditingWork({...editingWork, productName: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">จำนวน</label>
                <Input
                  type="number"
                  value={editingWork.quantity}
                  onChange={(e) => setEditingWork({...editingWork, quantity: parseInt(e.target.value) || 1})}
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">ลำดับความสำคัญ</label>
                <Select value={editingWork.priority.toString()} onValueChange={(value) => setEditingWork({...editingWork, priority: parseInt(value)})}>
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
                <label className="text-sm font-medium">สถานะ</label>
                <Select value={editingWork.status} onValueChange={(value) => setEditingWork({...editingWork, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">รอดำเนินการ</SelectItem>
                    <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                    <SelectItem value="completed">เสร็จแล้ว</SelectItem>
                    <SelectItem value="cancelled">ยกเลิก</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">หมายเหตุ</label>
                <Input
                  value={editingWork.notes || ""}
                  onChange={(e) => setEditingWork({...editingWork, notes: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditWorkOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleUpdateWork} disabled={updateWorkMutation.isPending}>
                  {updateWorkMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}