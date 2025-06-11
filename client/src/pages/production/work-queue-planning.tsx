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
import { CalendarDays, Clock, Users, Trash2, Calculator, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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

  // State management
  const [selectedWorkStep, setSelectedWorkStep] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [teamStartDate, setTeamStartDate] = useState<string>("");
  const [teamQueue, setTeamQueue] = useState<SubJob[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<number[]>([]);

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

  // Update team queue when data changes
  useEffect(() => {
    setTeamQueue(currentTeamQueue);
  }, [currentTeamQueue]);

  // Reset team selection when work step changes
  useEffect(() => {
    if (selectedWorkStep) {
      setSelectedTeam("");
      setTeamStartDate("");
      setTeamQueue([]);
      setSelectedJobs([]);
    }
  }, [selectedWorkStep]);

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

  // Filter available jobs by search term and exclude jobs already in team queue
  const filteredAvailableJobs = availableJobs.filter(job => {
    // Check if job is already in current team queue
    const isInQueue = currentTeamQueue.some(queueJob => queueJob.id === job.id);
    if (isInQueue) return false;

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
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/available", selectedWorkStep] });
      
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

  const calculatePlan = () => {
    if (!selectedTeam || !teamStartDate || teamQueue.length === 0) {
      toast({
        title: "ข้อมูลไม่ครบ",
        description: "กรุณาเลือกทีม กำหนดวันเริ่มงาน และมีงานในคิว",
        variant: "destructive"
      });
      return;
    }

    // TODO: Implement planning calculation logic
    toast({
      title: "กำลังคำนวณแผน",
      description: "ระบบกำลังคำนวณแผนการผลิต...",
    });
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
            {/* Team Queue - 15% width */}
            <div className="w-[15%]">
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
                    <Input
                      type="date"
                      value={teamStartDate}
                      onChange={(e) => setTeamStartDate(e.target.value)}
                      className="text-xs"
                    />
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
                                    onClick={() => removeFromTeamQueue(job.id.toString(), index)}
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
                  {/* Calendar View for Planning */}
                  {selectedTeam && teamStartDate ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-gray-700 mb-2">
                        <div className="p-2 text-center">จันทร์</div>
                        <div className="p-2 text-center">อังคาร</div>
                        <div className="p-2 text-center">พุธ</div>
                        <div className="p-2 text-center">พฤหัสบดี</div>
                        <div className="p-2 text-center">ศุกร์</div>
                        <div className="p-2 text-center">เสาร์</div>
                        <div className="p-2 text-center">อาทิตย์</div>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1">
                        {/* Generate calendar days for 4 weeks */}
                        {Array.from({ length: 28 }, (_, i) => {
                          const date = new Date(teamStartDate);
                          date.setDate(date.getDate() + i);
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                          
                          return (
                            <Droppable key={`date-${i}`} droppableId={`calendar-${date.toISOString().split('T')[0]}`}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`
                                    min-h-[120px] p-2 border rounded-lg
                                    ${isWeekend ? 'bg-gray-100' : 'bg-white'}
                                    ${snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}
                                  `}
                                >
                                  <div className="text-xs font-medium text-gray-600 mb-1">
                                    {date.getDate()}/{date.getMonth() + 1}
                                  </div>
                                  
                                  {/* Jobs scheduled for this date would appear here */}
                                  <div className="space-y-1">
                                    {/* TODO: Add scheduled jobs for this date */}
                                  </div>
                                  
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          );
                        })}
                      </div>
                      
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
      </div>
    </div>
  );
}