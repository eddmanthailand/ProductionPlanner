import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Edit, Trash2, Loader2, Shield, Users, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Types
interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  level: number;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  tenantId: string | null;
}

interface UserWithRole {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  role?: Role;
}

// Form schemas
const createUserSchema = z.object({
  username: z.string().min(1, "ชื่อผู้ใช้จำเป็น"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  firstName: z.string().min(1, "ชื่อจำเป็น"),
  lastName: z.string().min(1, "นามสกุลจำเป็น"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  roleId: z.number().min(1, "กรุณาเลือกบทบาท"),
  isActive: z.boolean(),
});

const editUserSchema = z.object({
  firstName: z.string().min(1, "ชื่อจำเป็น"),
  lastName: z.string().min(1, "นามสกุลจำเป็น"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  roleId: z.number().min(1, "กรุณาเลือกบทบาท"),
  isActive: z.boolean(),
});

// Role form schemas
const createRoleSchema = z.object({
  name: z.string().min(1, "ชื่อบทบาทจำเป็น"),
  displayName: z.string().min(1, "ชื่อแสดงจำเป็น"),
  description: z.string().optional(),
  level: z.number().min(1).max(8, "ระดับต้องอยู่ระหว่าง 1-8"),
});

const editRoleSchema = z.object({
  displayName: z.string().min(1, "ชื่อแสดงจำเป็น"),
  description: z.string().optional(),
  level: z.number().min(1).max(8, "ระดับต้องอยู่ระหว่าง 1-8"),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;
type CreateRoleFormData = z.infer<typeof createRoleSchema>;
type EditRoleFormData = z.infer<typeof editRoleSchema>;

function UserManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { getPagePermissions } = usePageNavigation();
  const { canCreate, canEdit, canView } = getPagePermissions("/user-management");
  
  // State variables for users
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // State variables for roles
  const [isCreateRoleDialogOpen, setIsCreateRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  
  console.log("User Management Debug:", { 
    canCreate, 
    canEdit, 
    canView, 
    userRoleId: user?.roleId,
    isCreateDialogOpen 
  });

  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
  } = useQuery<UserWithRole[]>({
    queryKey: ["/api/users-with-roles"],
  });

  const {
    data: roles = [],
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      roleId: 0,
      isActive: true,
    },
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      roleId: 0,
      isActive: true,
    },
  });

  // Role forms
  const createRoleForm = useForm<CreateRoleFormData>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      level: 1,
    },
  });

  const editRoleForm = useForm<EditRoleFormData>({
    resolver: zodResolver(editRoleSchema),
    defaultValues: {
      displayName: "",
      description: "",
      level: 1,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const response = await apiRequest("POST", "/api/users", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "สร้างผู้ใช้ใหม่เรียบร้อยแล้ว",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users-with-roles"] });
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
    mutationFn: async (data: EditUserFormData) => {
      if (!editingUser) throw new Error("ไม่พบข้อมูลผู้ใช้");
      const response = await apiRequest("PUT", `/api/users/${editingUser.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "แก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว",
      });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users-with-roles"] });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/users/${userId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "ลบผู้ใช้เรียบร้อยแล้ว",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users-with-roles"] });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Role mutations
  const createRoleMutation = useMutation({
    mutationFn: async (data: CreateRoleFormData) => {
      const response = await apiRequest("POST", "/api/roles", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "สร้างบทบาทใหม่เรียบร้อยแล้ว",
      });
      setIsCreateRoleDialogOpen(false);
      createRoleForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editRoleMutation = useMutation({
    mutationFn: async (data: EditRoleFormData) => {
      if (!editingRole) throw new Error("ไม่พบข้อมูลบทบาท");
      const response = await apiRequest("PUT", `/api/roles/${editingRole.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "แก้ไขข้อมูลบทบาทเรียบร้อยแล้ว",
      });
      setIsEditRoleDialogOpen(false);
      setEditingRole(null);
      editRoleForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const response = await apiRequest("DELETE", `/api/roles/${roleId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "ลบบทบาทเรียบร้อยแล้ว",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users-with-roles"] });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    editForm.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roleId: user.role?.id || 0,
      isActive: user.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user: UserWithRole) => {
    if (confirm(`คุณต้องการลบผู้ใช้ "${user.username}" หรือไม่?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleSubmitEdit = (data: EditUserFormData) => {
    editUserMutation.mutate(data);
  };

  // Role handlers
  const handleCreateRole = (data: CreateRoleFormData) => {
    createRoleMutation.mutate(data);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    editRoleForm.reset({
      displayName: role.displayName,
      description: role.description || "",
      level: role.level,
    });
    setIsEditRoleDialogOpen(true);
  };

  const handleDeleteRole = (role: Role) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบบทบาท "${role.displayName}"?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const handleSubmitEditRole = (data: EditRoleFormData) => {
    editRoleMutation.mutate(data);
  };

  const handleCreateDialog = () => {
    console.log("Opening create dialog");
    setIsCreateDialogOpen(true);
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>จัดการผู้ใช้และสิทธิ์</CardTitle>
          <CardDescription>
            จัดการข้อมูลผู้ใช้และบทบาทในระบบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                จัดการผู้ใช้
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                จัดการบทบาท
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="users" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">จัดการผู้ใช้</h3>
                  <p className="text-sm text-muted-foreground">จัดการข้อมูลผู้ใช้และกำหนดบทบาท</p>
                </div>
                {canCreate && (
                  <Button onClick={handleCreateDialog}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    เพิ่มผู้ใช้ใหม่
                  </Button>
                )}
              </div>
              
              {usersLoading || rolesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อผู้ใช้</TableHead>
                      <TableHead>ชื่อ-นามสกุล</TableHead>
                      <TableHead>อีเมล</TableHead>
                      <TableHead>บทบาท</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>การจัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.firstName} {user.lastName}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role ? "default" : "secondary"}>
                              {user.role?.displayName || "ไม่มีบทบาท"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "destructive"}>
                              {user.isActive ? "ใช้งาน" : "ปิดการใช้งาน"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {canEdit && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              {canCreate && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteUser(user)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="roles" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">จัดการบทบาท</h3>
                    <p className="text-sm text-muted-foreground">จัดการบทบาทและระดับสิทธิ์ในระบบ</p>
                  </div>
                  {canCreate && (
                    <Button onClick={() => setIsCreateRoleDialogOpen(true)}>
                      <Settings className="w-4 h-4 mr-2" />
                      เพิ่มบทบาทใหม่
                    </Button>
                  )}
                </div>
                
                {rolesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ชื่อบทบาท</TableHead>
                        <TableHead>ชื่อแสดง</TableHead>
                        <TableHead>คำอธิบาย</TableHead>
                        <TableHead>ระดับ</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>การจัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell>{role.displayName}</TableCell>
                          <TableCell>{role.description || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">ระดับ {role.level}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={role.isActive ? "default" : "destructive"}>
                              {role.isActive ? "ใช้งาน" : "ปิดการใช้งาน"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {canEdit && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditRole(role)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              {canCreate && role.name !== "ADMIN" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteRole(role)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
            <DialogDescription>กรอกข้อมูลสำหรับสร้างผู้ใช้ใหม่</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateUser)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อผู้ใช้</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Input type="email" {...field} />
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
                        {roles.map((role) => (
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
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
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

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลผู้ใช้</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลของผู้ใช้ {editingUser?.username}</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleSubmitEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Input type="email" {...field} />
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
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกบทบาท" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
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
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={editUserMutation.isPending}>
                  {editUserMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Edit className="w-4 h-4 mr-2" />
                  )}
                  บันทึกการเปลี่ยนแปลง
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProtectedUserManagement() {
  return <UserManagement />;
}