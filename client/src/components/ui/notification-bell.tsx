import { useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "unread" | "read" | "dismissed";
  relatedType?: string;
  relatedId?: string;
  metadata?: any;
  createdAt: string;
  readAt?: string;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);

  // Get unread notification count
  const { data: unreadCountData } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = (unreadCountData as { count: number })?.count || 0;

  // Get user notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["/api/notifications", { limit: 20, status: "unread" }],
    enabled: isOpen,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiRequest(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/notifications/read-all", {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Dismiss notification mutation
  const dismissMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiRequest(`/api/notifications/${notificationId}/dismiss`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-blue-500";
      case "low":
        return "bg-gray-500";
      default:
        return "bg-blue-500";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deadline_warning":
        return "⚠️";
      case "status_change":
        return "🔄";
      case "overdue_task":
        return "🚨";
      case "system_alert":
        return "🔔";
      default:
        return "📢";
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleDismiss = (notificationId: string) => {
    dismissMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 max-h-96" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">การแจ้งเตือน</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="text-xs"
            >
              อ่านทั้งหมด
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              กำลังโหลด...
            </div>
          ) : (notifications as Notification[]).length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              ไม่มีการแจ้งเตือนใหม่
            </div>
          ) : (
            <div className="space-y-1">
              {(notifications as Notification[]).map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${
                    notification.status === "unread" ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div
                        className={`w-2 h-2 rounded-full ${getPriorityColor(
                          notification.priority
                        )}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1 text-sm">
                          <span>{getTypeIcon(notification.type)}</span>
                          <span className="font-medium truncate">
                            {notification.title}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {notification.status === "unread" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={markAsReadMutation.isPending}
                              className="h-6 w-6 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDismiss(notification.id)}
                            disabled={dismissMutation.isPending}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(notification.createdAt), "d MMM HH:mm", {
                            locale: th,
                          })}
                        </span>
                        
                        {notification.relatedType && (
                          <Badge variant="outline" className="text-xs">
                            {notification.relatedType === "work_order" && "ใบสั่งงาน"}
                            {notification.relatedType === "daily_work_log" && "บันทึกงาน"}
                            {notification.relatedType === "production_plan" && "แผนผลิต"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setIsOpen(false);
                // Navigate to notifications page if exists
              }}
            >
              ดูทั้งหมด
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}