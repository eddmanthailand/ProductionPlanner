import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Clock, Users, Trash2, Calculator, Plus, Search, List, ChevronDown, Loader2 } from "lucide-react";

// Sortable Item component for drag and drop
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-move transition-all",
        isDragging && "opacity-50 scale-105"
      )}
    >
      {children}
    </div>
  );
}
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SubJob {
  id: number;
  workOrderId: string;
  orderNumber: string;
  customerName: string;
  deliveryDate: string | null;
  productName: string;
  departmentId: string;
  workStepId: string;
  colorId: number;
  sizeId: number;
  quantity: number;
  unitPrice: number;
  totalCost: string | number;
  productionCost?: number;
  status: string;
  queueId?: string;
  priority?: number;
}

interface WorkStep {
  id: string;
  departmentId: string;
  name: string;
  description: string;
  estimatedDuration: number;
  status: string;
}

interface Team {
  id: string;
  departmentId: string;
  name: string;
  leader: string;
  costPerDay: string;
  status: string;
}

interface Color {
  id: number;
  name: string;
  code: string;
}

interface Size {
  id: number;
  name: string;
  sortOrder: number;
}

interface Employee {
  id: string;
  teamId: string;
  name: string;
  position: string;
  status: string;
}

interface ProductionCapacity {
  id: string;
  teamId: string;
  maxCapacity: number;
  currentCapacity: number;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: string;
}

