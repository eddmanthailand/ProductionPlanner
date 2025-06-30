import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, DollarSign, TrendingUp, Users, FileText, BarChart3, ClipboardList } from "lucide-react";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import MainLayout from "@/components/layout/main-layout";

interface Team {
  id: string;
  name: string;
  departmentId: string;
}

interface DailyWorkLog {
  id: string;
  teamId: string;
  date: string;
  productName: string;
  quantity: number;
  unitPrice: string;  // API ส่งมาเป็น string
  totalRevenue?: number;
  workerId: string;
  workerName: string;
  customerName: string;
  orderNumber: string;
  jobTitle: string;
  colorName: string;
  colorCode: string;
  sizeName: string;
  workStepId: string;
  workStepName: string;
  workDescription: string;
}

interface RevenueData {
  date: string;
  revenue: number;
  quantity: number;
  jobs: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    jobTitle: string;
    productName: string;
    colorName: string;
    sizeName: string;
    workStepName: string;
    quantity: number;
    unitPrice: number;
    revenue: number;
    workerName: string;
    workDescription: string;
  }>;
}

function TeamRevenueReport() {
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  // ดึงข้อมูลทีม
  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // ดึงข้อมูลรายงานรายได้ที่มีข้อมูลครบถ้วน
  const { data: workLogs, isLoading, refetch } = useQuery<DailyWorkLog[]>({
    queryKey: ["/api/team-revenue-report", selectedTeam, startDate, endDate],
    enabled: !!selectedTeam && !!startDate && !!endDate,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const params = new URLSearchParams({
        teamId: selectedTeam,
        startDate: format(startDate!, "yyyy-MM-dd"),
        endDate: format(endDate!, "yyyy-MM-dd"),
        _t: Date.now().toString()
      });
      const response = await fetch(`/api/team-revenue-report?${params}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch revenue report');
      return response.json();
    }
  });

  // คำนวณข้อมูลรายได้
  const revenueData = useMemo(() => {
    if (!workLogs) return [];

    const grouped = new Map<string, RevenueData>();

    workLogs.forEach(log => {
      const dateKey = log.date;
      const quantity = Number(log.quantity) || 0;
      const unitPrice = Number(log.unitPrice) || 0;
      const revenue = quantity * unitPrice;

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, {
          date: dateKey,
          revenue: 0,
          quantity: 0,
          jobs: []
        });
      }

      const dayData = grouped.get(dateKey)!;
      dayData.revenue += revenue;
      dayData.quantity += quantity;

      // เพิ่มข้อมูลงานทุกรายการ
      dayData.jobs.push({
        id: log.id,
        orderNumber: log.orderNumber || 'ไม่ระบุ',
        customerName: log.customerName || 'ไม่ระบุลูกค้า',
        jobTitle: log.jobTitle || 'ไม่ระบุงาน',
        productName: log.productName || 'ไม่ระบุสินค้า',
        colorName: log.colorName || 'ไม่ระบุสี',
        sizeName: log.sizeName || 'ไม่ระบุไซร์',
        workStepName: log.workStepName || 'ไม่ระบุขั้นตอน',
        quantity: quantity,
        unitPrice: unitPrice,
        revenue: revenue,
        workerName: log.workerName || 'ไม่ระบุช่าง',
        workDescription: log.workDescription || 'ไม่ระบุ'
      });
    });

    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [workLogs]);

  // สรุปข้อมูลรวม
  const summary = useMemo(() => {
    if (!workLogs || workLogs.length === 0) {
      return { totalRevenue: 0, totalQuantity: 0, totalDays: 0, totalJobs: 0 };
    }

    const totalRevenue = workLogs.reduce((sum, log) => {
      const quantity = Number(log.quantity) || 0;
      const unitPrice = Number(log.unitPrice) || 0;
      return sum + (quantity * unitPrice);
    }, 0);

    const totalQuantity = workLogs.reduce((sum, log) => sum + (Number(log.quantity) || 0), 0);
    const uniqueDays = new Set(workLogs.map(log => log.date)).size;

    return {
      totalRevenue,
      totalQuantity,
      totalDays: uniqueDays,
      totalJobs: workLogs.length
    };
  }, [workLogs]);

  const selectedTeamName = teams?.find(t => t.id === selectedTeam)?.name || "";

  const handleGenerateReport = () => {
    if (!selectedTeam || !startDate || !endDate) {
      alert("กรุณาเลือกทีม วันที่เริ่มต้น และวันที่สิ้นสุด");
      return;
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Modern Header */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <DollarSign className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              รายงานรายได้ทีมผลิต
            </h1>
            <p className="text-slate-600 text-sm mt-1">วิเคราะห์รายได้ของทีมผลิตตามช่วงเวลาที่กำหนด</p>
          </div>
        </div>
      </div>

      {/* Modern Filters */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            เลือกเงื่อนไขการรายงาน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* เลือกทีม */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">ทีมผลิต</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกทีม" />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* วันที่เริ่มต้น */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">วันที่เริ่มต้น</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy", { locale: th }) : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* วันที่สิ้นสุด */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy", { locale: th }) : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* ปุ่มสร้างรายงาน */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">&nbsp;</label>
              <Button 
                onClick={handleGenerateReport}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={!selectedTeam || !startDate || !endDate || isLoading}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                สร้างรายงาน
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modern Summary Cards */}
      {workLogs && workLogs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* รายได้รวม Card */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">รายได้รวม</p>
                  <p className="text-3xl font-bold text-green-600 group-hover:text-green-700 transition-colors">
                    ฿{summary.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* จำนวนผลิต Card */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">จำนวนผลิต</p>
                  <p className="text-3xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                    {summary.totalQuantity.toLocaleString()} ตัว
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* รายได้เฉลี่ย/วัน Card */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-violet-50 hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 mb-1">รายได้เฉลี่ย/วัน</p>
                  <p className="text-3xl font-bold text-purple-600 group-hover:text-purple-700 transition-colors">
                    ฿{summary.totalDays > 0 ? Math.round(summary.totalRevenue / summary.totalDays).toLocaleString() : 0}
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <CalendarIcon className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* จำนวนงานทั้งหมด Card */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700 mb-1">จำนวนงานทั้งหมด</p>
                  <p className="text-3xl font-bold text-orange-600 group-hover:text-orange-700 transition-colors">
                    {summary.totalJobs} งาน
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modern Revenue Table */}
      {workLogs && workLogs.length > 0 && (
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-t-lg pb-6">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              ตารางรายละเอียดรายได้ - ทีม {selectedTeamName}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-100 to-slate-50 border-none">
                    <TableHead className="font-semibold text-slate-700 py-4">วันที่</TableHead>
                    <TableHead className="font-semibold text-slate-700">ใบสั่งงาน</TableHead>
                    <TableHead className="font-semibold text-slate-700">ชื่อลูกค้า</TableHead>
                    <TableHead className="font-semibold text-slate-700">ชื่อสินค้า</TableHead>
                    <TableHead className="font-semibold text-slate-700">สี</TableHead>
                    <TableHead className="font-semibold text-slate-700">ไซส์</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">จำนวนที่ทำ</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">ราคา/ชิ้น</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">รายได้</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workLogs?.map((log, index) => {
                    const quantity = Number(log.quantity) || 0;
                    const unitPrice = Number(log.unitPrice) || 0;
                    const revenue = quantity * unitPrice;
                    
                    return (
                      <TableRow key={`${log.id}-${index}`} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                        <TableCell className="font-medium text-slate-700 py-4">
                          {format(parseISO(log.date), "dd/MM/yyyy", { locale: th })}
                        </TableCell>
                        <TableCell className="text-slate-600">{log.orderNumber || 'ไม่ระบุ'}</TableCell>
                        <TableCell className="text-slate-600">{log.customerName || 'ไม่ระบุลูกค้า'}</TableCell>
                        <TableCell className="text-slate-600">{log.productName || 'ไม่ระบุสินค้า'}</TableCell>
                        <TableCell className="text-slate-600">{log.colorName || 'ไม่ระบุสี'}</TableCell>
                        <TableCell className="text-slate-600">{log.sizeName || 'ไม่ระบุไซส์'}</TableCell>
                        <TableCell className="text-center font-medium text-blue-600">{quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium text-slate-700">฿{parseFloat(log.unitPrice).toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-green-600 text-right">
                          ฿{revenue.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modern Empty State */}
      {selectedTeam && startDate && endDate && (!workLogs || workLogs.length === 0) && !isLoading && (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">ไม่พบข้อมูลในช่วงเวลาที่เลือก</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              กรุณาตรวจสอบการเลือกทีมและช่วงเวลา หรือลองเปลี่ยนเงื่อนไขการค้นหา
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function TeamRevenueReportPage() {
  return (
    <MainLayout>
      <TeamRevenueReport />
    </MainLayout>
  );
}