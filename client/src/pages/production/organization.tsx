import { useState } from "react";
import { Network, Users, Settings, Plus, Edit2, Save, X, Trash2, UserPlus, DollarSign, Clock, CheckCircle } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

interface Employee {
  id: string;
  teamId: string;
  tenantId: string;
  count: number;
  averageWage: string;
  overheadPercentage: string;
  managementPercentage: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkStep {
  id: string;
  name: string;
  departmentId: string;
  description?: string;
  duration: number;
  requiredSkills: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export default function OrganizationChart() {
  const { toast } = useToast();
  const { canAccess } = usePermissions();
  const queryClient = useQueryClient();
  const [isAddDepartmentOpen, setIsAddDepartmentOpen] = useState(false);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [isEditDepartmentOpen, setIsEditDepartmentOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
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
  const [newEmployee, setNewEmployee] = useState({
    count: 1,
    averageWage: "",
    overheadPercentage: "",
    managementPercentage: "",
    description: "",
    status: "active"
  });

  // Work Steps state
  const [isAddWorkStepOpen, setIsAddWorkStepOpen] = useState(false);
  const [isEditWorkStepOpen, setIsEditWorkStepOpen] = useState(false);
  const [editingWorkStep, setEditingWorkStep] = useState<WorkStep | null>(null);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [newWorkStep, setNewWorkStep] = useState({
    name: "",
    department_id: "",
    description: ""
  });

  // Delete confirmation dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'department' | 'team' | 'employee' | 'workstep'>('department');
  const [deleteTarget, setDeleteTarget] = useState<string>('');
  const [deleteTargetName, setDeleteTargetName] = useState<string>('');

  // Fetch departments from API
  const { data: departments = [], isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await fetch("/api/departments", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch departments");
      return response.json();
    },
    refetchOnWindowFocus: false
  });

  // Fetch teams from API
  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      const response = await fetch("/api/teams", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch teams");
      return response.json();
    },
    refetchOnWindowFocus: false
  });

