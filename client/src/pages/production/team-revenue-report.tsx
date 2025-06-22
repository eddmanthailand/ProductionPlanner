import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, DollarSign, TrendingUp, Users, FileText } from "lucide-react";
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
  unitPrice: number;
  totalRevenue: number;
  workerId: string;
  workerName: string;
}

interface RevenueData {
  date: string;
  revenue: number;
  quantity: number;
  products: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    revenue: number;
  }>;
}

export default function TeamRevenueReport() {
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  // ดึงข้อมูลทีม
  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // ดึงข้อมูลใบบันทึกงานประจำวัน
  const { data: workLogs, isLoading } = useQuery<DailyWorkLog[]>({
    queryKey: ["/api/daily-work-logs", selectedTeam, startDate, endDate],
    enabled: !!selectedTeam && !!startDate && !!endDate,
  });

  // คำนวณข้อมูลรายได้
  const revenueData = useMemo(() => {
    if (!workLogs) return [];

    const grouped = new Map<string, RevenueData>();

    workLogs.forEach(log => {
      const dateKey = log.date;
      const revenue = log.quantity * log.unitPrice;

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, {
          date: dateKey,
          revenue: 0,
          quantity: 0,
          products: []
        });
      }

      const dayData = grouped.get(dateKey)!;
      dayData.revenue += revenue;
      dayData.quantity += log.quantity;

      // เช็คว่ามีสินค้านี้แล้วหรือไม่
      const existingProduct = dayData.products.find(p => p.name === log.productName);
      if (existingProduct) {
        existingProduct.quantity += log.quantity;
        existingProduct.revenue += revenue;
      } else {
        dayData.products.push({
          name: log.productName,
          quantity: log.quantity,
          unitPrice: log.unitPrice,
          revenue: revenue
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [workLogs]);

  // สรุปข้อมูลรวม
  const summary = useMemo(() => {
    return revenueData.reduce(
      (acc, day) => ({
        totalRevenue: acc.totalRevenue + day.revenue,
        totalQuantity: acc.totalQuantity + day.quantity,
        totalDays: acc.totalDays + 1
      }),
      { totalRevenue: 0, totalQuantity: 0, totalDays: 0 }
    );
  }, [revenueData]);

  const selectedTeamName = teams?.find(t => t.id === selectedTeam)?.name || "";

  const handleGenerateReport = () => {
    if (!selectedTeam || !startDate || !endDate) {
      alert("กรุณาเลือกทีม วันที่เริ่มต้น และวันที่สิ้นสุด");
      return;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            รายงานรายได้ทีมผลิต
          </h1>
          <p className="text-gray-600 mt-1">วิเคราะห์รายได้ของทีมผลิตตามช่วงเวลาที่กำหนด</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
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
              <label className="text-sm font-medium text-gray-700">&nbsp;</label>
              <Button 
                onClick={handleGenerateReport}
                className="w-full"
                disabled={!selectedTeam || !startDate || !endDate || isLoading}
              >
                <FileText className="mr-2 h-4 w-4" />
                สร้างรายงาน
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {revenueData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">รายได้รวม</p>
                  <p className="text-2xl font-bold text-green-600">
                    ฿{summary.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">จำนวนผลิต</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {summary.totalQuantity.toLocaleString()} ตัว
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">รายได้เฉลี่ย/วัน</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ฿{summary.totalDays > 0 ? Math.round(summary.totalRevenue / summary.totalDays).toLocaleString() : 0}
                  </p>
                </div>
                <CalendarIcon className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">จำนวนวันที่ทำงาน</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {summary.totalDays} วัน
                  </p>
                </div>
                <Users className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Table */}
      {revenueData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              รายละเอียดรายได้รายวัน - ทีม {selectedTeamName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>จำนวนผลิต (ตัว)</TableHead>
                    <TableHead>รายได้ (บาท)</TableHead>
                    <TableHead>รายละเอียดสินค้า</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueData.map((day, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {format(parseISO(day.date), "dd/MM/yyyy", { locale: th })}
                      </TableCell>
                      <TableCell>{day.quantity.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        ฿{day.revenue.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {day.products.map((product, pIndex) => (
                            <div key={pIndex} className="text-sm">
                              {product.name}: {product.quantity} ตัว × ฿{product.unitPrice} = ฿{product.revenue.toLocaleString()}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {selectedTeam && startDate && endDate && revenueData.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">ไม่พบข้อมูลในช่วงเวลาที่เลือก</p>
            <p className="text-sm text-gray-400">
              กรุณาตรวจสอบการเลือกทีมและช่วงเวลา หรือลองเปลี่ยนเงื่อนไขการค้นหา
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}