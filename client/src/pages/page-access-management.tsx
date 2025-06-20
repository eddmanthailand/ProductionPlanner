import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldCheck, RefreshCw, Plus, Users, CheckCircle } from "lucide-react";

// Types matching the backend response
type Role = { id: number; name: string; displayName: string };
type Page = { name: string; url: string };
type AccessRule = { roleId: number; pageUrl: string; accessLevel: AccessLevel };
type AccessLevel = "none" | "read" | "edit" | "create";

// Type for API response
interface PageAccessConfig {
  roles: Role[];
  pages: Page[];
  currentAccess: { roleId: number; pageUrl: string; accessLevel: AccessLevel }[];
}

// Type for the permission matrix state
type PermissionMatrix = Record<string, Record<number, AccessLevel>>;

export default function PageAccessManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<PermissionMatrix>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: config, isLoading, error, refetch } = useQuery<PageAccessConfig>({
    queryKey: ["pageAccessConfig"],
    queryFn: async () => {
      const response = await fetch("/api/page-access-management/config");
      if (!response.ok) {
        throw new Error("Failed to fetch page access configuration");
      }
      return response.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Omit<AccessRule, "id">[]) => {
      const response = await fetch("/api/page-access-management/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error("Failed to update permissions");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "บันทึกการเปลี่ยนแปลงสิทธิ์เรียบร้อยแล้ว",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["pageAccessConfig"] });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/page-access-management/create-all", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to create all permissions");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "สร้างสิทธิ์ครบถ้วนเรียบร้อยแล้ว",
      });
      queryClient.invalidateQueries({ queryKey: ["pageAccessConfig"] });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const buildPermissionMatrix = (config: PageAccessConfig): PermissionMatrix => {
    const matrix: PermissionMatrix = {};
    if (!config?.pages || !config?.roles) return matrix;
    
    config.pages.forEach(page => {
      matrix[page.url] = {};
      config.roles.forEach(role => {
        const access = config.currentAccess?.find(
          a => a.roleId === role.id && a.pageUrl === page.url
        );
        matrix[page.url][role.id] = access?.accessLevel || "none";
      });
    });
    return matrix;
  };

  // Initialize permissions matrix when config loads
  useEffect(() => {
    if (config) {
      setPermissions(buildPermissionMatrix(config));
    }
  }, [config]);

  const accessLevels: AccessLevel[] = ["none", "read", "edit", "create"];
  const accessLevelLabels = {
    none: "ไม่มีสิทธิ์",
    read: "ดูได้",
    edit: "แก้ไขได้",
    create: "สร้างได้",
  };

  const handlePermissionChange = (pageUrl: string, roleId: number, level: AccessLevel) => {
    setPermissions(prev => ({
      ...prev,
      [pageUrl]: {
        ...prev[pageUrl],
        [roleId]: level,
      },
    }));
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    if (!config?.pages || !config?.roles) return;

    const updatedList: Omit<AccessRule, "id">[] = [];
    const originalMatrix = buildPermissionMatrix(config);
    
    config.pages.forEach(page => {
      config.roles.forEach(role => {
        const originalLevel = originalMatrix[page.url]?.[role.id] || 'none';
        const currentLevel = permissions[page.url]?.[role.id] || 'none';
        if (originalLevel !== currentLevel) {
          updatedList.push({
            pageUrl: page.url,
            roleId: role.id,
            accessLevel: currentLevel,
          });
        }
      });
    });

    if (updatedList.length > 0) {
      updateMutation.mutate(updatedList);
    } else {
       toast({ title: "ไม่มีการเปลี่ยนแปลง", description: "ไม่มีข้อมูลที่ต้องบันทึก" });
    }
  };

  const handleCreateAllPermissions = () => {
    createAllMutation.mutate();
  };

  // Filter out the 'Admin' role from columns, as they have all permissions by default.
  const displayRoles = useMemo(() => config?.roles.filter(r => r.name !== 'ADMIN') ?? [], [config]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-4 text-lg">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
        <AlertDescription>
          ไม่สามารถโหลดข้อมูลการจัดการสิทธิ์ได้ กรุณาลองอีกครั้งในภายหลัง
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <div className="flex-1 p-6 overflow-hidden">
        <div className="w-full h-full flex flex-col">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <ShieldCheck className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">จัดการสิทธิ์การเข้าถึงหน้า</h1>
                <p className="text-lg text-gray-600">
                  กำหนดสิทธิ์การเข้าถึงหน้าต่างๆ ในระบบสำหรับแต่ละตำแหน่ง
                </p>
              </div>
            </div>
          </div>

          {/* Statistics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">จำนวนหน้าทั้งหมด</p>
                  <p className="text-3xl font-bold">{config?.pages?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-400 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">จำนวนบทบาท</p>
                  <p className="text-3xl font-bold">{displayRoles?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-400 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">สิทธิ์ที่กำหนดแล้ว</p>
                  <p className="text-3xl font-bold">{config?.currentAccess?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-400 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">การเปลี่ยนแปลง</p>
                  <p className="text-3xl font-bold">{hasChanges ? '1' : '0'}</p>
                </div>
                <div className="w-12 h-12 bg-orange-400 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  รีเฟรช
                </Button>
                <Button
                  onClick={handleCreateAllPermissions}
                  disabled={createAllMutation.isPending}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  {createAllMutation.isPending ? 'กำลังสร้าง...' : 'สร้างสิทธิ์ครบถ้วน'}
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setPermissions(buildPermissionMatrix(config))}
                  disabled={!hasChanges || updateMutation.isPending}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  ยกเลิกการเปลี่ยนแปลง
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  disabled={!hasChanges || updateMutation.isPending}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  {updateMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Table Header with Enhanced Styling */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h3 className="text-xl font-semibold text-white">ตารางสิทธิ์การเข้าถึง</h3>
                <p className="text-blue-100 text-sm mt-1">จัดการสิทธิ์สำหรับ {config?.pages?.length || 0} หน้า และ {displayRoles?.length || 0} ตำแหน่ง</p>
              </div>
              
              <div className="overflow-auto max-h-[calc(100vh-450px)]">
                <Table className="relative w-full table-fixed">
                  <TableHeader className="sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-blue-200 z-10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-1/3 px-6 py-4 text-left font-bold text-gray-800 border-r-2 border-blue-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-base">หน้าระบบ</span>
                        </div>
                      </TableHead>
                      {displayRoles && displayRoles.map((role, index) => (
                        <TableHead 
                          key={role.id} 
                          className={`px-4 py-4 text-center font-bold text-gray-800 border-r border-gray-300 ${
                            index % 2 === 0 ? 'bg-blue-50' : 'bg-indigo-50'
                          }`}
                          style={{ width: `${Math.floor(67 / displayRoles.length)}%` }}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              index % 2 === 0 ? 'bg-blue-500' : 'bg-indigo-500'
                            }`}>
                              {role.displayName.charAt(0)}
                            </div>
                            <span className="text-base">{role.displayName}</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config?.pages?.map((page, index) => (
                      <TableRow 
                        key={page.url} 
                        className={`transition-all duration-200 hover:bg-blue-50 hover:shadow-md ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <TableCell className="px-6 py-4 font-medium text-gray-900 border-r-2 border-blue-100">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              index % 3 === 0 ? 'bg-green-400' : 
                              index % 3 === 1 ? 'bg-yellow-400' : 'bg-purple-400'
                            }`}></div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-base text-gray-800 truncate">{page.name}</div>
                              <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded mt-1 inline-block truncate max-w-full">
                                {page.url}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        {displayRoles && displayRoles.map((role, roleIndex) => (
                          <TableCell key={role.id} className="text-center p-3 border-r border-gray-200">
                            <Select
                              value={permissions[page.url]?.[role.id] || "none"}
                              onValueChange={(value: AccessLevel) =>
                                handlePermissionChange(page.url, role.id, value)
                              }
                            >
                              <SelectTrigger className={`w-full h-10 border-2 transition-all duration-200 ${
                                permissions[page.url]?.[role.id] === 'create' ? 'border-green-300 bg-green-50 text-green-800' :
                                permissions[page.url]?.[role.id] === 'edit' ? 'border-blue-300 bg-blue-50 text-blue-800' :
                                permissions[page.url]?.[role.id] === 'read' ? 'border-yellow-300 bg-yellow-50 text-yellow-800' :
                                'border-gray-300 bg-gray-50 text-gray-600'
                              } hover:shadow-md focus:shadow-lg`}>
                                <SelectValue placeholder="เลือกระดับ" />
                              </SelectTrigger>
                              <SelectContent>
                                {accessLevels.map(level => (
                                  <SelectItem 
                                    key={level} 
                                    value={level}
                                    className={`py-2 px-3 ${
                                      level === 'create' ? 'text-green-700 hover:bg-green-50' :
                                      level === 'edit' ? 'text-blue-700 hover:bg-blue-50' :
                                      level === 'read' ? 'text-yellow-700 hover:bg-yellow-50' :
                                      'text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${
                                        level === 'create' ? 'bg-green-500' :
                                        level === 'edit' ? 'bg-blue-500' :
                                        level === 'read' ? 'bg-yellow-500' :
                                        'bg-gray-400'
                                      }`}></div>
                                      <span className="font-medium text-sm">{accessLevelLabels[level]}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        ))}
                      </TableRow>
                    )) || []}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}