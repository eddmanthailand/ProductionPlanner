import { useState } from "react";
import { Calendar, Clock, Users, Plus, Save, FileText, CheckCircle2, AlertCircle, Edit2, ChevronRight, Building, UserCheck, Workflow, ClipboardList, Search, Check, ChevronsUpDown, Eye, Circle, BarChart3, MessageSquare, TrendingUp, Trash2 } from "lucide-react";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ฟังก์ชันสำหรับแสดงสี - ตอนนี้ใช้ hex code จากฐานข้อมูลโดยตรง
const getColorHex = (colorCode: string): string => {
  // ถ้าเป็น hex code แล้ว ใช้เลย
  if (colorCode && colorCode.startsWith('#')) {
    return colorCode;
  }
  // fallback สำหรับสีที่ยังไม่ได้ update
  return '#f3f4f6';
};

interface DailyWorkLog {
  id: string;
  reportNumber: string;
  date: string;
  teamId: string;
  employeeId: string;
  workOrderId: string;
  subJobId: number;
  hoursWorked: number;
  workDescription: string;
  status: 'in_progress' | 'completed' | 'paused';
  notes?: string;
  quantityCompleted?: number;
  createdAt: string;
  updatedAt: string;
}

interface Team {
  id: string;
  name: string;
  leader: string;
  departmentId: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  teamId: string;
  position: string;
}

interface WorkOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  title: string;
  status: string;
  deliveryDate?: string;
}

interface SubJob {
  id: number;
  workOrderId: string;
  productName: string;
  quantity: number;
  status: string;
  totalCost: string;
  colorId?: number;
  sizeId?: number;
  colorName?: string;
  sizeName?: string;
  customerName?: string;
  orderNumber?: string;
  unitPrice?: number;
  completedQuantity?: number;
  workStepId?: string;
}

interface Department {
  id: string;
  name: string;
  tenantId: string;
}

interface WorkStep {
  id: string;
  name: string;
  sequence: number;
  tenantId: string;
}

interface Color {
  id: number;
  name: string;
  code: string;
  description?: string;
}

interface Size {
  id: number;
  name: string;
  description?: string;
}

interface SubJobProgress {
  id: number;
  productName: string;
  quantity: number;
  quantityCompleted: number;
  quantityRemaining: number;
  progressPercentage: number;
  colorId?: number;
  sizeId?: number;
  colorName?: string;
  sizeName?: string;
}

