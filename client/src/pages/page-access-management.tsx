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
import { Loader2, ShieldCheck, RefreshCw, Plus } from "lucide-react";

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
    <div className="h-full flex flex-col">
      <div className="flex-1 p-6 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <ShieldCheck className="w-6 h-6 text-primary mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">จัดการสิทธิ์การเข้าถึงหน้า</h1>
            </div>
            <p className="text-gray-600">
              กำหนดสิทธิ์การเข้าถึงหน้าต่างๆ ในระบบสำหรับแต่ละตำแหน่ง
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </Button>
              <Button
                onClick={handleCreateAllPermissions}
                disabled={createAllMutation.isPending}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                {createAllMutation.isPending ? 'กำลังสร้าง...' : 'สร้างสิทธิ์ครบถ้วน'}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPermissions(buildPermissionMatrix(config))}
                disabled={!hasChanges || updateMutation.isPending}
              >
                ยกเลิกการเปลี่ยนแปลง
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={!hasChanges || updateMutation.isPending}
                className="flex items-center gap-2"
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

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                  <TableRow>
                    <TableHead className="w-80 px-6 py-4 text-left font-semibold text-gray-900 border-r border-gray-200">
                      หน้า
                    </TableHead>
                    {displayRoles.map(role => (
                      <TableHead key={role.id} className="px-4 py-4 text-center font-semibold text-gray-900 border-r border-gray-200 min-w-[200px]">
                        {role.displayName}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.pages.map((page, index) => (
                    <TableRow 
                      key={page.url} 
                      className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <TableCell className="px-6 py-4 font-medium text-gray-900 border-r border-gray-200">
                        <div>
                          <div className="font-semibold">{page.name}</div>
                          <div className="text-sm text-gray-500">{page.url}</div>
                        </div>
                      </TableCell>
                      {displayRoles.map(role => (
                        <TableCell key={role.id} className="text-center p-2">
                          <Select
                            value={permissions[page.url]?.[role.id] || "none"}
                            onValueChange={(value: AccessLevel) =>
                              handlePermissionChange(page.url, role.id, value)
                            }
                          >
                            <SelectTrigger className="w-full min-w-[160px]">
                              <SelectValue placeholder="เลือกระดับ" />
                            </SelectTrigger>
                            <SelectContent>
                              {accessLevels.map(level => (
                                <SelectItem key={level} value={level}>
                                  {accessLevelLabels[level]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}