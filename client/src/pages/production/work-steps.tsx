import { useState } from "react";
import { Settings, Plus, Edit2, Trash2, Clock, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Department {
  id: string;
  name: string;
  type: string;
  manager?: string;
  location: string;
  status: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkStep {
  id: string;
  name: string;
  department_id: string;
  description?: string;
  duration: number; // in minutes
  required_skills: string[];
  order: number;
  created_at: string;
  updated_at: string;
}

interface Team {
  id: string;
  name: string;
  departmentId: string;
  leader?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function WorkStepsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWorkStep, setEditingWorkStep] = useState<WorkStep | null>(null);
  
  const [newWorkStep, setNewWorkStep] = useState({
    name: "",
    department_id: "",
    description: "",
    duration: 60,
    required_skills: ["basic"],
    order: 1
  });

  // Fetch departments
  const { data: departments = [], isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    refetchOnWindowFocus: false
  });

  // Fetch work steps
  const { data: workSteps = [], isLoading: workStepsLoading } = useQuery<WorkStep[]>({
    queryKey: ["/api/work-steps"],
    refetchOnWindowFocus: false
  });

  // Fetch teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    refetchOnWindowFocus: false
  });

  // Create work step mutation
  const createWorkStepMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/work-steps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to create work step");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-steps"] });
      setIsCreateDialogOpen(false);
      setNewWorkStep({
        name: "",
        departmentId: "",
        description: "",
        estimatedDuration: 60,
        skillRequired: "basic",
        sortOrder: 1
      });
      toast({
        title: "สำเร็จ",
        description: "สร้างขั้นตอนงานใหม่เรียบร้อยแล้ว"
      });
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถสร้างขั้นตอนงานได้",
        variant: "destructive"
      });
    }
  });

  // Update work step mutation
  const updateWorkStepMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/work-steps/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to update work step");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-steps"] });
      setIsEditDialogOpen(false);
      setEditingWorkStep(null);
      toast({
        title: "สำเร็จ",
        description: "แก้ไขขั้นตอนงานเรียบร้อยแล้ว"
      });
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขขั้นตอนงานได้",
        variant: "destructive"
      });
    }
  });

  // Delete work step mutation
  const deleteWorkStepMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/work-steps/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error("Failed to delete work step");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-steps"] });
      toast({
        title: "สำเร็จ",
        description: "ลบขั้นตอนงานเรียบร้อยแล้ว"
      });
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถลบขั้นตอนงานได้",
        variant: "destructive"
      });
    }
  });

  const handleCreateWorkStep = () => {
    createWorkStepMutation.mutate(newWorkStep);
  };

  const handleUpdateWorkStep = () => {
    if (!editingWorkStep) return;
    updateWorkStepMutation.mutate({
      id: editingWorkStep.id,
      data: editingWorkStep
    });
  };

  const handleEditWorkStep = (workStep: WorkStep) => {
    setEditingWorkStep(workStep);
    setIsEditDialogOpen(true);
  };

  const handleDeleteWorkStep = (id: string) => {
    if (confirm("คุณต้องการลบขั้นตอนงานนี้หรือไม่?")) {
      deleteWorkStepMutation.mutate(id);
    }
  };

  // Filter work steps by selected department
  const filteredWorkSteps = selectedDepartment 
    ? workSteps.filter(ws => ws.departmentId === selectedDepartment)
    : workSteps;

  // Group work steps by department
  const workStepsByDepartment = departments.reduce((acc, dept) => {
    acc[dept.id] = workSteps.filter(ws => ws.departmentId === dept.id);
    return acc;
  }, {} as Record<string, WorkStep[]>);

  const getTeamsInDepartment = (departmentId: string) => {
    return teams.filter(team => team.departmentId === departmentId);
  };

  const getSkillLevelBadge = (skill: string) => {
    const colors = {
      basic: "bg-green-100 text-green-800",
      intermediate: "bg-yellow-100 text-yellow-800",
      advanced: "bg-red-100 text-red-800",
      expert: "bg-purple-100 text-purple-800"
    };
    return colors[skill as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} นาที`;
    if (mins === 0) return `${hours} ชั่วโมง`;
    return `${hours} ชม. ${mins} นาที`;
  };

  if (departmentsLoading || workStepsLoading || teamsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ขั้นตอนการทำงาน</h1>
          <p className="text-gray-600 mt-2">จัดการขั้นตอนงานในแต่ละแผนกเพื่อการวางแผนการผลิต</p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มขั้นตอนงาน
        </Button>
      </div>

      {/* Department Filter */}
      <div className="flex space-x-4">
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="เลือกแผนก" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">แผนกทั้งหมด</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Work Steps by Department */}
      <div className="space-y-8">
        {departments.map((department) => {
          const deptWorkSteps = workStepsByDepartment[department.id] || [];
          const deptTeams = getTeamsInDepartment(department.id);
          
          if (selectedDepartment && selectedDepartment !== department.id) return null;

          return (
            <Card key={department.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl text-gray-900">{department.name}</CardTitle>
                    <p className="text-gray-600 mt-1">
                      {deptWorkSteps.length} ขั้นตอน | {deptTeams.length} ทีม
                    </p>
                  </div>
                  <Badge variant="outline" className="text-blue-600">
                    {department.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {deptWorkSteps.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>ยังไม่มีขั้นตอนงานในแผนกนี้</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        setNewWorkStep({ ...newWorkStep, departmentId: department.id });
                        setIsCreateDialogOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      เพิ่มขั้นตอนแรก
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deptWorkSteps
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((workStep) => (
                        <div
                          key={workStep.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-semibold text-gray-900">{workStep.name}</h3>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditWorkStep(workStep)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteWorkStep(workStep.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {workStep.description && (
                            <p className="text-gray-600 text-sm mb-3">{workStep.description}</p>
                          )}

                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-2" />
                              {formatDuration(workStep.estimatedDuration)}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Badge className={getSkillLevelBadge(workStep.skillRequired)}>
                                {workStep.skillRequired === 'basic' && 'เบื้องต้น'}
                                {workStep.skillRequired === 'intermediate' && 'ปานกลาง'}
                                {workStep.skillRequired === 'advanced' && 'สูง'}
                                {workStep.skillRequired === 'expert' && 'ผู้เชี่ยวชาญ'}
                              </Badge>
                              
                              <Badge variant={workStep.isActive ? "default" : "secondary"}>
                                {workStep.isActive ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    ใช้งาน
                                  </>
                                ) : (
                                  'ปิดใช้งาน'
                                )}
                              </Badge>
                            </div>

                            <div className="text-xs text-gray-500 flex justify-between">
                              <span>ลำดับ: {workStep.sortOrder}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Work Step Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มขั้นตอนงานใหม่</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ชื่อขั้นตอน</Label>
              <Input
                value={newWorkStep.name}
                onChange={(e) => setNewWorkStep({ ...newWorkStep, name: e.target.value })}
                placeholder="เช่น การตัดผ้า, การเย็บชิ้นส่วน"
              />
            </div>

            <div>
              <Label>แผนก</Label>
              <Select 
                value={newWorkStep.departmentId} 
                onValueChange={(value) => setNewWorkStep({ ...newWorkStep, departmentId: value })}
              >
                <SelectTrigger>
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

            <div>
              <Label>รายละเอียด</Label>
              <Textarea
                value={newWorkStep.description}
                onChange={(e) => setNewWorkStep({ ...newWorkStep, description: e.target.value })}
                placeholder="อธิบายรายละเอียดของขั้นตอนนี้"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>เวลาโดยประมาณ (นาที)</Label>
                <Input
                  type="number"
                  value={newWorkStep.estimatedDuration}
                  onChange={(e) => setNewWorkStep({ ...newWorkStep, estimatedDuration: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>

              <div>
                <Label>ลำดับ</Label>
                <Input
                  type="number"
                  value={newWorkStep.sortOrder}
                  onChange={(e) => setNewWorkStep({ ...newWorkStep, sortOrder: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
            </div>

            <div>
              <Label>ระดับทักษะที่ต้องการ</Label>
              <Select 
                value={newWorkStep.skillRequired} 
                onValueChange={(value) => setNewWorkStep({ ...newWorkStep, skillRequired: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">เบื้องต้น</SelectItem>
                  <SelectItem value="intermediate">ปานกลาง</SelectItem>
                  <SelectItem value="advanced">สูง</SelectItem>
                  <SelectItem value="expert">ผู้เชี่ยวชาญ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button 
                onClick={handleCreateWorkStep}
                disabled={!newWorkStep.name || !newWorkStep.departmentId}
              >
                เพิ่มขั้นตอน
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Work Step Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขขั้นตอนงาน</DialogTitle>
          </DialogHeader>
          {editingWorkStep && (
            <div className="space-y-4">
              <div>
                <Label>ชื่อขั้นตอน</Label>
                <Input
                  value={editingWorkStep.name}
                  onChange={(e) => setEditingWorkStep({ ...editingWorkStep, name: e.target.value })}
                />
              </div>

              <div>
                <Label>รายละเอียด</Label>
                <Textarea
                  value={editingWorkStep.description || ""}
                  onChange={(e) => setEditingWorkStep({ ...editingWorkStep, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>เวลาโดยประมาณ (นาที)</Label>
                  <Input
                    type="number"
                    value={editingWorkStep.estimatedDuration}
                    onChange={(e) => setEditingWorkStep({ ...editingWorkStep, estimatedDuration: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>

                <div>
                  <Label>ลำดับ</Label>
                  <Input
                    type="number"
                    value={editingWorkStep.sortOrder}
                    onChange={(e) => setEditingWorkStep({ ...editingWorkStep, sortOrder: parseInt(e.target.value) || 1 })}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <Label>ระดับทักษะที่ต้องการ</Label>
                <Select 
                  value={editingWorkStep.skillRequired} 
                  onValueChange={(value) => setEditingWorkStep({ ...editingWorkStep, skillRequired: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">เบื้องต้น</SelectItem>
                    <SelectItem value="intermediate">ปานกลาง</SelectItem>
                    <SelectItem value="advanced">สูง</SelectItem>
                    <SelectItem value="expert">ผู้เชี่ยวชาญ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingWorkStep.isActive}
                  onChange={(e) => setEditingWorkStep({ ...editingWorkStep, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActive">ใช้งานขั้นตอนนี้</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button onClick={handleUpdateWorkStep}>
                  บันทึกการแก้ไข
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}