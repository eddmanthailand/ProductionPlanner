import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, DollarSign, TrendingUp, Users, FileText, BarChart3, ClipboardList, Printer, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [manualGenerate, setManualGenerate] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // ดึงข้อมูลทีม
  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // ดึงข้อมูลรายงานรายได้ที่มีข้อมูลครบถ้วน (เฉพาะเมื่อกดปุ่มสร้างรายงาน)
  const { data: workLogs, isLoading, refetch } = useQuery<DailyWorkLog[]>({
    queryKey: ["/api/team-revenue-report", selectedTeam, startDate, endDate],
    enabled: !!selectedTeam && !!startDate && !!endDate && manualGenerate,
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
    setManualGenerate(true);
  };

  const handlePrintPreview = () => {
    if (!workLogs || workLogs.length === 0) {
      alert("กรุณาสร้างรายงานก่อนพิมพ์");
      return;
    }
    setShowPrintPreview(true);
  };

  const handlePrint = () => {
    window.print();
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
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
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
                    onSelect={(date) => {
                      setStartDate(date);
                      setStartDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* วันที่สิ้นสุด */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
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
                    onSelect={(date) => {
                      setEndDate(date);
                      setEndDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* ปุ่มสร้างรายงาน */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">&nbsp;</label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleGenerateReport}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={!selectedTeam || !startDate || !endDate || isLoading}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  สร้างรายงาน
                </Button>
                
                <Button 
                  onClick={handlePrintPreview}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50 font-medium py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={!workLogs || workLogs.length === 0}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  ดูก่อนพิมพ์
                </Button>
              </div>
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
                  {workLogs?.sort((a, b) => Number(a.id) - Number(b.id)).map((log, index) => {
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

      {/* Print Preview Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Print Preview</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">


            {/* Print Content */}
            <PrintableReport 
              selectedTeamName={selectedTeamName}
              startDate={startDate}
              endDate={endDate}
              workLogs={workLogs}
              totalRevenue={workLogs?.reduce((sum, log) => sum + (Number(log.quantity) * Number(log.unitPrice)), 0) || 0}
              totalQuantity={workLogs?.reduce((sum, log) => sum + Number(log.quantity), 0) || 0}
              totalJobs={workLogs?.length || 0}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Print Component สำหรับการพิมพ์
interface PrintableReportProps {
  selectedTeamName: string;
  startDate?: Date;
  endDate?: Date;
  workLogs?: DailyWorkLog[];
  totalRevenue: number;
  totalQuantity: number;
  totalJobs: number;
}

function PrintableReport({ 
  selectedTeamName, 
  startDate, 
  endDate, 
  workLogs, 
  totalRevenue, 
  totalQuantity, 
  totalJobs 
}: PrintableReportProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return format(date, 'dd MMMM yyyy', { locale: th });
  };

  return (
    <div className="print:p-8 p-4 bg-white">
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body { font-size: 12px; }
            .no-print { display: none !important; }
            .print-break { page-break-after: always; }
            table { font-size: 11px; }
            th, td { padding: 4px 6px; }
            
            /* Force hide all buttons and footer when printing */
            [data-print-hide] { display: none !important; visibility: hidden !important; }
            .print-hide-buttons { display: none !important; visibility: hidden !important; }
            .print-hide-footer { display: none !important; visibility: hidden !important; }
            
            /* Additional selectors for buttons */
            button { display: none !important; }
            .btn { display: none !important; }
          }
        `
      }} />

      {/* Header with inline buttons */}
      <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-3">
        <div className="text-center flex-1">
          <h1 className="text-lg font-bold text-slate-800 mb-1">
            รายงานรายได้ทีมการผลิต
          </h1>
          <div className="text-xs text-slate-600">
            <strong>ทีม:</strong> {selectedTeamName} | <strong>ช่วงเวลา:</strong> {formatDate(startDate)} - {formatDate(endDate)} | <strong>วันที่พิมพ์:</strong> {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: th })} น.
          </div>
          <div className="text-xs text-slate-600 mt-1">
            <span className="text-blue-600 font-bold">{totalJobs}</span> งานทั้งหมด | 
            <span className="text-green-600 font-bold ml-1">{totalQuantity.toLocaleString()}</span> ชิ้นงานทั้งหมด | 
            <span className="text-purple-600 font-bold ml-1">{formatCurrency(totalRevenue)}</span> รายได้รวม
          </div>
        </div>
        
        {/* Inline buttons */}
        <div className="flex gap-2 ml-4" style={{display: 'block'}} data-print-hide>
          <style dangerouslySetInnerHTML={{
            __html: `
              @media print {
                [data-print-hide] { display: none !important; }
              }
            `
          }} />
          <Button
            onClick={() => window.print()}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs"
          >
            <Printer className="mr-1 h-3 w-3" />
            พิมพ์
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.close()}
            className="px-3 py-1 text-xs"
          >
            ปิด
          </Button>
        </div>
      </div>

      {/* Detailed Report Table */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">รายละเอียดรายได้</h2>
        
        {workLogs && workLogs.length > 0 ? (
          <table className="w-full border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-1 py-2 text-left text-xs font-semibold w-12">ลำดับ</th>
                <th className="border border-slate-300 px-1 py-2 text-left text-xs font-semibold w-20">วันที่</th>
                <th className="border border-slate-300 px-1 py-2 text-left text-xs font-semibold w-24">เลขที่ใบสั่งงาน</th>
                <th className="border border-slate-300 px-4 py-2 text-left text-xs font-semibold w-32">ลูกค้า</th>
                <th className="border border-slate-300 px-4 py-2 text-left text-xs font-semibold">สินค้า</th>
                <th className="border border-slate-300 px-2 py-2 text-left text-xs font-semibold">สี</th>
                <th className="border border-slate-300 px-2 py-2 text-left text-xs font-semibold">ขนาด</th>
                <th className="border border-slate-300 px-2 py-2 text-left text-xs font-semibold">ขั้นตอน</th>
                <th className="border border-slate-300 px-2 py-2 text-right text-xs font-semibold">จำนวน</th>
                <th className="border border-slate-300 px-2 py-2 text-right text-xs font-semibold">ราคา/ชิ้น</th>
                <th className="border border-slate-300 px-2 py-2 text-right text-xs font-semibold">รายได้</th>
              </tr>
            </thead>
            <tbody>
              {workLogs.sort((a, b) => Number(a.id) - Number(b.id)).map((log, index) => {
                const quantity = Number(log.quantity) || 0;
                const unitPrice = Number(log.unitPrice) || 0;
                const revenue = quantity * unitPrice;

                return (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="border border-slate-300 px-1 py-1 text-xs">{index + 1}</td>
                    <td className="border border-slate-300 px-1 py-1 text-xs">
                      {format(parseISO(log.date), 'dd/MM/yyyy', { locale: th })}
                    </td>
                    <td className="border border-slate-300 px-1 py-1 text-xs font-medium">{log.orderNumber}</td>
                    <td className="border border-slate-300 px-4 py-1 text-xs">{log.customerName}</td>
                    <td className="border border-slate-300 px-4 py-1 text-xs">{log.productName}</td>
                    <td className="border border-slate-300 px-2 py-1 text-xs">
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-3 h-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: log.colorCode }}
                        ></div>
                        {log.colorName}
                      </div>
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-xs">{log.sizeName}</td>
                    <td className="border border-slate-300 px-2 py-1 text-xs">{log.workStepName}</td>
                    <td className="border border-slate-300 px-2 py-1 text-xs text-right">{quantity.toLocaleString()}</td>
                    <td className="border border-slate-300 px-2 py-1 text-xs text-right">{formatCurrency(unitPrice)}</td>
                    <td className="border border-slate-300 px-2 py-1 text-xs text-right font-medium">{formatCurrency(revenue)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-200 font-bold">
                <td colSpan={8} className="border border-slate-300 px-2 py-2 text-xs text-right">รวมทั้งหมด:</td>
                <td className="border border-slate-300 px-2 py-2 text-xs text-right">{totalQuantity.toLocaleString()}</td>
                <td className="border border-slate-300 px-2 py-2 text-xs"></td>
                <td className="border border-slate-300 px-2 py-2 text-xs text-right">{formatCurrency(totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div className="text-center py-8 text-slate-500">
            ไม่พบข้อมูลในช่วงเวลาที่เลือก
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-slate-300 pt-4 text-sm text-slate-600" data-print-hide>
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              [data-print-hide] { display: none !important; }
            }
          `
        }} />
        <div className="flex justify-between">
          <div>
            <p>ระบบการจัดการการผลิต</p>
            <p>สร้างโดย: ระบบอัตโนมัติ</p>
          </div>
          <div className="text-right">
            <p>หน้า: 1/1</p>
            <p>รายงานสร้างเมื่อ: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: th })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamRevenueReportPage() {
  return <TeamRevenueReport />;
}