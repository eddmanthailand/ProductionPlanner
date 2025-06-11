import { useState, useEffect } from "react";
import { Calendar, Clock, Users, Plus, Save, FileText, CheckCircle2, AlertCircle, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
}

export default function DailyWorkLog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<string>("");
  const [selectedSubJob, setSelectedSubJob] = useState<string>("");
  const [hoursWorked, setHoursWorked] = useState<string>("");
  const [workDescription, setWorkDescription] = useState<string>("");
  const [workStatus, setWorkStatus] = useState<string>("in_progress");
  const [notes, setNotes] = useState<string>("");
  const [editingLog, setEditingLog] = useState<DailyWorkLog | null>(null);

  // Data queries
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: workOrders = [] } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: subJobs = [] } = useQuery<SubJob[]>({
    queryKey: ["/api/sub-jobs/available"],
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
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedTeam) params.append('teamId', selectedTeam);
      
      const response = await fetch(`/api/daily-work-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch daily logs');
      return response.json();
    }
  });

  // Filter employees by selected team
  const filteredEmployees = selectedTeam 
    ? employees.filter(emp => emp.teamId === selectedTeam)
    : employees;

  // Mutations
  const createLogMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/daily-work-logs', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-work-logs"] });
      resetForm();
      toast({
        title: "บันทึกสำเร็จ",
        description: "บันทึกงานประจำวันเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error('Create log error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive"
      });
    }
  });

  const updateLogMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/daily-work-logs/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-work-logs"] });
      setEditingLog(null);
      resetForm();
      toast({
        title: "อัปเดตสำเร็จ",
        description: "แก้ไขบันทึกงานเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error('Update log error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขข้อมูลได้",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setSelectedEmployee("");
    setSelectedWorkOrder("");
    setSelectedSubJob("");
    setHoursWorked("");
    setWorkDescription("");
    setWorkStatus("in_progress");
    setNotes("");
    setEditingLog(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTeam || !selectedEmployee || !selectedWorkOrder || !selectedSubJob || !hoursWorked || !workDescription) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกข้อมูลให้ครบทุกช่อง",
        variant: "destructive"
      });
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
      notes: notes || null
    };

    if (editingLog) {
      await updateLogMutation.mutateAsync({ id: editingLog.id, ...logData });
    } else {
      await createLogMutation.mutateAsync(logData);
    }
  };

  const handleEdit = (log: DailyWorkLog) => {
    setEditingLog(log);
    setSelectedTeam(log.teamId);
    setSelectedEmployee(log.employeeId);
    setSelectedWorkOrder(log.workOrderId);
    setSelectedSubJob(log.subJobId.toString());
    setHoursWorked(log.hoursWorked.toString());
    setWorkDescription(log.workDescription);
    setWorkStatus(log.status);
    setNotes(log.notes || "");
  };

  const getEmployeeName = (employeeId: string): string => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'ไม่ทราบ';
  };

  const getWorkOrderInfo = (workOrderId: string): string => {
    const workOrder = workOrders.find(wo => wo.id === workOrderId);
    return workOrder ? `${workOrder.orderNumber} - ${workOrder.customerName}` : 'ไม่ทราบ';
  };

  const getSubJobInfo = (subJobId: number): string => {
    const subJob = subJobs.find(sj => sj.id === subJobId);
    return subJob ? `${subJob.productName} (${subJob.quantity} ชิ้น)` : 'ไม่ทราบ';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">เสร็จสิ้น</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">กำลังดำเนินการ</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800">หยุดชั่วคราว</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTotalHours = (): number => {
    return dailyLogs.reduce((total, log) => total + log.hoursWorked, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">บันทึกงานประจำวัน</h1>
          <p className="mt-2 text-gray-600">บันทึกและติดตามงานที่ทำในแต่ละวัน</p>
        </div>

        {/* Filter Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              ตัวกรองข้อมูล
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">วันที่</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="team">ทีม</Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกทีม" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกทีม</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>รวมชั่วโมง: {getTotalHours().toFixed(1)} ชม.</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {editingLog ? "แก้ไขบันทึกงาน" : "เพิ่มบันทึกงานใหม่"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="employee">พนักงาน</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee} required>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกพนักงาน" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredEmployees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.firstName} {employee.lastName} - {employee.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="workOrder">ใบสั่งงาน</Label>
                  <Select value={selectedWorkOrder} onValueChange={setSelectedWorkOrder} required>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกใบสั่งงาน" />
                    </SelectTrigger>
                    <SelectContent>
                      {workOrders.map((workOrder) => (
                        <SelectItem key={workOrder.id} value={workOrder.id}>
                          {workOrder.orderNumber} - {workOrder.customerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subJob">งานย่อย</Label>
                  <Select value={selectedSubJob} onValueChange={setSelectedSubJob} required>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกงานย่อย" />
                    </SelectTrigger>
                    <SelectContent>
                      {subJobs.map((subJob) => (
                        <SelectItem key={subJob.id} value={subJob.id.toString()}>
                          {subJob.productName} ({subJob.quantity} ชิ้น)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hoursWorked">ชั่วโมงที่ทำงาน</Label>
                    <Input
                      id="hoursWorked"
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={hoursWorked}
                      onChange={(e) => setHoursWorked(e.target.value)}
                      placeholder="เช่น 8.0"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">สถานะงาน</Label>
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
                </div>

                <div>
                  <Label htmlFor="workDescription">รายละเอียดงานที่ทำ</Label>
                  <Textarea
                    id="workDescription"
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    placeholder="อธิบายงานที่ทำในวันนี้..."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="notes">หมายเหตุ (ถ้ามี)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="หมายเหตุเพิ่มเติม..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={createLogMutation.isPending || updateLogMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingLog ? "อัปเดต" : "บันทึก"}
                  </Button>
                  {editingLog && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetForm}
                    >
                      ยกเลิก
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Logs List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                บันทึกงานวันที่ {format(new Date(selectedDate), "dd/MM/yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>ยังไม่มีบันทึกงานในวันนี้</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {dailyLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-sm">{getEmployeeName(log.employeeId)}</h4>
                          <p className="text-xs text-gray-600">{getWorkOrderInfo(log.workOrderId)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(log.status)}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(log)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm mb-2">{log.workDescription}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{getSubJobInfo(log.subJobId)}</span>
                        <span>{log.hoursWorked} ชม.</span>
                      </div>
                      {log.notes && (
                        <p className="text-xs text-gray-600 mt-2 italic">หมายเหตุ: {log.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}