import { useState } from "react";
import { Network, Users, Settings, Plus, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Department {
  id: string;
  name: string;
  type: "production" | "quality" | "management" | "support";
  manager: string;
  location: string;
  status: "active" | "maintenance" | "inactive";
  teams: Team[];
  workSteps: WorkStep[];
}

interface Team {
  id: string;
  name: string;
  departmentId: string;
  leader: string;
  employees: Employee[];
  status: "active" | "inactive";
}

interface Employee {
  id: string;
  name: string;
  position: string;
  skill: string[];
  status: "available" | "busy" | "break" | "absent";
  workload: number;
}

interface WorkStep {
  id: string;
  name: string;
  departmentId: string;
  description: string;
  duration: number; // minutes
  requiredSkills: string[];
  order: number;
}

export default function OrganizationChart() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDepartmentOpen, setIsAddDepartmentOpen] = useState(false);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [newDepartment, setNewDepartment] = useState({
    name: "",
    manager: "",
    location: "",
    status: "active" as "active" | "maintenance" | "inactive"
  });
  const [newTeam, setNewTeam] = useState({
    name: "",
    leader: "",
    status: "active" as "active" | "inactive"
  });

  // Fetch departments from API
  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["/api/departments"],
    refetchOnWindowFocus: false
  });

  // Fetch teams from API
  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    refetchOnWindowFocus: false
  });

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/departments", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsAddDepartmentOpen(false);
      setNewDepartment({
        name: "",
        manager: "",
        location: "",
        status: "active"
      });
      toast({
        title: "สำเร็จ",
        description: "เพิ่มแผนกใหม่เรียบร้อยแล้ว"
      });
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มแผนกได้",
        variant: "destructive"
      });
    }
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/teams", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setIsAddTeamOpen(false);
      setNewTeam({
        name: "",
        leader: "",
        status: "active"
      });
      toast({
        title: "สำเร็จ",
        description: "เพิ่มทีมใหม่เรียบร้อยแล้ว"
      });
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มทีมได้",
        variant: "destructive"
      });
    }
  });

  const getDepartmentTypeColor = (type: string) => {
    switch (type) {
      case "production": return "bg-blue-100 text-blue-800";
      case "quality": return "bg-green-100 text-green-800";
      case "management": return "bg-purple-100 text-purple-800";
      case "support": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "maintenance": return "bg-yellow-100 text-yellow-800";
      case "inactive": return "bg-red-100 text-red-800";
      case "available": return "bg-green-100 text-green-800";
      case "busy": return "bg-red-100 text-red-800";
      case "break": return "bg-yellow-100 text-yellow-800";
      case "absent": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getWorkloadColor = (workload: number) => {
    if (workload >= 80) return "bg-red-500";
    if (workload >= 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  const handleAddDepartment = () => {
    if (!newDepartment.name.trim() || !newDepartment.location.trim()) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกชื่อแผนกและสถานที่",
        variant: "destructive"
      });
      return;
    }

    createDepartmentMutation.mutate({
      name: newDepartment.name,
      type: "production", // Default type
      manager: newDepartment.manager || null,
      location: newDepartment.location,
      status: newDepartment.status
    });
  };

  const handleCancelAddDepartment = () => {
    setNewDepartment({
      name: "",
      manager: "",
      location: "",
      status: "active"
    });
    setIsAddDepartmentOpen(false);
  };

  const handleAddTeam = () => {
    if (!newTeam.name.trim() || !selectedDepartmentId) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกชื่อทีมและเลือกแผนก",
        variant: "destructive"
      });
      return;
    }

    const team: Team = {
      id: `team-${Date.now()}`,
      name: newTeam.name,
      departmentId: selectedDepartmentId,
      leader: newTeam.leader,
      status: newTeam.status,
      employees: []
    };

    setDepartments(prev => prev.map(dept => 
      dept.id === selectedDepartmentId 
        ? { ...dept, teams: [...dept.teams, team] }
        : dept
    ));

    setNewTeam({
      name: "",
      leader: "",
      status: "active"
    });
    setSelectedDepartmentId("");
    setIsAddTeamOpen(false);

    toast({
      title: "สำเร็จ",
      description: "เพิ่มทีมใหม่เรียบร้อยแล้ว"
    });
  };

  const handleCancelAddTeam = () => {
    setNewTeam({
      name: "",
      leader: "",
      status: "active"
    });
    setSelectedDepartmentId("");
    setIsAddTeamOpen(false);
  };

  const openAddTeamDialog = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    setIsAddTeamOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Network className="w-8 h-8 text-blue-600" />
            แผนผังหน่วยงาน
          </h1>
          <p className="text-gray-600 mt-1">จัดการโครงสร้างองค์กรและทรัพยากรบุคคล</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setIsAddDepartmentOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มแผนก
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">จำนวนแผนก</p>
                <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
              </div>
              <Network className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">จำนวนทีม</p>
                <p className="text-2xl font-bold text-gray-900">
                  {departments.reduce((total, dept) => total + dept.teams.length, 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">พนักงานทั้งหมด</p>
                <p className="text-2xl font-bold text-green-600">
                  {departments.reduce((total, dept) => 
                    total + dept.teams.reduce((teamTotal, team) => teamTotal + team.employees.length, 0), 0
                  )}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ขั้นตอนงานทั้งหมด</p>
                <p className="text-2xl font-bold text-orange-600">
                  {departments.reduce((total, dept) => total + dept.workSteps.length, 0)}
                </p>
              </div>
              <Settings className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Cards */}
      <div className="space-y-8">
        {departments.map(department => (
          <Card key={department.id} className="overflow-hidden">
            <CardHeader className="bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {department.name}
                    <Badge className={getDepartmentTypeColor(department.type)}>
                      {department.type}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    หัวหน้า: {department.manager} | {department.location}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(department.status)}>
                    {department.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Teams Section */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">ทีมงาน ({department.teams.length} ทีม)</h3>
                  <div className="space-y-4">
                    {department.teams.map(team => (
                      <div key={team.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">{team.name}</h4>
                          <Badge className={getStatusColor(team.status)}>
                            {team.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">หัวหน้าทีม: {team.leader}</p>
                        
                        <div className="space-y-2">
                          {team.employees.map(employee => (
                            <div key={employee.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{employee.name}</span>
                                  <Badge className={getStatusColor(employee.status)} variant="outline">
                                    {employee.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600">{employee.position}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-medium text-gray-900">
                                  {employee.workload}%
                                </div>
                                <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-300 ${getWorkloadColor(employee.workload)}`}
                                    style={{ width: `${employee.workload}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Work Steps Section */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">ขั้นตอนงาน ({department.workSteps.length} ขั้นตอน)</h3>
                  <div className="space-y-3">
                    {department.workSteps
                      .sort((a, b) => a.order - b.order)
                      .map(step => (
                        <div key={step.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                                {step.order}
                              </span>
                              <h4 className="font-medium text-gray-900">{step.name}</h4>
                            </div>
                            <span className="text-xs text-gray-500">{step.duration} นาที</span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                          
                          <div className="flex flex-wrap gap-1">
                            {step.requiredSkills.map(skill => (
                              <span key={skill} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6 pt-4 border-t">
                <Button variant="outline" className="w-full" onClick={() => openAddTeamDialog(department.id)}>
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มทีม
                </Button>
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มขั้นตอนงาน
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Organization Tree View */}
      <Card>
        <CardHeader>
          <CardTitle>โครงสร้างองค์กร</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-block p-4 bg-purple-100 rounded-lg">
                <h3 className="font-bold text-purple-800">ผู้จัดการโรงงาน</h3>
                <p className="text-sm text-purple-600">อำนาจ ใจดี</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {departments.map(dept => (
                <div key={dept.id} className="text-center">
                  <div className="inline-block p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <h4 className="font-semibold text-blue-800">{dept.name}</h4>
                    <p className="text-sm text-blue-600">{dept.manager}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {dept.teams.reduce((total, team) => total + team.employees.length, 0)} คน
                    </p>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    {dept.teams.map(team => (
                      <div key={team.id} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium">{team.name}</div>
                        <div className="text-gray-600 text-xs">หัวหน้า: {team.leader}</div>
                        <div className="text-gray-500 text-xs">{team.employees.length} คน</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Department Dialog */}
      <Dialog open={isAddDepartmentOpen} onOpenChange={setIsAddDepartmentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มแผนกใหม่</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">ชื่อแผนก</label>
              <Input
                value={newDepartment.name}
                onChange={(e) => setNewDepartment(prev => ({ ...prev, name: e.target.value }))}
                placeholder="กรอกชื่อแผนก"
                className="mt-1"
              />
            </div>
            

            
            <div>
              <label className="text-sm font-medium text-gray-700">หัวหน้าแผนก</label>
              <Input
                value={newDepartment.manager}
                onChange={(e) => setNewDepartment(prev => ({ ...prev, manager: e.target.value }))}
                placeholder="กรอกชื่อหัวหน้าแผนก"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">สถานที่</label>
              <Input
                value={newDepartment.location}
                onChange={(e) => setNewDepartment(prev => ({ ...prev, location: e.target.value }))}
                placeholder="กรอกสถานที่ตั้งแผนก"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">สถานะ</label>
              <Select 
                value={newDepartment.status} 
                onValueChange={(value: any) => setNewDepartment(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ใช้งาน</SelectItem>
                  <SelectItem value="maintenance">บำรุงรักษา</SelectItem>
                  <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancelAddDepartment}>
                <X className="w-4 h-4 mr-2" />
                ยกเลิก
              </Button>
              <Button onClick={handleAddDepartment}>
                <Save className="w-4 h-4 mr-2" />
                บันทึก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Team Dialog */}
      <Dialog open={isAddTeamOpen} onOpenChange={setIsAddTeamOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มทีมใหม่</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">แผนก</label>
              <Input
                value={departments.find(d => d.id === selectedDepartmentId)?.name || ""}
                disabled
                className="mt-1 bg-gray-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">ชื่อทีม</label>
              <Input
                value={newTeam.name}
                onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                placeholder="กรอกชื่อทีม"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">หัวหน้าทีม</label>
              <Input
                value={newTeam.leader}
                onChange={(e) => setNewTeam(prev => ({ ...prev, leader: e.target.value }))}
                placeholder="กรอกชื่อหัวหน้าทีม (ไม่จำเป็น)"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">สถานะ</label>
              <Select 
                value={newTeam.status} 
                onValueChange={(value: any) => setNewTeam(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ใช้งาน</SelectItem>
                  <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancelAddTeam}>
                <X className="w-4 h-4 mr-2" />
                ยกเลิก
              </Button>
              <Button onClick={handleAddTeam}>
                <Save className="w-4 h-4 mr-2" />
                บันทึก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}