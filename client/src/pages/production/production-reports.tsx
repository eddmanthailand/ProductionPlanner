import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Calendar, Users, Trash2, Eye, RefreshCw, BarChart3, Clipboard, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface ProductionPlan {
  id: string;
  teamId: string;
  name: string;
  startDate: string;
  createdAt: string;
  status: string;
}

interface ProductionPlanItem {
  id: number;
  planId: string;
  subJobId: number;
  orderNumber: string;
  customerName: string;
  productName: string;
  colorName: string;
  sizeName: string;
  quantity: number;
  completionDate: string;
  jobCost: string;
  priority: number;
}

interface Team {
  id: string;
  name: string;
  leader: string;
  departmentId: string;
}

interface WorkOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
}

interface DailyWorkLog {
  id: string;
  date: string;
  teamId: string;
  teamName: string;
  subJobId: number;
  workOrderId: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  colorName: string;
  sizeName: string;
  workStepName: string;
  departmentName: string;
  quantityCompleted: number;
  employeeName: string;
  status: string;
}

interface JobProgress {
  workOrderId: string;
  orderNumber: string;
  customerName: string;
  workSteps: {
    stepName: string;
    departmentName: string;
    totalQuantity: number;
    completedQuantity: number;
    progressPercentage: number;
    status: 'pending' | 'in-progress' | 'completed';
  }[];
}

interface TeamProgress {
  teamId: string;
  teamName: string;
  queueJobs: {
    workOrderId: string;
    orderNumber: string;
    customerName: string;
    productName: string;
    colorName: string;
    sizeName: string;
    quantity: number;
    completedQuantity: number;
    progressPercentage: number;
    status: 'pending' | 'in-progress' | 'completed';
  }[];
}

interface WorkQueue {
  id: string;
  teamId: string;
  subJobId: number;
  workOrderId: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  quantity: number;
  sortOrder: number;
}

