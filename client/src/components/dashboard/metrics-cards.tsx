import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Clock, Package, Users, DollarSign } from "lucide-react";

interface MetricsData {
  revenue: { current: number; growth: number };
  expenses: number;
  profit: number;
  pendingOrders: number;
  activeUsers: number;
  lowStockItems: number;
  inventoryValue: number;
}

export default function MetricsCards() {
  const { t } = useLanguage();
  const { data: metrics, isLoading } = useQuery<MetricsData>({
    queryKey: ["/api/dashboard/metrics"]
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: t("dashboard.revenue"),
      value: `฿${metrics?.revenue.current?.toLocaleString() || "0"}`,
      change: `${metrics?.revenue.growth?.toFixed(1) || "0"}%`,
      changeType: (metrics?.revenue.growth || 0) >= 0 ? "increase" : "decrease",
      icon: DollarSign,
      color: "bg-green-100 text-green-600"
    },
    {
      title: t("dashboard.pending_orders"),
      value: metrics?.pendingOrders?.toString() || "0",
      change: t("production.status.in_progress") || "กำลังผลิต",
      changeType: "neutral",
      icon: Clock,
      color: "bg-orange-100 text-orange-600"
    },
    {
      title: t("dashboard.active_users"),
      value: metrics?.activeUsers?.toString() || "0",
      change: "ทั้งหมด",
      changeType: "neutral",
      icon: Users,
      color: "bg-blue-100 text-blue-600"
    },
    {
      title: t("dashboard.inventory_value"),
      value: `฿${(metrics?.inventoryValue || 0).toLocaleString()}`,
      change: `${metrics?.lowStockItems || 0} ${t("dashboard.low_stock")}`,
      changeType: "warning",
      icon: Package,
      color: "bg-amber-100 text-amber-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <Card key={index} className="border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-500 text-sm font-medium">{card.title}</h3>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
              <p className={`text-sm flex items-center ${
                card.changeType === "increase" 
                  ? "text-green-600" 
                  : card.changeType === "decrease"
                  ? "text-red-600"
                  : card.changeType === "warning"
                  ? "text-orange-600"
                  : "text-gray-500"
              }`}>
                {card.changeType === "increase" && <TrendingUp className="w-4 h-4 mr-1" />}
                {card.changeType === "decrease" && <TrendingDown className="w-4 h-4 mr-1" />}
                <span>{card.change}</span>
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
