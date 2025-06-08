import { useState } from "react";
import { GanttChart, Plus, Play, Pause, RotateCcw, Settings, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Task {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  duration: number;
  progress: number;
  assignedTo: string;
  priority: "low" | "medium" | "high";
  status: "scheduled" | "in-progress" | "completed" | "delayed";
  dependencies: string[];
  workOrder: string;
}

interface Resource {
  id: string;
  name: string;
  type: "machine" | "worker" | "material";
  availability: number;
  currentTasks: string[];
  capacity: number;
}

export default function ProductionPlanning() {
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [tasks] = useState<Task[]>([
    {
      id: "T001",
      name: "ตัดผ้าลูกไม้ 208 ชิ้น",
      startDate: "2025-06-08",
      endDate: "2025-06-09",
      duration: 2,
      progress: 100,
      assignedTo: "สมหญิง จันทร์ดี",
      priority: "high",
      status: "completed",
      dependencies: [],
      workOrder: "WO2025-001"
    },
    {
      id: "T002",
      name: "เย็บชิ้นส่วนหลัก",
      startDate: "2025-06-09",
      endDate: "2025-06-11",
      duration: 3,
      progress: 75,
      assignedTo: "สมศักดิ์ แสงทอง",
      priority: "high",
      status: "in-progress",
      dependencies: ["T001"],
      workOrder: "WO2025-001"
    },
    {
      id: "T003",
      name: "ติดซิป",
      startDate: "2025-06-11",
      endDate: "2025-06-12",
      duration: 2,
      progress: 25,
      assignedTo: "สมปอง เหลืองทอง",
      priority: "high",
      status: "in-progress",
      dependencies: ["T002"],
      workOrder: "WO2025-001"
    },
    {
      id: "T004",
      name: "โอเวอร์ล็อคขอบ",
      startDate: "2025-06-12",
      endDate: "2025-06-13",
      duration: 2,
      progress: 0,
      assignedTo: "สมปอง เหลืองทอง",
      priority: "medium",
      status: "scheduled",
      dependencies: ["T003"],
      workOrder: "WO2025-001"
    },
    {
      id: "T005",
      name: "ตรวจสอบคุณภาพ",
      startDate: "2025-06-13",
      endDate: "2025-06-14",
      duration: 1,
      progress: 0,
      assignedTo: "อัญชลี สีขาว",
      priority: "high",
      status: "scheduled",
      dependencies: ["T004"],
      workOrder: "WO2025-001"
    }
  ]);

  const [resources] = useState<Resource[]>([
    {
      id: "R001",
      name: "เครื่องตัดผ้า A",
      type: "machine",
      availability: 85,
      currentTasks: ["T001"],
      capacity: 100
    },
    {
      id: "R002",
      name: "เครื่องเย็บ B",
      type: "machine", 
      availability: 60,
      currentTasks: ["T002"],
      capacity: 100
    },
    {
      id: "R003",
      name: "ทีมผลิต A",
      type: "worker",
      availability: 75,
      currentTasks: ["T002", "T003"],
      capacity: 8
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "in-progress": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-green-100 text-green-800";
      case "delayed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "border-l-red-500 bg-red-50";
      case "medium": return "border-l-yellow-500 bg-yellow-50";
      case "low": return "border-l-green-500 bg-green-50";
      default: return "border-l-gray-500 bg-gray-50";
    }
  };

  const getProgressColor = (progress: number, status: string) => {
    if (status === "completed") return "bg-green-500";
    if (status === "delayed") return "bg-red-500";
    if (progress >= 75) return "bg-green-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const generateTimeSlots = () => {
    const slots = [];
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      slots.push(date);
    }
    return slots;
  };

  const isTaskInTimeSlot = (task: Task, date: Date) => {
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);
    const slotDate = new Date(date);
    
    return slotDate >= taskStart && slotDate <= taskEnd;
  };

  const getTaskPosition = (task: Task, date: Date) => {
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);
    const slotDate = new Date(date);
    
    if (slotDate < taskStart || slotDate > taskEnd) return null;
    
    const totalDays = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const currentDay = Math.ceil((slotDate.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      isStart: currentDay === 1,
      isEnd: currentDay === totalDays,
      isMiddle: currentDay > 1 && currentDay < totalDays,
      position: currentDay,
      total: totalDays
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <GanttChart className="w-8 h-8 text-blue-600" />
            จัดแผนและคิวงาน
          </h1>
          <p className="text-gray-600 mt-1">วางแผนและจัดลำดับการผลิต</p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">รายวัน</SelectItem>
              <SelectItem value="weekly">รายสัปดาห์</SelectItem>
              <SelectItem value="monthly">รายเดือน</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มงาน
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">งานที่กำหนดแล้ว</p>
                <p className="text-2xl font-bold text-blue-600">
                  {tasks.filter(t => t.status === 'scheduled').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">กำลังดำเนินการ</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {tasks.filter(t => t.status === 'in-progress').length}
                </p>
              </div>
              <Play className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">เสร็จสิ้น</p>
                <p className="text-2xl font-bold text-green-600">
                  {tasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
              <Settings className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">อัตราการใช้ทรัพยากร</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(resources.reduce((sum, r) => sum + (100 - r.availability), 0) / resources.length)}%
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gantt Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>แผนผังแกนท์</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                รีเซ็ต
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                ตั้งค่า
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Timeline Header */}
              <div className="grid grid-cols-8 gap-1 mb-4">
                <div className="font-medium text-gray-700 p-2">งาน</div>
                {generateTimeSlots().map((date, index) => (
                  <div key={index} className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-medium text-gray-700">
                      {date.toLocaleDateString('th-TH', { weekday: 'short' })}
                    </div>
                    <div className="text-sm text-gray-500">
                      {date.getDate()}/{date.getMonth() + 1}
                    </div>
                  </div>
                ))}
              </div>

              {/* Task Rows */}
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className="grid grid-cols-8 gap-1 items-center">
                    {/* Task Info */}
                    <div className={`p-3 border-l-4 rounded ${getPriorityColor(task.priority)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm text-gray-900">{task.name}</h4>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {task.assignedTo}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(task.progress, task.status)}`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {task.progress}%
                      </div>
                    </div>

                    {/* Timeline Bars */}
                    {generateTimeSlots().map((date, dayIndex) => {
                      const position = getTaskPosition(task, date);
                      
                      return (
                        <div key={dayIndex} className="h-16 relative">
                          {position && (
                            <div 
                              className={`absolute inset-x-1 top-2 h-8 rounded-sm ${getProgressColor(task.progress, task.status)} opacity-80 flex items-center justify-center`}
                            >
                              {position.isStart && (
                                <span className="text-xs text-white font-medium truncate px-1">
                                  {task.name}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resource Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>การใช้ทรัพยากร</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resources.map(resource => (
              <div key={resource.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{resource.name}</h4>
                  <Badge className={resource.type === 'machine' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                    {resource.type}
                  </Badge>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">การใช้งาน</span>
                    <span className="text-sm font-medium">
                      {100 - resource.availability}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${(100 - resource.availability) > 80 ? 'bg-red-500' : (100 - resource.availability) > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${100 - resource.availability}%` }}
                    />
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <div>กำลังการผลิต: {resource.capacity}</div>
                  <div>งานที่รับผิดชอบ: {resource.currentTasks.length} งาน</div>
                </div>

                {resource.currentTasks.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-700 mb-1">งานปัจจุบัน:</div>
                    <div className="space-y-1">
                      {resource.currentTasks.map(taskId => {
                        const task = tasks.find(t => t.id === taskId);
                        return task ? (
                          <div key={taskId} className="text-xs bg-gray-50 p-1 rounded">
                            {task.name}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}