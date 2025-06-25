import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Badge,
} from "@/components/ui/badge";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  History,
  Search,
  Eye,
  Filter,
  Calendar,
  FileText,
  Users,
  Circle,
} from "lucide-react";
import Layout from "@/components/layout/layout";
import { useAuth } from "@/hooks/useAuth";
import type { DailyWorkLog } from "@shared/schema";

export default function DailyWorkHistoryPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [previewingLog, setPreviewingLog] = useState<DailyWorkLog | null>(null);

  // Fetch daily work logs
  const { data: dailyLogs = [], isLoading: logsLoading } = useQuery<DailyWorkLog[]>({
    queryKey: ["/api/daily-work-logs"],
  });

  // Fetch teams
  const { data: allTeams = [] } = useQuery({
    queryKey: ["/api/teams"],
  });

  // Fetch work orders
  const { data: workOrders = [] } = useQuery({
    queryKey: ["/api/work-orders"],
  });

  // Consolidate logs by report number
  const consolidatedLogs = useMemo(() => {
    const grouped = dailyLogs.reduce((acc, log) => {
      const key = log.reportNumber || log.id;
      if (!acc[key]) {
        acc[key] = {
          ...log,
          subJobs: [],
          totalQuantity: 0,
        };
      }
      acc[key].subJobs.push(log);
      acc[key].totalQuantity += log.quantityCompleted || 0;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }, [dailyLogs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return consolidatedLogs.filter((log) => {
      const matchesSearch = !searchTerm || 
        log.reportNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workOrders.find(wo => wo.id === log.workOrderId)?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTeam = selectedTeam === "all" || log.teamId === selectedTeam;
      const matchesStatus = selectedStatus === "all" || log.status === selectedStatus;
      
      return matchesSearch && matchesTeam && matchesStatus;
    });
  }, [consolidatedLogs, searchTerm, selectedTeam, selectedStatus]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <History className="h-8 w-8 text-blue-600" />
              ประวัติบันทึกงานทั้งหมด
            </h1>
            <p className="text-muted-foreground mt-2">
              ดูประวัติการบันทึกงานประจำวันทั้งหมดของทุกทีม
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              ตัวกรองข้อมูล
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">ค้นหา</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="เลขที่รายงาน, ใบสั่งงาน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ทีมงาน</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกทีม</SelectItem>
                    {allTeams.map((team: any) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">สถานะ</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกสถานะ</SelectItem>
                    <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                    <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                    <SelectItem value="paused">หยุดชั่วคราว</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedTeam("all");
                    setSelectedStatus("all");
                  }}
                  className="w-full"
                >
                  ล้างตัวกรอง
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            พบ {filteredLogs.length} รายการจากทั้งหมด {consolidatedLogs.length} รายการ
          </p>
        </div>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              รายการบันทึกงาน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่รายงาน</TableHead>
                    <TableHead>วันเวลา</TableHead>
                    <TableHead>ทีมงาน</TableHead>
                    <TableHead>ใบสั่งงาน</TableHead>
                    <TableHead className="text-center">จำนวนงาน</TableHead>
                    <TableHead className="text-right">จำนวนรวม</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-center">การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell className="font-mono text-sm">
                        <div className="flex flex-col">
                          <span className="font-bold text-blue-600">
                            {log.reportNumber || 'N/A'}
                          </span>
                          <span className="text-xs text-gray-500">รายงาน</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(log.createdAt), 'dd MMM yyyy', { locale: th })}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(log.createdAt), 'HH:mm น.')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">
                            {allTeams.find((t: any) => t.id === log.teamId)?.name || log.teamId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {workOrders.find((wo: any) => wo.id === log.workOrderId)?.orderNumber || log.workOrderId}
                          </span>
                          <span className="text-xs text-gray-500">
                            {workOrders.find((wo: any) => wo.id === log.workOrderId)?.customerName || ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {log.subJobs.length} รายการ
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-green-600">
                          {log.totalQuantity?.toLocaleString() || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Circle className={`h-2 w-2 fill-current ${
                            log.status === 'completed' ? 'text-green-500' : 
                            log.status === 'in_progress' ? 'text-yellow-500' : 
                            'text-red-500'
                          }`} />
                          <Badge variant={
                            log.status === 'completed' ? 'default' : 
                            log.status === 'in_progress' ? 'secondary' : 
                            'outline'
                          }>
                            {log.status === 'completed' ? 'เสร็จสิ้น' : 
                             log.status === 'in_progress' ? 'กำลังดำเนินการ' : 
                             'หยุดชั่วคราว'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewingLog(log)}
                          className="hover:bg-blue-100 dark:hover:bg-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>ไม่พบข้อมูลบันทึกงาน</p>
                <p className="text-sm mt-1">ลองเปลี่ยนเงื่อนไขการค้นหา</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={!!previewingLog} onOpenChange={() => setPreviewingLog(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                รายละเอียดการบันทึกงาน
              </DialogTitle>
              <DialogDescription>
                เลขที่รายงาน: {previewingLog?.reportNumber}
              </DialogDescription>
            </DialogHeader>

            {previewingLog && (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">วันที่บันทึก</span>
                    </div>
                    <p className="font-bold text-blue-800 dark:text-blue-200">
                      {format(new Date(previewingLog.createdAt), 'dd MMMM yyyy', { locale: th })}
                    </p>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">ทีมงาน</span>
                    </div>
                    <p className="font-bold text-green-800 dark:text-green-200">
                      {allTeams.find((t: any) => t.id === previewingLog.teamId)?.name || 'ไม่ระบุ'}
                    </p>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-600">จำนวนรวม</span>
                    </div>
                    <p className="font-bold text-orange-800 dark:text-orange-200">
                      {previewingLog.totalQuantity?.toLocaleString() || 0} ชิ้น
                    </p>
                  </div>
                </div>

                {/* Work Description */}
                {previewingLog.workDescription && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">รายละเอียดงาน:</h4>
                    <p className="text-sm">{previewingLog.workDescription}</p>
                  </div>
                )}

                {/* Notes */}
                {previewingLog.notes && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">หมายเหตุ:</h4>
                    <p className="text-sm">{previewingLog.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}