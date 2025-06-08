import { useState } from "react";
import { BarChart3, Download, Calendar, TrendingUp, TrendingDown, Target, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ProductionData {
  date: string;
  planned: number;
  actual: number;
  efficiency: number;
}

interface ProductionMetrics {
  totalOrders: number;
  completedOrders: number;
  inProgressOrders: number;
  delayedOrders: number;
  averageEfficiency: number;
  totalProduction: number;
  defectRate: number;
  onTimeDelivery: number;
}

export default function ProductionReports() {
  const [reportPeriod, setReportPeriod] = useState("week");
  const [reportType, setReportType] = useState("overview");

  const [productionData] = useState<ProductionData[]>([
    { date: "2025-06-02", planned: 50, actual: 48, efficiency: 96 },
    { date: "2025-06-03", planned: 60, actual: 62, efficiency: 103 },
    { date: "2025-06-04", planned: 55, actual: 53, efficiency: 96 },
    { date: "2025-06-05", planned: 70, actual: 68, efficiency: 97 },
    { date: "2025-06-06", planned: 65, actual: 67, efficiency: 103 },
    { date: "2025-06-07", planned: 45, actual: 45, efficiency: 100 },
    { date: "2025-06-08", planned: 80, actual: 75, efficiency: 94 },
  ]);

  const [metrics] = useState<ProductionMetrics>({
    totalOrders: 15,
    completedOrders: 8,
    inProgressOrders: 5,
    delayedOrders: 2,
    averageEfficiency: 98.4,
    totalProduction: 435,
    defectRate: 2.1,
    onTimeDelivery: 87.5
  });

  const departmentEfficiency = [
    { name: "ทีมผลิต A", value: 95, color: "#3B82F6" },
    { name: "ทีมผลิต B", value: 88, color: "#10B981" },
    { name: "ทีม QC", value: 92, color: "#F59E0B" },
    { name: "ทีมบรรจุ", value: 85, color: "#EF4444" },
  ];

  const productionByCategory = [
    { name: "เสื้อผ้า", value: 60, color: "#3B82F6" },
    { name: "กางเกง", value: 25, color: "#10B981" },
    { name: "ชุดราตรี", value: 10, color: "#F59E0B" },
    { name: "อื่นๆ", value: 5, color: "#EF4444" },
  ];

  const dailyTargets = [
    { date: "จ", target: 80, actual: 75, workers: 8 },
    { date: "อ", target: 85, actual: 82, workers: 8 },
    { date: "พ", target: 90, actual: 88, workers: 9 },
    { date: "พฤ", target: 85, actual: 87, workers: 8 },
    { date: "ศ", target: 80, actual: 79, workers: 7 },
    { date: "ส", target: 60, actual: 58, workers: 6 },
    { date: "อา", target: 40, actual: 35, workers: 4 },
  ];

  const getMetricTrend = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change > 0,
      icon: change > 0 ? TrendingUp : TrendingDown
    };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const exportReport = () => {
    // Export functionality would go here
    console.log("Exporting report...");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            รายงานแผนผลิต
          </h1>
          <p className="text-gray-600 mt-1">วิเคราะห์และติดตามประสิทธิภาพการผลิต</p>
        </div>
        <div className="flex gap-2">
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">สัปดาห์นี้</SelectItem>
              <SelectItem value="month">เดือนนี้</SelectItem>
              <SelectItem value="quarter">ไตรมาสนี้</SelectItem>
              <SelectItem value="year">ปีนี้</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            ส่งออกรายงาน
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ใบสั่งงานทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalOrders}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">+12.5%</span>
                </div>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ประสิทธิภาพเฉลี่ย</p>
                <p className="text-2xl font-bold text-green-600">{metrics.averageEfficiency}%</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">+2.1%</span>
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">อัตราของเสีย</p>
                <p className="text-2xl font-bold text-red-600">{metrics.defectRate}%</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="w-3 h-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">-0.5%</span>
                </div>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ส่งมอบตรงเวลา</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.onTimeDelivery}%</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">+5.2%</span>
                </div>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>แนวโน้มการผลิต</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={productionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(label) => formatDate(label)}
                formatter={(value, name) => [
                  value,
                  name === 'planned' ? 'เป้าหมาย' : name === 'actual' ? 'ผลิตจริง' : 'ประสิทธิภาพ'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="planned" 
                stroke="#94A3B8" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="planned"
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#3B82F6" 
                strokeWidth={3}
                name="actual"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Production vs Target */}
        <Card>
          <CardHeader>
            <CardTitle>เป้าหมาย vs ผลผลิตรายวัน</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyTargets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="target" fill="#E5E7EB" name="เป้าหมาย" />
                <Bar dataKey="actual" fill="#3B82F6" name="ผลิตจริง" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Efficiency */}
        <Card>
          <CardHeader>
            <CardTitle>ประสิทธิภาพแต่ละแผนก</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentEfficiency.map((dept, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span className="font-medium text-gray-900">{dept.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${dept.value}%`,
                          backgroundColor: dept.color
                        }}
                      />
                    </div>
                    <span className="font-semibold text-gray-900 w-12 text-right">
                      {dept.value}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Production by Category */}
        <Card>
          <CardHeader>
            <CardTitle>การผลิตตามประเภทสินค้า</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={productionByCategory}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                >
                  {productionByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle>สรุปสถานะใบสั่งงาน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="font-medium text-gray-900">เสร็จสิ้น</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">{metrics.completedOrders}</div>
                  <div className="text-sm text-gray-600">
                    {((metrics.completedOrders / metrics.totalOrders) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="font-medium text-gray-900">กำลังดำเนินการ</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">{metrics.inProgressOrders}</div>
                  <div className="text-sm text-gray-600">
                    {((metrics.inProgressOrders / metrics.totalOrders) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="font-medium text-gray-900">ล่าช้า</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-600">{metrics.delayedOrders}</div>
                  <div className="text-sm text-gray-600">
                    {((metrics.delayedOrders / metrics.totalOrders) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>การวิเคราะห์เชิงลึก</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">จุดแข็ง</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  ประสิทธิภาพการผลิตสูงกว่าเป้าหมาย
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  คุณภาพสินค้าคงที่และดี
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  ทีมผลิต A มีประสิทธิภาพสูงสุด
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">จุดที่ต้องปรับปรุง</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  การส่งมอบตรงเวลายังต่ำกว่า 90%
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  ทีมบรรจุมีประสิทธิภาพต่ำสุด
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  ต้องเพิ่มประสิทธิภาพในวันหยุดสุดสัปดาห์
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">ข้อเสนอแนะ</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  เพิ่มการฝึกอบรมทีมบรรจุ
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  ปรับปรุงการวางแผนการผลิต
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  ติดตั้งระบบเตือนล่วงหน้า
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}