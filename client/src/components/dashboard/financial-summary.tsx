import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, TrendingUp } from "lucide-react";

interface Transaction {
  id: number;
  type: string;
  category: string;
  description: string;
  amount: string;
  date: string;
}

interface MetricsData {
  revenue: { current: number; growth: number };
  expenses: number;
  profit: number;
}

export default function FinancialSummary() {
  const { data: metrics } = useQuery<MetricsData>({
    queryKey: ["/api/dashboard/metrics"]
  });

  const revenue = metrics?.revenue.current || 0;
  const expenses = metrics?.expenses || 0;
  const profit = metrics?.profit || 0;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">สรุปทางการเงิน</CardTitle>
          <Select defaultValue="current-month">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">เดือนนี้</SelectItem>
              <SelectItem value="last-month">เดือนที่แล้ว</SelectItem>
              <SelectItem value="quarter">3 เดือนล่าสุด</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <ArrowDown className="w-4 h-4 text-green-600" />
              </div>
              <span className="font-medium">รายได้</span>
            </div>
            <span className="font-semibold text-green-600">
              ฿{revenue.toLocaleString()}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <ArrowUp className="w-4 h-4 text-red-600" />
              </div>
              <span className="font-medium">ค่าใช้จ่าย</span>
            </div>
            <span className="font-semibold text-red-600">
              ฿{expenses.toLocaleString()}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-medium">กำไรสุทธิ</span>
            </div>
            <span className="font-bold text-blue-600">
              ฿{profit.toLocaleString()}
            </span>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>อัตรากำไร</span>
              <span>{profitMargin.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(profitMargin, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
