import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  CalendarDays, 
  Users, 
  Calculator, 
  Trash2, 
  Clock,
  Plus,
  Search,
  Filter
} from "lucide-react";
import type { 
  WorkStep, 
  Team, 
  Color, 
  Size, 
  Employee, 
  ProductionCapacity, 
  Holiday,
  SubJob 
} from "@shared/schema";

export default function WorkQueuePlanningV2() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [selectedWorkStep, setSelectedWorkStep] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [teamStartDate, setTeamStartDate] = useState<string>("");
  const [teamQueue, setTeamQueue] = useState<SubJob[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set());

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
      setSelectedJobs(new Set());
    }
  }, [selectedWorkStep]);

  // Filter teams based on selected work step's department
  const availableTeams = teams.filter(team => {
    if (!selectedWorkStep || !workSteps.length) return false;
    const workStep = workSteps.find(ws => ws.id === selectedWorkStep);
    return workStep && team.departmentId === workStep.departmentId;
  });

  // Filter available jobs based on search term
  const filteredAvailableJobs = availableJobs.filter(job => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      job.customerName?.toLowerCase().includes(searchLower) ||
      job.productName?.toLowerCase().includes(searchLower) ||
      job.orderNumber?.toLowerCase().includes(searchLower)
    );
  });

  // Helper functions
  const getColorName = (colorId: number | null): string => {
    if (!colorId) return "ไม่ระบุ";
    const color = colors.find(c => c.id === colorId);
    return color ? color.name : "ไม่ระบุ";
  };

  const getSizeName = (sizeId: number | null): string => {
    if (!sizeId) return "ไม่ระบุ";
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

  // Job selection handlers
  const toggleJobSelection = (jobId: number) => {
    const newSelection = new Set(selectedJobs);
    if (newSelection.has(jobId)) {
      newSelection.delete(jobId);
    } else {
      newSelection.add(jobId);
    }
    setSelectedJobs(newSelection);
  };

  const selectAllJobs = () => {
    setSelectedJobs(new Set(filteredAvailableJobs.map(job => job.id)));
  };

  const clearSelection = () => {
    setSelectedJobs(new Set());
  };

  const addSelectedJobsToQueue = async () => {
    if (!selectedTeam || selectedJobs.size === 0) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "กรุณาเลือกทีมและงานที่ต้องการเพิ่มเข้าคิว",
        variant: "destructive"
      });
      return;
    }

    try {
      let priority = teamQueue.length + 1;
      for (const jobId of Array.from(selectedJobs)) {
        await addToQueueMutation.mutateAsync({
          subJobId: jobId,
          teamId: selectedTeam,
          priority: priority++
        });
      }

      setSelectedJobs(new Set());
      toast({
        title: "เพิ่มงานเข้าคิวสำเร็จ",
        description: `เพิ่ม ${selectedJobs.size} งานเข้าคิวแล้ว`,
      });
    } catch (error) {
      console.error('Failed to add jobs to queue:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มงานเข้าคิวได้",
        variant: "destructive"
      });
    }
  };

  const removeFromTeamQueue = async (queueId: string, index: number) => {
    try {
      await removeFromQueueMutation.mutateAsync(queueId);
      setTeamQueue(prev => prev.filter((_, i) => i !== index));
      
      toast({
        title: "งานถูกย้ายออกจากคิว",
        description: "งานได้กลับไปยังรายการงานที่พร้อมดำเนินการแล้ว",
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

  // Drag and drop handlers
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;

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

  const calculatePlan = () => {
    if (!selectedTeam || !teamStartDate || teamQueue.length === 0) {
      toast({
        title: "ข้อมูลไม่ครบ",
        description: "กรุณาเลือกทีม วันที่เริ่มงาน และมีงานในคิว",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "คำนวณแผนสำเร็จ",
      description: "ระบบได้คำนวณแผนการผลิตแล้ว",
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">วางแผนและคิวงาน</h1>
          <p className="text-gray-600 mt-1">จัดการลำดับงานและวางแผนการผลิต</p>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">การตั้งค่า</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">ขั้นตอนงาน</label>
                  <Select value={selectedWorkStep} onValueChange={setSelectedWorkStep}>
                    <SelectTrigger>
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
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">ทีมงาน</label>
                  <Select 
                    value={selectedTeam} 
                    onValueChange={setSelectedTeam}
                    disabled={!selectedWorkStep}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        selectedWorkStep 
                          ? "เลือกทีม" 
                          : "เลือกขั้นตอนงานก่อน"
                      } />
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
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">วันที่เริ่มงาน</label>
                  <Input
                    type="date"
                    value={teamStartDate}
                    onChange={(e) => setTeamStartDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-2 gap-6">
            {/* Left Panel - Team Queue */}
            <div className="col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-lg">คิวของทีม</CardTitle>
                    </div>
                    <Button 
                      onClick={calculatePlan}
                      size="sm"
                      disabled={!selectedTeam || !teamStartDate || teamQueue.length === 0}
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      คำนวณแผน
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Droppable droppableId="team-queue">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2 min-h-[500px]"
                      >
                        {teamQueue.map((job, index) => (
                          <Draggable key={`team-${job.id}`} draggableId={`team-${job.id}`} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 bg-white border rounded-lg cursor-grab hover:shadow-md transition-shadow ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-xs text-gray-900 line-clamp-1 flex-1">
                                    {job.customerName || "ไม่ระบุลูกค้า"} • {job.jobName || job.orderNumber} • {job.productName}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFromTeamQueue(job.id.toString(), index)}
                                    className="h-5 w-5 p-0 text-red-500 hover:text-red-700 ml-2"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <div className="text-gray-600">
                                    {formatDate(job.deliveryDate || null)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-xs px-1 py-0">
                                      {getColorName(job.colorId)}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs px-1 py-0">
                                      {getSizeName(job.sizeId)}
                                    </Badge>
                                    <span className="font-medium text-green-700">
                                      {job.quantity} ตัว
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {teamQueue.length === 0 && (
                          <div className="text-center text-gray-400 py-8">
                            <Clock className="h-12 w-12 mx-auto mb-2" />
                            <p>ยังไม่มีงานในคิว</p>
                            <p className="text-sm">เลือกงานจากด้านขวาเพื่อเพิ่มเข้าคิว</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Planning Space with Job Selection */}
            <div className="col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">งานพร้อมดำเนินการ</CardTitle>
                    {selectedJobs.size > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">เลือก {selectedJobs.size} งาน</span>
                        <Button 
                          onClick={addSelectedJobsToQueue}
                          size="sm"
                          disabled={!selectedTeam}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          เพิ่มเข้าคิว
                        </Button>
                      </div>
                    )}
                  </div>
                  {selectedWorkStep && (
                    <div className="mt-3 space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="ค้นหางาน..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectAllJobs}
                          disabled={filteredAvailableJobs.length === 0}
                        >
                          เลือกทั้งหมด
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearSelection}
                          disabled={selectedJobs.size === 0}
                        >
                          ยกเลิกการเลือก
                        </Button>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 min-h-[500px] max-h-[500px] overflow-y-auto">
                    {selectedWorkStep ? (
                      filteredAvailableJobs.length > 0 ? (
                        filteredAvailableJobs.map((job) => (
                          <div
                            key={job.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedJobs.has(job.id)
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white hover:shadow-md'
                            }`}
                            onClick={() => toggleJobSelection(job.id)}
                          >
                            <div className="text-xs text-gray-900 mb-1 line-clamp-1">
                              {job.customerName || "ไม่ระบุลูกค้า"} • {job.jobName || job.orderNumber} • {job.productName}
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="text-gray-600">
                                {formatDate(job.deliveryDate || null)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {getColorName(job.colorId || null)}
                                </Badge>
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {getSizeName(job.sizeId || null)}
                                </Badge>
                                <span className="font-medium text-green-700">
                                  {job.quantity} ตัว
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 py-8">
                          <Filter className="h-12 w-12 mx-auto mb-2" />
                          <p>ไม่พบงานที่ตรงกับเงื่อนไข</p>
                        </div>
                      )
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        <CalendarDays className="h-12 w-12 mx-auto mb-2" />
                        <p>เลือกขั้นตอนงาน</p>
                        <p className="text-sm">เพื่อดูงานที่พร้อมดำเนินการ</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}