import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions, useRolePermissions, Permission } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Users, Settings, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Role {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  isActive: boolean;
}

export default function PermissionsManagement() {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all permissions
  const { permissions, isLoading: permissionsLoading } = usePermissions();

  // Fetch permissions for selected role
  const { rolePermissions, isLoading: rolePermissionsLoading } = useRolePermissions(selectedRoleId || 0);

  // Initialize permissions mutation
  const initializePermissionsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/permissions/initialize", "POST");
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "เริ่มต้นระบบสิทธิ์เรียบร้อยแล้ว",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเริ่มต้นระบบสิทธิ์ได้",
        variant: "destructive",
      });
    },
  });

  // Assign permission mutation
  const assignPermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: number; permissionId: number }) => {
      await apiRequest(`/api/roles/${roleId}/permissions/${permissionId}`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "กำหนดสิทธิ์เรียบร้อยแล้ว",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/roles", selectedRoleId, "permissions"] });
    },
    onError: () => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถกำหนดสิทธิ์ได้",
        variant: "destructive",
      });
    },
  });

  // Remove permission mutation
  const removePermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: number; permissionId: number }) => {
      await apiRequest(`/api/roles/${roleId}/permissions/${permissionId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "ยกเลิกสิทธิ์เรียบร้อยแล้ว",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/roles", selectedRoleId, "permissions"] });
    },
    onError: () => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกสิทธิ์ได้",
        variant: "destructive",
      });
    },
  });

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const module = permission.module;
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Filter permissions by selected module
  const filteredPermissions = selectedModule === "all" 
    ? permissions 
    : groupedPermissions[selectedModule] || [];

  // Check if permission is assigned to role
  const isPermissionAssigned = (permissionId: number) => {
    return rolePermissions.some(rp => rp.id === permissionId);
  };

  // Handle permission toggle
  const handlePermissionToggle = (permission: Permission, isChecked: boolean) => {
    if (!selectedRoleId) return;

    if (isChecked) {
      assignPermissionMutation.mutate({
        roleId: selectedRoleId,
        permissionId: permission.id,
      });
    } else {
      removePermissionMutation.mutate({
        roleId: selectedRoleId,
        permissionId: permission.id,
      });
    }
  };

  const modules = Object.keys(groupedPermissions);
  const selectedRole = roles.find(role => role.id === selectedRoleId);

  if (rolesLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            จัดการสิทธิ์การเข้าถึง
          </h1>
          <p className="text-muted-foreground">กำหนดสิทธิ์การเข้าถึงหน้าต่างๆ ให้กับบทบาทต่างๆ</p>
        </div>
        
        {permissions.length === 0 && (
          <Button
            onClick={() => initializePermissionsMutation.mutate()}
            disabled={initializePermissionsMutation.isPending}
          >
            {initializePermissionsMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Settings className="w-4 h-4 mr-2" />
            )}
            เริ่มต้นระบบสิทธิ์
          </Button>
        )}
      </div>

      {permissions.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ยังไม่มีข้อมูลสิทธิ์ในระบบ กรุณากดปุ่ม "เริ่มต้นระบบสิทธิ์" เพื่อสร้างสิทธิ์พื้นฐานสำหรับหน้าต่างๆ ในระบบ
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs defaultValue="assign" className="space-y-6">
          <TabsList>
            <TabsTrigger value="assign">กำหนดสิทธิ์</TabsTrigger>
            <TabsTrigger value="overview">ภาพรวมสิทธิ์</TabsTrigger>
          </TabsList>

          <TabsContent value="assign" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  เลือกบทบาท
                </CardTitle>
                <CardDescription>
                  เลือกบทบาทที่ต้องการกำหนดสิทธิ์การเข้าถึง
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedRoleId?.toString() || ""} onValueChange={(value) => setSelectedRoleId(Number(value))}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="เลือกบทบาท" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{role.displayName}</span>
                          <Badge variant="outline">ระดับ {role.level}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedRoleId && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>สิทธิ์สำหรับบทบาท: {selectedRole?.displayName}</CardTitle>
                      <CardDescription>
                        กำหนดสิทธิ์การเข้าถึงหน้าต่างๆ ในระบบ
                      </CardDescription>
                    </div>
                    <Select value={selectedModule} onValueChange={setSelectedModule}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="เลือกโมดูล" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทุกโมดูล</SelectItem>
                        {modules.map((module) => (
                          <SelectItem key={module} value={module}>
                            {module}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {rolePermissionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(
                        filteredPermissions.reduce((acc, permission) => {
                          const module = permission.module;
                          if (!acc[module]) {
                            acc[module] = [];
                          }
                          acc[module].push(permission);
                          return acc;
                        }, {} as Record<string, Permission[]>)
                      ).map(([module, modulePermissions]) => (
                        <div key={module} className="space-y-3">
                          <h3 className="font-semibold text-lg capitalize">{module}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {modulePermissions.map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-start space-x-3 p-3 border rounded-lg"
                              >
                                <Checkbox
                                  id={`permission-${permission.id}`}
                                  checked={isPermissionAssigned(permission.id)}
                                  onCheckedChange={(checked) => 
                                    handlePermissionToggle(permission, checked as boolean)
                                  }
                                  disabled={assignPermissionMutation.isPending || removePermissionMutation.isPending}
                                />
                                <div className="flex-1 space-y-1">
                                  <label
                                    htmlFor={`permission-${permission.id}`}
                                    className="text-sm font-medium leading-none cursor-pointer"
                                  >
                                    {permission.displayName}
                                  </label>
                                  {permission.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {permission.description}
                                    </p>
                                  )}
                                  <div className="flex gap-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {permission.action}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {permission.resource}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ภาพรวมสิทธิ์ทั้งหมด</CardTitle>
                <CardDescription>
                  แสดงรายการสิทธิ์ทั้งหมดในระบบจัดกลุ่มตามโมดูล
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                    <div key={module} className="space-y-3">
                      <h3 className="font-semibold text-lg capitalize flex items-center gap-2">
                        {module}
                        <Badge variant="secondary">{modulePermissions.length} สิทธิ์</Badge>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {modulePermissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="p-3 border rounded-lg space-y-2"
                          >
                            <div className="font-medium text-sm">{permission.displayName}</div>
                            {permission.description && (
                              <div className="text-xs text-muted-foreground">
                                {permission.description}
                              </div>
                            )}
                            <div className="flex gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {permission.action}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {permission.resource}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}