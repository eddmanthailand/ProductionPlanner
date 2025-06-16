import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Users, Settings, Eye, Plus, Edit, Trash2, FileText } from "lucide-react";

interface Permission {
  id: number;
  name: string;
  description: string;
  module: string;
  action: string;
}

interface RolePermission {
  id: number;
  role: string;
  permission_id: number;
  granted: boolean;
  permission: Permission;
}

interface PermissionsByRole {
  [role: string]: RolePermission[];
}

export default function Permissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("admin");

  const { data: permissions, isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ["/api/permissions"]
  });

  const { data: rolePermissions, isLoading: rolePermissionsLoading } = useQuery<RolePermission[]>({
    queryKey: ["/api/role-permissions"]
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ role, permissionId, granted }: { role: string; permissionId: number; granted: boolean }) => {
      const res = await apiRequest(`/api/role-permissions/${role}/${permissionId}`, "PUT", { granted });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-permissions"] });
      toast({
        title: "สำเร็จ",
        description: "อัปเดตสิทธิ์การใช้งานเรียบร้อยแล้ว",
      });
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถอัปเดตสิทธิ์ได้",
        variant: "destructive"
      });
    }
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'view': return <Eye className="w-4 h-4" />;
      case 'create': return <Plus className="w-4 h-4" />;
      case 'edit': return <Edit className="w-4 h-4" />;
      case 'delete': return <Trash2 className="w-4 h-4" />;
      case 'reports': return <FileText className="w-4 h-4" />;
      case 'permissions': return <Settings className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'view': return 'bg-blue-100 text-blue-800';
      case 'create': return 'bg-green-100 text-green-800';
      case 'edit': return 'bg-yellow-100 text-yellow-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'reports': return 'bg-purple-100 text-purple-800';
      case 'permissions': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'manager': return <Settings className="w-4 h-4" />;
      case 'user': return <Users className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'manager': return 'ผู้จัดการ';
      case 'user': return 'ผู้ใช้งาน';
      default: return role;
    }
  };

  const handlePermissionToggle = (role: string, permissionId: number, granted: boolean) => {
    updatePermissionMutation.mutate({ role, permissionId, granted });
  };

  if (permissionsLoading || rolePermissionsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">จัดการสิทธิ์การใช้งาน</h1>
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

  // จัดกลุ่มสิทธิ์ตามบทบาท
  const permissionsByRole: PermissionsByRole = {};
  rolePermissions?.forEach(rp => {
    if (!permissionsByRole[rp.role]) {
      permissionsByRole[rp.role] = [];
    }
    permissionsByRole[rp.role].push(rp);
  });

  // จัดกลุ่มสิทธิ์ตาม module
  const permissionsByModule: { [module: string]: Permission[] } = {};
  permissions?.forEach(permission => {
    if (!permissionsByModule[permission.module]) {
      permissionsByModule[permission.module] = [];
    }
    permissionsByModule[permission.module].push(permission);
  });

  const roles = ['admin', 'manager', 'user'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการสิทธิ์การใช้งาน</h1>
          <p className="text-gray-600">กำหนดสิทธิ์การเข้าถึงหน้าต่างๆ สำหรับแต่ละบทบาท</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roles.map(role => {
          const rolePerms = permissionsByRole[role] || [];
          const grantedCount = rolePerms.filter(rp => rp.granted).length;
          const totalCount = rolePerms.length;
          
          return (
            <Card key={role}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getRoleIcon(role)}
                  {getRoleText(role)}
                </CardTitle>
                <Badge variant="outline">
                  {grantedCount}/{totalCount}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{grantedCount}</div>
                <p className="text-xs text-muted-foreground">
                  สิทธิ์ที่ได้รับจากทั้งหมด {totalCount} สิทธิ์
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Permission Management */}
      <Card>
        <CardHeader>
          <CardTitle>ตารางสิทธิ์การใช้งาน</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedRole} onValueChange={setSelectedRole}>
            <TabsList className="grid w-full grid-cols-3">
              {roles.map(role => (
                <TabsTrigger key={role} value={role} className="flex items-center gap-2">
                  {getRoleIcon(role)}
                  {getRoleText(role)}
                </TabsTrigger>
              ))}
            </TabsList>

            {roles.map(role => (
              <TabsContent key={role} value={role} className="mt-6">
                <div className="space-y-6">
                  {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                    <div key={module} className="space-y-4">
                      <h3 className="text-lg font-semibold capitalize">
                        {module.replace('_', ' ')}
                      </h3>
                      
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>การดำเนินการ</TableHead>
                              <TableHead>คำอธิบาย</TableHead>
                              <TableHead className="text-center">สิทธิ์</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {modulePermissions.map(permission => {
                              const rolePermission = permissionsByRole[role]?.find(
                                rp => rp.permission_id === permission.id
                              );
                              const isGranted = rolePermission?.granted || false;

                              return (
                                <TableRow key={permission.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant="outline" 
                                        className={`${getActionColor(permission.action)} border-0`}
                                      >
                                        {getActionIcon(permission.action)}
                                        <span className="ml-1 capitalize">{permission.action}</span>
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell>{permission.description}</TableCell>
                                  <TableCell className="text-center">
                                    <Switch
                                      checked={isGranted}
                                      onCheckedChange={(checked) => 
                                        handlePermissionToggle(role, permission.id, checked)
                                      }
                                      disabled={updatePermissionMutation.isPending}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}