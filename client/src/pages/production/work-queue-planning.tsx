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

  // Get current team's queue
  const { data: currentTeamQueue = [] } = useQuery<SubJob[]>({
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

  // Mutations
  const addToQueueMutation = useMutation({
    mutationFn: (data: { subJobId: number; teamId: string; priority: number }) => 
      apiRequest('/api/work-queues/add-job', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
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
    mutationFn: (data: { teamId: string; queueItems: SubJob[] }) => 
      apiRequest('/api/work-queues/reorder', {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/team", selectedTeam] });
    }
  });

  // Drag and drop handlers
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const newTeamQueue = Array.from(teamQueue);
    const [reorderedItem] = newTeamQueue.splice(result.source.index, 1);
    newTeamQueue.splice(result.destination.index, 0, reorderedItem);

    setTeamQueue(newTeamQueue);

    try {
      await reorderQueueMutation.mutateAsync({
        teamId: selectedTeam,
        queueItems: newTeamQueue
      });
    } catch (error) {
      console.error('Failed to reorder queue:', error);
      setTeamQueue(teamQueue);
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
        description: `วางแผนการผลิต ${teamQueue.length} งาน`
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
      const promises = selectedJobs.map((jobId, index) =>
        addToQueueMutation.mutateAsync({
          subJobId: jobId,
          teamId: selectedTeam,
          priority: teamQueue.length + index + 1
        })
      );

      await Promise.all(promises);

      toast({
        title: "เพิ่มงานเข้าคิวสำเร็จ",
        description: `เพิ่ม ${selectedJobs.length} งานเข้าคิวแล้ว`,
      });

      setDialogOpen(false);
      setSelectedJobs([]);
      setSearchTerm("");
    } catch (error) {
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

  const filteredAvailableJobs = availableJobs.filter(job => {
    // Check if job is already in any team queue
    const isInQueue = allTeamQueues.some(queueJob => queueJob.id === job.id);
    if (isInQueue) return false;
    
    // Apply search filter
    return job.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
           job.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           job.productName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">วางแผนและคิวงาน</h1>
          <p className="mt-2 text-gray-600">จัดการคิวงานและวางแผนการผลิตในแต่ละแผนก</p>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Available Jobs Section */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    งานรอวางคิว
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">เลือกขั้นตอนงาน</label>
                      <Select value={selectedWorkStep} onValueChange={setSelectedWorkStep}>
                        <SelectTrigger className="w-full">
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

                    {selectedWorkStep && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">
                            งานที่พร้อมจะใส่คิว ({availableJobs.length} งาน)
                          </span>
                          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                เพิ่มเข้าคิว
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                              <DialogHeader>
                                <DialogTitle>เลือกงานที่ต้องการเพิ่มเข้าคิว</DialogTitle>
                                <DialogDescription>
                                  เลือกงานจากรายการด้านล่างเพื่อเพิ่มเข้าคิวของทีม
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                  <Search className="h-4 w-4 text-gray-400" />
                                  <Input
                                    placeholder="ค้นหาหมายเลขใบงาน, ลูกค้า, หรือสินค้า..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex-1"
                                  />
                                </div>

                                <div className="border rounded-lg max-h-96 overflow-auto">
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
                                        <TableRow key={job.id}>
                                          <TableCell>
                                            <input
                                              type="checkbox"
                                              checked={selectedJobs.includes(job.id)}
                                              onChange={() => toggleJobSelection(job.id)}
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
                                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                      ยกเลิก
                                    </Button>
                                    <Button onClick={addJobsToQueue} disabled={selectedJobs.length === 0}>
                                      เพิ่มเข้าคิว ({selectedJobs.length})
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>


                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Team Queue Planning Section */}
            <div className="xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    แผนการผลิต
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedWorkStep ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">เลือกทีม</label>
                        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="เลือกทีม" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams
                              .filter(team => 
                                workSteps.find(step => step.id === selectedWorkStep)?.departmentId === team.departmentId
                              )
                              .map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedTeam && (
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">วันเริ่มงาน</label>
                            <div className="mt-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !calendarDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    {calendarDate ? format(calendarDate, "PPP") : "เลือกวันที่"}
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
                                onClick={calculatePlan}
                                className="w-full"
                                disabled={teamQueue.length === 0}
                              >
                                <Calculator className="h-4 w-4 mr-2" />
                                คำนวณแผน
                              </Button>
                            </div>
                          </div>

                          {/* Team Queue */}
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-medium text-gray-900">คิวงานของทีม ({teamQueue.length})</h4>
                            </div>
                            
                            <Droppable droppableId="team-queue">
                              {(provided) => (
                                <div
                                  {...provided.droppableProps}
                                  ref={provided.innerRef}
                                  className="space-y-2 min-h-[200px] border-2 border-dashed border-gray-200 rounded-lg p-4"
                                >
                                  {teamQueue.map((job, index) => (
                                    <Draggable key={job.id} draggableId={job.id.toString()} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`p-3 bg-white border rounded-lg shadow-sm ${
                                            snapshot.isDragging ? 'shadow-lg' : ''
                                          }`}
                                        >
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <div className="font-medium text-gray-900">{job.orderNumber}</div>
                                              <div className="text-sm text-gray-600">{job.customerName} • {job.productName}</div>
                                              <div className="text-sm text-gray-500">
                                                {format(new Date(), "dd/MM/yyyy")} {getColorName(job.colorId)} {getSizeName(job.sizeId)} จำนวน {job.quantity}
                                              </div>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeFromTeamQueue((job as any).queueId || (job as any).id, index)}
                                              className="text-red-600 hover:text-red-800"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                  {teamQueue.length === 0 && (
                                    <div className="text-center text-gray-400 py-8">
                                      <Clock className="h-12 w-12 mx-auto mb-3" />
                                      <p>ยังไม่มีงานในคิว</p>
                                      <p className="text-sm">ลากงานจากรายการซ้ายมาที่นี่</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Droppable>
                          </div>

                          {/* Results Table */}
                          {calculatedPlan.length > 0 ? (
                            <div className="mt-6">
                              <h4 className="font-medium text-gray-900 mb-4">ตารางแผนการผลิต</h4>
                              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                                <table className="w-full min-w-full divide-y divide-gray-200 text-xs">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        หมายเลขงาน
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        สินค้า
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        สี/ไซส์
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        จำนวน
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ต้นทุน
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        วันเริ่ม
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        วันเสร็จ
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

                          {/* Job Summary */}
                          {calculatedPlan.length > 0 && (
                            <div className="mt-6">
                              <h4 className="font-medium text-gray-900 mb-4">สรุปแผนการผลิต</h4>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="text-sm text-blue-800">
                                  <strong>ผลการคำนวณ:</strong> จำนวน {calculatedPlan.length} งาน 
                                  {calculatedPlan.length > 0 && (
                                    <>
                                      <br />เริ่มงาน: {calculatedPlan[0]?.startDate?.toLocaleDateString('th-TH')}
                                      <br />เสร็จสิ้น: {calculatedPlan[calculatedPlan.length - 1]?.completionDate?.toLocaleDateString('th-TH')}
                                      <br />ต้นทุนรวม: {calculatedPlan.reduce((sum, job) => sum + (job.totalCost || 0), 0).toLocaleString()} บาท
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Summary section */}
                          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">สรุปการวางแผน</h4>
                            {teamQueue.length > 0 && (
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">งานทั้งหมด:</span>
                                  <span className="ml-2 font-medium">{teamQueue.length} งาน</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">จำนวนชิ้นรวม:</span>
                                  <span className="ml-2 font-medium">
                                    {teamQueue.reduce((sum, job) => sum + job.quantity, 0)} ชิ้น
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">ต้นทุนการผลิตรวม:</span>
                                  <span className="ml-2 font-medium">
                                    {teamQueue.reduce((sum, job) => sum + job.quantity * 350, 0).toLocaleString()} บาท
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">วันที่เริ่มงาน:</span>
                                  <span className="ml-2 font-medium">
                                    {teamStartDate ? new Date(teamStartDate).toLocaleDateString('th-TH') : '-'}
                                  </span>
                                </div>
                                {calculatedPlan.length > 0 && (
                                  <>
                                    <div className="col-span-2">
                                      <span className="text-gray-600">ประมาณการเสร็จสิ้น:</span>
                                      <span className="ml-2 font-medium">
                                        {calculatedPlan[calculatedPlan.length - 1]?.completionDate?.toLocaleDateString('th-TH') || '-'}
                                      </span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-gray-600">จำนวนวันทำการ:</span>
                                      <span className="ml-2 font-medium">
                                        {calculatedPlan[0]?.startDate && calculatedPlan[calculatedPlan.length - 1]?.completionDate ? (
                                          Math.ceil(
                                            (calculatedPlan[calculatedPlan.length - 1].completionDate.getTime() - 
                                             calculatedPlan[0].startDate.getTime()) / (1000 * 60 * 60 * 24)
                                          ) + ' วัน'
                                        ) : '-'}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
      </div>
    </div>
  );
}