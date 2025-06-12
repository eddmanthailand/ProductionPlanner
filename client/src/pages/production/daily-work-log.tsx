import { useState } from "react";
import { Calendar, Clock, Users, Plus, Save, FileText, CheckCircle2, AlertCircle, Edit2, ChevronRight, Building, UserCheck, Workflow, ClipboardList, Search, Check, ChevronsUpDown, Eye, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  deliveryDate?: string;
}

interface SubJob {
  id: number;
  workOrderId: string;
  productName: string;
  quantity: number;
  status: string;
  totalCost: string;
  colorId?: number;
  sizeId?: number;
  colorName?: string;
  sizeName?: string;
  customerName?: string;
  orderNumber?: string;
  unitPrice?: number;
  completedQuantity?: number;
  workStepId?: string;
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

interface Color {
  id: number;
  name: string;
  code: string;
  description?: string;
}

interface Size {
  id: number;
  name: string;
  description?: string;
}

interface SubJobProgress {
  id: number;
  productName: string;
  quantity: number;
  quantityCompleted: number;
  quantityRemaining: number;
  progressPercentage: number;
  colorId?: number;
  sizeId?: number;
  colorName?: string;
  sizeName?: string;
}

export default function DailyWorkLog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedWorkStep, setSelectedWorkStep] = useState<string>("");

  const [selectedWorkOrder, setSelectedWorkOrder] = useState<string>("");
  const [workOrderOpen, setWorkOrderOpen] = useState(false);
  const [selectedSubJobs, setSelectedSubJobs] = useState<{[key: string]: boolean}>({});
  const [selectedQuantities, setSelectedQuantities] = useState<{[key: string]: string}>({});
  const [workDescription, setWorkDescription] = useState<string>("");
  const [workStatus, setWorkStatus] = useState<string>("in_progress");
  const [notes, setNotes] = useState<string>("");
  const [editingLog, setEditingLog] = useState<DailyWorkLog | null>(null);
  const [previewingLog, setPreviewingLog] = useState<any>(null);

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



  const { data: workOrders = [] } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: colors = [] } = useQuery<Color[]>({
    queryKey: ["/api/colors"],
  });

  const { data: sizes = [] } = useQuery<Size[]>({
    queryKey: ["/api/sizes"],
  });

  const { data: subJobs = [] } = useQuery<SubJob[]>({
    queryKey: ["/api/sub-jobs/by-work-order", selectedWorkOrder, selectedWorkStep],
    enabled: !!selectedWorkOrder,
    queryFn: async () => {
      if (!selectedWorkOrder) return [];
      const response = await fetch(`/api/sub-jobs/by-work-order/${selectedWorkOrder}`);
      if (!response.ok) throw new Error('Failed to fetch sub jobs');
      const allSubJobs = await response.json();
      
      // Filter by work step if selected
      if (selectedWorkStep) {
        return allSubJobs.filter((job: SubJob) => job.workStepId === selectedWorkStep);
      }
      return allSubJobs;
    }
  });

  const { data: subJobsProgress = [] } = useQuery<SubJobProgress[]>({
    queryKey: ["/api/sub-jobs/progress", selectedWorkOrder],
    enabled: !!selectedWorkOrder,
    queryFn: async () => {
      if (!selectedWorkOrder) return [];
      const response = await fetch(`/api/sub-jobs/progress/${selectedWorkOrder}`);
      if (!response.ok) throw new Error('Failed to fetch sub jobs progress');
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

  // Group daily logs by unique combinations of date, team, work order
  const groupedLogs = dailyLogs.reduce((acc, log) => {
    const key = `${log.date}-${log.teamId}-${log.workOrderId}`;
    if (!acc[key]) {
      acc[key] = {
        ...log,
        subJobs: [],
        totalQuantity: 0
      };
    }
    acc[key].subJobs.push({
      subJobId: log.subJobId,
      quantityCompleted: log.quantityCompleted || 0,
      workDescription: log.workDescription
    });
    acc[key].totalQuantity += log.quantityCompleted || 0;
    return acc;
  }, {} as Record<string, any>);

  const consolidatedLogs = Object.values(groupedLogs);

  // Helper functions
  const resetForm = () => {
    setSelectedDepartment("");
    setSelectedTeam("");
    setSelectedWorkStep("");
    setSelectedWorkOrder("");
    setWorkOrderOpen(false);
    setSelectedSubJobs({});
    setSelectedQuantities({});
    setWorkDescription("");
    setWorkStatus("in_progress");
    setNotes("");
    setEditingLog(null);
  };

  // Reset sub job selections when work step changes
  const handleWorkStepChange = (workStepId: string) => {
    setSelectedWorkStep(workStepId);
    setSelectedSubJobs({});
    setSelectedQuantities({});
  };

  const handleSubJobSelection = (subJobId: string, isSelected: boolean) => {
    setSelectedSubJobs(prev => ({
      ...prev,
      [subJobId]: isSelected
    }));
    
    if (!isSelected) {
      setSelectedQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[subJobId];
        return newQuantities;
      });
    }
  };

  const handleQuantityChange = (subJobId: string, quantity: string) => {
    setSelectedQuantities(prev => ({
      ...prev,
      [subJobId]: quantity
    }));
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
    },
    onError: () => {
      toast({ title: "ข้อผิดพลาด", description: "ไม่สามารถบันทึกงานได้", variant: "destructive" });
    },
  });

  const updateLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/daily-work-logs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update log');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-work-logs"] });
      toast({ title: "สำเร็จ", description: "อัปเดตบันทึกงานแล้ว" });
      setEditingLog(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "ข้อผิดพลาด", description: "ไม่สามารถอัปเดตบันทึกงานได้", variant: "destructive" });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedSubJobIds = Object.keys(selectedSubJobs).filter(id => selectedSubJobs[id]);
    if (!selectedTeam || !selectedWorkOrder || selectedSubJobIds.length === 0) {
      toast({ title: "ข้อผิดพลาด", description: "กรุณาเลือกงานที่จะบันทึก", variant: "destructive" });
      return;
    }

    // Get team data and find first employee in the team
    const selectedTeamData = teams.find(t => t.id === selectedTeam);
    if (!selectedTeamData) {
      toast({ title: "ข้อผิดพลาด", description: "ไม่พบข้อมูลทีม", variant: "destructive" });
      return;
    }

    // Use the first employee in the team as the recorder
    const teamEmployees = await fetch(`/api/employees/by-team/${selectedTeam}`).then(res => res.json());
    if (!teamEmployees || teamEmployees.length === 0) {
      toast({ title: "ข้อผิดพลาด", description: "ไม่พบพนักงานในทีม", variant: "destructive" });
      return;
    }
    const employeeId = teamEmployees[0].id;

    try {
      // Create log entries for selected sub jobs
      const logPromises = selectedSubJobIds.map(subJobId => {
        const quantity = selectedQuantities[subJobId] || "0";
        const subJob = subJobs.find(sj => sj.id.toString() === subJobId);
        const logData = {
          date: selectedDate,
          teamId: selectedTeam,
          employeeId: employeeId, // Use first employee in team
          workOrderId: selectedWorkOrder,
          subJobId: parseInt(subJobId),
          hoursWorked: 8, // Default 8 hours - auto calculated
          workDescription: workDescription || `ทำงาน ${subJob?.productName}`,
          status: workStatus,
          notes,
          quantityCompleted: parseInt(quantity) || 0,
        };

        if (editingLog && selectedSubJobIds.length === 1) {
          return updateLogMutation.mutateAsync({ id: editingLog.id, data: logData });
        } else {
          return createLogMutation.mutateAsync(logData);
        }
      });

      await Promise.all(logPromises);
      queryClient.invalidateQueries({ queryKey: ["/api/daily-work-logs"] });
      toast({ title: "สำเร็จ", description: `บันทึกงาน ${selectedSubJobIds.length} รายการแล้ว (ทีม: ${selectedTeamData.name})` });
      resetForm();
    } catch (error) {
      toast({ title: "ข้อผิดพลาด", description: "ไม่สามารถบันทึกงานได้", variant: "destructive" });
    }
  };

  const handleEdit = (log: any) => {
    // For consolidated logs, we need to handle multiple sub jobs
    const subJobSelections: {[key: string]: boolean} = {};
    const quantitySelections: {[key: string]: string} = {};
    
    log.subJobs.forEach((subJob: any) => {
      subJobSelections[subJob.subJobId.toString()] = true;
      quantitySelections[subJob.subJobId.toString()] = subJob.quantityCompleted.toString();
    });

    setSelectedDepartment("");
    setSelectedTeam(log.teamId);
    setSelectedWorkStep("");
    setSelectedWorkOrder(log.workOrderId);
    setSelectedSubJobs(subJobSelections);
    setSelectedQuantities(quantitySelections);
    setWorkDescription(log.workDescription);
    setWorkStatus(log.status);
    setNotes(log.notes || "");
    setEditingLog(log);
  };

  const handlePreview = (log: any) => {
    setPreviewingLog(log);
  };

  const selectedWorkOrderDetails = workOrders.find(wo => wo.id === selectedWorkOrder);
  const hasSelectedJobs = Object.values(selectedSubJobs).some(selected => selected);

  return (
    <div className="p-6 max-w-full mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          บันทึกงานประจำวัน
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          บันทึกการทำงานประจำวันของพนักงานในแต่ละทีม
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
              <Select value={selectedWorkStep} onValueChange={handleWorkStepChange} disabled={!selectedDepartment}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={selectedDepartment ? "เลือกขั้นตอนงาน" : "เลือกแผนกก่อน"} />
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

            {/* Step 4: Work Order Combobox */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="h-4 w-4 text-orange-600" />
                4. เลือกใบสั่งงาน
              </Label>
              <Popover open={workOrderOpen} onOpenChange={setWorkOrderOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={workOrderOpen}
                    className="h-11 w-full justify-between"
                  >
                    {selectedWorkOrder
                      ? workOrders.find((order) => order.id === selectedWorkOrder)?.orderNumber + " - " + 
                        workOrders.find((order) => order.id === selectedWorkOrder)?.customerName
                      : "ค้นหาและเลือกใบสั่งงาน..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="ค้นหาใบสั่งงาน..." />
                    <CommandEmpty>ไม่พบใบสั่งงาน</CommandEmpty>
                    <CommandGroup>
                      {workOrders.map((order) => (
                        <CommandItem
                          key={order.id}
                          value={`${order.orderNumber} ${order.customerName} ${order.title}`}
                          onSelect={() => {
                            setSelectedWorkOrder(order.id);
                            setWorkOrderOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedWorkOrder === order.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{order.orderNumber}</span>
                            <span className="text-sm text-gray-500">{order.customerName} - {order.title}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub Job Details - Full Width Display */}
      {selectedWorkOrder && selectedWorkOrderDetails && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                รายละเอียดงาน
              </div>
              {selectedWorkStep && (
                <Badge variant="outline" className="ml-2">
                  {workSteps.find(ws => ws.id === selectedWorkStep)?.name}
                </Badge>
              )}
            </CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">ชื่อลูกค้า</Label>
                <p className="font-medium text-lg">{selectedWorkOrderDetails.customerName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">รหัสใบสั่งงาน</Label>
                <p className="font-medium text-lg">{selectedWorkOrderDetails.orderNumber}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">ชื่อใบสั่งงาน</Label>
                <p className="font-medium text-lg">{selectedWorkOrderDetails.title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">กำหนดส่งสินค้า</Label>
                <p className="font-medium text-lg">
                  {selectedWorkOrderDetails.deliveryDate 
                    ? format(new Date(selectedWorkOrderDetails.deliveryDate), 'dd/MM/yyyy')
                    : 'ไม่ระบุ'
                  }
                </p>
              </div>
            </div>
            {!selectedWorkStep && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                กรุณาเลือกขั้นตอนงานเพื่อแสดงรายละเอียดที่เกี่ยวข้อง
              </p>
            )}
          </CardHeader>
          <CardContent>
            {selectedWorkStep && subJobs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow style={{ fontSize: '12px' }}>
                      <TableHead className="w-16">เลือก</TableHead>
                      <TableHead>ชื่อสินค้า</TableHead>
                      <TableHead>สี</TableHead>
                      <TableHead>ไซส์</TableHead>
                      <TableHead className="text-right">จำนวนสั่ง</TableHead>
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
                          selectedSubJobs[subJob.id.toString()] ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                        style={{ fontSize: '12px' }}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedSubJobs[subJob.id.toString()] || false}
                            onCheckedChange={(checked) => handleSubJobSelection(subJob.id.toString(), checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>{subJob.productName}</TableCell>
                        <TableCell>
                          {subJob.colorId 
                            ? colors.find(c => c.id === subJob.colorId)?.name || '-'
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {subJob.sizeId 
                            ? sizes.find(s => s.id === subJob.sizeId)?.name || '-'
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {subJob.quantity?.toLocaleString() || 0}
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
                          {selectedSubJobs[subJob.id.toString()] && (
                            <Input
                              type="number"
                              placeholder="จำนวน"
                              value={selectedQuantities[subJob.id.toString()] || ""}
                              onChange={(e) => handleQuantityChange(subJob.id.toString(), e.target.value)}
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
            ) : selectedWorkStep && subJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>ไม่พบงานที่ตรงกับขั้นตอน "{workSteps.find(ws => ws.id === selectedWorkStep)?.name}"</p>
                <p className="text-sm mt-1">กรุณาเลือกขั้นตอนอื่นหรือตรวจสอบข้อมูลใบสั่งงาน</p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Workflow className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>เลือกขั้นตอนงานเพื่อดูรายละเอียด</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Work Log Form */}
      {hasSelectedJobs && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                {editingLog ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {editingLog ? "แก้ไขบันทึกการทำงาน" : "บันทึกการทำงาน"}
              </div>
              {editingLog && (
                <Button variant="outline" size="sm" onClick={resetForm}>
                  ยกเลิก
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>ผู้บันทึก</Label>
                  <div className="h-11 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 flex items-center">
                    <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                    <span className="text-sm font-medium">
                      {selectedTeam && teams.find(t => t.id === selectedTeam)?.name 
                        ? `ทีม ${teams.find(t => t.id === selectedTeam)?.name}` 
                        : 'กรุณาเลือกทีมก่อน'
                      }
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">ระบบจะใช้สมาชิกในทีมเป็นผู้บันทึกอัตโนมัติ</p>
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

              <Button 
                type="submit" 
                className="w-full md:w-auto"
                disabled={createLogMutation.isPending || updateLogMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createLogMutation.isPending || updateLogMutation.isPending ? "กำลังบันทึก..." : "บันทึกงาน"}
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
                  <TableHead className="w-[120px]">วันเวลา</TableHead>
                  <TableHead className="w-[100px]">ทีม</TableHead>
                  <TableHead className="w-[140px]">ใบสั่งงาน</TableHead>
                  <TableHead className="w-[100px] text-center">จำนวนงาน</TableHead>
                  <TableHead className="w-[100px] text-right">จำนวนรวม</TableHead>
                  <TableHead className="w-[120px]">สถานะ</TableHead>
                  <TableHead className="w-[120px] text-center">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consolidatedLogs.map((log, index) => (
                  <TableRow key={`${log.date}-${log.teamId}-${log.workOrderId}-${index}`} 
                           style={{ fontSize: '12px' }}
                           className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <TableCell className="font-mono text-xs">
                      <div className="flex flex-col">
                        <span>{format(new Date(log.createdAt), 'dd/MM/yyyy')}</span>
                        <span className="text-gray-500">{format(new Date(log.createdAt), 'HH:mm')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="font-medium text-sm">
                          {teams.find(t => t.id === log.teamId)?.name || log.teamId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {workOrders.find(wo => wo.id === log.workOrderId)?.orderNumber || log.workOrderId}
                        </span>
                        <span className="text-xs text-gray-500">
                          {workOrders.find(wo => wo.id === log.workOrderId)?.customerName || ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {log.subJobs.length} รายการ
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {log.totalQuantity?.toLocaleString() || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Circle className={`h-2 w-2 fill-current ${
                          log.status === 'completed' ? 'text-green-500' : 
                          log.status === 'in_progress' ? 'text-yellow-500' : 
                          'text-red-500'
                        }`} />
                        <Badge variant={
                          log.status === 'completed' ? 'default' : 
                          log.status === 'in_progress' ? 'secondary' : 
                          'outline'
                        } className="text-xs">
                          {log.status === 'completed' ? 'เสร็จสิ้น' : 
                           log.status === 'in_progress' ? 'กำลังดำเนินการ' : 
                           'หยุดชั่วคราว'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button variant="ghost" size="sm" onClick={() => handlePreview(log)} 
                               title="ดูรายละเอียด"
                               className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900">
                          <Eye className="h-3 w-3 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(log)} 
                               title="แก้ไข"
                               className="h-8 w-8 p-0 hover:bg-orange-100 dark:hover:bg-orange-900">
                          <Edit2 className="h-3 w-3 text-orange-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewingLog} onOpenChange={() => setPreviewingLog(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>รายละเอียดการบันทึกงาน</DialogTitle>
            <DialogDescription>
              แสดงรายละเอียดงานที่บันทึกไว้ทั้งหมด
            </DialogDescription>
          </DialogHeader>
          {previewingLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">วันที่บันทึก</Label>
                  <p className="font-medium">{format(new Date(previewingLog.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">ทีม</Label>
                  <p className="font-medium">{teams.find(t => t.id === previewingLog.teamId)?.name || previewingLog.teamId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">ใบสั่งงาน</Label>
                  <p className="font-medium">{workOrders.find(wo => wo.id === previewingLog.workOrderId)?.orderNumber || previewingLog.workOrderId}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-lg font-medium mb-2 block">รายการงานที่ทำ</Label>
                <Table>
                  <TableHeader>
                    <TableRow style={{ fontSize: '12px' }}>
                      <TableHead>ชื่อสินค้า</TableHead>
                      <TableHead>สี</TableHead>
                      <TableHead>ไซส์</TableHead>
                      <TableHead className="text-right">จำนวนที่ทำ</TableHead>
                      <TableHead>รายละเอียดงาน</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewingLog.subJobs.map((subJobLog: any, index: number) => {
                      const subJob = subJobs.find(sj => sj.id === subJobLog.subJobId);
                      return (
                        <TableRow key={index} style={{ fontSize: '12px' }}>
                          <TableCell>{subJob?.productName || '-'}</TableCell>
                          <TableCell>
                            {subJob?.colorId 
                              ? colors.find(c => c.id === subJob.colorId)?.name || '-'
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            {subJob?.sizeId 
                              ? sizes.find(s => s.id === subJob.sizeId)?.name || '-'
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-right">{subJobLog.quantityCompleted}</TableCell>
                          <TableCell>{subJobLog.workDescription}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {previewingLog.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">หมายเหตุ</Label>
                  <p className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">{previewingLog.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}