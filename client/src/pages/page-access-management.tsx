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
import { Loader2, ShieldCheck, RefreshCw } from "lucide-react";

// Types matching the backend response
type Role = { id: number; name: string; displayName: string };
type Page = { name: string; url: string };
type AccessRule = { roleId: number; pageUrl: string; accessLevel: AccessLevel };
type AccessLevel = "none" | "read" | "edit" | "create";

type PageAccessConfig = {
  roles: Role[];
  pages: Page[];
  accessRules: AccessRule[];
};

const accessLevels: AccessLevel[] = ["none", "read", "edit", "create"];
const accessLevelLabels: Record<AccessLevel, string> = {
  none: "ไม่มีสิทธิ์",
  read: "อ่าน",
  edit: "แก้ไข",
  create: "สร้าง/ลบ",
};

// --- Helper function to build the permission matrix ---
const buildPermissionMatrix = (config: PageAccessConfig | undefined) => {
  if (!config) return {};
  const matrix: Record<string, Record<number, AccessLevel>> = {};
  config.pages.forEach(page => {
    matrix[page.url] = {};
    config.roles.forEach(role => {
      const rule = config.accessRules.find(r => r.pageUrl === page.url && r.roleId === role.id);
      matrix[page.url][role.id] = rule ? rule.accessLevel : 'none';
    });
  });
  return matrix;
};

export default function PageAccessManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Record<string, Record<number, AccessLevel>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // --- Data Fetching using React Query ---
  const { data: config, isLoading, error, refetch } = useQuery<PageAccessConfig>({
    queryKey: ["pageAccessConfig"],
    queryFn: async () => {
      const res = await fetch("/api/page-access-management/config", {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลการตั้งค่าสิทธิ์ได้");
      const data = await res.json();
      console.log("หน้าทั้งหมดที่โหลด:", data.pages.map((p: Page) => p.name).join(", "));
      return data;
    },
    staleTime: 0,
    gcTime: 0,
  });

  // --- Mutation for updating permissions ---
  const updateMutation = useMutation({
    mutationFn: (newAccessList: Omit<AccessRule, "id">[]) =>
      fetch("/api/page-access-management/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessList: newAccessList }),
      }).then(res => {
        if (!res.ok) throw new Error("การบันทึกสิทธิ์ล้มเหลว");
        return res.json();
      }),
    onSuccess: () => {
      toast({
        title: "สำเร็จ!",
        description: "บันทึกการตั้งค่าสิทธิ์เรียบร้อยแล้ว",
        className: "bg-green-100 text-green-800",
      });
      queryClient.invalidateQueries({ queryKey: ["pageAccessConfig"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] }); // Invalidate related queries
      setHasChanges(false);
    },
    onError: (e: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: e.message || "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive",
      });
    },
  });

  // --- Effect to initialize state when data is loaded ---
  useEffect(() => {
    if (config) {
      setPermissions(buildPermissionMatrix(config));
    }
  }, [config]);
  
  // --- Event Handler ---
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
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center">
                    <ShieldCheck className="w-7 h-7 mr-3 text-primary"/>
                    จัดการสิทธิ์การเข้าถึงหน้า
                </CardTitle>
                <CardDescription>
                    กำหนดระดับการเข้าถึงแต่ละหน้าสำหรับ Role ต่างๆ ในระบบ Role 'Admin' มีสิทธิ์เข้าถึงทุกอย่างโดยอัตโนมัติ
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-end gap-2 mb-4">
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
                <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-bold min-w-[250px]">หน้า (Page)</TableHead>
                                {displayRoles.map(role => (
                                    <TableHead key={role.id} className="font-bold min-w-[150px] text-center">{role.displayName}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {config.pages.map(page => (
                                <TableRow key={page.url}>
                                <TableCell className="font-medium">{page.name} <span className="text-xs text-muted-foreground">{page.url}</span></TableCell>
                                {displayRoles.map(role => (
                                    <TableCell key={role.id}>
                                    <Select
                                        value={permissions[page.url]?.[role.id] || "none"}
                                        onValueChange={(value: AccessLevel) =>
                                        handlePermissionChange(page.url, role.id, value)
                                        }
                                    >
                                        <SelectTrigger>
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
            </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}