export default function WorkQueuePlanning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [selectedWorkStep, setSelectedWorkStep] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [teamQueue, setTeamQueue] = useState<SubJob[]>([]);
  const [calculatedPlan, setCalculatedPlan] = useState<any[]>([]);
  const [teamStartDate, setTeamStartDate] = useState<string>("");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingTeam, setViewingTeam] = useState<string>("");
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, isProcessing: false });
  const [currentProcessingJob, setCurrentProcessingJob] = useState<string>("");

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Data queries
  const { data: workSteps = [] } = useQuery<WorkStep[]>({
    queryKey: ["/api/work-steps"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: colors = [] } = useQuery<Color[]>({
    queryKey: ["/api/colors"],
  });

  const { data: sizes = [] } = useQuery<Size[]>({
    queryKey: ["/api/sizes"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: productionCapacities = [] } = useQuery<ProductionCapacity[]>({
    queryKey: ["/api/production-capacities"],
  });

  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
  });

  // Get work step of selected team by finding the work step that matches the team's department
  const selectedTeamData = teams.find(t => t.id === selectedTeam);
  const selectedTeamWorkStep = selectedTeamData ? workSteps.find(ws => ws.departmentId === selectedTeamData.departmentId)?.id : undefined;

  // Get available sub jobs for selected team's work step
  const { data: availableJobs = [], refetch: refetchAvailableJobs } = useQuery<SubJob[]>({
    queryKey: ["/api/sub-jobs/available", selectedTeamWorkStep],
    enabled: !!selectedTeamWorkStep,
    queryFn: async () => {
      const response = await fetch(`/api/sub-jobs/available?workStepId=${selectedTeamWorkStep}`);
      if (!response.ok) throw new Error('Failed to fetch available jobs');
      return response.json();
    }
  });

  // Get team queue
  const { data: teamQueueData = [], refetch: refetchTeamQueue } = useQuery<SubJob[]>({
    queryKey: ["/api/work-queues/team", selectedTeam],
    enabled: !!selectedTeam,
    queryFn: async () => {
      const response = await fetch(`/api/work-queues/team/${selectedTeam}`);
      if (!response.ok) throw new Error('Failed to fetch team queue');
      return response.json();
    }
  });

  // Update team queue when data changes
  useEffect(() => {
    setTeamQueue(teamQueueData);
  }, [teamQueueData]);

  // Thailand date helper
  const getThailandDate = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const thailandTime = new Date(utc + (7 * 3600000));
    return thailandTime;
  };

  // Update team start date from calendar
  useEffect(() => {
    if (calendarDate) {
      setTeamStartDate(format(calendarDate, "yyyy-MM-dd"));
    }
  }, [calendarDate]);

  // Initialize team start date with Thailand date
  useEffect(() => {
    if (!teamStartDate) {
      const thailandDate = getThailandDate();
      setTeamStartDate(format(thailandDate, "yyyy-MM-dd"));
    }
  }, []);

  // Reset selected jobs when dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      setSelectedJobs([]);
      setSearchTerm("");
    }
  }, [dialogOpen]);

  // Mutations
  const addToQueueMutation = useMutation({
    mutationFn: (data: { subJobId: number; teamId: string; priority: number }) => 
      apiRequest('/api/work-queues/add-job', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/team", selectedTeam] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/available", selectedWorkStep] });
    }
  });

  const removeFromQueueMutation = useMutation({
    mutationFn: (queueId: string) => 
      apiRequest(`/api/work-queues/${queueId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/team", selectedTeam] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/available", selectedWorkStep] });
    }
  });

  const reorderQueueMutation = useMutation({
    mutationFn: (data: { teamId: string; queueItems: SubJob[] }) => 
      apiRequest('/api/work-queues/reorder', 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/team", selectedTeam] });
    }
  });

  // Drag and drop handlers
  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = teamQueue.findIndex(item => item.id.toString() === active.id);
      const newIndex = teamQueue.findIndex(item => item.id.toString() === over.id);

      setTeamQueue((items) => {
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeFromTeamQueue = async (queueId: string, index: number) => {
    try {
      console.log('🗑️ Starting delete process...');
      console.log('Queue ID to delete:', queueId);
      console.log('Index:', index);
      console.log('Current team queue:', teamQueue);
      console.log('Selected team:', selectedTeam);
      
      if (!queueId) {
        console.error('❌ No queue ID provided');
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่พบ ID ของงานที่จะลบ",
          variant: "destructive"
        });
        return;
      }

      console.log('🚀 Calling delete API...');
      const result = await removeFromQueueMutation.mutateAsync(queueId);
      console.log('✅ Delete API result:', result);
      
      toast({
        title: "ลบงานสำเร็จ",
        description: "งานถูกลบออกจากคิวเรียบร้อยแล้ว",
      });
    } catch (error) {
      console.error('❌ Failed to remove job:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบงานออกจากคิวได้: " + (error as any)?.message,
        variant: "destructive"
      });
    }
  };

  const calculatePlan = async () => {
    if (!selectedTeam || teamQueue.length === 0) {
      toast({
        title: "ไม่สามารถคำนวณได้",
        description: "กรุณาเลือกทีมและเพิ่มงานเข้าคิวก่อน",
        variant: "destructive"
      });
      return;
    }

    try {
      // Refresh data to get latest production costs from work orders
      const [refreshedTeamQueue, refreshedAvailableJobs] = await Promise.all([
        refetchTeamQueue ? refetchTeamQueue() : Promise.resolve({ data: teamQueueData }),
        refetchAvailableJobs ? refetchAvailableJobs() : Promise.resolve({ data: availableJobs })
      ]);
      
      // Use the refreshed data for calculation
      const currentTeamQueue = refreshedTeamQueue?.data || teamQueueData;
      
      console.log('Current team queue data for calculation:', currentTeamQueue);
      console.log('Sample job cost data:', currentTeamQueue[0]?.totalCost, currentTeamQueue[0]?.quantity);
      
      // Get team cost per day (ต้นทุนต่อวัน = กำลังการผลิต)
      const team = teams.find(t => t.id === selectedTeam);
      
      if (!team) {
        toast({
          title: "ไม่พบข้อมูลทีม",
          description: "กรุณาเลือกทีมที่ถูกต้อง",
          variant: "destructive"
        });
        return;
      }

      // Daily capacity = team cost per day (in Baht)
      console.log('Selected team data:', team);
      const dailyCapacity = parseFloat((team as any).cost_per_day || (team as any).costPerDay || "0");
      console.log('Daily capacity:', dailyCapacity);
      
      if (dailyCapacity <= 0) {
        toast({
          title: "ข้อมูลไม่ถูกต้อง",
          description: `ทีมนี้ไม่มีข้อมูลต้นทุนต่อวัน (ได้รับ: ${dailyCapacity})`,
          variant: "destructive"
        });
        return;
      }
      
      // Create a simple job completion list for table display
      const jobCompletions: any[] = [];
      
      let currentDate = new Date(teamStartDate + 'T00:00:00.000Z');
      let remainingCapacity = dailyCapacity;
      
      for (const job of currentTeamQueue) {
        const jobCost = job.totalCost ? parseFloat(job.totalCost.toString()) : (job.quantity * 350); // Convert string to number or use fallback calculation
        
        // If job cost exceeds remaining capacity for the day, move to next working day
        if (jobCost > remainingCapacity) {
          // Move to next working day
          do {
            currentDate.setDate(currentDate.getDate() + 1);
          } while (isWeekendOrHoliday(currentDate));
          
          remainingCapacity = dailyCapacity;
        }
        
        // Use capacity for this job
        remainingCapacity -= jobCost;
        
        // Add job completion record
        jobCompletions.push({
          jobId: job.id,
          orderNumber: job.orderNumber,
          customerName: job.customerName,
          productName: job.productName,
          colorName: getColorName(job.colorId),
          sizeName: getSizeName(job.sizeId),
          quantity: job.quantity,
          completionDate: format(currentDate, "dd/MM/yyyy"),
          jobCost: jobCost.toFixed(2),
          remainingCapacity: remainingCapacity
        });
      }
      
      setCalculatedPlan(jobCompletions);
      
      // Save production plan to database
      try {
        const teamName = teams.find(t => t.id === selectedTeam)?.name || 'Unknown Team';
        const planName = `แผนการผลิต ${teamName} - ${format(new Date(), "dd/MM/yyyy HH:mm")}`;
        
        await apiRequest('/api/production-plans', 'POST', {
          teamId: selectedTeam,
          name: planName,
          startDate: teamStartDate,
          planItems: jobCompletions.map((job, index) => ({
            subJobId: job.jobId,
            orderNumber: job.orderNumber,
            customerName: job.customerName,
            productName: job.productName,
            colorName: job.colorName,
            sizeName: job.sizeName,
            quantity: job.quantity,
            completionDate: job.completionDate.split('/').reverse().join('-'), // Convert to YYYY-MM-DD
            jobCost: job.jobCost,
            priority: index + 1
          }))
        });
        
        toast({
          title: "บันทึกแผนการผลิตสำเร็จ",
          description: `แผนการผลิตสำหรับ ${teamQueue.length} งานถูกบันทึกแล้ว`,
        });
      } catch (error) {
        console.error('Save production plan error:', error);
        toast({
          title: "คำนวณแผนเสร็จสิ้น",
          description: `แผนการผลิตสำหรับ ${teamQueue.length} งาน (ไม่สามารถบันทึกได้)`,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('Calculate plan error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถคำนวณแผนการผลิตได้",
        variant: "destructive"
      });
    }
  };

  const isWeekendOrHoliday = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return true; // Weekend
    
    const dateString = date.toISOString().split('T')[0];
    return holidays.some(holiday => holiday.date === dateString);
  };

  const getColorName = (colorId: number): string => {
    const color = colors.find(c => c.id === colorId);
    return color ? color.name : '-';
  };

  const getSizeName = (sizeId: number): string => {
    const size = sizes.find(s => s.id === sizeId);
    return size ? size.name : '-';
  };

  const addJobsToQueue = async () => {
    if (selectedJobs.length === 0) {
      toast({
        title: "ไม่ได้เลือกงาน",
        description: "กรุณาเลือกงานที่ต้องการเพิ่มเข้าคิว",
        variant: "destructive"
      });
      return;
    }

    if (!selectedTeam) {
      toast({
        title: "ไม่ได้เลือกทีม",
        description: "กรุณาเลือกทีมก่อนเพิ่มงานเข้าคิว",
        variant: "destructive"
      });
      return;
    }

    try {
      setBatchProgress({ current: 0, total: selectedJobs.length, isProcessing: true });
      
      let successCount = 0;
      const jobsToProcess = selectedJobs.map(jobId => {
        const job = availableJobs?.find(j => j.id === jobId);
        return { id: jobId, name: job?.productName || `งาน ${jobId}` };
      });

      for (let i = 0; i < jobsToProcess.length; i++) {
        const job = jobsToProcess[i];
        setCurrentProcessingJob(job.name);
        setBatchProgress(prev => ({ ...prev, current: i + 1 }));

        try {
          await addToQueueMutation.mutateAsync({
            subJobId: job.id,
            teamId: selectedTeam,
            priority: teamQueue.length + i + 1
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to add job ${job.id} to queue:`, error);
        }

        // เพิ่มความล่าช้าเล็กน้อยเพื่อให้ผู้ใช้เห็นความคืบหน้า
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setBatchProgress({ current: 0, total: 0, isProcessing: false });
      setCurrentProcessingJob("");

      toast({
        title: "เพิ่มงานเข้าคิวสำเร็จ",
        description: `เพิ่ม ${successCount}/${selectedJobs.length} งานเข้าคิวแล้ว`,
      });

      setDialogOpen(false);
      setSelectedJobs([]);
      setSearchTerm("");
    } catch (error) {
      setBatchProgress({ current: 0, total: 0, isProcessing: false });
      setCurrentProcessingJob("");
      console.error('Failed to add jobs to queue:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มงานเข้าคิวได้",
        variant: "destructive"
      });
    }
  };

  const toggleJobSelection = (jobId: number) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  // Get all team queues to check for jobs already assigned
  const { data: allTeamQueues = [] } = useQuery<SubJob[]>({
    queryKey: ["/api/work-queues/all", teams.map(t => t.id).join(',')],
    queryFn: async () => {
      const allQueues: SubJob[] = [];
      const promises = teams.map(async (team) => {
        try {
          const response = await fetch(`/api/work-queues/team/${team.id}`);
          if (response.ok) {
            const teamQueue = await response.json();
            return teamQueue;
          }
          return [];
        } catch (error) {
          console.error(`Failed to fetch queue for team ${team.id}:`, error);
          return [];
        }
      });
      
      const results = await Promise.all(promises);
      results.forEach(queue => allQueues.push(...queue));
      return allQueues;
    },
    enabled: teams.length > 0
  });

  const filteredAvailableJobs = availableJobs
    .filter(job => {
      // Check if job is already in any team queue
      const isInQueue = allTeamQueues.some(queueJob => queueJob.id === job.id);
      if (isInQueue) return false;
      
      // Apply search filter
      return job.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
             job.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             job.productName.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      // เรียงตามหมายเลขใบสั่งก่อน
      const orderCompare = a.orderNumber.localeCompare(b.orderNumber);
      if (orderCompare !== 0) return orderCompare;
      
      // เรียงตามชื่อสินค้า
      const productCompare = a.productName.localeCompare(b.productName);
      if (productCompare !== 0) return productCompare;
      
      // เรียงตามสี (ใช้ sortOrder ของสี)
      const colorA = colors.find(c => c.id === a.colorId);
      const colorB = colors.find(c => c.id === b.colorId);
      const colorCompare = (colorA?.sortOrder || 999) - (colorB?.sortOrder || 999);
      if (colorCompare !== 0) return colorCompare;
      
      // เรียงตามไซส์ (ใช้ sortOrder ของไซส์)
      const sizeA = sizes.find(s => s.id === a.sizeId);
      const sizeB = sizes.find(s => s.id === b.sizeId);
      return (sizeA?.sortOrder || 999) - (sizeB?.sortOrder || 999);
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">วางแผนและคิวงาน</h1>
          <p className="mt-2 text-gray-600">จัดการคิวงานและวางแผนการผลิตในแต่ละแผนก</p>
        </div>

        {/* Step-by-step workflow section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Step 1: Select Team */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-800 text-sm">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                เลือกทีม
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="เลือกทีม..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Step 3: Add Jobs */}
          <Card className={cn(
            "border-2 transition-colors",
            selectedTeam ? "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200" : "bg-gray-50 border-gray-200"
          )}>
            <CardHeader className="pb-3">
              <CardTitle className={cn(
                "flex items-center gap-2 text-sm",
                selectedTeam ? "text-purple-800" : "text-gray-500"
              )}>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold",
                  selectedTeam ? "bg-purple-600 text-white" : "bg-gray-400 text-white"
                )}>3</div>
                เพิ่มงานเข้าคิว
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full" 
                    disabled={!selectedTeam}
                    variant={selectedTeam ? "default" : "secondary"}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    เลือกงาน ({filteredAvailableJobs.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>เลือกงานที่จะเพิ่มเข้าคิว</DialogTitle>
                    <DialogDescription>
                      เลือกงานที่ต้องการเพิ่มเข้าคิวการผลิต
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Progress Indicator */}
                    {batchProgress.isProcessing && (
                      <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">
                            กำลังเพิ่มงานเข้าคิว... ({batchProgress.current}/{batchProgress.total})
                          </span>
                        </div>
                        <Progress 
                          value={(batchProgress.current / batchProgress.total) * 100} 
                          className="w-full"
                        />
                        {currentProcessingJob && (
                          <p className="text-xs text-blue-600">
                            กำลังประมวลผล: {currentProcessingJob}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="ค้นหาเลขที่ใบสั่ง ลูกค้า หรือสินค้า..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="flex-1"
                          disabled={batchProgress.isProcessing}
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedJobs(filteredAvailableJobs.map(job => job.id))}
                          disabled={filteredAvailableJobs.length === 0 || batchProgress.isProcessing}
                        >
                          เลือกทั้งหมด ({filteredAvailableJobs.length})
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedJobs([])}
                          disabled={selectedJobs.length === 0 || batchProgress.isProcessing}
                        >
                          ยกเลิกทั้งหมด
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">เลือก</TableHead>
                            <TableHead>หมายเลขงาน</TableHead>
                            <TableHead>ลูกค้า</TableHead>
                            <TableHead>สินค้า</TableHead>
                            <TableHead>สี/ไซส์</TableHead>
                            <TableHead>จำนวน</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAvailableJobs.map((job) => (
                            <TableRow 
                              key={job.id} 
                              className={cn(
                                "cursor-pointer hover:bg-gray-50",
                                selectedJobs.includes(job.id) && "bg-blue-50",
                                batchProgress.isProcessing && "opacity-50 cursor-not-allowed"
                              )}
                              onClick={() => !batchProgress.isProcessing && toggleJobSelection(job.id)}
                            >
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedJobs.includes(job.id)}
                                  onChange={() => !batchProgress.isProcessing && toggleJobSelection(job.id)}
                                  disabled={batchProgress.isProcessing}
                                  className="rounded border-gray-300"
                                />
                              </TableCell>
                              <TableCell className="font-medium">{job.orderNumber}</TableCell>
                              <TableCell>{job.customerName}</TableCell>
                              <TableCell>{job.productName}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Badge variant="outline" className="text-xs">
                                    {getColorName(job.colorId)}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {getSizeName(job.sizeId)}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>{job.quantity}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="text-sm text-gray-600">
                        เลือกแล้ว: {selectedJobs.length} งาน
                      </span>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setDialogOpen(false)}
                          disabled={batchProgress.isProcessing}
                        >
                          ยกเลิก
                        </Button>
                        <Button 
                          onClick={addJobsToQueue} 
                          disabled={selectedJobs.length === 0 || batchProgress.isProcessing}
                        >
                          {batchProgress.isProcessing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              กำลังประมวลผล...
                            </>
                          ) : (
                            `เพิ่มเข้าคิว (${selectedJobs.length})`
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Step 4: Calculate Plan */}
          <Card className={cn(
            "border-2 transition-colors",
            teamQueue.length > 0 ? "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200" : "bg-gray-50 border-gray-200"
          )}>
            <CardHeader className="pb-3">
              <CardTitle className={cn(
                "flex items-center gap-2 text-sm",
                teamQueue.length > 0 ? "text-orange-800" : "text-gray-500"
              )}>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold",
                  teamQueue.length > 0 ? "bg-orange-600 text-white" : "bg-gray-400 text-white"
                )}>4</div>
                คำนวณแผน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={calculatePlan}
                disabled={!selectedTeam || teamQueue.length === 0}
                className="w-full"
                variant={teamQueue.length > 0 ? "default" : "secondary"}
              >
                <Calculator className="h-4 w-4 mr-1" />
                คำนวณแผนการผลิต
              </Button>
            </CardContent>
          </Card>
        </div>

        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 gap-8">
            {/* Team Queue and Production Planning */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    แผนการผลิต {selectedTeam && teams.find(t => t.id === selectedTeam)?.name}
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <CalendarDays className="h-4 w-4" />
                          วันเริ่มต้น: {teamStartDate ? format(new Date(teamStartDate), "dd/MM/yyyy") : "เลือกวันที่"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={calendarDate}
                          onSelect={setCalendarDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedTeam ? (
                  <div className="space-y-6">
                    {/* Team Queue */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">คิวงานของทีม ({teamQueue.length} งาน)</h4>
                      
                      <div className="space-y-2 min-h-[100px] p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                        {teamQueue.length === 0 ? (
                          <div className="text-center text-gray-500 py-8">
                            ไม่มีงานในคิว กรุณาเพิ่มงานเข้าคิว
                          </div>
                        ) : (
                          <SortableContext 
                            items={teamQueue.map(job => job.id.toString())}
                            strategy={verticalListSortingStrategy}
                          >
                            {teamQueue.map((job, index) => (
                              <SortableItem key={job.id.toString()} id={job.id.toString()}>
                                <div className="p-3 bg-white rounded-lg border shadow-sm transition-all">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">
                                        {job.orderNumber} - {job.customerName}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {format(new Date(), "dd/MM/yyyy")} {getColorName(job.colorId)} {getSizeName(job.sizeId)} จำนวน {job.quantity}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        console.log('Delete button clicked for job:', job);
                                        removeFromTeamQueue((job as any).queueId || job.id.toString(), index);
                                      }}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </SortableItem>
                            ))}
                          </SortableContext>
                        )}
                      </div>
                    </div>

                    {/* Results Table */}
                    {calculatedPlan.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-4">ตารางแผนการผลิต</h4>
                        <div className="border rounded-lg overflow-hidden overflow-x-auto">
                          <table className="w-full min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  หมายเลขงาน
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  ลูกค้า
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  สินค้า
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  สี
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  ไซส์
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  จำนวน
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  วันจบงาน
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  ต้นทุนงาน (บาท)
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {calculatedPlan.map((job, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
                                    {job.orderNumber}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                    {job.customerName}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                    {job.productName}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                    {job.colorName}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                    {job.sizeName}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                    {job.quantity}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-xs text-green-600 font-medium">
                                    {job.completionDate}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-xs text-blue-600 font-medium">
                                    {job.jobCost.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    กรุณาเลือกขั้นตอนงานและทีมก่อนเริ่มวางแผน
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DndContext>
      </div>
    </div>
  );
}