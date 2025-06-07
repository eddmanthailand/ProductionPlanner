import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProductionOrder {
  id: number;
  orderNumber: string;
  productId: number;
  quantity: number;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export default function ProductionSchedule() {
  const { t } = useLanguage();
  const { data: orders, isLoading } = useQuery<ProductionOrder[]>({
    queryKey: ["/api/production-orders"]
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-orange-100 text-orange-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "delayed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "เสร็จสิ้น";
      case "in_progress":
        return "กำลังผลิต";
      case "pending":
        return "รอเริ่มผลิต";
      case "delayed":
        return "ล่าช้า";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>แผนการผลิต</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeOrders = orders?.filter(order => order.status !== "completed").slice(0, 5) || [];

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">แผนการผลิต</CardTitle>
          <Button variant="outline" size="sm">
            ดูทั้งหมด
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>ไม่มีออเดอร์การผลิตในขณะนี้</p>
            </div>
          ) : (
            activeOrders.map((order) => (
              <div key={order.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${
                  order.status === "completed" ? "bg-green-500" :
                  order.status === "in_progress" ? "bg-orange-500" :
                  order.status === "delayed" ? "bg-red-500" : "bg-blue-500"
                }`}></div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {order.orderNumber} - จำนวน {order.quantity} ชิ้น
                  </h4>
                  <p className="text-sm text-gray-600">
                    {order.startDate && `เริ่ม: ${new Date(order.startDate).toLocaleDateString("th-TH")}`}
                    {order.endDate && ` | กำหนดเสร็จ: ${new Date(order.endDate).toLocaleDateString("th-TH")}`}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusText(order.status)}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
