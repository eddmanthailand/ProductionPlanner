import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Shield, Edit, Users, UserX, UserCheck, Trash2, AlertTriangle, Eye, EyeOff, Plus, X } from "lucide-react";
import { ProtectedRoute, ProtectedComponent, usePermissionCheck } from "@/components/permissions/ProtectedRoute";
import type { UserWithRole, Role } from "@shared/schema";

const createUserSchema = z.object({
  username: z.string().min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  firstName: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  lastName: z.string().min(2, "นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  roleId: z.number().min(1, "กรุณาเลือกบทบาท")
});

const editUserSchema = z.object({
  username: z.string().min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  firstName: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  lastName: z.string().min(2, "นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร"),
  password: z.string().optional().refine(val => !val || val.length >= 6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  roleId: z.number().min(1, "กรุณาเลือกบทบาท")
});

const createRoleSchema = z.object({
  name: z.string().min(2, "ชื่อบทบาทต้องมีอย่างน้อย 2 ตัวอักษร"),
  displayName: z.string().min(2, "ชื่อแสดงต้องมีอย่างน้อย 2 ตัวอักษร"),
  description: z.string().optional(),
  level: z.number().min(1, "ระดับต้องมากกว่า 0").max(100, "ระดับต้องไม่เกิน 100")
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;
type CreateRoleFormData = z.infer<typeof createRoleSchema>;

function UserManagement() {
  const { canAccess } = usePermissionCheck();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isCreateRoleDialogOpen, setIsCreateRoleDialogOpen] = useState(false);
  const [isDeleteRoleDialogOpen, setIsDeleteRoleDialogOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  // Fetch users with roles
  const { data: users = [], isLoading: usersLoading } = useQuery<UserWithRole[]>({
    queryKey: ["/api/users-with-roles"],
    enabled: true
  });

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    enabled: true
  });

  // Create role form
  const createRoleForm = useForm<CreateRoleFormData>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      level: 1
    }
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: CreateRoleFormData) => {
      return await apiRequest("/api/roles", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "สร้างบทบาทใหม่เรียบร้อยแล้ว"
      });
      setIsCreateRoleDialogOpen(false);
      createRoleForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถสร้างบทบาทได้",
        variant: "destructive"
      });
    }
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      return await apiRequest(`/api/roles/${roleId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "ลบบทบาทเรียบร้อยแล้ว"
      });
      setIsDeleteRoleDialogOpen(false);
      setDeletingRole(null);
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถลบบทบาทได้",
        variant: "destructive"
      });
    }
  });

  // Create user form
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
      password: "",
      roleId: 0
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      return await apiRequest("/api/auth/register", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "สร้างผู้ใช้ใหม่เรียบร้อยแล้ว"
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users-with-roles"] });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างผู้ใช้ได้",
        variant: "destructive"
      });
    }
  });



  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async (data: EditUserFormData & { userId: number }) => {
      const { userId, ...updateData } = data;
      return await apiRequest(`/api/users/${userId}`, "PUT", updateData);
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว"
      });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users-with-roles"] });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้",
        variant: "destructive"
      });
    }
  });

  // Toggle user status mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number, isActive: boolean }) => {
      return await apiRequest(`/api/users/${userId}/status`, "PUT", { isActive });
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "เปลี่ยนสถานะผู้ใช้เรียบร้อยแล้ว"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users-with-roles"] });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปลี่ยนสถานะผู้ใช้ได้",
        variant: "destructive"
      });
    }
  });

  // Delete user mutation (soft delete)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/users/${userId}`, "DELETE", {});
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "ลบผู้ใช้เรียบร้อยแล้ว"
      });
      setIsDeleteDialogOpen(false);
      setDeletingUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users-with-roles"] });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบผู้ใช้ได้",
        variant: "destructive"
      });
    }
  });

  const handleCreateUser = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleCreateRole = (data: CreateRoleFormData) => {
    createRoleMutation.mutate(data);
  };

  const handleDeleteRole = (role: Role) => {
    // Check if role has users
    const roleHasUsers = users.some(user => user.role?.id === role.id);
    if (roleHasUsers) {
      toast({
        title: "ไม่สามารถลบได้",
        description: "บทบาทนี้มีผู้ใช้ที่ได้รับมอบหมายอยู่ กรุณาย้ายผู้ใช้ไปยังบทบาทอื่นก่อน",
        variant: "destructive"
      });
      return;
    }
    
    setDeletingRole(role);
    setIsDeleteRoleDialogOpen(true);
  };

  const confirmDeleteRole = () => {
    if (deletingRole) {
      deleteRoleMutation.mutate(deletingRole.id);
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    editForm.reset({
      username: user.username || "",
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      password: "",
      roleId: user.roleId || 0
    });
    setIsEditDialogOpen(true);
  };

  const handleToggleUserStatus = (user: UserWithRole) => {
    toggleUserStatusMutation.mutate({ 
      userId: user.id, 
      isActive: !user.isActive 
    });
  };

  const handleDeleteUser = (user: UserWithRole) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (deletingUser) {
      deleteUserMutation.mutate(deletingUser.id);
    }
  };

  const handleSubmitEdit = (data: EditUserFormData) => {
    if (editingUser) {
      editUserMutation.mutate({ ...data, userId: editingUser.id });
    }
  };

  const getRoleBadgeColor = (level: number) => {
    if (level <= 2) return "bg-red-100 text-red-800";
    if (level <= 4) return "bg-orange-100 text-orange-800";
    if (level <= 6) return "bg-blue-100 text-blue-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">จัดการผู้ใช้และสิทธิ์</h1>
          <p className="text-muted-foreground">จัดการผู้ใช้ในระบบและกำหนดบทบาทตามสิทธิ์ 8 ระดับ</p>
        </div>
        <div className="flex gap-2">
          {canAccess("user_management", "write") && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  เพิ่มผู้ใช้ใหม่
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลผู้ใช้ใหม่และเลือกบทบาทที่เหมาะสม
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateUser)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ชื่อ</FormLabel>
                          <FormControl>
                            <Input placeholder="ชื่อ" {...field} />
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
                          <div className="relative">
                            <Input 
                              type={showCreatePassword ? "text" : "password"} 
                              placeholder="รหัสผ่าน" 
                              {...field} 
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowCreatePassword(!showCreatePassword)}
                            >
                              {showCreatePassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
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
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกบทบาท" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <Badge className={getRoleBadgeColor(role.level)}>
                                    ระดับ {role.level}
                                  </Badge>
                                  {role.displayName}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <UserPlus className="w-4 h-4 mr-2" />
                      )}
                      สร้างผู้ใช้
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Roles Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                บทบาทในระบบ ({roles.length} บทบาท)
              </CardTitle>
              <CardDescription>
                ระบบจัดการสิทธิ์แบบลำดับชั้น จากระดับสูงสุด (1) ไปยังระดับต่ำสุด
              </CardDescription>
            </div>
            <Dialog open={isCreateRoleDialogOpen} onOpenChange={setIsCreateRoleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มบทบาท
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>เพิ่มบทบาทใหม่</DialogTitle>
                  <DialogDescription>
                    สร้างบทบาทใหม่สำหรับจัดการสิทธิ์ผู้ใช้
                  </DialogDescription>
                </DialogHeader>
                <Form {...createRoleForm}>
                  <form onSubmit={createRoleForm.handleSubmit(handleCreateRole)} className="space-y-4">
                    <FormField
                      control={createRoleForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ชื่อบทบาท (ภาษาอังกฤษ)</FormLabel>
                          <FormControl>
                            <Input placeholder="MANAGER" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createRoleForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ชื่อแสดง</FormLabel>
                          <FormControl>
                            <Input placeholder="ผู้จัดการ" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createRoleForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>คำอธิบาย (ไม่บังคับ)</FormLabel>
                          <FormControl>
                            <Input placeholder="อธิบายหน้าที่ของบทบาทนี้" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createRoleForm.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ระดับสิทธิ์</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="100" 
                              placeholder="9" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateRoleDialogOpen(false)}>
                        ยกเลิก
                      </Button>
                      <Button type="submit" disabled={createRoleMutation.isPending}>
                        {createRoleMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        สร้างบทบาท
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {rolesLoading ? (
              <div className="col-span-full flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              roles.map((role) => {
                const userCount = users.filter((u) => u.role?.id === role.id).length;
                return (
                  <Card key={role.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getRoleBadgeColor(role.level)}>
                        ระดับ {role.level}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {userCount} คน
                        </span>
                        {userCount === 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRole(role)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold">{role.displayName}</h3>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            รายชื่อผู้ใช้
          </CardTitle>
          <CardDescription>
            จัดการผู้ใช้ทั้งหมดในระบบและกำหนดบทบาท
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ผู้ใช้</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">@{user.username}</div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.role ? (
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeColor(user.role.level)}>
                            ระดับ {user.role.level}
                          </Badge>
                          <span>{user.role.displayName}</span>
                        </div>
                      ) : (
                        <Badge variant="outline">ไม่มีบทบาท</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "ใช้งานได้" : "ปิดใช้งาน"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          แก้ไข
                        </Button>
                        <Button
                          size="sm"
                          variant={user.isActive ? "destructive" : "default"}
                          onClick={() => handleToggleUserStatus(user)}
                          disabled={toggleUserStatusMutation.isPending}
                        >
                          {user.isActive ? (
                            <>
                              <UserX className="w-4 h-4 mr-2" />
                              ระงับ
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 mr-2" />
                              เปิดใช้งาน
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          ลบ
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>



      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลผู้ใช้</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลของ {editingUser?.firstName} {editingUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleSubmitEdit)} className="space-y-4">
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
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ</FormLabel>
                    <FormControl>
                      <Input placeholder="ชื่อ" {...field} />
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสผ่านใหม่ (เว้นว่างหากไม่ต้องการเปลี่ยน)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showEditPassword ? "text" : "password"} 
                          placeholder="รหัสผ่านใหม่" 
                          {...field} 
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                        >
                          {showEditPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
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
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกบทบาท" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Badge className={getRoleBadgeColor(role.level)}>
                                ระดับ {role.level}
                              </Badge>
                              {role.displayName}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={editUserMutation.isPending}>
                  {editUserMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Edit className="w-4 h-4 mr-2" />
                  )}
                  บันทึกการแก้ไข
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              ยืนยันการลบผู้ใช้
            </AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบผู้ใช้ <strong>{deletingUser?.firstName} {deletingUser?.lastName}</strong> (@{deletingUser?.username})?
              <br /><br />
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>หมายเหตุ:</strong> การลบนี้เป็นการลบแบบปลอดภัย ข้อมูลงานที่ผู้ใช้เคยทำจะยังคงอยู่ในระบบ 
                    แต่ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้อีก
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              disabled={deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              ลบผู้ใช้
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Role Confirmation Dialog */}
      <AlertDialog open={isDeleteRoleDialogOpen} onOpenChange={setIsDeleteRoleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              ยืนยันการลบบทบาท
            </AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบบทบาท <strong>{deletingRole?.displayName}</strong> (ระดับ {deletingRole?.level})?
              <br /><br />
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <strong>คำเตือน:</strong> การลบบทบาทจะไม่สามารถกู้คืนได้ กรุณาตรวจสอบให้แน่ใจว่าไม่มีผู้ใช้ใดใช้บทบาทนี้อยู่
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteRole}
              disabled={deleteRoleMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteRoleMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              ลบบทบาท
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Main export with protection
export default function ProtectedUserManagement() {
  return (
    <ProtectedRoute 
      requiredPermissions={[
        { resource: "user_management", action: "read" }
      ]}
      requireAll={true}
    >
      <UserManagement />
    </ProtectedRoute>
  );
}