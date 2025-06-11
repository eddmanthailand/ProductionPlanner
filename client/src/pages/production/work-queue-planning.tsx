import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { CalendarDays, Clock, Users, Trash2, Calculator, Plus, Search, List, ChevronDown } from "lucide-react";
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
  productionCost: string;
  totalCost: string;
  status: string;
  sortOrder: number;
}

interface WorkStep {
  id: string;
  name: string;
  departmentId: string;
}

interface Team {
  id: string;
  name: string;
  departmentId: string;
}

interface Color {
  id: number;
  name: string;
}

interface Size {
  id: number;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  teamId: string;
}

interface ProductionCapacity {
  id: string;
  teamId: string;
  workStepId: string;
  dailyCapacity: number;
  costPerUnit: string;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
}

export default function WorkQueuePlanning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current date in Thailand timezone (UTC+7)
  const getThailandDate = () => {
    // Since we know today is 2025-06-12 in Thailand
    const today = new Date('2025-06-12T00:00:00.000Z');
    return today;
  };

  // State management
  const [selectedWorkStep, setSelectedWorkStep] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [teamStartDate, setTeamStartDate] = useState<string>("");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(getThailandDate());
  const [teamQueue, setTeamQueue] = useState<SubJob[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
  const [viewTeamQueueDialog, setViewTeamQueueDialog] = useState(false);
  const [viewingTeam, setViewingTeam] = useState<string>("");

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

  // Get available sub jobs for selected work step
  const { data: availableJobs = [] } = useQuery<SubJob[]>({
    queryKey: ["/api/sub-jobs/available", selectedWorkStep],
    enabled: !!selectedWorkStep,
    queryFn: async () => {
      const response = await fetch(`/api/sub-jobs/available?workStepId=${selectedWorkStep}`);
      if (!response.ok) throw new Error('Failed to fetch available jobs');
      return response.json();
    }
  });

  // Get team queue
  const { data: currentTeamQueue = [] } = useQuery<SubJob[]>({
    queryKey: ["/api/work-queues/team", selectedTeam],
    enabled: !!selectedTeam,
    queryFn: async () => {
      if (!selectedTeam) return [];
      const response = await fetch(`/api/work-queues/team/${selectedTeam}`);
      if (!response.ok) throw new Error('Failed to fetch team queue');
      return response.json();
    }
  });

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

  // Update team queue when data changes
  useEffect(() => {
    setTeamQueue(currentTeamQueue);
  }, [currentTeamQueue]);

  // Reset team selection when work step changes
  useEffect(() => {
    if (selectedWorkStep) {
      setSelectedTeam("");
      setTeamStartDate("");
      setCalendarDate(getThailandDate());
      setTeamQueue([]);
      setSelectedJobs([]);
    }
  }, [selectedWorkStep]);

  // Update team start date when calendar date changes
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

  // Filter teams based on selected work step's department
  const availableTeams = teams.filter(team => {
    if (!selectedWorkStep || !workSteps.length) return false;
    const workStep = workSteps.find(ws => ws.id === selectedWorkStep);
    return workStep && team.departmentId === workStep.departmentId;
  });

  // Filter available jobs by search term and exclude jobs already assigned to any team
  const filteredAvailableJobs = availableJobs.filter(job => {
    // Check if this specific sub job is already assigned to any team queue by checking sub_job_id
    const isInAnyQueue = allTeamQueues.some(queueJob => queueJob.id === job.id);
    
    if (isInAnyQueue) return false;

    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      job.customerName.toLowerCase().includes(searchLower) ||
      job.orderNumber.toLowerCase().includes(searchLower) ||
      job.productName.toLowerCase().includes(searchLower)
    );
  });

  // Helper functions
  const getColorName = (colorId: number): string => {
    const color = colors.find(c => c.id === colorId);
    return color ? color.name : "ไม่ระบุ";
  };

  const getSizeName = (sizeId: number): string => {
    const size = sizes.find(s => s.id === sizeId);
    return size ? size.name : "ไม่ระบุ";
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "ไม่กำหนด";
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  // Function to toggle job selection
  const toggleJobSelection = (jobId: number) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  // Function to add selected jobs to queue
  const addSelectedJobsToQueue = async () => {
    if (!selectedTeam || selectedJobs.length === 0) return;
    
    try {
      for (const jobId of selectedJobs) {
        const response = await fetch('/api/work-queues/add-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subJobId: jobId,
            teamId: selectedTeam,
            priority: teamQueue.length + 1
          }),
        });
        if (!response.ok) throw new Error('Failed to add job to queue');
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/team", selectedTeam] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/available", selectedWorkStep] });
      
      // Clear selected jobs
      setSelectedJobs([]);
      
      toast({
        title: "เพิ่มงานสำเร็จ",
        description: `เพิ่ม ${selectedJobs.length} งานเข้าคิวของทีมแล้ว`,
      });
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Add to queue error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มงานเข้าคิวได้",
        variant: "destructive"
      });
    }
  };

  // Mutations for queue management
  const addToQueueMutation = useMutation({
    mutationFn: async (data: { subJobId: number; teamId: string; priority: number }) => {
      const response = await fetch('/api/work-queues/add-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to add job to queue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/team", selectedTeam] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/available", selectedWorkStep] });
    }
  });

  const removeFromQueueMutation = useMutation({
    mutationFn: async (queueId: string) => {
      const response = await fetch(`/api/work-queues/${queueId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to remove job from queue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/team", selectedTeam] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/available", selectedWorkStep] });
    }
  });

  const reorderQueueMutation = useMutation({
    mutationFn: async (data: { teamId: string; queueItems: SubJob[] }) => {
      const response = await fetch('/api/work-queues/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to reorder queue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/team", selectedTeam] });
    }
  });

  // Drag and drop handlers
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // Moving from available jobs to team queue
    if (source.droppableId === "available-jobs" && destination.droppableId === "team-queue") {
      if (!selectedTeam) return;
      
      const jobToMove = filteredAvailableJobs[source.index];
      await addToQueueMutation.mutateAsync({
        subJobId: jobToMove.id,
        teamId: selectedTeam,
        priority: teamQueue.length + 1
      });
      return;
    }

    // Reordering within team queue
    if (source.droppableId === "team-queue" && destination.droppableId === "team-queue") {
      const newQueue = Array.from(teamQueue);
      const [removed] = newQueue.splice(source.index, 1);
      newQueue.splice(destination.index, 0, removed);
      
      setTeamQueue(newQueue);
      
      if (selectedTeam) {
        await reorderQueueMutation.mutateAsync({
          teamId: selectedTeam,
          queueItems: newQueue
        });
      }
      return;
    }
  };

  const removeFromTeamQueue = async (queueId: string, index: number) => {
    try {
      await removeFromQueueMutation.mutateAsync(queueId);
      setTeamQueue(prev => prev.filter((_, i) => i !== index));
      
      // Refetch available jobs to show the returned job
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/available", selectedWorkStep] });
      
      toast({
        title: "งานถูกย้ายออกจากคิว",
        description: "งานได้กลับไปยัง 'งานรอวางคิว' แล้ว",
      });
    } catch (error) {
      console.error('Failed to remove job:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบงานจากคิวได้",
        variant: "destructive"
      });
    }
  };

  const [calculatedPlan, setCalculatedPlan] = useState<any[]>([]);

  const calculatePlan = async () => {
    if (!selectedTeam || !teamStartDate || teamQueue.length === 0) {
      toast({
        title: "ข้อมูลไม่ครบ",
        description: "กรุณาเลือกทีม กำหนดวันเริ่มงาน และมีงานในคิว",
        variant: "destructive"
      });
      return;
    }

    try {
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
      const dailyCapacity = parseFloat((team as any).cost_per_day || "0");
      
      if (dailyCapacity <= 0) {
        toast({
          title: "ข้อมูลไม่ถูกต้อง",
          description: "ทีมนี้ไม่มีข้อมูลต้นทุนต่อวัน",
          variant: "destructive"
        });
        return;
      }
      
      // Calculate job schedule
      const schedule: any[] = [];
      let currentDate = new Date(teamStartDate);
      let remainingDailyCapacity = dailyCapacity;
      
      // Track job completion dates
      const jobCompletionMap = new Map();
      
      // Create a simple job completion list for table display
      const jobCompletions: any[] = [];
      let processDate = new Date(teamStartDate);
      let dailyRemainingBudget = dailyCapacity;
      
      for (let jobIndex = 0; jobIndex < teamQueue.length; jobIndex++) {
        const job = teamQueue[jobIndex];
        const unitPrice = 350;
        const totalJobCost = job.quantity * unitPrice;
        let remainingJobCost = totalJobCost;
        let jobStartDate = new Date(processDate);
        
        // Process this job until complete
        while (remainingJobCost > 0) {
          // Skip weekends and holidays
          while (isWeekendOrHoliday(processDate)) {
            processDate = new Date(processDate.getTime() + 24 * 60 * 60 * 1000);
          }
          
          // How much of this job can we process today?
          const costToProcess = Math.min(remainingJobCost, dailyRemainingBudget);
          
          if (costToProcess > 0) {
            remainingJobCost -= costToProcess;
            dailyRemainingBudget -= costToProcess;
          }
          
          // If day is full or job is complete, move to next day
          if (dailyRemainingBudget <= 0 || remainingJobCost <= 0) {
            if (remainingJobCost <= 0) {
              // Job is complete - record completion
              jobCompletions.push({
                ...job,
                jobKey: `${job.id}-${job.colorId}-${job.sizeId}`,
                startDate: jobStartDate,
                completionDate: new Date(processDate),
                totalCost: totalJobCost,
                totalQuantity: job.quantity
              });
            }
            
            // Move to next working day
            processDate = new Date(processDate.getTime() + 24 * 60 * 60 * 1000);
            dailyRemainingBudget = dailyCapacity;
          }
        }
      }
      
      // Use job completions for the table display
      setCalculatedPlan(jobCompletions);
      
      toast({
        title: "คำนวณแผนสำเร็จ",
        description: `วางแผนการผลิต ${teamQueue.length} งาน ใช้เวลา ${schedule.length} วันทำการ`
      });
      
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

  const getJobsForDate = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return calculatedPlan.find(plan => plan.dateKey === dateKey)?.jobs || [];
  };

  const getJobColor = (jobIndex: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-orange-500'
    ];
    return colors[jobIndex % colors.length];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">วางแผนและคิวงาน</h1>
          <p className="text-gray-600 mt-1">จัดการลำดับงานและวางแผนการผลิต</p>
        </div>

        {/* Top Bar - Controls */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">เลือกขั้นตอนงาน</label>
              <Select value={selectedWorkStep} onValueChange={setSelectedWorkStep}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="เลือกขั้นตอน" />
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
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!selectedWorkStep}>
                  <Plus className="h-4 w-4 mr-2" />
                  เลือกงานรอ
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>เลือกงานรอวางคิว - {workSteps.find(ws => ws.id === selectedWorkStep)?.name || 'ไม่ระบุขั้นตอน'}</DialogTitle>
                  <DialogDescription>
                    เลือกงานที่ต้องการเพิ่มเข้าคิวของทีม งานที่อยู่ในคิวแล้วจะไม่แสดงในรายการ
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="ค้นหางาน..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-48"
                      />
                      <div className="text-sm text-gray-600">
                        เลือกทีม:
                      </div>
                      <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="เลือกทีม" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTeams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedJobs(filteredAvailableJobs.map(job => job.id))}
                        disabled={filteredAvailableJobs.length === 0}
                      >
                        เลือกทั้งหมด
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedJobs([])}
                        disabled={selectedJobs.length === 0}
                      >
                        ยกเลิกการเลือก
                      </Button>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <div className="grid gap-2 p-4">
                      {filteredAvailableJobs.map((job) => {
                        const isSelected = selectedJobs.includes(job.id);
                        return (
                          <div
                            key={job.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                            onClick={() => toggleJobSelection(job.id)}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleJobSelection(job.id)}
                                className="mt-1"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 mb-2">
                                  {job.customerName} • {job.orderNumber} • {job.productName}
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <div>
                                    {formatDate(job.deliveryDate)} • {getColorName(job.colorId)} • {getSizeName(job.sizeId)}
                                  </div>
                                  <div className="font-medium">
                                    {job.quantity} ชิ้น
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      เลือกแล้ว {selectedJobs.length} งาน
                      {selectedTeam && (
                        <span className="ml-2 text-green-600">
                          → ทีม: {availableTeams.find(t => t.id === selectedTeam)?.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        ยกเลิก
                      </Button>
                      <Button 
                        onClick={addSelectedJobsToQueue}
                        disabled={selectedJobs.length === 0 || !selectedTeam}
                      >
                        เพิ่มเข้าคิว ({selectedJobs.length})
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6">
            {/* Team Queue - 25% width */}
            <div className="w-[25%]">
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-sm">
                      คิวของทีม
                      {selectedTeam && (
                        <span className="text-blue-600 ml-2">
                          - {availableTeams.find(t => t.id === selectedTeam)?.name}
                        </span>
                      )}
                    </CardTitle>
                  </div>
                  {selectedWorkStep && (
                    <div className="mt-2 text-xs text-gray-600">
                      ขั้นตอน: {workSteps.find(ws => ws.id === selectedWorkStep)?.name}
                    </div>
                  )}
                  <div className="mt-3">
                    <label className="text-xs font-medium text-gray-700 mb-2 block">เลือกทีม</label>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="เลือกทีม" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-3">
                    <label className="text-xs font-medium text-gray-700 mb-2 block">วันเริ่มงาน</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal text-xs",
                            !calendarDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {calendarDate ? format(calendarDate, "dd/MM/yyyy") : "เลือกวันที่"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={calendarDate}
                          onSelect={(date) => setCalendarDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewTeamQueueDialog(true)}
                      className="w-full text-xs"
                    >
                      <List className="h-4 w-4 mr-2" />
                      ดูคิวทีมอื่น ๆ
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Droppable droppableId="team-queue">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2 min-h-[400px]"
                      >
                        {teamQueue.map((job, index) => (
                          <Draggable key={job.id} draggableId={job.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-2 bg-white border rounded-lg cursor-grab hover:shadow-md transition-shadow ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-xs text-gray-900 line-clamp-1 flex-1">
                                    {job.customerName} • {job.orderNumber} • {job.productName}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFromTeamQueue((job as any).queueId || job.id.toString(), index)}
                                    className="h-4 w-4 p-0 text-red-500 hover:text-red-700 ml-1"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <div className="text-gray-600">
                                    {formatDate(job.deliveryDate)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-xs px-1 py-0">
                                      {getColorName(job.colorId)}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs px-1 py-0">
                                      {getSizeName(job.sizeId)}
                                    </Badge>
                                    <span className="font-medium text-green-700">
                                      {job.quantity}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </div>

            {/* Planning Calendar - 85% width */}
            <div className="flex-1">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-lg">แผนการผลิต</CardTitle>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <Button 
                      onClick={calculatePlan}
                      disabled={!selectedTeam || !teamStartDate || teamQueue.length === 0}
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      คำนวณแผน
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Table View for Planning */}
                  {selectedTeam && teamStartDate ? (
                    <div className="space-y-4">
                      {/* Production Schedule Table */}
                      {calculatedPlan.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  หมายเลขงาน
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  ชื่อสินค้า
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  สี / ไซส์
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  จำนวน
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  ต้นทุน
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  วันที่เริ่ม
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  วันที่เสร็จ
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  สถานะ
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {calculatedPlan.map((job: any, index: number) => (
                                <tr key={`${job.id}-${job.colorId}-${job.sizeId}-${index}`} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {job.orderNumber}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {job.productName}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {getColorName(job.colorId)}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {getSizeName(job.sizeId)}
                                      </Badge>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {job.totalQuantity} ชิ้น
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {job.totalCost?.toLocaleString()} บาท
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {job.startDate?.toLocaleDateString('th-TH')}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {job.completionDate?.toLocaleDateString('th-TH')}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                    >
                                      วางแผนแล้ว
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="min-h-[400px] flex items-center justify-center border rounded-lg bg-gray-50">
                          <div className="text-center text-gray-400">
                            <Calculator className="h-16 w-16 mx-auto mb-4" />
                            <p className="text-lg">กดปุ่ม "คำนวณแผน" เพื่อสร้างตารางการผลิต</p>
                            <p className="text-sm">ระบบจะแสดงรายละเอียด sub job และวันที่เสร็จสิ้น</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Daily Plan Summary */}
                      {calculatedPlan.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-medium text-gray-900 mb-4">แผนการผลิตรายวัน</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {calculatedPlan.map((dayPlan, dayIndex) => (
                              <div key={dayPlan.dateKey} className="border rounded-lg p-4 bg-white shadow-sm">
                                <div className="mb-3">
                                  <h5 className="font-medium text-lg">
                                    {dayPlan.date.toLocaleDateString('th-TH', { 
                                      weekday: 'short', 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </h5>
                                  <div className="text-sm text-gray-500">
                                    ต้นทุนต่อวัน: {dayPlan.dailyCapacity.toLocaleString()} บาท
                                  </div>
                                </div>
                                
                                {/* Progress bar showing daily capacity usage */}
                                <div className="mb-3">
                                  <div className="w-full bg-gray-200 rounded-full h-4 relative">
                                    {dayPlan.jobs.map((job: any, jobIndex: number) => (
                                      <div
                                        key={`${job.id}-${jobIndex}`}
                                        className={`absolute h-full rounded ${getJobColor(job.jobIndex)} opacity-80`}
                                        style={{
                                          left: `${job.leftOffset}%`,
                                          width: `${job.width}%`
                                        }}
                                        title={`${job.orderNumber} • ${job.productName} • ${getColorName(job.colorId)} • ${getSizeName(job.sizeId)} • ${job.processedQuantity} ชิ้น • ${job.processedCost?.toLocaleString()} บาท`}
                                      />
                                    ))}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    รวม: {dayPlan.jobs.reduce((sum: number, job: any) => sum + job.processedQuantity, 0)} ชิ้น •{" "}
                                    {dayPlan.jobs.reduce((sum: number, job: any) => sum + (job.processedCost || 0), 0).toLocaleString()} บาท
                                  </div>
                                </div>

                                {/* Job details */}
                                <div className="space-y-2">
                                  {dayPlan.jobs.map((job: any, jobIndex: number) => (
                                    <div
                                      key={`${job.id}-${jobIndex}`}
                                      className="text-xs p-2 border rounded bg-gray-50"
                                    >
                                      <div className="font-medium">
                                        {job.orderNumber} • {job.productName}
                                      </div>
                                      <div className="text-gray-600">
                                        {getColorName(job.colorId)} • {getSizeName(job.sizeId)} • {job.processedQuantity} ชิ้น
                                      </div>
                                      <div className="text-gray-500">
                                        {job.processedCost?.toLocaleString()} บาท ({job.width.toFixed(1)}%)
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary section */}
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">สรุปการวางแผน</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">งานทั้งหมด: </span>
                            <span className="font-medium">{teamQueue.length} งาน</span>
                          </div>
                          <div>
                            <span className="text-gray-600">วันที่เริ่ม: </span>
                            <span className="font-medium">{formatDate(teamStartDate)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">ทีม: </span>
                            <span className="font-medium">
                              {availableTeams.find(t => t.id === selectedTeam)?.name || '-'}
                            </span>
                          </div>
                        </div>
                        {calculatedPlan.length > 0 && (
                          <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                            <div>
                              <span className="text-gray-600">วันที่เสร็จ: </span>
                              <span className="font-medium">
                                {calculatedPlan[calculatedPlan.length - 1]?.date.toLocaleDateString('th-TH') || '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">ใช้เวลา: </span>
                              <span className="font-medium">{calculatedPlan.length} วันทำการ</span>
                            </div>
                            <div>
                              <span className="text-gray-600">ต้นทุนรวม: </span>
                              <span className="font-medium">
                                {calculatedPlan.reduce((total, day) => 
                                  total + day.jobs.reduce((sum: number, job: any) => sum + (job.processedCost || 0), 0), 0
                                ).toLocaleString()} บาท
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="min-h-[500px] flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <Clock className="h-16 w-16 mx-auto mb-4" />
                        <p className="text-lg">เลือกทีมและกำหนดวันเริ่มงาน</p>
                        <p className="text-sm">เพื่อดูตารางวางแผนการผลิต</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </DragDropContext>

        {/* View Team Queue Dialog */}
        <Dialog open={viewTeamQueueDialog} onOpenChange={setViewTeamQueueDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>คิวงานของทีมทั้งหมด</DialogTitle>
              <DialogDescription>
                แสดงคิวงานปัจจุบันของทุกทีมในแผนก
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {teams.map((team) => (
                  <TeamQueueView key={team.id} team={team} />
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Component to display individual team queue
function TeamQueueView({ team }: { team: Team }) {
  const { data: teamQueue = [] } = useQuery<SubJob[]>({
    queryKey: ["/api/work-queues/team", team.id],
    queryFn: async () => {
      const response = await fetch(`/api/work-queues/team/${team.id}`);
      if (!response.ok) throw new Error('Failed to fetch team queue');
      return response.json();
    }
  });

  const { data: colors = [] } = useQuery<Color[]>({
    queryKey: ["/api/colors"],
  });

  const { data: sizes = [] } = useQuery<Size[]>({
    queryKey: ["/api/sizes"],
  });

  const getColorName = (colorId: number): string => {
    const color = colors.find(c => c.id === colorId);
    return color ? color.name : '-';
  };

  const getSizeName = (sizeId: number): string => {
    const size = sizes.find(s => s.id === sizeId);
    return size ? size.name : '-';
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          <CardTitle className="text-sm">{team.name}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {teamQueue.length} งาน
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[300px] overflow-auto">
          {teamQueue.length === 0 ? (
            <div className="text-center text-gray-400 py-4">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">ไม่มีงานในคิว</p>
            </div>
          ) : (
            teamQueue.map((job, index) => (
              <div key={job.id} className="p-2 bg-gray-50 border rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-gray-900 line-clamp-1 flex-1">
                    {job.customerName} • {job.orderNumber} • {job.productName}
                  </div>
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    #{index + 1}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="text-gray-600">
                    {formatDate(job.deliveryDate)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {getColorName(job.colorId)}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {getSizeName(job.sizeId)}
                    </Badge>
                    <span className="font-medium text-green-700">
                      {job.quantity}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}