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
  subJobs: {
    id: number;
    stepName: string;
    productName: string;
    colorName: string;
    sizeName: string;
    quantity: number;
    completedQuantity: number;
    remainingQuantity: number;
    progressPercentage: number;
    status: 'pending' | 'in-progress' | 'completed';
    dailyLogs: {
      date: string;
      quantityCompleted: number;
      employeeName: string;
    }[];
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

  // Sub jobs data for calculating total quantities
  const { data: subJobs = [] } = useQuery<any[]>({
    queryKey: ["/api/sub-jobs/complete"],
  });

  // Work steps, colors, sizes data for detailed display
  const { data: workSteps = [] } = useQuery<any[]>({
    queryKey: ["/api/work-steps"],
  });

  const { data: colors = [] } = useQuery<any[]>({
    queryKey: ["/api/colors"],
  });

  const { data: sizes = [] } = useQuery<any[]>({
    queryKey: ["/api/sizes"],
  });

  // Filter plans by team
  const filteredPlans = selectedTeam === "all" 
    ? productionPlans 
    : productionPlans.filter(plan => plan.teamId === selectedTeam);

  const getTeamName = (teamId: string): string => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'ไม่ทราบทีม';
  };

  // Helper function to get color and size names
  const getColorName = (colorId: number): string => {
    const color = colors.find((c: any) => c.id === colorId);
    return color ? color.name : 'ไม่ระบุ';
  };

  const getSizeName = (sizeId: number): string => {
    const size = sizes.find((s: any) => s.id === sizeId);
    return size ? size.name : 'ไม่ระบุ';
  };

  const getWorkStepName = (workStepId: string): string => {
    const workStep = workSteps.find((ws: any) => ws.id === workStepId);
    return workStep ? workStep.name : 'ไม่ระบุ';
  };

  // Generate Job Status Report Data
  const generateJobStatusReport = (): JobProgress[] => {
    const jobProgressMap = new Map<string, JobProgress>();

    // Filter work orders
    const filteredWorkOrders = selectedWorkOrder === "all" 
      ? workOrders 
      : workOrders.filter(wo => wo.id === selectedWorkOrder);

    filteredWorkOrders.forEach(workOrder => {
      const workOrderSubJobs = subJobs.filter(sj => sj.workOrderId === workOrder.id);
      
      const processedSubJobs = workOrderSubJobs.map(subJob => {
        // Get daily logs for this sub job
        const subJobLogs = dailyWorkLogs.filter(log => 
          log.workOrderId === workOrder.id && log.subJobId === subJob.id
        );

        // Group logs by date
        const dailyLogsMap = new Map<string, { quantityCompleted: number; employeeName: string }>();
        subJobLogs.forEach(log => {
          const dateKey = log.date;
          if (!dailyLogsMap.has(dateKey)) {
            dailyLogsMap.set(dateKey, { quantityCompleted: 0, employeeName: log.employeeName });
          }
          const existing = dailyLogsMap.get(dateKey)!;
          existing.quantityCompleted += log.quantityCompleted;
          if (existing.employeeName !== log.employeeName) {
            existing.employeeName += `, ${log.employeeName}`;
          }
        });

        const dailyLogs = Array.from(dailyLogsMap.entries()).map(([date, data]) => ({
          date,
          quantityCompleted: data.quantityCompleted,
          employeeName: data.employeeName
        }));

        const totalCompleted = subJobLogs.reduce((sum, log) => sum + log.quantityCompleted, 0);
        const remainingQuantity = subJob.quantity - totalCompleted;
        const progressPercentage = subJob.quantity > 0 ? Math.round((totalCompleted / subJob.quantity) * 100) : 0;

        return {
          id: subJob.id,
          stepName: getWorkStepName(subJob.workStepId),
          productName: subJob.productName || 'ไม่ระบุ',
          colorName: getColorName(subJob.colorId),
          sizeName: getSizeName(subJob.sizeId),
          quantity: subJob.quantity,
          completedQuantity: totalCompleted,
          remainingQuantity,
          progressPercentage,
          status: (totalCompleted === 0 ? 'pending' : 
                  totalCompleted >= subJob.quantity ? 'completed' : 'in-progress') as 'pending' | 'in-progress' | 'completed',
          dailyLogs: dailyLogs.sort((a, b) => a.date.localeCompare(b.date))
        };
      });

      // Group sub jobs by step name and sort
      const groupedByStep = processedSubJobs.reduce((acc, subJob) => {
        const stepName = subJob.stepName;
        if (!acc[stepName]) {
          acc[stepName] = [];
        }
        acc[stepName].push(subJob);
        return acc;
      }, {} as Record<string, typeof processedSubJobs>);

      // Flatten the grouped sub jobs back to array, maintaining step grouping
      const sortedSubJobs = Object.keys(groupedByStep)
        .sort() // Sort step names alphabetically
        .flatMap(stepName => groupedByStep[stepName]);

      jobProgressMap.set(workOrder.id, {
        workOrderId: workOrder.id,
        orderNumber: workOrder.orderNumber,
        customerName: workOrder.customerName,
        subJobs: sortedSubJobs
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
                        <CardHeader className="pb-2 pt-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold text-gray-800">
                              {job.orderNumber} - {job.customerName}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {job.subJobs.length} รายการ
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {job.subJobs.length === 0 ? (
                              <p className="text-sm text-gray-500">ยังไม่มีข้อมูลความคืบหน้า</p>
                            ) : (
                              <div className="space-y-4">
                                {/* Summary Progress */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100">
                                  <h5 className="font-medium text-gray-900 mb-2 text-sm">สรุปความคืบหน้า</h5>
                                  <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div className="text-center bg-white p-2 rounded shadow-sm">
                                      <div className="text-lg font-bold text-green-600">
                                        {job.subJobs.filter((s: any) => s.status === 'completed').length}
                                      </div>
                                      <div className="text-xs text-gray-600">เสร็จสิ้น</div>
                                    </div>
                                    <div className="text-center bg-white p-2 rounded shadow-sm">
                                      <div className="text-lg font-bold text-orange-600">
                                        {job.subJobs.filter((s: any) => s.status === 'in-progress').length}
                                      </div>
                                      <div className="text-xs text-gray-600">กำลังดำเนินการ</div>
                                    </div>
                                    <div className="text-center bg-white p-2 rounded shadow-sm">
                                      <div className="text-lg font-bold text-gray-600">
                                        {job.subJobs.filter((s: any) => s.status === 'pending').length}
                                      </div>
                                      <div className="text-xs text-gray-600">รอดำเนินการ</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Detailed Sub Jobs Table */}
                                <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="h-9 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                        <TableHead className="w-12 text-xs py-2 font-semibold text-gray-700">#</TableHead>
                                        <TableHead className="w-32 text-xs py-2 font-semibold text-gray-700">ขั้นตอน</TableHead>
                                        <TableHead className="w-40 text-xs py-2 font-semibold text-gray-700">สินค้า</TableHead>
                                        <TableHead className="w-20 text-xs py-2 font-semibold text-gray-700">สี</TableHead>
                                        <TableHead className="w-16 text-xs py-2 font-semibold text-gray-700">ไซส์</TableHead>
                                        <TableHead className="w-20 text-xs py-2 text-right font-semibold text-gray-700">จำนวนสั่ง</TableHead>
                                        <TableHead className="w-20 text-xs py-2 text-right font-semibold text-gray-700">จำนวนผลิต</TableHead>
                                        <TableHead className="w-20 text-xs py-2 text-right font-semibold text-gray-700">ยอดคงเหลือ</TableHead>
                                        <TableHead className="w-24 text-xs py-2 font-semibold text-gray-700">ความคืบหน้า</TableHead>
                                        <TableHead className="w-20 text-xs py-2 font-semibold text-gray-700">สถานะ</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {job.subJobs.map((subJob: any, index: number) => {
                                        const currentStepName = subJob.stepName;
                                        const previousStepName = index > 0 ? job.subJobs[index - 1].stepName : null;
                                        const isFirstOfStep = currentStepName !== previousStepName;
                                        
                                        return (
                                          <TableRow 
                                            key={subJob.id}
                                            className={`h-9 transition-all hover:bg-gray-50 ${
                                              isFirstOfStep ? 'border-t-2 border-t-blue-300 bg-blue-50/30' : 
                                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                            }`}
                                          >
                                            <TableCell className="font-mono text-xs text-gray-500 py-1 px-3 font-medium">
                                              {index + 1}
                                            </TableCell>
                                            <TableCell className="py-1 px-3">
                                              {isFirstOfStep ? (
                                                <div className="bg-gradient-to-r from-blue-100 to-blue-200 px-2 py-1 rounded-md text-xs text-blue-900 font-semibold shadow-sm border border-blue-300">
                                                  {subJob.stepName}
                                                </div>
                                              ) : (
                                                <div className="text-gray-400 text-center text-xs font-medium">↳</div>
                                              )}
                                            </TableCell>
                                            <TableCell className="text-xs py-1 px-3 font-medium text-gray-800">
                                              {subJob.productName}
                                            </TableCell>
                                            <TableCell className="text-xs py-1 px-3 text-gray-600">
                                              <span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs">
                                                {subJob.colorName}
                                              </span>
                                            </TableCell>
                                            <TableCell className="text-xs py-1 px-3 text-gray-600">
                                              <span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs">
                                                {subJob.sizeName}
                                              </span>
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-bold py-1 px-3 text-gray-800">
                                              {subJob.quantity.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-bold text-blue-700 py-1 px-3">
                                              {subJob.completedQuantity.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-bold py-1 px-3">
                                              <span className={`px-2 py-0.5 rounded-md font-semibold ${
                                                subJob.remainingQuantity === 0 ? 'bg-green-100 text-green-800' :
                                                subJob.remainingQuantity > 0 ? 'bg-orange-100 text-orange-800' :
                                                'bg-green-100 text-green-800'
                                              }`}>
                                                {subJob.remainingQuantity.toLocaleString()}
                                                {subJob.remainingQuantity < 0 && ' (เกิน)'}
                                              </span>
                                            </TableCell>
                                            <TableCell className="py-1 px-3 text-center">
                                              <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                                                subJob.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                subJob.status === 'in-progress' ? 'bg-orange-100 text-orange-800' :
                                                'bg-gray-100 text-gray-600'
                                              }`}>
                                                {subJob.progressPercentage}%
                                              </span>
                                            </TableCell>
                                            <TableCell className="py-1 px-3">
                                              <Badge 
                                                variant={subJob.status === 'completed' ? 'default' : 
                                                       subJob.status === 'in-progress' ? 'secondary' : 'outline'}
                                                className={`text-xs px-2 py-1 font-medium shadow-sm ${
                                                  subJob.status === 'completed' ? 'bg-green-100 text-green-800 border-green-300' :
                                                  subJob.status === 'in-progress' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                                  'bg-gray-100 text-gray-600 border-gray-300'
                                                }`}
                                              >
                                                {subJob.status === 'completed' ? 'เสร็จ' :
                                                 subJob.status === 'in-progress' ? 'ดำเนินการ' : 'รอ'}
                                              </Badge>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
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
                          <div className="space-y-6">
                            {team.queueJobs.length === 0 ? (
                              <p className="text-sm text-gray-500">ไม่มีงานในคิว</p>
                            ) : (
                              <div className="space-y-4">
                                {/* Team Summary */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                  <h5 className="font-medium text-gray-900 mb-3">สรุปงานในคิว</h5>
                                  <div className="grid grid-cols-4 gap-4 text-sm">
                                    <div className="text-center">
                                      <div className="text-lg font-bold text-blue-600">
                                        {team.queueJobs.length}
                                      </div>
                                      <div className="text-gray-600">งานทั้งหมด</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-lg font-bold text-green-600">
                                        {team.queueJobs.filter(j => j.status === 'completed').length}
                                      </div>
                                      <div className="text-gray-600">เสร็จสิ้น</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-lg font-bold text-orange-600">
                                        {team.queueJobs.filter(j => j.status === 'in-progress').length}
                                      </div>
                                      <div className="text-gray-600">กำลังดำเนินการ</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-lg font-bold text-gray-600">
                                        {team.queueJobs.filter(j => j.status === 'pending').length}
                                      </div>
                                      <div className="text-gray-600">รอดำเนินการ</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Detailed Queue Jobs Table */}
                                <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="h-9 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                        <TableHead className="w-12 text-xs py-2 font-semibold text-gray-700">#</TableHead>
                                        <TableHead className="w-32 text-xs py-2 font-semibold text-gray-700">หมายเลขงาน</TableHead>
                                        <TableHead className="w-32 text-xs py-2 font-semibold text-gray-700">ลูกค้า</TableHead>
                                        <TableHead className="w-40 text-xs py-2 font-semibold text-gray-700">สินค้า</TableHead>
                                        <TableHead className="w-20 text-xs py-2 font-semibold text-gray-700">สี</TableHead>
                                        <TableHead className="w-16 text-xs py-2 font-semibold text-gray-700">ไซส์</TableHead>
                                        <TableHead className="w-20 text-xs py-2 text-right font-semibold text-gray-700">จำนวนสั่ง</TableHead>
                                        <TableHead className="w-20 text-xs py-2 text-right font-semibold text-gray-700">จำนวนผลิต</TableHead>
                                        <TableHead className="w-20 text-xs py-2 text-right font-semibold text-gray-700">ยอดคงเหลือ</TableHead>
                                        <TableHead className="w-24 text-xs py-2 font-semibold text-gray-700">ความคืบหน้า</TableHead>
                                        <TableHead className="w-20 text-xs py-2 font-semibold text-gray-700">สถานะ</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {team.queueJobs.map((job, index) => (
                                        <TableRow 
                                          key={`${job.workOrderId}-${job.orderNumber}-${index}`}
                                          className={`h-9 transition-all hover:bg-gray-50 ${
                                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                          }`}
                                        >
                                          <TableCell className="font-mono text-xs text-gray-500 py-1 px-3 font-medium">
                                            {index + 1}
                                          </TableCell>
                                          <TableCell className="text-xs py-1 px-3 font-medium text-gray-800">
                                            {job.orderNumber}
                                          </TableCell>
                                          <TableCell className="text-xs py-1 px-3 font-medium text-gray-800">
                                            {job.customerName}
                                          </TableCell>
                                          <TableCell className="text-xs py-1 px-3 font-medium text-gray-800">
                                            {job.productName}
                                          </TableCell>
                                          <TableCell className="text-xs py-1 px-3 text-gray-600">
                                            <span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs">
                                              {job.colorName || 'ไม่ระบุ'}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-xs py-1 px-3 text-gray-600">
                                            <span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs">
                                              {job.sizeName || 'ไม่ระบุ'}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right text-xs font-bold py-1 px-3 text-gray-800">
                                            {job.quantity.toLocaleString()}
                                          </TableCell>
                                          <TableCell className="text-right text-xs font-bold text-blue-700 py-1 px-3">
                                            {job.completedQuantity.toLocaleString()}
                                          </TableCell>
                                          <TableCell className="text-right text-xs font-bold py-1 px-3">
                                            <span className={`px-2 py-0.5 rounded-md font-semibold ${
                                              (job.quantity - job.completedQuantity) === 0 ? 'bg-green-100 text-green-800' :
                                              (job.quantity - job.completedQuantity) > 0 ? 'bg-orange-100 text-orange-800' :
                                              'bg-green-100 text-green-800'
                                            }`}>
                                              {(job.quantity - job.completedQuantity).toLocaleString()}
                                              {(job.quantity - job.completedQuantity) < 0 && ' (เกิน)'}
                                            </span>
                                          </TableCell>
                                          <TableCell className="py-1 px-3 text-center">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                                              job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                              job.status === 'in-progress' ? 'bg-orange-100 text-orange-800' :
                                              'bg-gray-100 text-gray-600'
                                            }`}>
                                              {job.progressPercentage}%
                                            </span>
                                          </TableCell>
                                          <TableCell className="py-1 px-3">
                                            <Badge 
                                              variant={job.status === 'completed' ? 'default' : 
                                                     job.status === 'in-progress' ? 'secondary' : 'outline'}
                                              className={`text-xs px-2 py-1 font-medium shadow-sm ${
                                                job.status === 'completed' ? 'bg-green-100 text-green-800 border-green-300' :
                                                job.status === 'in-progress' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                                'bg-gray-100 text-gray-600 border-gray-300'
                                              }`}
                                            >
                                              {job.status === 'completed' ? 'เสร็จ' :
                                               job.status === 'in-progress' ? 'ดำเนินการ' : 'รอ'}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
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