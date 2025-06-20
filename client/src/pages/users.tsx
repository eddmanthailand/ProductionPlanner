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
import { useToast } from "@/hooks/use-toast";
import { Plus, User, Shield, Settings } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

interface Role {
  id: number;
  name: string;
  displayName: string;
}

// Form validation schema
const createUserSchema = z.object({
  username: z.string().min(1, "กรุณากรอกชื่อผู้ใช้"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  firstName: z.string().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  roleId: z.coerce.number().min(1, "กรุณาเลือกบทบาท")
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export default function Users() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const { data: roles } = useQuery<Role[]>({
    queryKey: ["/api/roles"]
  });

  // Form setup
  const form = useForm<CreateUserFormData>({
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

  // Mutation for creating new user
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "สำเร็จ",
        description: "สร้างผู้ใช้ใหม่เรียบร้อยแล้ว",
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

  // Mutation for toggling user status
  const toggleUserStatusMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/toggle-status`);
      return response.json();
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

  // Navigation handlers
  const handleCreateUser = () => {
    console.log("Opening create dialog");
    setIsCreateDialogOpen(true);
  };

  const onSubmit = (data: CreateUserFormData) => {
    console.log("Form submitted:", data);
    createUserMutation.mutate(data);
  };

  const handleEditUser = (userId: number) => {
    console.log("Editing user:", userId);
    setLocation("/user-management");
  };

  const handleToggleUserStatus = (user: User) => {
    console.log("Toggling status for user:", user.id);
    toggleUserStatusMutation.mutate(user.id);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "user":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
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
          <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้</h1>
          <p className="text-gray-600">จัดการสิทธิ์การเข้าใช้งานและบทบาทของผู้ใช้</p>
        </div>
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
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ผู้ดูแลระบบ</p>
                <p className="text-2xl font-bold text-red-600">{adminUsers}</p>
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

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>รายชื่อผู้ใช้งาน</CardTitle>
        </CardHeader>
        <CardContent>
          {!users || users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">ยังไม่มีผู้ใช้งานในระบบ</p>
              <Button onClick={handleCreateUser}>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มผู้ใช้แรก
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {user.firstName} {user.lastName}
                        </h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <span>{user.email}</span>
                          <span>@{user.username}</span>
                          <Badge className={`${getRoleColor(user.role)} flex items-center space-x-1`}>
                            {getRoleIcon(user.role)}
                            <span>{getRoleText(user.role)}</span>
                          </Badge>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "ใช้งานอยู่" : "ไม่ใช้งาน"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditUser(user.id)}
                      >
                        แก้ไข
                      </Button>
                      <Button 
                        variant={user.isActive ? "destructive" : "default"} 
                        size="sm"
                        onClick={() => handleToggleUserStatus(user)}
                        disabled={toggleUserStatusMutation.isPending}
                      >
                        {toggleUserStatusMutation.isPending ? "กำลังดำเนินการ..." : 
                         user.isActive ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อผู้ใช้</FormLabel>
                    <FormControl>
                      <Input placeholder="กรอกชื่อผู้ใช้" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อีเมล (ไม่จำเป็น)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="กรอกอีเมล" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อ</FormLabel>
                      <FormControl>
                        <Input placeholder="กรอกชื่อ" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>นามสกุล</FormLabel>
                      <FormControl>
                        <Input placeholder="กรอกนามสกุล" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสผ่าน</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="กรอกรหัสผ่าน" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
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
    </div>
  );
}