export default function ProductionReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("job-status");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<string>("all");
  const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Data queries
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: workOrders = [] } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: dailyWorkLogs = [] } = useQuery<DailyWorkLog[]>({
    queryKey: ["/api/daily-work-logs"],
  });

  const { data: productionPlans = [], refetch: refetchPlans } = useQuery<ProductionPlan[]>({
    queryKey: ["/api/production-plans"],
  });

  const { data: planItems = [] } = useQuery<ProductionPlanItem[]>({
    queryKey: ["/api/production-plans", selectedPlan?.id, "items"],
    enabled: !!selectedPlan?.id,
    queryFn: async () => {
      if (!selectedPlan?.id) return [];
      const response = await fetch(`/api/production-plans/${selectedPlan.id}/items`);
      if (!response.ok) throw new Error('Failed to fetch plan items');
      return response.json();
    }
  });

  // Work queue data for team status report
  const { data: workQueues = [] } = useQuery<WorkQueue[]>({
    queryKey: ["/api/work-queues"],
  });

  // Filter plans by team
  const filteredPlans = selectedTeam === "all" 
    ? productionPlans 
    : productionPlans.filter(plan => plan.teamId === selectedTeam);

  const getTeamName = (teamId: string): string => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'ไม่ทราบทีม';
  };

  // Generate Job Status Report Data
  const generateJobStatusReport = (): JobProgress[] => {
    const jobProgressMap = new Map<string, JobProgress>();

    // Filter work orders
    const filteredWorkOrders = selectedWorkOrder === "all" 
      ? workOrders 
      : workOrders.filter(wo => wo.id === selectedWorkOrder);

    filteredWorkOrders.forEach(workOrder => {
      const workOrderLogs = dailyWorkLogs.filter(log => log.workOrderId === workOrder.id);
      
      // Group by work step
      const stepMap = new Map<string, {
        stepName: string;
        departmentName: string;
        totalQuantity: number;
        completedQuantity: number;
      }>();

      workOrderLogs.forEach(log => {
        const key = `${log.workStepName}-${log.departmentName}`;
        if (!stepMap.has(key)) {
          stepMap.set(key, {
            stepName: log.workStepName,
            departmentName: log.departmentName,
            totalQuantity: 0,
            completedQuantity: 0
          });
        }
        const step = stepMap.get(key)!;
        step.completedQuantity += log.quantityCompleted;
      });

      const workSteps = Array.from(stepMap.values()).map(step => ({
        ...step,
        progressPercentage: step.totalQuantity > 0 ? Math.round((step.completedQuantity / step.totalQuantity) * 100) : 0,
        status: (step.completedQuantity === 0 ? 'pending' : 
                step.completedQuantity >= step.totalQuantity ? 'completed' : 'in-progress') as 'pending' | 'in-progress' | 'completed'
      }));

      jobProgressMap.set(workOrder.id, {
        workOrderId: workOrder.id,
        orderNumber: workOrder.orderNumber,
        customerName: workOrder.customerName,
        workSteps
      });
    });

    return Array.from(jobProgressMap.values());
  };

  // Generate Team Status Report Data
  const generateTeamStatusReport = (): TeamProgress[] => {
    const teamProgressMap = new Map<string, TeamProgress>();

    teams.forEach(team => {
      const teamQueues = workQueues.filter(wq => wq.teamId === team.id);
      const teamLogs = dailyWorkLogs.filter(log => log.teamId === team.id);

      const queueJobs = teamQueues.map(queue => {
        const completedLogs = teamLogs.filter(log => 
          log.workOrderId === queue.workOrderId && 
          log.subJobId === queue.subJobId
        );
        
        const completedQuantity = completedLogs.reduce((sum, log) => sum + log.quantityCompleted, 0);
        const progressPercentage = queue.quantity > 0 ? Math.round((completedQuantity / queue.quantity) * 100) : 0;
        
        return {
          workOrderId: queue.workOrderId,
          orderNumber: queue.orderNumber,
          customerName: queue.customerName,
          productName: queue.productName,
          colorName: '',
          sizeName: '',
          quantity: queue.quantity,
          completedQuantity,
          progressPercentage,
          status: (completedQuantity === 0 ? 'pending' : 
                  completedQuantity >= queue.quantity ? 'completed' : 'in-progress') as 'pending' | 'in-progress' | 'completed'
        };
      });

      teamProgressMap.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        queueJobs
      });
    });

    return Array.from(teamProgressMap.values()).filter(tp => 
      selectedTeam === "all" || tp.teamId === selectedTeam
    );
  };

  const jobStatusData = generateJobStatusReport();
  const teamStatusData = generateTeamStatusReport();

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: (planId: string) => apiRequest(`/api/production-plans/${planId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-plans"] });
      toast({
        title: "ลบแผนการผลิตสำเร็จ",
        description: "แผนการผลิตถูกลบออกจากระบบแล้ว",
      });
    },
    onError: (error: any) => {
      console.error('Delete plan error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบแผนการผลิตได้",
        variant: "destructive"
      });
    }
  });

  const handleDeletePlan = async (planId: string) => {
    await deletePlanMutation.mutateAsync(planId);
  };

  const handleViewPlan = (plan: ProductionPlan) => {
    setSelectedPlan(plan);
    setDialogOpen(true);
  };

  const getTotalJobCost = (): number => {
    return planItems.reduce((total, item) => total + parseFloat(item.jobCost || "0"), 0);
  };

  const getTotalQuantity = (): number => {
    return planItems.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">รายงาน</h1>
          <p className="mt-2 text-gray-600">ดูรายงานสถานะงาน ทีม และแผนการผลิต</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="job-status" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Job Status
            </TabsTrigger>
            <TabsTrigger value="team-status" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Status
            </TabsTrigger>
            <TabsTrigger value="production-plans" className="flex items-center gap-2">
              <Clipboard className="h-4 w-4" />
              แผนการผลิต
            </TabsTrigger>
          </TabsList>

          {/* Job Status Report */}
          <TabsContent value="job-status" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  รายงานสถานะงาน (Job Status)
                </CardTitle>
                <p className="text-sm text-gray-600">
                  แสดงความคืบหน้าของงานแต่ละ Job ตามขั้นตอนการผลิต
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700">เลือกงาน</label>
                  <Select value={selectedWorkOrder} onValueChange={setSelectedWorkOrder}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="เลือกงาน..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกงาน</SelectItem>
                      {workOrders.map((workOrder) => (
                        <SelectItem key={workOrder.id} value={workOrder.id}>
                          {workOrder.orderNumber} - {workOrder.customerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-6">
                  {jobStatusData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      ไม่พบข้อมูลความคืบหน้าของงาน
                    </div>
                  ) : (
                    jobStatusData.map((job) => (
                      <Card key={job.workOrderId} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              {job.orderNumber} - {job.customerName}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {job.workSteps.length} ขั้นตอน
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {job.workSteps.length === 0 ? (
                              <p className="text-sm text-gray-500">ยังไม่มีข้อมูลความคืบหน้า</p>
                            ) : (
                              job.workSteps.map((step, index) => (
                                <div key={`${step.stepName}-${step.departmentName}`} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant={step.status === 'completed' ? 'default' : 
                                               step.status === 'in-progress' ? 'secondary' : 'outline'}
                                        className="text-xs"
                                      >
                                        {step.status === 'completed' ? 'เสร็จสิ้น' :
                                         step.status === 'in-progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}
                                      </Badge>
                                      <span className="font-medium">{step.stepName}</span>
                                      <span className="text-sm text-gray-500">({step.departmentName})</span>
                                    </div>
                                    <div className="text-sm font-medium">
                                      {step.progressPercentage}%
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Progress value={step.progressPercentage} className="flex-1" />
                                    <div className="text-xs text-gray-500 whitespace-nowrap">
                                      {step.completedQuantity}/{step.totalQuantity}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Status Report */}
          <TabsContent value="team-status" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  รายงานสถานะทีม (Team Status)
                </CardTitle>
                <p className="text-sm text-gray-600">
                  แสดงความคืบหน้าของงานในคิวของแต่ละทีม
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700">เลือกทีม</label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="เลือกทีม..." />
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

                <div className="space-y-6">
                  {teamStatusData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      ไม่พบข้อมูลคิวงานของทีม
                    </div>
                  ) : (
                    teamStatusData.map((team) => (
                      <Card key={team.teamId} className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              {team.teamName}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {team.queueJobs.length} งานในคิว
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {team.queueJobs.length === 0 ? (
                              <p className="text-sm text-gray-500">ไม่มีงานในคิว</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>หมายเลขงาน</TableHead>
                                      <TableHead>ลูกค้า</TableHead>
                                      <TableHead>สินค้า</TableHead>
                                      <TableHead>จำนวน</TableHead>
                                      <TableHead>ความคืบหน้า</TableHead>
                                      <TableHead>สถานะ</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {team.queueJobs.map((job) => (
                                      <TableRow key={`${job.workOrderId}-${job.orderNumber}`}>
                                        <TableCell className="font-medium">{job.orderNumber}</TableCell>
                                        <TableCell>{job.customerName}</TableCell>
                                        <TableCell>{job.productName}</TableCell>
                                        <TableCell>
                                          <div className="text-sm">
                                            <div>{job.completedQuantity}/{job.quantity}</div>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <Progress value={job.progressPercentage} className="w-20" />
                                            <span className="text-xs">{job.progressPercentage}%</span>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <Badge 
                                            variant={job.status === 'completed' ? 'default' : 
                                                   job.status === 'in-progress' ? 'secondary' : 'outline'}
                                          >
                                            {job.status === 'completed' ? 'เสร็จสิ้น' :
                                             job.status === 'in-progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Production Plans Report */}
          <TabsContent value="production-plans" className="space-y-6">
            {/* Filter Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    กรองข้อมูล
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchPlans()}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    รีเฟรช
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">เลือกทีม</label>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกทีม..." />
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
                </div>
              </CardContent>
            </Card>

            {/* Production Plans Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  แผนการผลิต ({filteredPlans.length} แผน)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ชื่อแผน</TableHead>
                        <TableHead>ทีม</TableHead>
                        <TableHead>วันเริ่มต้น</TableHead>
                        <TableHead>วันที่สร้าง</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>การจัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlans.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            ไม่พบแผนการผลิต
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPlans.map((plan) => (
                          <TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.name}</TableCell>
                            <TableCell>{getTeamName(plan.teamId)}</TableCell>
                            <TableCell>
                              {plan.startDate ? format(new Date(plan.startDate), "dd/MM/yyyy") : '-'}
                            </TableCell>
                            <TableCell>
                              {format(new Date(plan.createdAt), "dd/MM/yyyy HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                                {plan.status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewPlan(plan)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  ดู
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeletePlan(plan.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  ลบ
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Plan Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                รายละเอียดแผนการผลิต: {selectedPlan?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedPlan && (
              <div className="space-y-6">
                {/* Plan Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600">ทีม</div>
                      <div className="font-semibold">{getTeamName(selectedPlan.teamId)}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600">วันเริ่มต้น</div>
                      <div className="font-semibold">
                        {selectedPlan.startDate ? format(new Date(selectedPlan.startDate), "dd/MM/yyyy") : '-'}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600">จำนวนงาน</div>
                      <div className="font-semibold">{planItems.length} งาน</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-600">ต้นทุนรวม</div>
                      <div className="font-semibold text-blue-600">
                        {getTotalJobCost().toLocaleString()} บาท
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Plan Items Table */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">รายการงานในแผน</h4>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">หมายเลขงาน</TableHead>
                          <TableHead className="text-xs">ลูกค้า</TableHead>
                          <TableHead className="text-xs">สินค้า</TableHead>
                          <TableHead className="text-xs">สี</TableHead>
                          <TableHead className="text-xs">ไซส์</TableHead>
                          <TableHead className="text-xs">จำนวน</TableHead>
                          <TableHead className="text-xs">วันจบงาน</TableHead>
                          <TableHead className="text-xs">ต้นทุน (บาท)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {planItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs font-medium">{item.orderNumber}</TableCell>
                            <TableCell className="text-xs">{item.customerName}</TableCell>
                            <TableCell className="text-xs">{item.productName}</TableCell>
                            <TableCell className="text-xs">{item.colorName}</TableCell>
                            <TableCell className="text-xs">{item.sizeName}</TableCell>
                            <TableCell className="text-xs">{item.quantity}</TableCell>
                            <TableCell className="text-xs text-green-600 font-medium">
                              {item.completionDate ? format(new Date(item.completionDate), "dd/MM/yyyy") : '-'}
                            </TableCell>
                            <TableCell className="text-xs text-blue-600 font-medium">
                              {parseFloat(item.jobCost).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">จำนวนงานทั้งหมด: </span>
                      <span className="font-semibold">{planItems.length} งาน</span>
                    </div>
                    <div>
                      <span className="text-gray-600">จำนวนชิ้นทั้งหมด: </span>
                      <span className="font-semibold">{getTotalQuantity()} ชิ้น</span>
                    </div>
                    <div>
                      <span className="text-gray-600">ต้นทุนรวม: </span>
                      <span className="font-semibold text-blue-600">{getTotalJobCost().toLocaleString()} บาท</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}