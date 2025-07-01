import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsTest() {
  const { toast } = useToast();
  const [notificationData, setNotificationData] = useState({
    type: "deadline_warning",
    title: "",
    message: "",
    priority: "medium",
    relatedType: "",
    relatedId: "",
  });

  // Create test notification
  const createNotificationMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/notifications", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "สร้างการแจ้งเตือนทดสอบเรียบร้อยแล้ว",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      // Reset form
      setNotificationData({
        type: "deadline_warning",
        title: "",
        message: "",
        priority: "medium",
        relatedType: "",
        relatedId: "",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างการแจ้งเตือนได้",
        variant: "destructive",
      });
    },
  });

  // Generate deadline warnings
  const generateDeadlineWarningsMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/notifications/generate-deadline-warnings", {
        method: "POST",
      }),
    onSuccess: (data: any) => {
      toast({
        title: "สำเร็จ",
        description: data.message || "สร้างการแจ้งเตือนกำหนดส่งเรียบร้อยแล้ว",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างการแจ้งเตือนกำหนดส่งได้",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationData.title || !notificationData.message) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกหัวเรื่องและข้อความ",
        variant: "destructive",
      });
      return;
    }
    createNotificationMutation.mutate(notificationData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ทดสอบระบบการแจ้งเตือน</h1>
        <p className="text-muted-foreground">
          สร้างการแจ้งเตือนทดสอบและทดสอบระบบแจ้งเตือนต่างๆ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Test Notification */}
        <Card>
          <CardHeader>
            <CardTitle>สร้างการแจ้งเตือนทดสอบ</CardTitle>
            <CardDescription>
              สร้างการแจ้งเตือนเพื่อทดสอบระบบ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="type">ประเภทการแจ้งเตือน</Label>
                <Select
                  value={notificationData.type}
                  onValueChange={(value) =>
                    setNotificationData({ ...notificationData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deadline_warning">⚠️ เตือนกำหนดส่ง</SelectItem>
                    <SelectItem value="status_change">🔄 เปลี่ยนสถานะ</SelectItem>
                    <SelectItem value="overdue_task">🚨 งานเกินกำหนด</SelectItem>
                    <SelectItem value="system_alert">🔔 แจ้งเตือนระบบ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">หัวเรื่อง</Label>
                <Input
                  id="title"
                  value={notificationData.title}
                  onChange={(e) =>
                    setNotificationData({ ...notificationData, title: e.target.value })
                  }
                  placeholder="ใส่หัวเรื่องการแจ้งเตือน"
                />
              </div>

              <div>
                <Label htmlFor="message">ข้อความ</Label>
                <Textarea
                  id="message"
                  value={notificationData.message}
                  onChange={(e) =>
                    setNotificationData({ ...notificationData, message: e.target.value })
                  }
                  placeholder="ใส่ข้อความการแจ้งเตือน"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="priority">ระดับความสำคัญ</Label>
                <Select
                  value={notificationData.priority}
                  onValueChange={(value) =>
                    setNotificationData({ ...notificationData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 ต่ำ</SelectItem>
                    <SelectItem value="medium">🟡 ปานกลาง</SelectItem>
                    <SelectItem value="high">🟠 สูง</SelectItem>
                    <SelectItem value="urgent">🔴 เร่งด่วน</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="relatedType">ประเภทข้อมูลที่เกี่ยวข้อง</Label>
                  <Select
                    value={notificationData.relatedType}
                    onValueChange={(value) =>
                      setNotificationData({ ...notificationData, relatedType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">ไม่มี</SelectItem>
                      <SelectItem value="work_order">ใบสั่งงาน</SelectItem>
                      <SelectItem value="daily_work_log">บันทึกงาน</SelectItem>
                      <SelectItem value="production_plan">แผนผลิต</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="relatedId">ID ข้อมูลที่เกี่ยวข้อง</Label>
                  <Input
                    id="relatedId"
                    value={notificationData.relatedId}
                    onChange={(e) =>
                      setNotificationData({ ...notificationData, relatedId: e.target.value })
                    }
                    placeholder="เช่น JB202507001"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={createNotificationMutation.isPending}
                className="w-full"
              >
                {createNotificationMutation.isPending ? "กำลังสร้าง..." : "สร้างการแจ้งเตือน"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* System Notification Generators */}
        <Card>
          <CardHeader>
            <CardTitle>เครื่องมือสร้างการแจ้งเตือนระบบ</CardTitle>
            <CardDescription>
              สร้างการแจ้งเตือนอัตโนมัติจากระบบ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">⚠️ การแจ้งเตือนกำหนดส่ง</h3>
              <p className="text-sm text-muted-foreground mb-3">
                สร้างการแจ้งเตือนสำหรับใบสั่งงานที่ใกล้กำหนดส่ง (3 วันข้างหน้า)
              </p>
              <Button
                onClick={() => generateDeadlineWarningsMutation.mutate()}
                disabled={generateDeadlineWarningsMutation.isPending}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {generateDeadlineWarningsMutation.isPending
                  ? "กำลังสร้าง..."
                  : "สร้างการแจ้งเตือนกำหนดส่ง"}
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">🧹 ล้างข้อมูลการแจ้งเตือน</h3>
              <p className="text-sm text-muted-foreground mb-3">
                ลบการแจ้งเตือนที่หมดอายุแล้ว
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled
              >
                ล้างข้อมูลการแจ้งเตือน
              </Button>
            </div>

            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-2">📊 สถิติการแจ้งเตือน</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>การแจ้งเตือนทั้งหมด:</span>
                  <span className="font-mono">-</span>
                </div>
                <div className="flex justify-between">
                  <span>ยังไม่ได้อ่าน:</span>
                  <span className="font-mono">-</span>
                </div>
                <div className="flex justify-between">
                  <span>อ่านแล้ว:</span>
                  <span className="font-mono">-</span>
                </div>
                <div className="flex justify-between">
                  <span>ถูกปิด:</span>
                  <span className="font-mono">-</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>วิธีการทดสอบ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">1. สร้างการแจ้งเตือนทดสอบ</h4>
                <p className="text-muted-foreground">
                  ใช้ฟอร์มด้านซ้ายเพื่อสร้างการแจ้งเตือนทดสอบ จากนั้นดูที่ไอคอนกระดิ่งในหัวข้อ
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">2. ตรวจสอบการแจ้งเตือน</h4>
                <p className="text-muted-foreground">
                  คลิกที่ไอคอนกระดิ่งเพื่อดูการแจ้งเตือน สามารถอ่าน, ปิด, หรือดำเนินการได้
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">3. ทดสอบการแจ้งเตือนระบบ</h4>
                <p className="text-muted-foreground">
                  ใช้เครื่องมือสร้างการแจ้งเตือนอัตโนมัติเพื่อทดสอบระบบการแจ้งเตือนจริง
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}