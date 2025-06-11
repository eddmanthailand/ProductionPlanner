import { useState } from "react";
import { Calendar, Clock, Users, Plus, Save, FileText, CheckCircle2, AlertCircle, Edit2, ChevronRight, Building, UserCheck, Workflow, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface DailyWorkLog {
  id: string;
  date: string;
  teamId: string;
  employeeId: string;
  workOrderId: string;
  subJobId: number;
  hoursWorked: number;
  workDescription: string;
  status: 'in_progress' | 'completed' | 'paused';
  notes?: string;
  quantityCompleted?: number;
  createdAt: string;
  updatedAt: string;
}

interface Team {
  id: string;
  name: string;
  leader: string;
  departmentId: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  teamId: string;
  position: string;
}

interface WorkOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  title: string;
  status: string;
}

interface SubJob {
  id: number;
  workOrderId: string;
  productName: string;
  quantity: number;
  status: string;
  totalCost: string;
  colorName?: string;
  sizeName?: string;
  customerName?: string;
  orderNumber?: string;
  unitPrice?: number;
  completedQuantity?: number;
}

interface Department {
  id: string;
  name: string;
  tenantId: string;
}

interface WorkStep {
  id: string;
  name: string;
  sequence: number;
  tenantId: string;
}

export default function DailyWorkLog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedWorkStep, setSelectedWorkStep] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<string>("");
  const [selectedSubJob, setSelectedSubJob] = useState<string>("");
  const [hoursWorked, setHoursWorked] = useState<string>("");
  const [quantityCompleted, setQuantityCompleted] = useState<string>("");
  const [workDescription, setWorkDescription] = useState<string>("");
  const [workStatus, setWorkStatus] = useState<string>("in_progress");
  const [notes, setNotes] = useState<string>("");
  const [editingLog, setEditingLog] = useState<DailyWorkLog | null>(null);

  // Data queries
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams", selectedDepartment],
    enabled: !!selectedDepartment,
    queryFn: async () => {
      if (!selectedDepartment) return [];
      const response = await fetch(`/api/teams?departmentId=${selectedDepartment}`);
      if (!response.ok) throw new Error('Failed to fetch teams');
      return response.json();
    }
  });

  const { data: workSteps = [] } = useQuery<WorkStep[]>({
    queryKey: ["/api/work-steps", selectedDepartment],
    enabled: !!selectedDepartment,
    queryFn: async () => {
      if (!selectedDepartment) return [];
      const response = await fetch(`/api/departments/${selectedDepartment}/work-steps`);
      if (!response.ok) throw new Error('Failed to fetch work steps');
      return response.json();
    }
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees/by-team", selectedTeam],
    enabled: !!selectedTeam,
    queryFn: async () => {
      if (!selectedTeam) return [];
      const response = await fetch(`/api/employees/by-team/${selectedTeam}`);
      if (!response.ok) throw new Error('Failed to fetch employees');
      return response.json();
    }
  });

  const { data: workOrders = [] } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: subJobs = [] } = useQuery<SubJob[]>({
    queryKey: ["/api/sub-jobs/by-work-order", selectedWorkOrder],
    enabled: !!selectedWorkOrder,
    queryFn: async () => {
      if (!selectedWorkOrder) return [];
      const response = await fetch(`/api/sub-jobs/by-work-order/${selectedWorkOrder}`);
      if (!response.ok) throw new Error('Failed to fetch sub jobs');
      return response.json();
    }
  });

  const { data: dailyLogs = [] } = useQuery<DailyWorkLog[]>({
    queryKey: ["/api/daily-work-logs", selectedDate, selectedTeam],
    queryFn: async () => {
      const params = new URLSearchParams({
        date: selectedDate,
        ...(selectedTeam && { teamId: selectedTeam })
      });
      const response = await fetch(`/api/daily-work-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch daily logs');
      return response.json();
    }
  });

  // Helper functions
  const resetForm = () => {
    setSelectedDepartment("");
    setSelectedTeam("");
    setSelectedWorkStep("");
    setSelectedEmployee("");
    setSelectedWorkOrder("");
    setSelectedSubJob("");
    setHoursWorked("");
    setQuantityCompleted("");
    setWorkDescription("");
    setWorkStatus("in_progress");
    setNotes("");
  };

  // Mutations
  const createLogMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/daily-work-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create log');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-work-logs"] });
      toast({ title: "สำเร็จ", description: "บันทึกงานประจำวันแล้ว" });
      resetForm();
    },
    onError: () => {
      toast({ title: "ข้อผิดพลาด", description: "ไม่สามารถบันทึกงานได้", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTeam || !selectedEmployee || !selectedWorkOrder || !selectedSubJob || !hoursWorked) {
      toast({ title: "ข้อผิดพลาด", description: "กรุณากรอกข้อมูลให้ครบถ้วน", variant: "destructive" });
      return;
    }

    const logData = {
      date: selectedDate,
      teamId: selectedTeam,
      employeeId: selectedEmployee,
      workOrderId: selectedWorkOrder,
      subJobId: parseInt(selectedSubJob),
      hoursWorked: parseFloat(hoursWorked),
      workDescription,
      status: workStatus,
      notes,
      quantityCompleted: quantityCompleted ? parseInt(quantityCompleted) : 0,
    };

    createLogMutation.mutate(logData);
  };

  // Get selected sub job details
  const selectedSubJobDetails = subJobs.find(sj => sj.id === parseInt(selectedSubJob));
  const selectedWorkOrderDetails = workOrders.find(wo => wo.id === selectedWorkOrder);

  return (
    <div className="p-6 max-w-full mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          บันทึกงานประจำวัน
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          บันทึกการทำงานประจำวันของพนักงานในแต่ละทีมและติดตามความคืบหน้า
        </p>
      </div>

      {/* Selection Steps */}
      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            เลือกข้อมูลการทำงาน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1: Department */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Building className="h-4 w-4 text-blue-600" />
                1. เลือกแผนก
              </Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="เลือกแผนก" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Team */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-green-600" />
                2. เลือกทีม
              </Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam} disabled={!selectedDepartment}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={selectedDepartment ? "เลือกทีม" : "เลือกแผนกก่อน"} />
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

            {/* Step 3: Work Step */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Workflow className="h-4 w-4 text-purple-600" />
                3. เลือกขั้นตอน
              </Label>
              <Select value={selectedWorkStep} onValueChange={setSelectedWorkStep}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="เลือกขั้นตอนงาน" />
                </SelectTrigger>
                <SelectContent>
                  {workSteps.map((step) => (
                    <SelectItem key={step.id} value={step.id}>
                      {step.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 4: Work Order */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="h-4 w-4 text-orange-600" />
                4. เลือกใบสั่งงาน
              </Label>
              <Select value={selectedWorkOrder} onValueChange={setSelectedWorkOrder}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="เลือกใบสั่งงาน" />
                </SelectTrigger>
                <SelectContent>
                  {workOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.orderNumber} - {order.customerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub Job Details - Full Width Display */}
      {selectedWorkOrder && selectedWorkOrderDetails && subJobs.length > 0 && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              รายละเอียดงาน - {selectedWorkOrderDetails.orderNumber}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ fontSize: '12px' }}>
                    <TableHead className="w-16">เลือก</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead>ชื่อสินค้า</TableHead>
                    <TableHead>สี</TableHead>
                    <TableHead>ไซส์</TableHead>
                    <TableHead className="text-right">จำนวนสั่ง</TableHead>
                    <TableHead className="text-right">ราคาต่อหน่วย</TableHead>
                    <TableHead className="text-right">ราคารวม</TableHead>
                    <TableHead className="text-right">ทำแล้ว</TableHead>
                    <TableHead className="text-right">คงเหลือ</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="w-32">จำนวนที่ทำ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subJobs.map((subJob) => (
                    <TableRow 
                      key={subJob.id} 
                      className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        selectedSubJob === subJob.id.toString() ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      style={{ fontSize: '12px' }}
                      onClick={() => setSelectedSubJob(subJob.id.toString())}
                    >
                      <TableCell>
                        <input
                          type="radio"
                          name="subJob"
                          checked={selectedSubJob === subJob.id.toString()}
                          onChange={() => setSelectedSubJob(subJob.id.toString())}
                          className="h-4 w-4 text-blue-600"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {subJob.customerName || selectedWorkOrderDetails.customerName}
                      </TableCell>
                      <TableCell>{subJob.productName}</TableCell>
                      <TableCell>{subJob.colorName || '-'}</TableCell>
                      <TableCell>{subJob.sizeName || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {subJob.quantity?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        ฿{subJob.unitPrice?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ฿{parseFloat(subJob.totalCost || '0').toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {subJob.completedQuantity?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {((subJob.quantity || 0) - (subJob.completedQuantity || 0)).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={subJob.status === 'completed' ? 'default' : 'secondary'}>
                          {subJob.status === 'completed' ? 'เสร็จสิ้น' : 
                           subJob.status === 'in_progress' ? 'กำลังดำเนินการ' : 
                           subJob.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {selectedSubJob === subJob.id.toString() && (
                          <Input
                            type="number"
                            placeholder="จำนวน"
                            value={quantityCompleted}
                            onChange={(e) => setQuantityCompleted(e.target.value)}
                            className="w-20 h-8 text-xs"
                            min="0"
                            max={subJob.quantity - (subJob.completedQuantity || 0)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Work Log Form */}
      {selectedSubJob && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              บันทึกการทำงาน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>วันที่</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>พนักงาน</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกพนักงาน" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} - {emp.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ชั่วโมงทำงาน</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="เช่น 8.5"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>รายละเอียดงาน</Label>
                  <Textarea
                    placeholder="อธิบายรายละเอียดการทำงาน..."
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>หมายเหตุ</Label>
                  <Textarea
                    placeholder="หมายเหตุเพิ่มเติม..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>สถานะงาน</Label>
                <Select value={workStatus} onValueChange={setWorkStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                    <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                    <SelectItem value="paused">หยุดชั่วคราว</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full md:w-auto"
                disabled={createLogMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createLogMutation.isPending ? "กำลังบันทึก..." : "บันทึกงาน"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Daily Logs Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            รายการงานประจำวัน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ fontSize: '12px' }}>
                  <TableHead>เวลา</TableHead>
                  <TableHead>ทีม</TableHead>
                  <TableHead>พนักงาน</TableHead>
                  <TableHead>ใบสั่งงาน</TableHead>
                  <TableHead>รายละเอียดงาน</TableHead>
                  <TableHead className="text-right">ชั่วโมง</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyLogs.map((log) => (
                  <TableRow key={log.id} style={{ fontSize: '12px' }}>
                    <TableCell>
                      {format(new Date(log.createdAt), 'HH:mm')}
                    </TableCell>
                    <TableCell>
                      {teams.find(t => t.id === log.teamId)?.name || log.teamId}
                    </TableCell>
                    <TableCell>
                      {employees.find(e => e.id === log.employeeId)?.firstName || 'N/A'} {' '}
                      {employees.find(e => e.id === log.employeeId)?.lastName || ''}
                    </TableCell>
                    <TableCell>
                      {workOrders.find(wo => wo.id === log.workOrderId)?.orderNumber || log.workOrderId}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {log.workDescription}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.hoursWorked}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.quantityCompleted || 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        log.status === 'completed' ? 'default' : 
                        log.status === 'in_progress' ? 'secondary' : 
                        'outline'
                      }>
                        {log.status === 'completed' ? 'เสร็จสิ้น' : 
                         log.status === 'in_progress' ? 'กำลังดำเนินการ' : 
                         'หยุดชั่วคราว'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}