  // Fetch employees from API
  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch("/api/employees", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    },
    refetchOnWindowFocus: false
  });

  // Fetch work steps from API
  const { data: workSteps = [], isLoading: workStepsLoading } = useQuery<WorkStep[]>({
    queryKey: ["/api/work-steps"],
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

  // Update department mutation
  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/departments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to update department");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsEditDepartmentOpen(false);
      setEditingDepartment(null);
      toast({
        title: "สำเร็จ",
        description: "แก้ไขแผนกเรียบร้อยแล้ว"
      });
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขแผนกได้",
        variant: "destructive"
      });
    }
  });

  // Delete department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/departments/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to delete department");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "สำเร็จ",
        description: "ลบแผนกเรียบร้อยแล้ว"
      });
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถลบแผนกได้",
        variant: "destructive"
      });
    }
  });

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/teams/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to update team");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setIsEditTeamOpen(false);
      setEditingTeam(null);
      toast({
        title: "สำเร็จ",
        description: "แก้ไขทีมเรียบร้อยแล้ว"
      });
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขทีมได้",
        variant: "destructive"
      });
    }
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/teams/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to delete team");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "สำเร็จ",
        description: "ลบทีมเรียบร้อยแล้ว"
      });
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถลบทีมได้",
        variant: "destructive"
      });
    }
  });

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to create employee");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsAddEmployeeOpen(false);
      setNewEmployee({
        count: 1,
        averageWage: "",
        overheadPercentage: "",
        managementPercentage: "",
        description: "",
        status: "active"
      });
      toast({
        title: "สำเร็จ",
        description: "เพิ่มพนักงานใหม่เรียบร้อยแล้ว"
      });
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มพนักงานได้",
        variant: "destructive"
      });
    }
  });

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to update employee");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsEditEmployeeOpen(false);
      setEditingEmployee(null);
      toast({
        title: "สำเร็จ",
        description: "แก้ไขข้อมูลพนักงานเรียบร้อยแล้ว"
      });
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขข้อมูลพนักงานได้",
        variant: "destructive"
      });
    }
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to delete employee");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "สำเร็จ",
        description: "ลบข้อมูลพนักงานเรียบร้อยแล้ว"
      });
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถลบข้อมูลพนักงานได้",
        variant: "destructive"
      });
    }
  });

  // Work Steps Mutations
  const createWorkStepMutation = useMutation({
    mutationFn: async (data: any) => {
      // Add default values for required fields and map field names to match server schema
      const workStepData = {
        name: data.name,
        departmentId: data.department_id, // Map to server field name
        description: data.description,
        duration: 60, // Default 60 minutes
        requiredSkills: ["basic"], // Default basic skill, map to server field name
        order: 1 // Default order
      };
      
      const response = await fetch("/api/work-steps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(workStepData)
      });
      if (!response.ok) throw new Error("Failed to create work step");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-steps"] });
      setIsAddWorkStepOpen(false);
      setNewWorkStep({
        name: "",
        department_id: "",
        description: ""
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

  const updateWorkStepMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/work-steps/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to update work step");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-steps"] });
      setIsEditWorkStepOpen(false);
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

  const deleteWorkStepMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/work-steps/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
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

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setIsEditDepartmentOpen(true);
  };

  const handleUpdateDepartment = () => {
    if (!editingDepartment) return;
    
    updateDepartmentMutation.mutate({
      id: editingDepartment.id,
      data: {
        name: editingDepartment.name,
        manager: editingDepartment.manager || null,
        location: editingDepartment.location,
        status: editingDepartment.status
      }
    });
  };

  const handleDeleteDepartment = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    setDeleteType('department');
    setDeleteTarget(departmentId);
    setDeleteTargetName(department?.name || '');
    setDeleteConfirmOpen(true);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setIsEditTeamOpen(true);
  };

  const handleUpdateTeam = () => {
    if (!editingTeam) return;
    
    updateTeamMutation.mutate({
      id: editingTeam.id,
      data: {
        name: editingTeam.name,
        leader: editingTeam.leader || null,
        status: editingTeam.status
      }
    });
  };

  const handleDeleteTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    setDeleteType('team');
    setDeleteTarget(teamId);
    setDeleteTargetName(team?.name || '');
    setDeleteConfirmOpen(true);
  };

  const handleAddEmployee = (teamId: string) => {
    setSelectedTeamId(teamId);
    setIsAddEmployeeOpen(true);
  };

  const handleCreateEmployee = () => {
    if (!selectedTeamId) return;
    
    createEmployeeMutation.mutate({
      teamId: selectedTeamId,
      count: newEmployee.count,
      averageWage: newEmployee.averageWage,
      overheadPercentage: newEmployee.overheadPercentage,
      managementPercentage: newEmployee.managementPercentage,
      description: newEmployee.description,
      status: newEmployee.status
    });
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsEditEmployeeOpen(true);
  };

  const handleUpdateEmployee = () => {
    if (!editingEmployee) return;
    
    updateEmployeeMutation.mutate({
      id: editingEmployee.id,
      data: {
        count: editingEmployee.count,
        averageWage: editingEmployee.averageWage,
        overheadPercentage: editingEmployee.overheadPercentage,
        managementPercentage: editingEmployee.managementPercentage,
        description: editingEmployee.description,
        status: editingEmployee.status
      }
    });
  };

  const handleDeleteEmployee = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    setDeleteType('employee');
    setDeleteTarget(employeeId);
    setDeleteTargetName(`พนักงาน ${employee?.count} คน`);
    setDeleteConfirmOpen(true);
  };

  // Calculate daily cost function
  const calculateDailyCost = (count: number, wage: number, overhead: number, management: number) => {
    if (!count || !wage || overhead === undefined || management === undefined) return 0;
    
    const baseCost = count * wage;
    const overheadCost = baseCost * (overhead / 100);
    const totalWithOverhead = baseCost + overheadCost;
    const managementCost = totalWithOverhead * (management / 100);
    const totalCost = totalWithOverhead + managementCost;
    
    return totalCost;
  };

  // Group teams by department
  const getTeamsByDepartment = (departmentId: string) => {
    return teams.filter(team => team.departmentId === departmentId);
  };

  // Get employees by team
  const getEmployeesByTeam = (teamId: string) => {
    return employees.filter(employee => employee.teamId === teamId);
  };

  // Work Steps functions
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} นาที`;
    if (mins === 0) return `${hours} ชั่วโมง`;
    return `${hours} ชม. ${mins} นาที`;
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

  const getWorkStepsForDepartment = (departmentId: string) => {
    return workSteps.filter(ws => ws.departmentId === departmentId).sort((a, b) => a.order - b.order);
  };

  const toggleDepartmentExpansion = (departmentId: string) => {
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(departmentId)) {
        newSet.delete(departmentId);
      } else {
        newSet.add(departmentId);
      }
      return newSet;
    });
  };

  // Handle delete confirmation
  const handleConfirmDelete = () => {
    switch (deleteType) {
      case 'department':
        deleteDepartmentMutation.mutate(deleteTarget);
        break;
      case 'team':
        deleteTeamMutation.mutate(deleteTarget);
        break;
      case 'employee':
        deleteEmployeeMutation.mutate(deleteTarget);
        break;
      case 'workstep':
        deleteWorkStepMutation.mutate(deleteTarget);
        break;
    }
    setDeleteConfirmOpen(false);
    setDeleteTarget('');
    setDeleteTargetName('');
  };

  const totalDepartments = departments.length;
  const totalTeams = teams.length;
  const activeDepartments = departments.filter(dept => dept.status === "active").length;
  const totalEmployees = employees.reduce((sum, emp) => sum + emp.count, 0);
  const totalDailyCost = employees.reduce((sum, emp) => {
    return sum + calculateDailyCost(
      emp.count,
      parseFloat(emp.averageWage) || 0,
      parseFloat(emp.overheadPercentage) || 0,
      parseFloat(emp.managementPercentage) || 0
    );
  }, 0);

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
          {canAccess("organization", "create") && (
            <Button
              onClick={() => setIsAddDepartmentOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              เพิ่มแผนก
            </Button>
          )}
          {canAccess("organization", "create") && (
            <Button
              variant="outline"
              onClick={() => setIsAddTeamOpen(true)}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              เพิ่มทีม
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {totalEmployees > 0 ? `กระจายอยู่ใน ${totalTeams} ทีม` : "ยังไม่มีพนักงานในระบบ"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ต้นทุนรวม/วัน</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDailyCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              บาทต่อวัน (รวมทุกค่าใช้จ่าย)
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
                <div className="flex items-center gap-2">
                  <div className="text-right mr-4">
                    <div className="text-sm text-gray-600">หัวหน้าแผนก</div>
                    <div className="font-medium">{department.manager || "ไม่ระบุ"}</div>
                    <div className="text-sm text-gray-500">{department.location}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleDepartmentExpansion(department.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditDepartment(department)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDepartment(department.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Work Steps Section - Only show when expanded */}
              {expandedDepartments.has(department.id) && (
                <div className="ml-8 mb-6 space-y-3">
                  <div className="text-sm font-medium text-gray-700 flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      ขั้นตอนการทำงาน ({getWorkStepsForDepartment(department.id).length})
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewWorkStep({ ...newWorkStep, department_id: department.id });
                        setIsAddWorkStepOpen(true);
                      }}
                      className="h-7 px-3 text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      เพิ่มขั้นตอน
                    </Button>
                  </div>

                  {getWorkStepsForDepartment(department.id).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getWorkStepsForDepartment(department.id).map((workStep) => (
                        <div
                          key={workStep.id}
                          className="border rounded-lg p-4 bg-blue-50 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-medium text-gray-900">{workStep.name}</h4>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingWorkStep(workStep);
                                  setIsEditWorkStepOpen(true);
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeleteType('workstep');
                                  setDeleteTarget(workStep.id);
                                  setDeleteTargetName(workStep.name);
                                  setDeleteConfirmOpen(true);
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {workStep.description && (
                            <p className="text-gray-600 text-sm mb-3">{workStep.description}</p>
                          )}

                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="h-4 w-4 mr-2" />
                              {formatDuration(workStep.duration)}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Badge className={getSkillLevelBadge(workStep.requiredSkills?.[0] || 'basic')}>
                                {(() => {
                                  const skill = workStep.requiredSkills?.[0] || 'basic';
                                  switch(skill) {
                                    case 'basic': return 'เบื้องต้น';
                                    case 'intermediate': return 'ปานกลาง';
                                    case 'advanced': return 'สูง';
                                    case 'expert': return 'ผู้เชี่ยวชาญ';
                                    default: return 'เบื้องต้น';
                                  }
                                })()}
                              </Badge>
                              
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                ลำดับ: {workStep.order}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                      <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>ยังไม่มีขั้นตอนงานในแผนกนี้</p>
                    </div>
                  )}
                </div>
              )}

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
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(team.status)}>
                              {team.status}
                            </Badge>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTeam(team)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteTeam(team.id)}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Employee Section */}
                        <div className="mt-3 border-t pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium text-gray-700 flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              พนักงานในทีม ({getEmployeesByTeam(team.id).length})
                            </h5>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddEmployee(team.id)}
                              className="border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 h-7 px-3"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              เพิ่มพนักงาน
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            {getEmployeesByTeam(team.id).length > 0 ? (
                              getEmployeesByTeam(team.id).map((employee) => (
                                <div key={employee.id} className="border rounded p-3 bg-blue-50/30">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-800">
                                        จำนวน: {employee.count} คน
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        ค่าแรงเฉลี่ย: {employee.averageWage} บาท/คน
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        Overhead: {employee.overheadPercentage}% | Management: {employee.managementPercentage}%
                                      </div>
                                      <div className="text-sm font-medium text-green-600 mt-1">
                                        ต้นทุนต่อวัน: {calculateDailyCost(
                                          employee.count,
                                          parseFloat(employee.averageWage) || 0,
                                          parseFloat(employee.overheadPercentage) || 0,
                                          parseFloat(employee.managementPercentage) || 0
                                        ).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                                      </div>
                                      {employee.description && (
                                        <div className="text-xs text-gray-500 mt-1 italic">{employee.description}</div>
                                      )}
                                    </div>
                                    <div className="flex gap-1 ml-3">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditEmployee(employee)}
                                        className="h-6 w-6 p-0 hover:bg-blue-100"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteEmployee(employee.id)}
                                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-4 text-gray-500 text-sm border border-dashed rounded">
                                ยังไม่มีข้อมูลพนักงานในทีมนี้
                                <br />
                                คลิกปุ่ม "เพิ่มพนักงาน" เพื่อเริ่มต้น
                              </div>
                            )}
                          </div>
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

      {/* Edit Department Dialog */}
      <Dialog open={isEditDepartmentOpen} onOpenChange={setIsEditDepartmentOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>แก้ไขแผนก</DialogTitle>
          </DialogHeader>
          {editingDepartment && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="edit-dept-name">ชื่อแผนก *</label>
                <Input
                  id="edit-dept-name"
                  value={editingDepartment.name}
                  onChange={(e) => setEditingDepartment(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="เช่น แผนกผลิต"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-dept-manager">หัวหน้าแผนก</label>
                <Input
                  id="edit-dept-manager"
                  value={editingDepartment.manager || ""}
                  onChange={(e) => setEditingDepartment(prev => prev ? { ...prev, manager: e.target.value } : null)}
                  placeholder="ไม่บังคับ"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-dept-location">สถานที่ *</label>
                <Input
                  id="edit-dept-location"
                  value={editingDepartment.location}
                  onChange={(e) => setEditingDepartment(prev => prev ? { ...prev, location: e.target.value } : null)}
                  placeholder="เช่น อาคาร A ชั้น 2"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-dept-status">สถานะ</label>
                <Select 
                  value={editingDepartment.status} 
                  onValueChange={(value) => setEditingDepartment(prev => prev ? { ...prev, status: value } : null)}
                >
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
          )}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleUpdateDepartment}
              disabled={updateDepartmentMutation.isPending}
              className="flex-1"
            >
              {updateDepartmentMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDepartmentOpen(false);
                setEditingDepartment(null);
              }} 
              className="flex-1"
            >
              ยกเลิก
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={isEditTeamOpen} onOpenChange={setIsEditTeamOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>แก้ไขทีม</DialogTitle>
          </DialogHeader>
          {editingTeam && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="edit-team-name">ชื่อทีม *</label>
                <Input
                  id="edit-team-name"
                  value={editingTeam.name}
                  onChange={(e) => setEditingTeam(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="เช่น ทีมผลิตเสื้อผ้า"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-team-leader">หัวหน้าทีม</label>
                <Input
                  id="edit-team-leader"
                  value={editingTeam.leader || ""}
                  onChange={(e) => setEditingTeam(prev => prev ? { ...prev, leader: e.target.value } : null)}
                  placeholder="ไม่บังคับ"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-team-status">สถานะ</label>
                <Select 
                  value={editingTeam.status} 
                  onValueChange={(value) => setEditingTeam(prev => prev ? { ...prev, status: value } : null)}
                >
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
          )}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleUpdateTeam}
              disabled={updateTeamMutation.isPending}
              className="flex-1"
            >
              {updateTeamMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditTeamOpen(false);
                setEditingTeam(null);
              }} 
              className="flex-1"
            >
              ยกเลิก
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>เพิ่มพนักงาน</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="employee-count">จำนวนพนักงาน *</label>
              <Input
                id="employee-count"
                type="number"
                min="1"
                value={newEmployee.count}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
                placeholder="เช่น 5"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="employee-wage">ค่าแรงเฉลี่ย/คน (บาท) *</label>
              <Input
                id="employee-wage"
                type="number"
                min="0"
                value={newEmployee.averageWage}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, averageWage: e.target.value }))}
                placeholder="เช่น 400"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="employee-overhead">%Overhead *</label>
              <Input
                id="employee-overhead"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={newEmployee.overheadPercentage}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, overheadPercentage: e.target.value }))}
                placeholder="เช่น 15.5"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="employee-management">%Management *</label>
              <Input
                id="employee-management"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={newEmployee.managementPercentage}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, managementPercentage: e.target.value }))}
                placeholder="เช่น 10.5"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="employee-description">คำอธิบาย</label>
              <Input
                id="employee-description"
                value={newEmployee.description}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, description: e.target.value }))}
                placeholder="เช่น ช่างตัด, ช่างเย็บ"
              />
            </div>
            
            {/* Daily Cost Calculation */}
            <div className="grid gap-2 bg-blue-50 p-3 rounded-lg">
              <label className="font-medium text-gray-700">ต้นทุนต่อวัน</label>
              <div className="text-lg font-bold text-blue-600">
                {calculateDailyCost(
                  newEmployee.count,
                  parseFloat(newEmployee.averageWage) || 0,
                  parseFloat(newEmployee.overheadPercentage) || 0,
                  parseFloat(newEmployee.managementPercentage) || 0
                ).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
              </div>
              <div className="text-xs text-gray-600">
                สูตร: (((จำนวนพนักงาน × ค่าแรงเฉลี่ย) + (จำนวนพนักงาน × ค่าแรงเฉลี่ย × %Overhead)) × %Management) + (จำนวนพนักงาน × ค่าแรงเฉลี่ย)
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleCreateEmployee}
              disabled={createEmployeeMutation.isPending}
              className="flex-1"
            >
              {createEmployeeMutation.isPending ? "กำลังเพิ่ม..." : "เพิ่มพนักงาน"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddEmployeeOpen(false);
                setNewEmployee({
                  count: 1,
                  averageWage: "",
                  overheadPercentage: "",
                  managementPercentage: "",
                  description: "",
                  status: "active"
                });
              }} 
              className="flex-1"
            >
              ยกเลิก
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditEmployeeOpen} onOpenChange={setIsEditEmployeeOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลพนักงาน</DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="edit-employee-count">จำนวนพนักงาน *</label>
                <Input
                  id="edit-employee-count"
                  type="number"
                  min="1"
                  value={editingEmployee.count}
                  onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, count: parseInt(e.target.value) || 1 } : null)}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-employee-wage">ค่าแรงเฉลี่ย/คน (บาท) *</label>
                <Input
                  id="edit-employee-wage"
                  type="number"
                  min="0"
                  value={editingEmployee.averageWage}
                  onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, averageWage: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-employee-overhead">%Overhead *</label>
                <Input
                  id="edit-employee-overhead"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editingEmployee.overheadPercentage}
                  onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, overheadPercentage: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-employee-management">%Management *</label>
                <Input
                  id="edit-employee-management"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editingEmployee.managementPercentage}
                  onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, managementPercentage: e.target.value } : null)}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-employee-description">คำอธิบาย</label>
                <Input
                  id="edit-employee-description"
                  value={editingEmployee.description || ""}
                  onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              
              {/* Daily Cost Calculation */}
              <div className="grid gap-2 bg-blue-50 p-3 rounded-lg">
                <label className="font-medium text-gray-700">ต้นทุนต่อวัน</label>
                <div className="text-lg font-bold text-blue-600">
                  {calculateDailyCost(
                    editingEmployee.count,
                    parseFloat(editingEmployee.averageWage) || 0,
                    parseFloat(editingEmployee.overheadPercentage) || 0,
                    parseFloat(editingEmployee.managementPercentage) || 0
                  ).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                </div>
                <div className="text-xs text-gray-600">
                  สูตร: (((จำนวนพนักงาน × ค่าแรงเฉลี่ย) + (จำนวนพนักงาน × ค่าแรงเฉลี่ย × %Overhead)) × %Management) + (จำนวนพนักงาน × ค่าแรงเฉลี่ย)
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleUpdateEmployee}
              disabled={updateEmployeeMutation.isPending}
              className="flex-1"
            >
              {updateEmployeeMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditEmployeeOpen(false);
                setEditingEmployee(null);
              }} 
              className="flex-1"
            >
              ยกเลิก
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Work Step Dialog */}
      <Dialog open={isAddWorkStepOpen} onOpenChange={setIsAddWorkStepOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>เพิ่มขั้นตอนงานใหม่</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="work-step-name">ชื่อขั้นตอน *</Label>
              <Input
                id="work-step-name"
                value={newWorkStep.name}
                onChange={(e) => setNewWorkStep(prev => ({ ...prev, name: e.target.value }))}
                placeholder="เช่น การตัดผ้า, การเย็บชิ้นส่วน"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="work-step-department">แผนก</Label>
              <Select 
                value={newWorkStep.department_id} 
                onValueChange={(value) => setNewWorkStep(prev => ({ ...prev, department_id: value }))}
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

            <div className="grid gap-2">
              <Label htmlFor="work-step-description">รายละเอียด</Label>
              <Textarea
                id="work-step-description"
                value={newWorkStep.description}
                onChange={(e) => setNewWorkStep(prev => ({ ...prev, description: e.target.value }))}
                placeholder="อธิบายรายละเอียดของขั้นตอนนี้"
                rows={3}
              />
            </div>



            <div className="flex gap-2 pt-4">
              <Button 
                onClick={() => createWorkStepMutation.mutate(newWorkStep)}
                disabled={!newWorkStep.name || !newWorkStep.department_id || createWorkStepMutation.isPending}
                className="flex-1"
              >
                {createWorkStepMutation.isPending ? "กำลังเพิ่ม..." : "เพิ่มขั้นตอน"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsAddWorkStepOpen(false)}
                className="flex-1"
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Work Step Dialog */}
      <Dialog open={isEditWorkStepOpen} onOpenChange={setIsEditWorkStepOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>แก้ไขขั้นตอนงาน</DialogTitle>
          </DialogHeader>
          {editingWorkStep && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-work-step-name">ชื่อขั้นตอน *</Label>
                <Input
                  id="edit-work-step-name"
                  value={editingWorkStep.name}
                  onChange={(e) => setEditingWorkStep(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-work-step-description">รายละเอียด</Label>
                <Textarea
                  id="edit-work-step-description"
                  value={editingWorkStep.description || ""}
                  onChange={(e) => setEditingWorkStep(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                />
              </div>



              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => updateWorkStepMutation.mutate({ id: editingWorkStep.id, data: editingWorkStep })}
                  disabled={updateWorkStepMutation.isPending}
                  className="flex-1"
                >
                  {updateWorkStepMutation.isPending ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditWorkStepOpen(false);
                    setEditingWorkStep(null);
                  }}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">ยืนยันการลบ</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              คุณแน่ใจหรือไม่ที่จะลบ{' '}
              {deleteType === 'department' && 'แผนก'} 
              {deleteType === 'team' && 'ทีม'} 
              {deleteType === 'employee' && 'ข้อมูลพนักงาน'} 
              {deleteType === 'workstep' && 'ขั้นตอนงาน'} 
              <span className="font-semibold"> "{deleteTargetName}"</span>?
            </p>
            {deleteType === 'department' && (
              <p className="text-red-600 text-sm mt-2">
                ⚠️ ทีมทั้งหมดในแผนกจะถูกลบด้วย
              </p>
            )}
            <p className="text-gray-500 text-sm mt-2">
              การดำเนินการนี้ไม่สามารถยกเลิกได้
            </p>
          </div>
          <div className="flex gap-2 pt-4">
            <Button 
              variant="destructive"
              onClick={handleConfirmDelete}
              className="flex-1"
            >
              ยืนยันการลบ
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmOpen(false)}
              className="flex-1"
            >
              ยกเลิก
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}