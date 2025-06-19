import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ChartLine,
  Calculator,
  Package,
  Users,
  Settings,
  FileText,
  Shield,
  ShoppingCart,
  Settings2,
  Calendar,
  Network,
  ClipboardList,
  BarChart3
} from "lucide-react";

interface Role {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  isActive: boolean;
}

interface PageAccess {
  id?: number;
  roleId: number;
  pageName: string;
  pageUrl: string;
  accessLevel: 'none' | 'read' | 'edit' | 'create';
}

interface Page {
  name: string;
  url: string;
  icon: any;
  description: string;
  module: string;
}

export default function PageAccessManagement() {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Define all available pages in the system
  const availablePages: Page[] = [
    { name: "แดชบอร์ด", url: "/", icon: ChartLine, description: "หน้าหลักของระบบ", module: "dashboard" },
    { name: "บัญชี", url: "/accounting", icon: Calculator, description: "ระบบบัญชีและการเงิน", module: "accounting" },
    { name: "คลังสินค้า", url: "/inventory", icon: Package, description: "จัดการสินค้าคงคลัง", module: "inventory" },
    { name: "ลูกค้า", url: "/customers", icon: Users, description: "จัดการข้อมูลลูกค้า", module: "customers" },
    { name: "ข้อมูลหลัก", url: "/master-data", icon: Settings, description: "จัดการข้อมูลพื้นฐาน", module: "master" },
    { name: "รายงานการผลิต", url: "/production/production-reports", icon: FileText, description: "รายงานเกี่ยวกับการผลิต", module: "production" },
    { name: "ใบเสนอราคา", url: "/sales/quotations", icon: FileText, description: "สร้างและจัดการใบเสนอราคา", module: "sales" },
    { name: "ใบส่งสินค้า/ใบแจ้งหนี้", url: "/sales/invoices", icon: FileText, description: "ใบส่งสินค้าและใบแจ้งหนี้", module: "sales" },
    { name: "ใบกำกับภาษี", url: "/sales/tax-invoices", icon: FileText, description: "ใบกำกับภาษี", module: "sales" },
    { name: "ใบเสร็จรับเงิน", url: "/sales/receipts", icon: FileText, description: "ใบเสร็จรับเงิน", module: "sales" },
    { name: "ปฏิทินการทำงาน", url: "/production/calendar", icon: Calendar, description: "ปฏิทินการวางแผนงาน", module: "production" },
    { name: "แผนผังหน่วยงาน", url: "/production/organization", icon: Network, description: "โครงสร้างองค์กร", module: "production" },
    { name: "วางแผนและคิวงาน", url: "/production/work-queue-planning", icon: Calendar, description: "วางแผนคิวการผลิต", module: "production" },
    { name: "ใบสั่งงาน", url: "/production/work-orders", icon: ClipboardList, description: "จัดการใบสั่งงาน", module: "production" },
    { name: "บันทึกงานประจำวัน", url: "/production/daily-work-log", icon: FileText, description: "บันทึกงานรายวัน", module: "production" },
    { name: "จัดการผู้ใช้และสิทธิ์", url: "/user-management", icon: Shield, description: "จัดการผู้ใช้และระบบสิทธิ์", module: "admin" },
  ];

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch page access for selected role
  const { data: pageAccesses = [], isLoading: accessLoading } = useQuery<PageAccess[]>({
    queryKey: ["/api/roles", selectedRoleId, "page-access"],
    enabled: !!selectedRoleId,
    queryFn: async () => {
      const response = await fetch(`/api/roles/${selectedRoleId}/page-access`);
      if (!response.ok) {
        // If no page access records exist, return empty array
        if (response.status === 404) {
          return [];
        }
        throw new Error('Failed to fetch page access');
      }
      return response.json();
    },
  });

  // Mutation to update page access
  const updatePageAccessMutation = useMutation({
    mutationFn: async ({ roleId, pageName, pageUrl, accessLevel }: { roleId: number, pageName: string, pageUrl: string, accessLevel: string }) => {
      await apiRequest(`/api/roles/${roleId}/page-access`, "POST", {
        pageName,
        pageUrl,
        accessLevel
      });
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "อัปเดตสิทธิ์การเข้าถึงหน้าเรียบร้อยแล้ว",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/roles", selectedRoleId, "page-access"] });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสิทธิ์การเข้าถึงหน้าได้",
        variant: "destructive",
      });
    },
  });

  const handlePageAccessChange = (page: Page, accessLevel: 'none' | 'read' | 'edit' | 'create') => {
    if (!selectedRoleId) return;
    
    updatePageAccessMutation.mutate({
      roleId: selectedRoleId,
      pageName: page.name,
      pageUrl: page.url,
      accessLevel
    });
  };

  const getPageAccessLevel = (pageUrl: string): 'none' | 'read' | 'edit' | 'create' => {
    const access = pageAccesses.find(pa => pa.pageUrl === pageUrl);
    return access ? access.accessLevel : 'none';
  };

  const getRoleLevelColor = (level: number) => {
    const colors = [
      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    ];
    return colors[level - 1] || colors[8];
  };

  const getModuleColor = (module: string) => {
    const moduleColors: { [key: string]: string } = {
      dashboard: "bg-blue-100 text-blue-800",
      accounting: "bg-green-100 text-green-800",
      inventory: "bg-purple-100 text-purple-800",
      customers: "bg-orange-100 text-orange-800",
      master: "bg-gray-100 text-gray-800",
      production: "bg-teal-100 text-teal-800",
      sales: "bg-yellow-100 text-yellow-800",
      admin: "bg-red-100 text-red-800",
    };
    return moduleColors[module] || "bg-gray-100 text-gray-800";
  };

  if (rolesLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">กำลังโหลดข้อมูล...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">จัดการสิทธิ์การเข้าถึงหน้า</h1>
          <p className="text-muted-foreground">กำหนดสิทธิ์การเข้าถึงหน้าต่างๆ ในระบบสำหรับแต่ละบทบาท</p>
        </div>
      </div>

      {/* Role Selection */}
      <Card>
        <CardHeader>
          <CardTitle>เลือกบทบาท</CardTitle>
          <CardDescription>เลือกบทบาทที่ต้องการจัดการสิทธิ์การเข้าถึงหน้า</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">บทบาท</label>
              <Select value={selectedRoleId?.toString() || ""} onValueChange={(value) => setSelectedRoleId(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบทบาท" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <span>{role.displayName}</span>
                        <Badge variant="outline" className={getRoleLevelColor(role.level)}>
                          ระดับ {role.level}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRoleId && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">รายละเอียดบทบาท</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  {(() => {
                    const role = roles.find(r => r.id === selectedRoleId);
                    return role ? (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{role.displayName}</span>
                          <Badge variant="outline" className={getRoleLevelColor(role.level)}>
                            ระดับ {role.level}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{role.description}</p>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Page Access Management */}
      {selectedRoleId && (
        <Card>
          <CardHeader>
            <CardTitle>สิทธิ์การเข้าถึงหน้า</CardTitle>
            <CardDescription>กำหนดระดับสิทธิ์การเข้าถึงหน้าต่างๆ ในระบบ<br/>
            <span className="text-sm text-gray-500">
              • สร้าง = ทำได้ทุกอย่าง (สร้าง, แก้ไข, ดู, ลบ)<br/>
              • แก้ไข = แก้ไขและดูได้ (ไม่สามารถสร้างหรือลบ)<br/>
              • ดู = ดูอย่างเดียว (ไม่สามารถแก้ไข, สร้าง, หรือลบ)
            </span>
          </CardDescription>
          </CardHeader>
          <CardContent>
            {accessLoading ? (
              <div className="text-center py-4">กำลังโหลดข้อมูลสิทธิ์...</div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>หน้า</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>โมดูล</TableHead>
                      <TableHead>คำอธิบาย</TableHead>
                      <TableHead className="text-center">ระดับสิทธิ์</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availablePages.map((page) => {
                      const accessLevel = getPageAccessLevel(page.url);
                      const PageIcon = page.icon;
                      
                      return (
                        <TableRow key={page.url}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <PageIcon className="w-4 h-4" />
                              <span className="font-medium">{page.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{page.url}</code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getModuleColor(page.module)}>
                              {page.module}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">{page.description}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Select 
                              value={accessLevel} 
                              onValueChange={(value) => handlePageAccessChange(page, value as 'none' | 'read' | 'edit' | 'create')}
                              disabled={updatePageAccessMutation.isPending}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">ไม่มีสิทธิ์</SelectItem>
                                <SelectItem value="read">ดู (ดูอย่างเดียว)</SelectItem>
                                <SelectItem value="edit">แก้ไข (แก้ไข + ดู)</SelectItem>
                                <SelectItem value="create">สร้าง (ทำได้ทุกอย่าง)</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}