export default function DailyWorkLog() {
  const { toast } = useToast();
  const { getPagePermissions } = usePageNavigation();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Get page permissions for current page
  const { canCreate, canEdit, canView, canDelete } = getPagePermissions('/production/daily-work-log');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedWorkStep, setSelectedWorkStep] = useState<string>("");

  const [selectedWorkOrder, setSelectedWorkOrder] = useState<string>("");
  const [workOrderOpen, setWorkOrderOpen] = useState(false);
  const [selectedSubJobs, setSelectedSubJobs] = useState<{[key: string]: boolean}>({});
  const [selectedQuantities, setSelectedQuantities] = useState<{[key: string]: string}>({});
  const [workDescription, setWorkDescription] = useState<string>("");
  const [workStatus, setWorkStatus] = useState<string>("in_progress");
  const [notes, setNotes] = useState<string>("");
  const [editingLog, setEditingLog] = useState<DailyWorkLog | null>(null);
  const [previewingLog, setPreviewingLog] = useState<any>(null);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState({
    dateFrom: "",
    dateTo: "",
    teamId: "",
    workOrderId: "",
    status: "",
    employeeName: ""
  });

  // Data queries
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams", selectedDepartment],
    enabled: !!selectedDepartment,
    queryFn: async () => {
      if (!selectedDepartment) return [];
      const response = await fetch(`/api/teams?departmentId=${selectedDepartment}`);
      if (!response.ok) throw new Error('Failed to fetch teams');
      return response.json();
    }
  });

  // Get all teams for display purposes
  const { data: allTeams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      const response = await fetch('/api/teams');
      if (!response.ok) throw new Error('Failed to fetch all teams');
      return response.json();
    }
  });

  const { data: workSteps = [] } = useQuery<WorkStep[]>({
    queryKey: ["/api/work-steps", selectedDepartment],
    enabled: !!selectedDepartment,
    queryFn: async () => {
      if (!selectedDepartment) return [];
      const response = await fetch(`/api/departments/${selectedDepartment}/work-steps`);
      if (!response.ok) throw new Error('Failed to fetch work steps');
      return response.json();
    }
  });



  const { data: workOrders = [] } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: colors = [] } = useQuery<Color[]>({
    queryKey: ["/api/colors"],
  });

  const { data: sizes = [] } = useQuery<Size[]>({
    queryKey: ["/api/sizes"],
  });

  const { data: subJobs = [] } = useQuery<SubJob[]>({
    queryKey: ["/api/sub-jobs/by-work-order", selectedWorkOrder, selectedWorkStep],
    enabled: !!selectedWorkOrder && !!selectedWorkStep,
    queryFn: async () => {
      if (!selectedWorkOrder || !selectedWorkStep) return [];
      const response = await fetch(`/api/sub-jobs/by-work-order/${selectedWorkOrder}`);
      if (!response.ok) throw new Error('Failed to fetch sub jobs');
      const allSubJobs = await response.json();
      
      // Filter by work step - ป้องกันการบันทึกข้ามแผนก
      return allSubJobs
        .filter((job: SubJob) => job.workStepId === selectedWorkStep)
        // กรองและเรียงลำดับตามทีมที่เลือก
        .filter((subJob: SubJob) => {
          const selectedTeamInfo = allTeams.find(t => t.id === selectedTeam);
          const isTeamCut = selectedTeamInfo?.name?.includes('ตัด');
          
          // ถ้าเป็นทีมตัด ให้แสดงเฉพาะ sort_order คี่ (ขั้นตอนตัด)
          // ถ้าเป็นทีมเย็บ ให้แสดงเฉพาะ sort_order คู่ (ขั้นตอนเย็บ)
          return isTeamCut ? 
            (subJob.sortOrder % 2 === 1) : // ทีมตัด = sort_order คี่
            (subJob.sortOrder % 2 === 0);  // ทีมเย็บ = sort_order คู่
        })
        .sort((a: SubJob, b: SubJob) => {
          // เรียงตาม sortOrder จากฐานข้อมูล
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        });
    }
  });

  // Get all sub-jobs with complete data for the selected work order
  const { data: allSubJobsComplete = [] } = useQuery<SubJob[]>({
    queryKey: ["/api/sub-jobs/by-work-order", selectedWorkOrder],
    queryFn: async () => {
      if (!selectedWorkOrder) return [];
      const response = await fetch(`/api/sub-jobs/by-work-order/${selectedWorkOrder}?_t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch sub jobs');
      return response.json();
    },
    enabled: !!selectedWorkOrder,
    staleTime: 0, // บังคับให้ fetch ข้อมูลใหม่ทุกครั้ง
    gcTime: 0 // ไม่เก็บ cache
  });

  // Fetch sub jobs for quantity information in preview dialog
  const { data: subJobsWithQuantity = [] } = useQuery({
    queryKey: ['/api/sub-jobs/by-work-order', previewingLog?.workOrderId],
    queryFn: async () => {
      if (!previewingLog?.workOrderId) return [];
      const response = await fetch(`/api/sub-jobs/by-work-order/${previewingLog.workOrderId}`);
      if (!response.ok) throw new Error('Failed to fetch sub jobs');
      return response.json();
    },
    enabled: !!previewingLog?.workOrderId
  });

  const { data: subJobsProgress = [] } = useQuery<SubJobProgress[]>({
    queryKey: ["/api/sub-jobs/progress", selectedWorkOrder],
    enabled: !!selectedWorkOrder,
    staleTime: 0, // บังคับให้ fetch ข้อมูลใหม่ทุกครั้ง
    gcTime: 0, // ไม่เก็บ cache
    queryFn: async () => {
      if (!selectedWorkOrder) return [];
      const response = await fetch(`/api/sub-jobs/progress/${selectedWorkOrder}?_t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch sub jobs progress');
      return response.json();
    }
  });

  const { data: dailyLogs = [] } = useQuery<DailyWorkLog[]>({
    queryKey: ["/api/daily-work-logs", searchCriteria, selectedDate, selectedTeam],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "20",
        ...(searchCriteria.dateFrom && { dateFrom: searchCriteria.dateFrom }),
        ...(searchCriteria.dateTo && { dateTo: searchCriteria.dateTo }),
        ...(searchCriteria.teamId && searchCriteria.teamId !== "all" && { teamId: searchCriteria.teamId }),
        ...(searchCriteria.workOrderId && searchCriteria.workOrderId !== "all" && { workOrderId: searchCriteria.workOrderId }),
        ...(searchCriteria.status && searchCriteria.status !== "all" && { status: searchCriteria.status }),
        ...(searchCriteria.employeeName && { employeeName: searchCriteria.employeeName }),
        ...(!Object.values(searchCriteria).some(Boolean) && selectedTeam !== "all" && selectedTeam && { 
          teamId: selectedTeam
        })
      });
      const response = await fetch(`/api/daily-work-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch daily logs');
      return response.json();
    }
  });

  // console.log('Daily logs raw data:', dailyLogs.slice(0, 2));
  // console.log('AllSubJobsComplete data:', allSubJobsComplete.slice(0, 2));

  // Group daily logs by unique combinations of date, team, work order
  const groupedLogs = dailyLogs.reduce((acc, log) => {
    const key = `${log.date}-${log.teamId}-${log.workOrderId}`;
    if (!acc[key]) {
      acc[key] = {
        id: log.id,
        reportNumber: log.reportNumber,
        date: log.date,
        teamId: log.teamId,
        teamName: allTeams.find(t => t.id === log.teamId)?.name || "ไม่ระบุ",
        workOrderId: log.workOrderId,
        workOrderNumber: workOrders.find(wo => wo.id === log.workOrderId)?.orderNumber || "ไม่ระบุ",
        customerName: workOrders.find(wo => wo.id === log.workOrderId)?.customerName || "ไม่ระบุ",
        employeeId: log.employeeId,
        hoursWorked: log.hoursWorked,
        status: log.status,
        notes: log.notes,
        createdAt: log.createdAt,
        subJobs: [],
        recordingSessions: [], // เก็บแต่ละรอบการบันทึก
        totalQuantity: 0
      };
    }
    
    // จัดกลุ่มตาม reportNumber เพื่อแสดงแต่ละรอบการบันทึก
    let session = acc[key].recordingSessions.find((s: any) => s.reportNumber === log.reportNumber);
    if (!session) {
      session = {
        reportNumber: log.reportNumber,
        createdAt: log.createdAt,
        employeeId: log.employeeId,
        employeeName: log.employeeName || 'ไม่ระบุ',
        subJobs: [],
        sessionQuantity: 0
      };
      acc[key].recordingSessions.push(session);
    }
    
    session.subJobs.push({
      subJobId: log.subJobId,
      quantityCompleted: log.quantityCompleted || 0,
      workDescription: log.workDescription,
      productName: log.productName || 'ไม่ระบุ',
      colorName: log.colorName || 'ไม่ระบุ', 
      sizeName: log.sizeName || 'ไม่ระบุ'
    });
    session.sessionQuantity += log.quantityCompleted || 0;
    
    // เก็บข้อมูลเดิมไว้เพื่อ backward compatibility
    acc[key].subJobs.push({
      subJobId: log.subJobId,
      quantityCompleted: log.quantityCompleted || 0,
      workDescription: log.workDescription,
      productName: log.productName || 'ไม่ระบุ',
      colorName: log.colorName || 'ไม่ระบุ', 
      sizeName: log.sizeName || 'ไม่ระบุ',
      quantity: 0 // จะเอาจาก API แยกต่างหาก
    });
    acc[key].totalQuantity += log.quantityCompleted || 0;
    
    return acc;
  }, {} as Record<string, any>);

  // เรียงลำดับข้อมูลในแต่ละ grouped log
  Object.values(groupedLogs).forEach((log: any) => {
    // เรียงลำดับ recording sessions ตามเวลา (เก่าไปใหม่)
    log.recordingSessions.sort((a: any, b: any) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    
    // เรียงลำดับ sub jobs ภายในแต่ละ session
    log.recordingSessions.forEach((session: any) => {
      session.subJobs.sort((a: any, b: any) => {
        return a.sortOrder - b.sortOrder;
      });
    });
    
    // เรียงลำดับ sub jobs รวม (เพื่อ backward compatibility)
    log.subJobs.sort((a: any, b: any) => {
      return a.sortOrder - b.sortOrder;
    });
  });

  const consolidatedLogs = Object.values(groupedLogs);

  // Helper functions
  const resetForm = () => {
    setSelectedDepartment("");
    setSelectedTeam("");
    setSelectedWorkStep("");
    setSelectedWorkOrder("");
    setWorkOrderOpen(false);
    setSelectedSubJobs({});
    setSelectedQuantities({});
    setWorkDescription("");
    setWorkStatus("in_progress");
    setNotes("");
    setEditingLog(null);
  };

  // Reset sub job selections when work step changes
  const handleWorkStepChange = (workStepId: string) => {
    setSelectedWorkStep(workStepId);
    setSelectedSubJobs({});
    setSelectedQuantities({});
  };

  const handleSubJobSelection = (subJobId: string, isSelected: boolean) => {
    setSelectedSubJobs(prev => ({
      ...prev,
      [subJobId]: isSelected
    }));
    
    if (!isSelected) {
      setSelectedQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[subJobId];
        return newQuantities;
      });
    }
  };

  const handleQuantityChange = (subJobId: string, quantity: string) => {
    setSelectedQuantities(prev => ({
      ...prev,
      [subJobId]: quantity
    }));
  };

  // Delete log mutation
  const deleteLogMutation = useMutation({
    mutationFn: async (logId: string) => {
      const response = await fetch(`/api/daily-work-logs/${logId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete log');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure data refresh
      queryClient.invalidateQueries({ queryKey: ["/api/daily-work-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/progress"] });
      
      toast({
        title: "สำเร็จ",
        description: "ลบบันทึกประจำวันเรียบร้อยแล้ว",
      });
      setPreviewingLog(null);
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถลบบันทึกได้",
        variant: "destructive",
      });
    },
  });

  const handleDeleteLog = (log: any) => {
    deleteLogMutation.mutate(log.id);
  };

  const handleDeleteGroupedLog = async (groupedLog: any) => {
    if (!groupedLog || !groupedLog.id) return;
    
    // For grouped logs, we need to delete all individual logs that were grouped together
    // Find all logs in the current dailyLogs that match this group
    const logsToDelete = dailyLogs.filter(log => 
      log.date === groupedLog.date && 
      log.teamId === groupedLog.teamId && 
      log.workOrderId === groupedLog.workOrderId
    );
    
    try {
      // Delete all logs in this group
      for (const log of logsToDelete) {
        await fetch(`/api/daily-work-logs/${log.id}`, {
          method: 'DELETE',
        });
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/daily-work-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/progress"] });
      
      toast({
        title: "สำเร็จ",
        description: `ลบบันทึกประจำวันเรียบร้อยแล้ว (${logsToDelete.length} รายการ)`,
      });
      setPreviewingLog(null);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบบันทึกได้",
        variant: "destructive",
      });
    }
  };

  // Mutations
  const createLogMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/daily-work-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create log');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/daily-work-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      
      toast({ 
        title: "สำเร็จ", 
        description: "บันทึกงานประจำวันเรียบร้อยแล้ว",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "ไม่สามารถบันทึกงานได้", 
        description: error.message || "เกิดข้อผิดพลาดในการบันทึกงาน", 
        variant: "destructive" 
      });
    },
  });

  const updateLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/daily-work-logs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update log');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/daily-work-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      
      toast({ title: "สำเร็จ", description: "อัปเดตบันทึกงานแล้ว" });
      setEditingLog(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "ข้อผิดพลาด", description: "ไม่สามารถอัปเดตบันทึกงานได้", variant: "destructive" });
    },
  });

  const batchCreateLogMutation = useMutation({
    mutationFn: async ({ subJobs }: { subJobs: any[] }) => {
      const response = await fetch('/api/daily-work-logs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subJobs }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create batch logs');
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-work-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-jobs/progress"] });
      toast({ 
        title: "สำเร็จ", 
        description: `บันทึกงาน ${result.count} รายการด้วยเลขที่รายงาน ${result.reportNumber}`,
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "ไม่สามารถบันทึกงานได้", 
        description: error.message || "เกิดข้อผิดพลาดในการบันทึกงาน", 
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedSubJobIds = Object.keys(selectedSubJobs).filter(id => selectedSubJobs[id]);
    if (!selectedTeam || !selectedWorkOrder || selectedSubJobIds.length === 0) {
      toast({ title: "ข้อผิดพลาด", description: "กรุณาเลือกงานที่จะบันทึก", variant: "destructive" });
      return;
    }

    // Use logged-in user as the recorder
    if (!user) {
      toast({ title: "ข้อผิดพลาด", description: "ไม่พบข้อมูลผู้ใช้", variant: "destructive" });
      return;
    }

    try {
      // If editing a single log, use update
      if (editingLog && selectedSubJobIds.length === 1) {
        const subJobId = selectedSubJobIds[0];
        const quantity = selectedQuantities[subJobId] || "0";
        const subJob = subJobs.find(sj => sj.id.toString() === subJobId);
        const logData = {
          date: selectedDate,
          teamId: selectedTeam,
          employeeId: user.id.toString(),
          employeeName: `${user.firstName} ${user.lastName}`,
          workOrderId: selectedWorkOrder,
          subJobId: parseInt(subJobId),
          hoursWorked: 8,
          workDescription: workDescription || `ทำงาน ${subJob?.productName}`,
          status: workStatus,
          notes,
          quantityCompleted: parseInt(quantity) || 0,
        };
        
        await updateLogMutation.mutateAsync({ id: editingLog.id, data: logData });
      } else {
        // For multiple sub jobs, use batch creation to get same report number
        const subJobsData = selectedSubJobIds.map(subJobId => {
          const quantity = selectedQuantities[subJobId] || "0";
          const subJob = subJobs.find(sj => sj.id.toString() === subJobId);
          return {
            date: selectedDate,
            teamId: selectedTeam,
            employeeId: user.id.toString(),
            employeeName: `${user.firstName} ${user.lastName}`,
            workOrderId: selectedWorkOrder,
            subJobId: parseInt(subJobId),
            hoursWorked: 8,
            workDescription: workDescription || `ทำงาน ${subJob?.productName}`,
            status: workStatus,
            notes,
            quantityCompleted: parseInt(quantity) || 0,
          };
        });

        // Use batch API for multiple sub jobs
        await batchCreateLogMutation.mutateAsync({ subJobs: subJobsData });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/daily-work-logs"] });
      const selectedTeamData = teams.find(t => t.id === selectedTeam);
      toast({ title: "สำเร็จ", description: `บันทึกงาน ${selectedSubJobIds.length} รายการแล้ว (ทีม: ${selectedTeamData?.name})` });
      resetForm();
    } catch (error) {
      toast({ title: "ข้อผิดพลาด", description: "ไม่สามารถบันทึกงานได้", variant: "destructive" });
    }
  };

  const handlePreview = (log: any) => {
    setPreviewingLog(log);
  };

  const selectedWorkOrderDetails = workOrders.find(wo => wo.id === selectedWorkOrder);
  const hasSelectedJobs = Object.values(selectedSubJobs).some(selected => selected);

  return (
    <div className="p-6 max-w-full mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          บันทึกงานประจำวัน
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          บันทึกการทำงานประจำวันของพนักงานในแต่ละทีม
        </p>
      </div>

      {/* Selection Steps */}
      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            เลือกข้อมูลการทำงาน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1: Department */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Building className="h-4 w-4 text-blue-600" />
                1. เลือกแผนก
              </Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="h-11">
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

            {/* Step 2: Team */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-green-600" />
                2. เลือกทีม
              </Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam} disabled={!selectedDepartment}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={selectedDepartment ? "เลือกทีม" : "เลือกแผนกก่อน"} />
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

            {/* Step 3: Work Step */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Workflow className="h-4 w-4 text-purple-600" />
                3. เลือกขั้นตอน
              </Label>
              <Select value={selectedWorkStep} onValueChange={handleWorkStepChange} disabled={!selectedDepartment}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={selectedDepartment ? "เลือกขั้นตอนงาน" : "เลือกแผนกก่อน"} />
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

            {/* Step 4: Work Order Combobox */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="h-4 w-4 text-orange-600" />
                4. เลือกใบสั่งงาน
              </Label>
              <Popover open={workOrderOpen} onOpenChange={setWorkOrderOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={workOrderOpen}
                    className="h-11 w-full justify-between"
                  >
                    {selectedWorkOrder
                      ? workOrders.find((order) => order.id === selectedWorkOrder)?.orderNumber + " - " + 
                        workOrders.find((order) => order.id === selectedWorkOrder)?.customerName
                      : "ค้นหาและเลือกใบสั่งงาน..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="ค้นหาใบสั่งงาน..." />
                    <CommandEmpty>ไม่พบใบสั่งงาน</CommandEmpty>
                    <CommandGroup>
                      {workOrders.map((order) => (
                        <CommandItem
                          key={order.id}
                          value={`${order.orderNumber} ${order.customerName} ${order.title}`}
                          onSelect={() => {
                            setSelectedWorkOrder(order.id);
                            setWorkOrderOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedWorkOrder === order.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{order.orderNumber}</span>
                            <span className="text-sm text-gray-500">{order.customerName} - {order.title}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub Job Details - Full Width Display */}
      {selectedWorkOrder && selectedWorkOrderDetails && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                รายละเอียดงาน
              </div>
              {selectedWorkStep && (
                <Badge variant="outline" className="ml-2">
                  {workSteps.find(ws => ws.id === selectedWorkStep)?.name}
                </Badge>
              )}
            </CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">ชื่อลูกค้า</Label>
                <p className="font-medium text-lg">{selectedWorkOrderDetails.customerName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">รหัสใบสั่งงาน</Label>
                <p className="font-medium text-lg">{selectedWorkOrderDetails.orderNumber}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">ชื่อใบสั่งงาน</Label>
                <p className="font-medium text-lg">{selectedWorkOrderDetails.title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">กำหนดส่งสินค้า</Label>
                <p className="font-medium text-lg">
                  {selectedWorkOrderDetails.deliveryDate 
                    ? format(new Date(selectedWorkOrderDetails.deliveryDate), 'dd/MM/yyyy')
                    : 'ไม่ระบุ'
                  }
                </p>
              </div>
            </div>
            {!selectedWorkStep && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                กรุณาเลือกขั้นตอนงานเพื่อแสดงรายละเอียดที่เกี่ยวข้อง
              </p>
            )}
          </CardHeader>
          <CardContent>
            {selectedWorkStep && subJobs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow style={{ fontSize: '11px' }}>
                      <TableHead className="w-16 py-2 px-3">เลือก</TableHead>
                      <TableHead className="py-2 px-3">ชื่อสินค้า</TableHead>
                      <TableHead className="py-2 px-3">สี</TableHead>
                      <TableHead className="py-2 px-3">ไซส์</TableHead>
                      <TableHead className="text-right py-2 px-3">จำนวนสั่ง</TableHead>
                      <TableHead className="text-right py-2 px-3">ทำแล้ว</TableHead>
                      <TableHead className="text-right py-2 px-3">คงเหลือ</TableHead>
                      <TableHead className="py-2 px-3">สถานะ</TableHead>
                      <TableHead className="w-32 py-2 px-3">จำนวนที่ทำ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subJobs.map((subJob) => {
                      const progressData = subJobsProgress.find(p => p.id === subJob.id);
                      const quantityCompleted = progressData?.quantityCompleted || 0;
                      
                      // คำนวณยอดคงเหลือ = จำนวนสั่ง - จำนวนที่ทำรวมจากทุกใบบันทึกงาน
                      const totalCompleted = consolidatedLogs.reduce((total, log) => {
                        const subJobInLog = log.subJobs.find((sj: any) => sj.subJobId === subJob.id);
                        return total + (subJobInLog?.quantityCompleted || 0);
                      }, 0);
                      
                      const quantityRemaining = subJob.quantity - totalCompleted;
                      const progressPercentage = progressData?.progressPercentage || 0;
                      
                      return (
                        <TableRow 
                          key={subJob.id} 
                          className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 h-12 ${
                            selectedSubJobs[subJob.id.toString()] ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                          style={{ fontSize: '11px' }}
                        >
                          <TableCell className="py-2 px-3">
                            <Checkbox
                              checked={selectedSubJobs[subJob.id.toString()] || false}
                              onCheckedChange={(checked) => handleSubJobSelection(subJob.id.toString(), checked as boolean)}
                              className="scale-90"
                            />
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            <div className="space-y-1">
                              <div className="text-xs font-medium">{subJob.productName}</div>
                              {progressPercentage > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <Progress value={progressPercentage} className="h-1.5 flex-1" />
                                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 min-w-[35px]">
                                    {progressPercentage.toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              {subJob.colorId && (
                                <div className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{
                                  backgroundColor: getColorHex(colors.find(c => c.id === subJob.colorId)?.code || '')
                                }}></div>
                              )}
                              <span className="text-xs">
                                {subJob.colorId 
                                  ? colors.find(c => c.id === subJob.colorId)?.name || '-'
                                  : '-'
                                }
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            <span className="text-xs">
                              {subJob.sizeId 
                                ? sizes.find(s => s.id === subJob.sizeId)?.name || '-'
                                : '-'
                              }
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium py-2 px-3">
                            <span className="text-xs">{subJob.quantity?.toLocaleString() || 0}</span>
                          </TableCell>
                          <TableCell className="text-right py-2 px-3">
                            <span className={`font-medium text-xs ${quantityCompleted > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                              {quantityCompleted.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-2 px-3">
                            {(() => {
                              let colorClass = '';
                              let label = '';
                              
                              if (quantityRemaining === 0) {
                                colorClass = 'text-green-600 dark:text-green-400';
                              } else if (quantityRemaining > 0) {
                                colorClass = 'text-orange-600 dark:text-orange-400';
                              } else {
                                colorClass = 'text-green-600 dark:text-green-400';
                                label = '(เกิน)';
                              }
                              
                              return (
                                <span className={`font-bold text-xs ${colorClass}`}>
                                  {quantityRemaining.toLocaleString()}
                                  {label && (
                                    <span className="text-[10px] text-green-500 ml-1">{label}</span>
                                  )}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <Circle className={`h-1.5 w-1.5 fill-current ${
                                progressPercentage >= 100 ? 'text-green-500' : 
                                progressPercentage > 0 ? 'text-yellow-500' : 
                                'text-gray-400'
                              }`} />
                              <Badge variant={
                                progressPercentage >= 100 ? 'default' : 
                                progressPercentage > 0 ? 'secondary' : 
                                'outline'
                              } className="text-[10px] px-1.5 py-0.5 h-5">
                                {progressPercentage >= 100 ? 'เสร็จสิ้น' : 
                                 progressPercentage > 0 ? 'กำลังดำเนินการ' : 
                                 'รอดำเนินการ'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            {selectedSubJobs[subJob.id.toString()] && (
                              <Input
                                type="number"
                                placeholder="จำนวน"
                                value={selectedQuantities[subJob.id.toString()] || ""}
                                onChange={(e) => handleQuantityChange(subJob.id.toString(), e.target.value)}
                                className="w-16 h-6 text-xs px-2"
                                min="0"
                                max={quantityRemaining > 0 ? quantityRemaining : 999}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : selectedWorkStep && subJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>ไม่พบงานที่ตรงกับขั้นตอน "{workSteps.find(ws => ws.id === selectedWorkStep)?.name}"</p>
                <p className="text-sm mt-1">ทีมนี้สามารถทำงานได้เฉพาะขั้นตอนของแผนกเดียวกันเท่านั้น</p>
                <p className="text-xs mt-1 text-amber-600">หมายเหตุ: ไม่อนุญาตให้บันทึกงานข้ามแผนกเนื่องจากใช้เครื่องจักรที่แตกต่างกัน</p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Workflow className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>เลือกขั้นตอนงานเพื่อดูรายละเอียด</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Work Log Form */}
      {hasSelectedJobs && canCreate && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                {editingLog ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {editingLog ? "แก้ไขบันทึกการทำงาน" : "บันทึกการทำงาน"}
              </div>
              {editingLog && (
                <Button variant="outline" size="sm" onClick={resetForm}>
                  ยกเลิก
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>ผู้บันทึก</Label>
                  <div className="h-11 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 flex items-center">
                    <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                    <span className="text-sm font-medium">
                      {user ? `${user.firstName} ${user.lastName}` : 'กำลังโหลด...'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border">
                    <span className="font-medium text-blue-700 dark:text-blue-300">เลขที่รายงาน: </span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">
                      {(() => {
                        const now = new Date();
                        const yearMonth = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0');
                        return `RP${yearMonth}XXXX (สร้างอัตโนมัติ)`;
                      })()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>สถานะงาน</Label>
                  <Select value={workStatus} onValueChange={setWorkStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                      <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                      <SelectItem value="paused">หยุดชั่วคราว</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>รายละเอียดงาน</Label>
                  <Textarea
                    placeholder="อธิบายรายละเอียดการทำงาน..."
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>หมายเหตุ</Label>
                  <Textarea
                    placeholder="หมายเหตุเพิ่มเติม..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full md:w-auto"
                disabled={createLogMutation.isPending || updateLogMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createLogMutation.isPending || updateLogMutation.isPending ? "กำลังบันทึก..." : "บันทึกงาน"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Daily Logs Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              บันทึกประจำวัน
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowSearchDialog(true)}>
              <Search className="h-4 w-4 mr-2" />
              ค้นหาบันทึก
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ fontSize: '11px' }}>
                  <TableHead className="w-[120px] py-2 px-3">รหัสอ้างอิง</TableHead>
                  <TableHead className="w-[120px] py-2 px-3">วันเวลา</TableHead>
                  <TableHead className="w-[100px] py-2 px-3">ทีม</TableHead>
                  <TableHead className="w-[140px] py-2 px-3">ใบสั่งงาน</TableHead>
                  <TableHead className="w-[100px] text-center py-2 px-3">จำนวนงาน</TableHead>
                  <TableHead className="w-[100px] text-right py-2 px-3">จำนวนรวม</TableHead>
                  <TableHead className="w-[120px] py-2 px-3">สถานะ</TableHead>
                  <TableHead className="w-[80px] text-center py-2 px-3">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consolidatedLogs.map((log, index) => (
                  <TableRow key={`${log.date}-${log.teamId}-${log.workOrderId}-${index}`} 
                           style={{ fontSize: '11px' }}
                           className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors h-12">
                    <TableCell className="font-mono text-xs py-2 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-blue-600 text-xs">{log.reportNumber || 'N/A'}</span>
                        <span className="text-gray-500 text-[10px]">เลขที่รายงาน</span>
                        <span className="font-mono text-green-600 text-[10px]">{log.id || 'N/A'}</span>
                        <span className="text-gray-500 text-[9px]">เลขที่บันทึก</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs py-2 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs">{format(new Date(log.createdAt), 'dd/MM/yyyy')}</span>
                        <span className="text-gray-500 text-[10px]">{format(new Date(log.createdAt), 'HH:mm')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        <span className="font-medium text-xs">
                          {allTeams.find(t => t.id === log.teamId)?.name || log.teamId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-xs">
                          {workOrders.find(wo => wo.id === log.workOrderId)?.orderNumber || log.workOrderId}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {workOrders.find(wo => wo.id === log.workOrderId)?.customerName || ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-2 px-3">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-5">
                        {log.subJobs.length} รายการ
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-2 px-3">
                      <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">
                        {log.totalQuantity?.toLocaleString() || 0}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <Circle className={`h-1.5 w-1.5 fill-current ${
                          log.status === 'completed' ? 'text-green-500' : 
                          log.status === 'in_progress' ? 'text-yellow-500' : 
                          'text-red-500'
                        }`} />
                        <Badge variant={
                          log.status === 'completed' ? 'default' : 
                          log.status === 'in_progress' ? 'secondary' : 
                          'outline'
                        } className="text-[10px] px-1.5 py-0.5 h-5">
                          {log.status === 'completed' ? 'เสร็จสิ้น' : 
                           log.status === 'in_progress' ? 'กำลังดำเนินการ' : 
                           'หยุดชั่วคราว'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <div className="flex gap-1 justify-center">
                        <Button variant="ghost" size="sm" onClick={() => handlePreview(log)} 
                               title="ดูรายละเอียด"
                               className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900">
                          <Eye className="h-3 w-3 text-blue-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewingLog} onOpenChange={() => setPreviewingLog(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center">
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  รายละเอียดการบันทึกงาน
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  แสดงรายละเอียดงานที่บันทึกไว้ทั้งหมด - วันที่ {previewingLog && format(new Date(previewingLog.createdAt), 'dd/MM/yyyy')}
                </DialogDescription>
              </div>
              <div className="mr-[10%]">
                {canDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex items-center gap-2"
                        disabled={deleteLogMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        ลบบันทึก
                      </Button>
                    </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ยืนยันการลบบันทึก</AlertDialogTitle>
                      <AlertDialogDescription>
                        คุณต้องการลบบันทึกประจำวันนี้หรือไม่? การลบจะไม่สามารถยกเลิกได้ และข้อมูลทั้งหมดจะถูกลบออกจากระบบอย่างถาวร
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteGroupedLog(previewingLog)}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={deleteLogMutation.isPending}
                      >
                        {deleteLogMutation.isPending ? "กำลังลบ..." : "ลบบันทึก"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                )}
              </div>
            </div>
          </DialogHeader>
          {previewingLog && (
            <div className="space-y-6 pt-4">
              {/* Remove debug info */}
              
              {/* Header Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-3 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Label className="text-[10px] font-medium text-purple-600 dark:text-purple-400 block">เลขที่บันทึก</Label>
                      <p className="font-bold text-xs text-purple-900 dark:text-purple-100 truncate" title={previewingLog.id}>{previewingLog.id || 'กำลังสร้าง...'}</p>
                      <p className="text-[9px] text-purple-700 dark:text-purple-300">WL Format</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 p-3 rounded-lg border border-indigo-200 dark:border-indigo-700">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Label className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 block">เลขที่รายงาน</Label>
                      <p className="font-bold text-xs text-indigo-900 dark:text-indigo-100 truncate" title={previewingLog.reportNumber}>{previewingLog.reportNumber || 'N/A'}</p>
                      <p className="text-[9px] text-indigo-700 dark:text-indigo-300">RP Format</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Label className="text-[10px] font-medium text-blue-600 dark:text-blue-400 block">วันที่บันทึก</Label>
                      <p className="font-bold text-xs text-blue-900 dark:text-blue-100">{format(new Date(previewingLog.createdAt), 'dd/MM/yyyy')}</p>
                      <p className="text-[9px] text-blue-700 dark:text-blue-300">{format(new Date(previewingLog.createdAt), 'HH:mm น.')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Label className="text-[10px] font-medium text-green-600 dark:text-green-400 block">ทีมงาน</Label>
                      <p className="font-bold text-xs text-green-900 dark:text-green-100 truncate" title={allTeams.find(t => t.id === previewingLog.teamId)?.name}>{allTeams.find(t => t.id === previewingLog.teamId)?.name || previewingLog.teamId}</p>
                      <p className="text-[9px] text-green-700 dark:text-green-300 truncate">แผนก{departments.find(d => d.id === allTeams.find(t => t.id === previewingLog.teamId)?.departmentId)?.name}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-3 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Label className="text-[10px] font-medium text-purple-600 dark:text-purple-400 block">ใบสั่งงาน</Label>
                      <p className="font-bold text-xs text-purple-900 dark:text-purple-100 truncate" title={workOrders.find(wo => wo.id === previewingLog.workOrderId)?.orderNumber}>{workOrders.find(wo => wo.id === previewingLog.workOrderId)?.orderNumber || previewingLog.workOrderId}</p>
                      <p className="text-[9px] text-purple-700 dark:text-purple-300 truncate">{workOrders.find(wo => wo.id === previewingLog.workOrderId)?.customerName}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-3 rounded-lg border border-orange-200 dark:border-orange-700">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Label className="text-[10px] font-medium text-orange-600 dark:text-orange-400 block">จำนวนรวม</Label>
                      <p className="font-bold text-xs text-orange-900 dark:text-orange-100">{previewingLog.totalQuantity?.toLocaleString() || 0} ชิ้น</p>
                      <p className="text-[9px] text-orange-700 dark:text-orange-300">{previewingLog.subJobs.length} รายการงาน</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Details Section - แสดงแต่ละรอบการบันทึก */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                    รายการงานที่ทำ - แยกตามรอบการบันทึก
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">แสดงรายละเอียดแต่ละครั้งที่มีการบันทึกงาน เรียงตามลำดับเวลา</p>
                </div>
                <div className="p-6 space-y-6">
                  {/* แสดงแต่ละรอบการบันทึก */}
                  {previewingLog.recordingSessions && previewingLog.recordingSessions.length > 0 ? (
                    previewingLog.recordingSessions.map((session: any, sessionIndex: number) => (
                      <div key={session.reportNumber} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                        {/* หัวข้อของแต่ละรอบ */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {sessionIndex + 1}
                              </div>
                              <div>
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                                  การบันทึกครั้งที่ {sessionIndex + 1}
                                </h4>
                                <div className="flex items-center gap-4 text-sm text-blue-700 dark:text-blue-300">
                                  <span>เลขที่รายงาน: {session.reportNumber}</span>
                                  <span>•</span>
                                  <span>เวลา: {format(new Date(session.createdAt), 'HH:mm น.')}</span>
                                  <span>•</span>
                                  <span>ผู้บันทึก: {session.employeeName}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {session.sessionQuantity.toLocaleString()} ชิ้น
                              </p>
                              <p className="text-xs text-blue-500 dark:text-blue-400">
                                {session.subJobs.length} รายการ
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* ตารางงานในรอบนี้ */}
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50 dark:bg-gray-800">
                                <TableHead className="font-semibold">ชื่อสินค้า</TableHead>
                                <TableHead className="font-semibold">สี</TableHead>
                                <TableHead className="font-semibold">ไซส์</TableHead>
                                <TableHead className="font-semibold text-right">จำนวนสั่ง</TableHead>
                                <TableHead className="font-semibold text-right">จำนวนที่ทำ</TableHead>
                                <TableHead className="font-semibold">รายละเอียดงาน</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {session.subJobs
                                .sort((a: any, b: any) => {
                                  // เรียงตาม product → color → size
                                  if (a.productName !== b.productName) {
                                    return a.productName.localeCompare(b.productName, 'th');
                                  }
                                  
                                  const colorOrder = ['ฟ้า', 'ชมพู', 'เหลือง'];
                                  const aColorIndex = colorOrder.indexOf(a.colorName) !== -1 ? colorOrder.indexOf(a.colorName) : 999;
                                  const bColorIndex = colorOrder.indexOf(b.colorName) !== -1 ? colorOrder.indexOf(b.colorName) : 999;
                                  
                                  if (aColorIndex !== bColorIndex) {
                                    return aColorIndex - bColorIndex;
                                  }
                                  
                                  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL'];
                                  const aSizeIndex = sizeOrder.indexOf(a.sizeName) !== -1 ? sizeOrder.indexOf(a.sizeName) : 999;
                                  const bSizeIndex = sizeOrder.indexOf(b.sizeName) !== -1 ? sizeOrder.indexOf(b.sizeName) : 999;
                                  
                                  return aSizeIndex - bSizeIndex;
                                })
                                .map((item: any, index: number) => {
                                  const subJobData = subJobsWithQuantity.find((sj: any) => sj.id === item.subJobId);
                                  const orderQuantity = subJobData?.quantity || 0;

                                  return (
                                    <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                      <TableCell className="font-medium">{item.productName || '-'}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <div className="w-4 h-4 rounded-full border border-gray-300" style={{
                                            backgroundColor: getColorHex(colors.find(c => c.name === item.colorName)?.code || '')
                                          }}></div>
                                          {item.colorName || '-'}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                          {item.sizeName || '-'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className="font-medium text-gray-600 dark:text-gray-400">
                                          {orderQuantity.toLocaleString()}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className="font-bold text-green-600 dark:text-green-400">
                                          {item.quantityCompleted?.toLocaleString() || 0}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                          {item.workDescription || '-'}
                                        </p>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      ไม่พบข้อมูลการบันทึกงาน
                    </div>
                  )}

                  {/* สรุปรวมของทุกรอบ */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      สรุปรวมทุกรอบการบันทึก
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-white dark:bg-gray-900 rounded border">
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {previewingLog.recordingSessions?.length || 0}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">รอบการบันทึก</p>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-gray-900 rounded border">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {previewingLog.subJobs?.length || 0}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">รายการงานรวม</p>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-gray-900 rounded border">
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {previewingLog.totalQuantity?.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">ชิ้นงานรวม</p>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-gray-900 rounded border">
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          {Math.round((previewingLog.totalQuantity || 0) / (previewingLog.subJobs?.length || 1)) || 0}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">เฉลี่ยต่อรายการ</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {previewingLog.notes && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center mt-1">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm font-semibold text-amber-800 dark:text-amber-200">หมายเหตุ</Label>
                      <p className="mt-2 text-amber-900 dark:text-amber-100 leading-relaxed">{previewingLog.notes}</p>
                    </div>
                  </div>
                </div>
              )}


            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ค้นหาบันทึกประจำวัน</DialogTitle>
            <DialogDescription>
              ใช้เงื่อนไขต่างๆ เพื่อค้นหาบันทึกที่ต้องการ
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>วันที่เริ่มต้น</Label>
              <Input
                type="date"
                value={searchCriteria.dateFrom}
                onChange={(e) => setSearchCriteria(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>วันที่สิ้นสุด</Label>
              <Input
                type="date"
                value={searchCriteria.dateTo}
                onChange={(e) => setSearchCriteria(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>ทีม</Label>
              <Select value={searchCriteria.teamId} onValueChange={(value) => setSearchCriteria(prev => ({ ...prev, teamId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกทีม" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกทีม</SelectItem>
                  {allTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ใบสั่งงาน</Label>
              <Select value={searchCriteria.workOrderId} onValueChange={(value) => setSearchCriteria(prev => ({ ...prev, workOrderId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกใบสั่งงาน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกใบสั่งงาน</SelectItem>
                  {workOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.orderNumber} - {order.customerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>สถานะ</Label>
              <Select value={searchCriteria.status} onValueChange={(value) => setSearchCriteria(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                  <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                  <SelectItem value="paused">หยุดชั่วคราว</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ชื่อพนักงาน</Label>
              <Input
                placeholder="ค้นหาด้วยชื่อพนักงาน..."
                value={searchCriteria.employeeName}
                onChange={(e) => setSearchCriteria(prev => ({ ...prev, employeeName: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/daily-work-logs"] });
                setShowSearchDialog(false);
              }}
              className="flex-1"
            >
              <Search className="h-4 w-4 mr-2" />
              ค้นหา
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchCriteria({
                  dateFrom: "",
                  dateTo: "",
                  teamId: "",
                  workOrderId: "",
                  status: "",
                  employeeName: ""
                });
                queryClient.invalidateQueries({ queryKey: ["/api/daily-work-logs"] });
              }}
            >
              ล้างค่า
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}