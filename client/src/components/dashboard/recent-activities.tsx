import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Plus, AlertTriangle, DollarSign, User } from "lucide-react";

interface Activity {
  id: number;
  type: string;
  description: string;
  userId: number;
  tenantId: string;
  metadata?: any;
  createdAt: string;
}

export default function RecentActivities() {
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "production_order_created":
      case "product_created":
        return Plus;
      case "production_order_completed":
        return Check;
      case "transaction_created":
        return DollarSign;
      case "user_created":
        return User;
      default:
        return AlertTriangle;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "production_order_completed":
        return "bg-green-100 text-green-600";
      case "production_order_created":
      case "product_created":
        return "bg-blue-100 text-blue-600";
      case "transaction_created":
        return "bg-amber-100 text-amber-600";
      case "user_created":
        return "bg-purple-100 text-purple-600";
      default:
        return "bg-orange-100 text-orange-600";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "เมื่อสักครู่";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} นาทีที่แล้ว`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ชั่วโมงที่แล้ว`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} วันที่แล้ว`;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>กิจกรรมล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentActivities = activities?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">กิจกรรมล่าสุด</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>ไม่มีกิจกรรมล่าสุด</p>
            </div>
          ) : (
            recentActivities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTimeAgo(activity.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <Button variant="ghost" className="w-full mt-4 text-blue-600 hover:bg-blue-50">
          ดูทั้งหมด
        </Button>
      </CardContent>
    </Card>
  );
}
