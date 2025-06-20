import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, User, Shield, Settings, Key, MoreHorizontal, Edit, Power } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleId: number | null;
  isActive: boolean;
}

interface Role {
  id: number;
  name: string;
  displayName: string;
}

interface Permission {
  id: number;
  resource: string;
  name: string;
  action: string;
  displayName: string;
  module: string;
}

interface PageAccess {
  id: number;
  roleId: number;
  pageName: string;
  pageUrl: string;
  accessLevel: string;
}

interface AllPage {
  pageName: string;
  pageUrl: string;
  module: string;
}

const createUserSchema = z.object({
  username: z.string().min(1, "กรุณาระบุชื่อผู้ใช้"),
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  firstName: z.string().min(1, "กรุณาระบุชื่อจริง"),
  lastName: z.string().min(1, "กรุณาระบุนามสกุล"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  roleId: z.number().min(1, "กรุณาเลือกบทบาท")
});

const editUserSchema = z.object({
  username: z.string().min(1, "กรุณาระบุชื่อผู้ใช้"),
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  firstName: z.string().min(1, "กรุณาระบุชื่อจริง"),
  lastName: z.string().min(1, "กรุณาระบุนามสกุล"),
  roleId: z.number().min(1, "กรุณาเลือกบทบาท")
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

export default function Users() {
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // State for dialogs and forms
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<number | null>(null);

  // Fetch data
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: roles } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const { data: permissions } = useQuery<Permission[]>({
    queryKey: ["/api/permissions"],
  });

  const { data: pageAccess, refetch: refetchPageAccess } = useQuery<PageAccess[]>({
    queryKey: ["/api/page-access", selectedRoleForPermissions],
    enabled: !!selectedRoleForPermissions,
  });



  // All available pages in the system
  const allPages: AllPage[] = [
    { pageName: "หน้าหลัก", pageUrl: "/", module: "หลัก" },
    { pageName: "บัญชี", pageUrl: "/accounting", module: "บัญชี" },
    { pageName: "คลังสินค้า", pageUrl: "/inventory", module: "คลังสินค้า" },
    { pageName: "ข้อมูลหลัก", pageUrl: "/master-data", module: "ข้อมูล" },
    { pageName: "จัดการลูกค้า", pageUrl: "/customers", module: "ข้อมูล" },
    { pageName: "จัดการสินค้า", pageUrl: "/products", module: "ข้อมูล" },
    { pageName: "จัดการผู้ใช้และสิทธิ์", pageUrl: "/user-management", module: "ระบบ" },
    { pageName: "การผลิต", pageUrl: "/production", module: "การผลิต" },
    { pageName: "แผนการผลิต", pageUrl: "/production/planning", module: "การผลิต" },
    { pageName: "บันทึกงานประจำวัน", pageUrl: "/production/daily-work-log", module: "การผลิต" },
    { pageName: "ใบเสนอราคา", pageUrl: "/quotations", module: "ขาย" },
    { pageName: "รายงานการขาย", pageUrl: "/sales-reports", module: "รายงาน" },
    { pageName: "รายงานการผลิต", pageUrl: "/production-reports", module: "รายงาน" },
    { pageName: "ตั้งค่าระบบ", pageUrl: "/settings", module: "ระบบ" },
    { pageName: "ทดสอบระบบสิทธิ์การเข้าถึง", pageUrl: "/access-demo", module: "ระบบ" },
  ];

  // Forms
  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      roleId: 0
    }
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      roleId: 0
    }
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "สำเร็จ",
        description: "เพิ่มผู้ใช้ใหม่เรียบร้อยแล้ว",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async (data: EditUserFormData & { id: number }) => {
      const res = await apiRequest("PUT", `/api/users/${data.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      editForm.reset();
      toast({
        title: "สำเร็จ",
        description: "แก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}/toggle-status`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "สำเร็จ",
        description: "เปลี่ยนสถานะผู้ใช้เรียบร้อยแล้ว",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePageAccessMutation = useMutation({
    mutationFn: async ({ roleId, pageName, pageUrl, accessLevel }: { 
      roleId: number; 
      pageName: string; 
      pageUrl: string; 
      accessLevel: string | null; 
    }) => {
      const res = await apiRequest("POST", "/api/page-access", { 
        roleId, 
        pageName, 
        pageUrl, 
        accessLevel 
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-access"] });
      refetchPageAccess();
      toast({
        title: "สำเร็จ",
        description: "อัปเดตสิทธิ์การเข้าถึงเรียบร้อยแล้ว",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleCreateUser = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId || 0
    });
    setIsEditDialogOpen(true);
  };

  const onSubmit = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const onEditSubmit = (data: EditUserFormData) => {
    if (editingUser) {
      editUserMutation.mutate({ ...data, id: editingUser.id });
    }
  };

  const handleToggleUserStatus = (user: User) => {
    toggleUserStatusMutation.mutate({
      id: user.id,
      isActive: !user.isActive
    });
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "ผู้ดูแลระบบ";
      case "manager":
        return "ผู้จัดการ";
      case "user":
        return "ผู้ใช้งาน";
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4" />;
      case "manager":
        return <Settings className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <Button disabled>เพิ่มผู้ใช้ใหม่</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter(u => u.isActive).length || 0;
  const adminUsers = users?.filter(u => u.role === "admin").length || 0;
  const managerUsers = users?.filter(u => u.role === "manager").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้และสิทธิ์</h1>
          <p className="text-gray-600">จัดการผู้ใช้งาน บทบาท และสิทธิ์การเข้าถึงระบบ</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            จัดการผู้ใช้
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            กำหนดสิทธิ์
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">รายการผู้ใช้</h2>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={handleCreateUser}
            >
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มผู้ใช้ใหม่
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ผู้ใช้ทั้งหมด</p>
                    <p className="text-2xl font-bold">{totalUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ใช้งานอยู่</p>
                    <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ผู้ดูแลระบบ</p>
                    <p className="text-2xl font-bold text-purple-600">{adminUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ผู้จัดการ</p>
                    <p className="text-2xl font-bold text-orange-600">{managerUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ผู้ใช้</TableHead>
                    <TableHead>อีเมล</TableHead>
                    <TableHead>บทบาท</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            {getRoleIcon(user.role)}
                          </div>
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getRoleText(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "ใช้งานอยู่" : "หยุดใช้งาน"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="w-4 h-4 mr-2" />
                              แก้ไข
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleUserStatus(user)}>
                              <Power className="w-4 h-4 mr-2" />
                              {user.isActive ? "หยุดใช้งาน" : "เปิดใช้งาน"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">กำหนดสิทธิ์การเข้าถึง</h2>
            
            <div className="flex items-center space-x-4">
              <div className="w-48">
                <Select onValueChange={(value) => setSelectedRoleForPermissions(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกบทบาทเพื่อดูสิทธิ์" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedRoleForPermissions && (
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>การตั้งค่าด่วน</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          allPages.forEach(page => {
                            updatePageAccessMutation.mutate({
                              roleId: selectedRoleForPermissions,
                              pageName: page.pageName,
                              pageUrl: page.pageUrl,
                              accessLevel: "view"
                            });
                          });
                        }}
                        disabled={updatePageAccessMutation.isPending}
                      >
                        เปิดทุกหน้า (ดูอย่างเดียว)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          allPages.forEach(page => {
                            updatePageAccessMutation.mutate({
                              roleId: selectedRoleForPermissions,
                              pageName: page.pageName,
                              pageUrl: page.pageUrl,
                              accessLevel: null
                            });
                          });
                        }}
                        disabled={updatePageAccessMutation.isPending}
                      >
                        ปิดทุกหน้า
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Page Access Management */}
                <Card>
                  <CardHeader>
                    <CardTitle>สิทธิ์การเข้าถึงหน้าต่างๆ</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      กำหนดสิทธิ์การเข้าถึงสำหรับบทบาท: <strong>{roles?.find(r => r.id === selectedRoleForPermissions)?.displayName}</strong>
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(
                        allPages.reduce((acc, page) => {
                          if (!acc[page.module]) acc[page.module] = [];
                          acc[page.module].push(page);
                          return acc;
                        }, {} as Record<string, typeof allPages>)
                      ).map(([module, pages]) => (
                        <div key={module} className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Badge variant="secondary">{module}</Badge>
                            <span className="text-sm text-muted-foreground">
                              ({pages.filter(page => pageAccess?.find(access => access.pageUrl === page.pageUrl)).length}/{pages.length} หน้าเปิดใช้งาน)
                            </span>
                          </h4>
                          
                          <div className="grid gap-3">
                            {pages.map((page) => {
                              const existingAccess = pageAccess?.find(
                                (access) => access.pageUrl === page.pageUrl
                              );
                              const hasAccess = !!existingAccess;
                              const accessLevel = existingAccess?.accessLevel || "view";

                              return (
                                <div key={page.pageUrl} className="flex items-center justify-between p-3 border rounded-md bg-card">
                                  <div className="flex-1">
                                    <div className="font-medium">{page.pageName}</div>
                                    <div className="text-sm text-muted-foreground font-mono">{page.pageUrl}</div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                    {/* Access Toggle */}
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={hasAccess}
                                        onCheckedChange={(checked) => {
                                          // Optimistic update
                                          const newAccessLevel = checked ? "view" : null;
                                          
                                          updatePageAccessMutation.mutate({
                                            roleId: selectedRoleForPermissions,
                                            pageName: page.pageName,
                                            pageUrl: page.pageUrl,
                                            accessLevel: newAccessLevel
                                          });
                                        }}
                                        disabled={updatePageAccessMutation.isPending}
                                      />
                                      <span className={`text-sm font-medium transition-colors ${hasAccess ? 'text-green-600' : 'text-gray-400'}`}>
                                        {hasAccess ? 'เปิด' : 'ปิด'}
                                      </span>
                                      {updatePageAccessMutation.isPending && (
                                        <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                      )}
                                    </div>

                                    {/* Permission Level */}
                                    {hasAccess ? (
                                      <Select
                                        value={accessLevel}
                                        onValueChange={(value) => {
                                          updatePageAccessMutation.mutate({
                                            roleId: selectedRoleForPermissions,
                                            pageName: page.pageName,
                                            pageUrl: page.pageUrl,
                                            accessLevel: value
                                          });
                                        }}
                                        disabled={updatePageAccessMutation.isPending}
                                      >
                                        <SelectTrigger className="w-40">
                                          <SelectValue placeholder="เลือกสิทธิ์" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="view">
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                              ดูอย่างเดียว
                                            </div>
                                          </SelectItem>
                                          <SelectItem value="edit">
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                              แก้ไข + ดู
                                            </div>
                                          </SelectItem>
                                          <SelectItem value="create">
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                              สร้าง + แก้ไข + ดู
                                            </div>
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <div className="w-40 text-sm text-gray-400 text-center">
                                        ไม่มีสิทธิ์
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Advanced Permission Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>การตั้งค่าสิทธิ์ขั้นสูง</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">การจำกัดเวลาการเข้าถึง</label>
                        <div className="flex gap-2">
                          <Input type="time" placeholder="เวลาเริ่ม" className="flex-1" />
                          <Input type="time" placeholder="เวลาสิ้นสุด" className="flex-1" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          กำหนดช่วงเวลาที่อนุญาตให้เข้าถึงระบบ
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">การจำกัด IP Address</label>
                        <Input placeholder="192.168.1.0/24" />
                        <p className="text-xs text-muted-foreground">
                          จำกัดการเข้าถึงจาก IP หรือช่วง IP ที่กำหนด
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">วันที่หมดอายุ</label>
                        <Input type="date" />
                        <p className="text-xs text-muted-foreground">
                          กำหนดวันที่สิทธิ์จะหมดอายุ
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">จำนวนครั้งการเข้าถึงสูงสุด</label>
                        <Input type="number" placeholder="100" />
                        <p className="text-xs text-muted-foreground">
                          จำกัดจำนวนครั้งการเข้าถึงต่อวัน
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" size="sm">
                        บันทึกการตั้งค่าขั้นสูง
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อจริง</FormLabel>
                      <FormControl>
                        <Input placeholder="ชื่อจริง" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>นามสกุล</FormLabel>
                      <FormControl>
                        <Input placeholder="นามสกุล" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อผู้ใช้</FormLabel>
                    <FormControl>
                      <Input placeholder="ชื่อผู้ใช้" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อีเมล</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="อีเมล" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสผ่าน</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="รหัสผ่าน" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>บทบาท</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกบทบาท" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles?.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลผู้ใช้</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อจริง</FormLabel>
                      <FormControl>
                        <Input placeholder="ชื่อจริง" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>นามสกุล</FormLabel>
                      <FormControl>
                        <Input placeholder="นามสกุล" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อผู้ใช้</FormLabel>
                    <FormControl>
                      <Input placeholder="ชื่อผู้ใช้" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อีเมล</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="อีเมล" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>บทบาท</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกบทบาท" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles?.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingUser(null);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button 
                  type="submit" 
                  disabled={editUserMutation.isPending}
                >
                  {editUserMutation.isPending ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}