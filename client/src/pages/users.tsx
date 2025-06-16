import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, User, Shield, Settings, Edit, Trash2, Mail, Phone, Eye, EyeOff } from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string | null;
  first_name: string;
  last_name: string;
  role: string;
  is_active?: boolean;
  team_id?: string | null;
  tenant_id?: string | null;
}

export default function Users() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    confirmPassword: "",
    role: "accountant"
  });
  const [editFormData, setEditFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "accountant",
    password: "",
    confirmPassword: ""
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  // Helper function to get initials safely
  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || "";
    const last = lastName?.charAt(0)?.toUpperCase() || "";
    return first + last || "U";
  };

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof formData) => {
      // Check password confirmation
      if (userData.password !== userData.confirmPassword) {
        throw new Error("รหัสผ่านไม่ตรงกัน");
      }
      
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...apiData } = userData;
      const res = await apiRequest("/api/users", "POST", apiData);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setOpen(false);
      setFormData({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        confirmPassword: "",
        role: "accountant"
      });
      toast({
        title: "สำเร็จ",
        description: "เพิ่มผู้ใช้ใหม่เรียบร้อยแล้ว",
      });
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถเพิ่มผู้ใช้ได้",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: { id: number; data: typeof editFormData }) => {
      const res = await apiRequest(`/api/users/${userData.id}`, "PUT", userData.data);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditOpen(false);
      setEditingUser(null);
      toast({
        title: "สำเร็จ",
        description: "แก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว",
      });
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถแก้ไขข้อมูลผู้ใช้ได้",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditInputChange = (field: string, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password confirmation if password is provided
    if (editFormData.password && editFormData.password !== editFormData.confirmPassword) {
      toast({
        title: "ข้อผิดพลาด",
        description: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน",
        variant: "destructive",
      });
      return;
    }
    
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data: editFormData });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username,
      email: user.email || "",
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      password: "",
      confirmPassword: ""
    });
    setEditOpen(true);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "system_admin":
        return "ผู้ดูแลระบบ";
      case "managing_director":
        return "กรรมการผู้จัดการ";
      case "factory_manager":
        return "ผู้จัดการโรงงาน";
      case "accounting_manager":
        return "ผู้จัดการฝ่ายบัญชี";
      case "production_team_leader":
        return "หัวหน้าทีมผลิต";
      case "accountant":
        return "เจ้าหน้าที่บัญชี";
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "system_admin":
        return <Shield className="w-4 h-4" />;
      case "managing_director":
      case "factory_manager":
      case "accounting_manager":
        return <Settings className="w-4 h-4" />;
      case "production_team_leader":
      case "accountant":
        return <User className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "system_admin":
        return "destructive";
      case "managing_director":
        return "default";
      case "factory_manager":
        return "default";
      case "accounting_manager":
        return "secondary";
      case "production_team_leader":
        return "secondary";
      case "accountant":
        return "outline";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <Button disabled>เพิ่มผู้ใช้ใหม่</Button>
        </div>
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle>กำลังโหลด...</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          จัดการผู้ใช้
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มผู้ใช้ใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">ชื่อ *</Label>
                  <Input
                    id="firstName"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange("first_name", e.target.value)}
                    placeholder="กรอกชื่อ"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">นามสกุล *</Label>
                  <Input
                    id="lastName"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange("last_name", e.target.value)}
                    placeholder="กรอกนามสกุล"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">ชื่อผู้ใช้ *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  placeholder="กรอกชื่อผู้ใช้"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="กรอกอีเมล (ไม่บังคับ)"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    placeholder="กรอกรหัสผ่าน"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">บทบาท</Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกบทบาท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system_admin">ผู้ดูแลระบบ</SelectItem>
                    <SelectItem value="managing_director">กรรมการผู้จัดการ</SelectItem>
                    <SelectItem value="factory_manager">ผู้จัดการโรงงาน</SelectItem>
                    <SelectItem value="accounting_manager">ผู้จัดการฝ่ายบัญชี</SelectItem>
                    <SelectItem value="production_team_leader">หัวหน้าทีมผลิต</SelectItem>
                    <SelectItem value="accountant">เจ้าหน้าที่บัญชี</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "กำลังเพิ่ม..." : "เพิ่มผู้ใช้"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลผู้ใช้</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">ชื่อ *</Label>
                <Input
                  id="edit-firstName"
                  value={editFormData.first_name}
                  onChange={(e) => handleEditInputChange("first_name", e.target.value)}
                  placeholder={editingUser ? `เดิม: ${editingUser.first_name}` : "กรอกชื่อ"}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">นามสกุล *</Label>
                <Input
                  id="edit-lastName"
                  value={editFormData.last_name}
                  onChange={(e) => handleEditInputChange("last_name", e.target.value)}
                  placeholder={editingUser ? `เดิม: ${editingUser.last_name}` : "กรอกนามสกุล"}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-username">ชื่อผู้ใช้ *</Label>
              <Input
                id="edit-username"
                value={editFormData.username}
                onChange={(e) => handleEditInputChange("username", e.target.value)}
                placeholder={editingUser ? `เดิม: ${editingUser.username}` : "กรอกชื่อผู้ใช้"}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-email">อีเมล</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => handleEditInputChange("email", e.target.value)}
                placeholder={editingUser ? (editingUser.email ? `เดิม: ${editingUser.email}` : "ไม่ได้ระบุ") : "กรอกอีเมล (ไม่บังคับ)"}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-role">บทบาท</Label>
              <Select value={editFormData.role} onValueChange={(value) => handleEditInputChange("role", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบทบาท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system_admin">ผู้ดูแลระบบ</SelectItem>
                  <SelectItem value="managing_director">กรรมการผู้จัดการ</SelectItem>
                  <SelectItem value="factory_manager">ผู้จัดการโรงงาน</SelectItem>
                  <SelectItem value="accounting_manager">ผู้จัดการฝ่ายบัญชี</SelectItem>
                  <SelectItem value="production_team_leader">หัวหน้าทีมผลิต</SelectItem>
                  <SelectItem value="accountant">เจ้าหน้าที่บัญชี</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-password">รหัสผ่านใหม่ (เว้นว่างหากไม่ต้องการเปลี่ยน)</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showEditPassword ? "text" : "password"}
                  value={editFormData.password}
                  onChange={(e) => handleEditInputChange("password", e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                >
                  {showEditPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
              <div className="relative">
                <Input
                  id="edit-confirmPassword"
                  type={showEditConfirmPassword ? "text" : "password"}
                  value={editFormData.confirmPassword}
                  onChange={(e) => handleEditInputChange("confirmPassword", e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowEditConfirmPassword(!showEditConfirmPassword)}
                >
                  {showEditConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Users Table */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <User className="w-5 h-5" />
            <span>รายชื่อผู้ใช้ในระบบ ({users?.length || 0} คน)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 border-b-2 border-gray-200">
                  <TableHead className="font-semibold text-gray-700 py-4">ผู้ใช้</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-4">ข้อมูลติดต่อ</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-4">บทบาท</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-4 text-center">สถานะ</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-4 text-center">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id} className="hover:bg-blue-50/50 transition-all duration-200 border-b border-gray-100">
                    <TableCell className="py-4">
                      <div>
                        <div className="font-semibold text-gray-900 text-base">{user.first_name} {user.last_name}</div>
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <User className="w-3 h-3 mr-1" />
                          @{user.username}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        {user.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="w-4 h-4 mr-2 text-blue-500" />
                            <span className="hover:text-blue-600 transition-colors">{user.email}</span>
                          </div>
                        )}
                        {!user.email && (
                          <div className="text-sm text-gray-400 italic">ไม่ระบุอีเมล</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge 
                        variant={getRoleColor(user.role) as any}
                        className="flex items-center space-x-1 w-fit px-3 py-1 font-medium"
                      >
                        {getRoleIcon(user.role)}
                        <span>{getRoleLabel(user.role)}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 font-medium">
                        ใช้งานอยู่
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-all duration-200 font-medium"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        แก้ไข
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {users && users.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">ไม่พบข้อมูลผู้ใช้</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}