import React, { useState, useEffect, useMemo } from "react";
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
type AccessLevel = "none" | "view" | "edit" | "create";

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
      const response = await fetch("/api/page-access-management/config", {
        cache: 'no-cache', // ป้องกันการ cache ข้อมูลเก่า
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch page access configuration");
      }
      return response.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 0, // ข้อมูลจะ stale ทันที
    cacheTime: 0, // ไม่เก็บ cache
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
      // รีเซ็ต permissions state ให้เป็นค่าว่าง เพื่อให้ useEffect ทำงานใหม่
      setPermissions({});
      // ล้าง cache และ refetch
      queryClient.removeQueries({ queryKey: ["pageAccessConfig"] });
      setTimeout(() => {
        refetch();
      }, 100);
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
      const newMatrix = buildPermissionMatrix(config);
      setPermissions(newMatrix);
      console.log("Updated permissions matrix:", newMatrix);
    }
  }, [config]);

  const accessLevels: AccessLevel[] = ["none", "view", "edit", "create"];
  const accessLevelLabels = {
    none: "ไม่มีสิทธิ์",
    view: "ดูได้",
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
            pageTitle: page.name, // เพิ่ม pageTitle เพื่อป้องกัน null value
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

  // จัดกลุ่มหน้าระบบตามหมวดหมู่
  const groupedPages = useMemo(() => {
    if (!config?.pages) return {};
    
    const groups: { [key: string]: Page[] } = {
      'ระบบหลัก': [],
      'การขาย': [],
      'การผลิต': [],
      'ระบบอื่นๆ': []
    };
    
    config.pages.forEach(page => {
      if (page.url === '/') {
        groups['ระบบหลัก'].push(page);
      } else if (page.url.startsWith('/sales')) {
        groups['การขาย'].push(page);
      } else if (page.url.startsWith('/production')) {
        groups['การผลิต'].push(page);
      } else {
        groups['ระบบอื่นๆ'].push(page);
      }
    });
    
    return groups;
  }, [config?.pages]);

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
          <div className="mb-4">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">จัดการสิทธิ์การเข้าถึงหน้า</h1>
                <p className="text-sm text-gray-600">
                  กำหนดสิทธิ์การเข้าถึงหน้าต่างๆ ในระบบสำหรับแต่ละตำแหน่ง
                </p>
              </div>
            </div>
          </div>

          {/* Statistics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs">จำนวนหน้าทั้งหมด</p>
                  <p className="text-lg font-bold">{config?.pages?.length || 0}</p>
                </div>
                <div className="w-6 h-6 bg-blue-400 rounded flex items-center justify-center">
                  <ShieldCheck className="w-3 h-3" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 text-white shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs">จำนวนบทบาท</p>
                  <p className="text-lg font-bold">{displayRoles?.length || 0}</p>
                </div>
                <div className="w-6 h-6 bg-green-400 rounded flex items-center justify-center">
                  <Users className="w-3 h-3" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 text-white shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs">สิทธิ์ที่กำหนดแล้ว</p>
                  <p className="text-lg font-bold">{config?.currentAccess?.length || 0}</p>
                </div>
                <div className="w-6 h-6 bg-purple-400 rounded flex items-center justify-center">
                  <CheckCircle className="w-3 h-3" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-3 text-white shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-xs">การเปลี่ยนแปลง</p>
                  <p className="text-lg font-bold">{hasChanges ? '1' : '0'}</p>
                </div>
                <div className="w-6 h-6 bg-orange-400 rounded flex items-center justify-center">
                  <RefreshCw className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3 mb-3">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 text-xs"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  รีเฟรช
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateAllPermissions}
                  disabled={createAllMutation.isPending}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-xs"
                >
                  <Plus className="w-3 h-3" />
                  {createAllMutation.isPending ? 'กำลังสร้าง...' : 'สร้างสิทธิ์ครบถ้วน'}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPermissions(buildPermissionMatrix(config))}
                  disabled={!hasChanges || updateMutation.isPending}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
                >
                  ยกเลิก
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveChanges}
                  disabled={!hasChanges || updateMutation.isPending}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-xs"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3 h-3" />
                  )}
                  {updateMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Table Header with Enhanced Styling */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2">
                <h3 className="text-sm font-semibold text-white">ตารางสิทธิ์การเข้าถึง</h3>
                <p className="text-blue-100 text-xs">จัดการสิทธิ์สำหรับ {config?.pages?.length || 0} หน้า และ {displayRoles?.length || 0} ตำแหน่ง</p>
              </div>
              
              <div className="overflow-auto max-h-[calc(100vh-450px)]">
                <Table className="relative w-full table-fixed">
                  <TableHeader className="sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-blue-200 z-10">
                    <TableRow className="hover:bg-transparent h-12">
                      <TableHead className="w-[15%] px-2 py-1 text-left font-bold text-gray-800 border-r-2 border-blue-200 bg-white shadow-sm">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          <span className="text-xs">หน้าระบบ</span>
                        </div>
                      </TableHead>
                      {displayRoles && displayRoles.map((role, index) => (
                        <TableHead 
                          key={role.id} 
                          className={`px-1 py-1 text-center font-bold text-gray-800 border-r border-gray-300 ${
                            index % 2 === 0 ? 'bg-blue-50' : 'bg-indigo-50'
                          }`}
                          style={{ width: `${Math.floor(85 / displayRoles.length)}%` }}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <div className={`w-3 h-3 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                              index % 2 === 0 ? 'bg-blue-500' : 'bg-indigo-500'
                            }`}>
                              {role.displayName.charAt(0)}
                            </div>
                            <span className="text-[10px] leading-3 text-center break-words hyphens-auto max-w-full">{role.displayName}</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(groupedPages).map(([groupName, pages]) => [
                      // Group Header
                      <TableRow key={`${groupName}-header`} className="bg-gradient-to-r from-blue-600 to-blue-700">
                        <TableCell colSpan={displayRoles.length + 1} className="px-2 py-1 font-bold text-white text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full flex items-center justify-center">
                              <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                            </div>
                            {groupName} ({pages.length} หน้า)
                          </div>
                        </TableCell>
                      </TableRow>,
                      // Group Pages
                      ...pages.map((page, index) => (
                        <TableRow 
                          key={page.url} 
                          className={`transition-all duration-200 hover:bg-blue-50 hover:shadow-sm h-8 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <TableCell className="px-2 py-0.5 font-medium text-gray-900 border-r-2 border-blue-100">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1 h-1 rounded-full ${
                                groupName === 'ระบบหลัก' ? 'bg-green-400' : 
                                groupName === 'การขาย' ? 'bg-blue-400' :
                                groupName === 'การผลิต' ? 'bg-purple-400' : 'bg-gray-400'
                              }`}></div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-gray-900 truncate leading-tight" title={page.name}>
                                  {page.name}
                                </div>
                                <div className="text-xs text-gray-500 truncate leading-tight" title={page.url}>
                                  {page.url}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          {displayRoles && displayRoles.map((role, roleIndex) => (
                            <TableCell key={role.id} className="text-center px-0.5 py-0.5 border-r border-gray-200">
                              <Select
                                value={permissions[page.url]?.[role.id] || "none"}
                                onValueChange={(value: AccessLevel) =>
                                  handlePermissionChange(page.url, role.id, value)
                                }
                              >
                                <SelectTrigger className={`w-full h-5 border-0 shadow-none focus:ring-1 focus:ring-blue-500 rounded text-xs ${
                                  permissions[page.url]?.[role.id] === 'create' ? 'bg-green-100 text-green-800' :
                                  permissions[page.url]?.[role.id] === 'edit' ? 'bg-blue-100 text-blue-800' :
                                  permissions[page.url]?.[role.id] === 'view' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  <SelectValue placeholder="เลือก" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accessLevels.map((level) => (
                                    <SelectItem key={level} value={level} className="text-xs">
                                      {accessLevelLabels[level]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ]).flat()}
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