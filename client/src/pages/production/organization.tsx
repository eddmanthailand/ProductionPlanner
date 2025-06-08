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

interface Team {
  id: string;
  name: string;
  departmentId: string;
  leader?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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
    status: "active"
  });
  const [newTeam, setNewTeam] = useState({
    name: "",
    leader: "",
    status: "active"
  });

  // Fetch departments from API
  const { data: departments = [], isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    refetchOnWindowFocus: false
  });

  // Fetch teams from API
  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    refetchOnWindowFocus: false
  });

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to create department");
      return response.json();
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
    mutationFn: async (data: any) => {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to create team");
      return response.json();
    },
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
      default: return "bg-gray-100 text-gray-800";
    }
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
      type: "production",
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

    createTeamMutation.mutate({
      name: newTeam.name,
      departmentId: selectedDepartmentId,
      leader: newTeam.leader || null,
      status: newTeam.status
    });
  };

  const handleCancelAddTeam = () => {
    setNewTeam({
      name: "",
      leader: "",
      status: "active"
    });
    setIsAddTeamOpen(false);
  };

  // Group teams by department
  const getTeamsByDepartment = (departmentId: string) => {
    return teams.filter(team => team.departmentId === departmentId);
  };

  const totalDepartments = departments.length;
  const totalTeams = teams.length;
  const activeDepartments = departments.filter(dept => dept.status === "active").length;

  if (departmentsLoading || teamsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Network className="h-8 w-8 text-blue-600" />
            โครงสร้างองค์กร
          </h1>
          <p className="text-gray-600 mt-2">จัดการแผนก ทีม และพนักงานในองค์กร</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsAddDepartmentOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            เพิ่มแผนก
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsAddTeamOpen(true)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            เพิ่มทีม
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">แผนกทั้งหมด</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDepartments}</div>
            <p className="text-xs text-muted-foreground">
              แผนกที่ใช้งาน {activeDepartments} แผนก
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ทีมทั้งหมด</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeams}</div>
            <p className="text-xs text-muted-foreground">
              กระจายใน {totalDepartments} แผนก
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">พนักงานทั้งหมด</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              ยังไม่มีพนักงานในระบบ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Organization Chart */}
      <div className="grid gap-6">
        {departments.map((department) => {
          const departmentTeams = getTeamsByDepartment(department.id);
          
          return (
            <Card key={department.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Settings className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{department.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge className={getDepartmentTypeColor(department.type)}>
                        {department.type}
                      </Badge>
                      <Badge className={getStatusColor(department.status)}>
                        {department.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">หัวหน้าแผนก</div>
                  <div className="font-medium">{department.manager || "ไม่ระบุ"}</div>
                  <div className="text-sm text-gray-500">{department.location}</div>
                </div>
              </div>

              {/* Teams */}
              <div className="ml-8 space-y-3">
                <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  ทีมในแผนก ({departmentTeams.length})
                </div>
                
                {departmentTeams.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {departmentTeams.map((team) => (
                      <div key={team.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{team.name}</h4>
                            <div className="text-sm text-gray-600">
                              หัวหน้าทีม: {team.leader || "ไม่ระบุ"}
                            </div>
                          </div>
                          <Badge className={getStatusColor(team.status)}>
                            {team.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm py-4">
                    ยังไม่มีทีมในแผนกนี้
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {departments.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีแผนก</h3>
            <p className="text-gray-500 mb-4">เริ่มต้นสร้างโครงสร้างองค์กรโดยเพิ่มแผนกแรก</p>
            <Button onClick={() => setIsAddDepartmentOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มแผนกแรก
            </Button>
          </div>
        </Card>
      )}

      {/* Add Department Dialog */}
      <Dialog open={isAddDepartmentOpen} onOpenChange={setIsAddDepartmentOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>เพิ่มแผนกใหม่</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="dept-name">ชื่อแผนก *</label>
              <Input
                id="dept-name"
                value={newDepartment.name}
                onChange={(e) => setNewDepartment(prev => ({ ...prev, name: e.target.value }))}
                placeholder="เช่น แผนกผลิต"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="dept-manager">หัวหน้าแผนก</label>
              <Input
                id="dept-manager"
                value={newDepartment.manager}
                onChange={(e) => setNewDepartment(prev => ({ ...prev, manager: e.target.value }))}
                placeholder="ไม่บังคับ"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="dept-location">สถานที่ *</label>
              <Input
                id="dept-location"
                value={newDepartment.location}
                onChange={(e) => setNewDepartment(prev => ({ ...prev, location: e.target.value }))}
                placeholder="เช่น อาคาร A ชั้น 2"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="dept-status">สถานะ</label>
              <Select value={newDepartment.status} onValueChange={(value) => setNewDepartment(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ใช้งาน</SelectItem>
                  <SelectItem value="maintenance">บำรุงรักษา</SelectItem>
                  <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleAddDepartment}
              disabled={createDepartmentMutation.isPending}
              className="flex-1"
            >
              {createDepartmentMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
            <Button variant="outline" onClick={handleCancelAddDepartment} className="flex-1">
              ยกเลิก
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Team Dialog */}
      <Dialog open={isAddTeamOpen} onOpenChange={setIsAddTeamOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>เพิ่มทีมใหม่</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="team-dept">แผนก *</label>
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกแผนก" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="team-name">ชื่อทีม *</label>
              <Input
                id="team-name"
                value={newTeam.name}
                onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                placeholder="เช่น ทีมผลิตเสื้อผ้า"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="team-leader">หัวหน้าทีม</label>
              <Input
                id="team-leader"
                value={newTeam.leader}
                onChange={(e) => setNewTeam(prev => ({ ...prev, leader: e.target.value }))}
                placeholder="ไม่บังคับ"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="team-status">สถานะ</label>
              <Select value={newTeam.status} onValueChange={(value) => setNewTeam(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ใช้งาน</SelectItem>
                  <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleAddTeam}
              disabled={createTeamMutation.isPending}
              className="flex-1"
            >
              {createTeamMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
            <Button variant="outline" onClick={handleCancelAddTeam} className="flex-1">
              ยกเลิก
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}