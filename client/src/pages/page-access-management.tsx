import { useState, useEffect, useMemo } from "react";
import MainLayout from "@/components/layout/main-layout";
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

interface PageAccessConfig {
  roles: Role[];
  pages: Page[];
  currentAccess: { roleId: number; pageUrl: string; accessLevel: AccessLevel }[];
}

type PermissionMatrix = Record<string, Record<number, AccessLevel>>;

const accessLevels: AccessLevel[] = ["none", "read", "edit", "create"];
const accessLevelLabels: Record<AccessLevel, string> = {
  none: "ไม่มีสิทธิ์",
  read: "ดูได้อย่างเดียว",
  edit: "แก้ไขได้",
  create: "สร้างได้ (เต็มสิทธิ์)",
};

export default function PageAccessManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<PermissionMatrix>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: config, isLoading, error, refetch } = useQuery<PageAccessConfig>({
    queryKey: ["pageAccessConfig"],
    queryFn: async () => {
      const response = await fetch("/api/page-access-management/config");
      if (!response.ok) throw new Error("Failed to fetch page access config");
      return response.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Omit<AccessRule, "id">[]) => {
      const response = await fetch("/api/page-access-management/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!response.ok) throw new Error("Failed to update permissions");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "สำเร็จ", description: "อัปเดตสิทธิ์การเข้าถึงเรียบร้อยแล้ว" });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["pageAccessConfig"] });
    },
    onError: (error) => {
      console.error("Permission update error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสิทธิ์ได้",
        variant: "destructive",
      });
    },
  });

  const buildPermissionMatrix = (config: PageAccessConfig): PermissionMatrix => {
    const matrix: PermissionMatrix = {};
    config.pages.forEach(page => {
      matrix[page.url] = {};
      config.roles.forEach(role => {
        const access = config.currentAccess.find(
          a => a.roleId === role.id && a.pageUrl === page.url
        );
        matrix[page.url][role.id] = access?.accessLevel || "none";
      });
    });
    return matrix;
  };

  useEffect(() => {
    if (config) {
      const matrix = buildPermissionMatrix(config);
      setPermissions(matrix);
      setHasChanges(false);
    }
  }, [config]);

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
    if (!config) return;

    const updatedList: Omit<AccessRule, "id">[] = [];
    config.pages.forEach(page => {
      config.roles.forEach(role => {
        const originalLevel = buildPermissionMatrix(config)[page.url][role.id];
        const currentLevel = permissions[page.url]?.[role.id];
        if (originalLevel !== currentLevel) {
          updatedList.push({
            pageUrl: page.url,
            roleId: role.id,
            accessLevel: currentLevel ?? 'none',
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
  
  const handleResetChanges = () => {
    if (config) {
        setPermissions(buildPermissionMatrix(config));
        setHasChanges(false);
        toast({ description: "ยกเลิกการเปลี่ยนแปลงทั้งหมดแล้ว" });
    }
  }

  // Filter out the 'Admin' role from columns, as they have all permissions by default.
  const displayRoles = useMemo(() => config?.roles.filter(r => r.name !== 'ADMIN') ?? [], [config]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-4 text-lg">กำลังโหลดข้อมูล...</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !config) {
    return (
      <MainLayout>
        <Alert variant="destructive" className="m-4">
          <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
          <AlertDescription>
            ไม่สามารถโหลดข้อมูลการจัดการสิทธิ์ได้ กรุณาลองอีกครั้งในภายหลัง
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <ShieldCheck className="w-8 h-8 mr-3 text-primary"/>
                <h1 className="text-3xl font-bold">จัดการสิทธิ์การเข้าถึงหน้า</h1>
              </div>
              <p className="text-muted-foreground">
                กำหนดระดับการเข้าถึงแต่ละหน้าสำหรับ Role ต่างๆ ในระบบ Role 'Admin' มีสิทธิ์เข้าถึงทุกอย่างโดยอัตโนมัติ
              </p>
            </div>

            {/* Controls */}
            <div className="flex justify-end gap-2 mb-4">
              <Button 
                variant="secondary"
                onClick={async () => {
                  console.log("🔄 กำลังเริ่มต้นระบบสิทธิ์");
                  try {
                    const response = await fetch('/api/page-access-management/force-sync', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                    });
                    
                    if (response.ok) {
                      const result = await response.json();
                      console.log("✅ สร้างสิทธิ์เสร็จสิ้น:", result.message);
                      toast({
                        title: "เสร็จสิ้น",
                        description: result.message,
                      });
                      queryClient.invalidateQueries({ queryKey: ["pageAccessConfig"] });
                      refetch();
                    } else {
                      throw new Error('Failed to sync permissions');
                    }
                  } catch (error) {
                    console.error("❌ ข้อผิดพลาด:", error);
                    toast({
                      title: "เกิดข้อผิดพลาด",
                      description: "ไม่สามารถสร้างสิทธิ์ได้",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                สร้างสิทธิ์ครบถ้วน
              </Button>
              <Button 
                variant="outline"
                onClick={async () => {
                  console.log("🔄 กำลังรีเฟรชข้อมูล");
                  queryClient.removeQueries({ queryKey: ["pageAccessConfig"] });
                  await refetch();
                  console.log("✅ รีเฟรชข้อมูลเสร็จสิ้น");
                }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                รีเฟรชข้อมูล
              </Button>
              <Button 
                variant="outline"
                onClick={handleResetChanges}
                disabled={!hasChanges || updateMutation.isPending}
              >
                ยกเลิกการเปลี่ยนแปลง
              </Button>
              <Button 
                onClick={handleSaveChanges} 
                disabled={!hasChanges || updateMutation.isPending}
              >
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                บันทึกการเปลี่ยนแปลง
              </Button>
            </div>

            {/* Table Container with Full Height */}
            <div className="flex-1 border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
              <div className="h-full overflow-auto">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-bold min-w-[300px] bg-muted/50 sticky left-0 z-20">หน้า (Page)</TableHead>
                      {displayRoles.map(role => (
                        <TableHead key={role.id} className="font-bold min-w-[180px] text-center bg-muted/50">
                          {role.displayName}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.pages.map(page => (
                      <TableRow key={page.url} className="hover:bg-muted/20">
                        <TableCell className="font-medium sticky left-0 bg-white dark:bg-gray-800 border-r z-10">
                          <div className="min-w-[280px]">
                            <div className="font-semibold text-sm">{page.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{page.url}</div>
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
    </MainLayout>
  );
}