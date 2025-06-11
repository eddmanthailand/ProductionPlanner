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
import { CalendarDays, Clock, Users, Trash2, Calculator } from "lucide-react";
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
  });

  // Update team queue when data changes
  useEffect(() => {
    setTeamQueue(currentTeamQueue);
  }, [currentTeamQueue]);

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

  // Mutations for queue management
  const addToQueueMutation = useMutation({
    mutationFn: async (data: { subJobId: number; teamId: string; priority: number }) => {
      return apiRequest(`/api/work-queues/add-job`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/team", selectedTeam] });
    }
  });

  const removeFromQueueMutation = useMutation({
    mutationFn: async (queueId: string) => {
      return apiRequest(`/api/work-queues/${queueId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-queues/team", selectedTeam] });
    }
  });

  const reorderQueueMutation = useMutation({
    mutationFn: async (data: { teamId: string; queueItems: SubJob[] }) => {
      return apiRequest(`/api/work-queues/reorder`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
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
      
      const jobToMove = availableJobs[source.index];
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
    await removeFromQueueMutation.mutateAsync(queueId);
    setTeamQueue(prev => prev.filter((_, i) => i !== index));
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

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-5 gap-6">
            {/* Left Panel - Available Jobs */}
            <div className="col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">งานที่พร้อมดำเนินการ</CardTitle>
                  </div>
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">เลือกขั้นตอนงาน</label>
                    <Select value={selectedWorkStep} onValueChange={setSelectedWorkStep}>
                      <SelectTrigger>
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
                </CardHeader>
                <CardContent>
                  <Droppable droppableId="available-jobs">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2 min-h-[400px]"
                      >
                        {selectedWorkStep && availableJobs.map((job, index) => (
                          <Draggable key={job.id} draggableId={job.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 bg-white border rounded-lg cursor-grab hover:shadow-md transition-shadow ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                }`}
                              >
                                <div className="text-sm font-medium text-blue-700 mb-1">
                                  {job.orderNumber}
                                </div>
                                <div className="text-xs text-gray-600 mb-2">
                                  {job.customerName}
                                </div>
                                <div className="text-xs text-gray-500 mb-2">
                                  กำหนดส่ง: {formatDate(job.deliveryDate)}
                                </div>
                                <div className="flex items-center gap-1 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {getColorName(job.colorId)}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {getSizeName(job.sizeId)}
                                  </Badge>
                                </div>
                                <div className="text-xs font-medium text-green-700">
                                  {job.quantity} ตัว
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

            {/* Middle Area - Planning Space */}
            <div className="col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center text-xl text-gray-600">
                    พื้นที่วางแผน
                  </CardTitle>
                  <p className="text-center text-sm text-gray-500">
                    ลากงานจากด้านซ้ายมายังทีมด้านขวา เพื่อจัดลำดับการผลิต
                  </p>
                </CardHeader>
                <CardContent className="min-h-[600px] flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Clock className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg">เลือกขั้นตอนงานและทีม</p>
                    <p className="text-sm">เพื่อเริ่มวางแผนการผลิต</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Team Queue */}
            <div className="col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg">คิวของทีม</CardTitle>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">เลือกทีม</label>
                      <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกทีม" />
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
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">วันที่เริ่มงาน</label>
                      <Input
                        type="date"
                        value={teamStartDate}
                        onChange={(e) => setTeamStartDate(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={calculatePlan}
                      className="w-full"
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
                        className="space-y-2 min-h-[400px]"
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
                                  <div className="text-sm font-medium text-blue-700">
                                    {job.orderNumber}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFromTeamQueue(job.id.toString(), index)}
                                    className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="text-xs text-gray-600 mb-2">
                                  {job.customerName}
                                </div>
                                <div className="text-xs text-gray-500 mb-2">
                                  กำหนดส่ง: {formatDate(job.deliveryDate)}
                                </div>
                                <div className="flex items-center gap-1 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {getColorName(job.colorId)}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {getSizeName(job.sizeId)}
                                  </Badge>
                                </div>
                                <div className="text-xs font-medium text-green-700">
                                  {job.quantity} ตัว
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
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}