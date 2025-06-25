import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertColorSchema, insertSizeSchema, insertWorkTypeSchema, type Color, type Size, type WorkType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useMemo } from "react";
import { Plus, Edit, Trash2, Palette, Ruler, GripVertical, Pipette, Search } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Sortable Item component for drag and drop
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-50" : ""}
    >
      {children}
    </TableRow>
  );
}

export default function MasterData() {
  const { t } = useLanguage();
  const { canAccess } = usePermissions();
  const queryClient = useQueryClient();

  // Check if user has permission to access master data
  if (!canAccess("master_data", "read")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-gray-600">คุณไม่มีสิทธิ์เข้าถึงหน้าข้อมูลหลัก</p>
        </div>
      </div>
    );
  }
  const [activeTab, setActiveTab] = useState("colors");
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [isSizeDialogOpen, setIsSizeDialogOpen] = useState(false);
  const [isWorkTypeDialogOpen, setIsWorkTypeDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);
  const [editingSize, setEditingSize] = useState<Size | null>(null);
  const [editingWorkType, setEditingWorkType] = useState<WorkType | null>(null);
  const [colorSearchQuery, setColorSearchQuery] = useState('');

  // Comprehensive color database with search keywords
  const colorDatabase = [
    // สีแดง (Red family)
    { name: 'แดง', hex: '#EF4444', keywords: ['แดง', 'red', 'สีแดง'], family: 'red', shade: 'medium' },
    { name: 'แดงอ่อน', hex: '#FCA5A5', keywords: ['แดงอ่อน', 'แดงพาสเทล', 'light red'], family: 'red', shade: 'light' },
    { name: 'แดงเข้ม', hex: '#DC2626', keywords: ['แดงเข้ม', 'แดงเก่า', 'dark red'], family: 'red', shade: 'dark' },
    { name: 'แดงเลือดหมู', hex: '#7F1D1D', keywords: ['แดงเลือดหมู', 'แดงม่วง', 'maroon'], family: 'red', shade: 'dark' },
    { name: 'แดงส้ม', hex: '#EA580C', keywords: ['แดงส้ม', 'ส้มแดง', 'orange red'], family: 'red', shade: 'medium' },
    { name: 'แดงอิฐ', hex: '#B91C1C', keywords: ['แดงอิฐ', 'แดงดิน', 'brick red'], family: 'red', shade: 'dark' },
    
    // สีชมพู (Pink family)
    { name: 'ชมพู', hex: '#EC4899', keywords: ['ชมพู', 'pink', 'สีชมพู'], family: 'pink', shade: 'medium' },
    { name: 'ชมพูอ่อน', hex: '#F9A8D4', keywords: ['ชมพูอ่อน', 'ชมพูพาสเทล', 'light pink'], family: 'pink', shade: 'light' },
    { name: 'ชมพูเข้ม', hex: '#BE185D', keywords: ['ชมพูเข้ม', 'ชมพูเก่า', 'dark pink'], family: 'pink', shade: 'dark' },
    { name: 'ชมพูกุหลาบ', hex: '#FB7185', keywords: ['ชมพูกุหลาบ', 'กุหลาบ', 'rose pink'], family: 'pink', shade: 'medium' },
    { name: 'ชมพูฟูเซีย', hex: '#D946EF', keywords: ['ฟูเซีย', 'ชมพูม่วง', 'fuchsia'], family: 'pink', shade: 'bright' },
    
    // สีส้ม (Orange family)
    { name: 'ส้ม', hex: '#F97316', keywords: ['ส้ม', 'orange', 'สีส้ม'], family: 'orange', shade: 'medium' },
    { name: 'ส้มอ่อน', hex: '#FDBA74', keywords: ['ส้มอ่อน', 'ส้มพาสเทล', 'light orange'], family: 'orange', shade: 'light' },
    { name: 'ส้มเข้ม', hex: '#C2410C', keywords: ['ส้มเข้ม', 'ส้มเก่า', 'dark orange'], family: 'orange', shade: 'dark' },
    { name: 'ส้มทอง', hex: '#F59E0B', keywords: ['ส้มทอง', 'ทองส้ม', 'golden orange'], family: 'orange', shade: 'bright' },
    
    // สีเหลือง (Yellow family)
    { name: 'เหลือง', hex: '#EAB308', keywords: ['เหลือง', 'yellow', 'สีเหลือง'], family: 'yellow', shade: 'medium' },
    { name: 'เหลืองอ่อน', hex: '#FDE047', keywords: ['เหลืองอ่อน', 'เหลืองพาสเทล', 'light yellow'], family: 'yellow', shade: 'light' },
    { name: 'เหลืองเข้ม', hex: '#A16207', keywords: ['เหลืองเข้ม', 'เหลืองเก่า', 'dark yellow'], family: 'yellow', shade: 'dark' },
    { name: 'เหลืองทอง', hex: '#FFD700', keywords: ['ทอง', 'เหลืองทอง', 'gold'], family: 'yellow', shade: 'bright' },
    { name: 'เหลืองครีม', hex: '#FEF3C7', keywords: ['ครีม', 'เหลืองครีม', 'cream'], family: 'yellow', shade: 'light' },
    
    // สีเขียว (Green family)
    { name: 'เขียว', hex: '#22C55E', keywords: ['เขียว', 'green', 'สีเขียว'], family: 'green', shade: 'medium' },
    { name: 'เขียวอ่อน', hex: '#86EFAC', keywords: ['เขียวอ่อน', 'เขียวพาสเทล', 'light green'], family: 'green', shade: 'light' },
    { name: 'เขียวเข้ม', hex: '#15803D', keywords: ['เขียวเข้ม', 'เขียวเก่า', 'dark green'], family: 'green', shade: 'dark' },
    { name: 'เขียวมะกอก', hex: '#84CC16', keywords: ['เขียวมะกอก', 'มะกอก', 'olive green'], family: 'green', shade: 'medium' },
    { name: 'เขียวมิ้นท์', hex: '#6EE7B7', keywords: ['มิ้นท์', 'เขียวมิ้นท์', 'mint green'], family: 'green', shade: 'light' },
    { name: 'เขียวป่า', hex: '#166534', keywords: ['เขียวป่า', 'เขียวดง', 'forest green'], family: 'green', shade: 'dark' },
    
    // สีฟ้า (Cyan/Light Blue family)
    { name: 'ฟ้า', hex: '#0EA5E9', keywords: ['ฟ้า', 'cyan', 'สีฟ้า'], family: 'cyan', shade: 'medium' },
    { name: 'ฟ้าอ่อน', hex: '#7DD3FC', keywords: ['ฟ้าอ่อน', 'ฟ้าพาสเทล', 'light cyan'], family: 'cyan', shade: 'light' },
    { name: 'ฟ้าเข้ม', hex: '#0284C7', keywords: ['ฟ้าเข้ม', 'ฟ้าเก่า', 'dark cyan'], family: 'cyan', shade: 'dark' },
    { name: 'ฟ้าอมเขียว', hex: '#06B6D4', keywords: ['ฟ้าเขียว', 'เขียวฟ้า', 'turquoise'], family: 'cyan', shade: 'medium' },
    
    // สีน้ำเงิน (Blue family)
    { name: 'น้ำเงิน', hex: '#3B82F6', keywords: ['น้ำเงิน', 'blue', 'สีน้ำเงิน'], family: 'blue', shade: 'medium' },
    { name: 'น้ำเงินอ่อน', hex: '#93C5FD', keywords: ['น้ำเงินอ่อน', 'น้ำเงินพาสเทล', 'light blue'], family: 'blue', shade: 'light' },
    { name: 'น้ำเงินเข้ม', hex: '#1D4ED8', keywords: ['น้ำเงินเข้ม', 'น้ำเงินเก่า', 'dark blue'], family: 'blue', shade: 'dark' },
    { name: 'กรมท่า', hex: '#1E3A8A', keywords: ['กรมท่า', 'น้ำเงินกรม', 'navy blue'], family: 'blue', shade: 'dark' },
    { name: 'ฟ้าคราม', hex: '#4F46E5', keywords: ['ฟ้าคราม', 'น้ำเงินม่วง', 'royal blue'], family: 'blue', shade: 'medium' },
    
    // สีม่วง (Purple family)
    { name: 'ม่วง', hex: '#A855F7', keywords: ['ม่วง', 'purple', 'สีม่วง'], family: 'purple', shade: 'medium' },
    { name: 'ม่วงอ่อน', hex: '#C084FC', keywords: ['ม่วงอ่อน', 'ม่วงพาสเทล', 'light purple'], family: 'purple', shade: 'light' },
    { name: 'ม่วงเข้ม', hex: '#7C3AED', keywords: ['ม่วงเข้ม', 'ม่วงเก่า', 'dark purple'], family: 'purple', shade: 'dark' },
    { name: 'ม่วงราชินี', hex: '#9333EA', keywords: ['ม่วงราชินี', 'ม่วงเจ้า', 'royal purple'], family: 'purple', shade: 'medium' },
    
    // สีน้ำตาล (Brown family)
    { name: 'น้ำตาล', hex: '#A3A3A3', keywords: ['น้ำตาล', 'brown', 'สีน้ำตาล'], family: 'brown', shade: 'medium' },
    { name: 'น้ำตาลอ่อน', hex: '#D6D3D1', keywords: ['น้ำตาลอ่อน', 'เบจ', 'light brown'], family: 'brown', shade: 'light' },
    { name: 'น้ำตาลเข้ม', hex: '#57534E', keywords: ['น้ำตาลเข้ม', 'น้ำตาลดำ', 'dark brown'], family: 'brown', shade: 'dark' },
    { name: 'น้ำตาลกาแฟ', hex: '#78716C', keywords: ['กาแฟ', 'น้ำตาลกาแฟ', 'coffee brown'], family: 'brown', shade: 'medium' },
    { name: 'เบจ', hex: '#F5F5DC', keywords: ['เบจ', 'ครีม', 'beige'], family: 'brown', shade: 'light' },
    
    // สีเทา (Gray family)
    { name: 'เทา', hex: '#6B7280', keywords: ['เทา', 'gray', 'สีเทา'], family: 'gray', shade: 'medium' },
    { name: 'เทาอ่อน', hex: '#D1D5DB', keywords: ['เทาอ่อน', 'เทาพาสเทล', 'light gray'], family: 'gray', shade: 'light' },
    { name: 'เทาเข้ม', hex: '#374151', keywords: ['เทาเข้ม', 'เทาดำ', 'dark gray'], family: 'gray', shade: 'dark' },
    { name: 'เงิน', hex: '#C0C0C0', keywords: ['เงิน', 'เทาเงิน', 'silver'], family: 'gray', shade: 'light' },
    { name: 'เทาเมฆ', hex: '#9CA3AF', keywords: ['เทาเมฆ', 'เทาอ่อน', 'cloud gray'], family: 'gray', shade: 'light' },
    
    // สีขาวดำ (Black & White)
    { name: 'ขาว', hex: '#FFFFFF', keywords: ['ขาว', 'white', 'สีขาว'], family: 'white', shade: 'pure' },
    { name: 'ขาวนวล', hex: '#FAFAFA', keywords: ['ขาวนวล', 'ขาวอ่อน', 'off white'], family: 'white', shade: 'soft' },
    { name: 'ดำ', hex: '#000000', keywords: ['ดำ', 'black', 'สีดำ'], family: 'black', shade: 'pure' },
    { name: 'ดำเทา', hex: '#1F2937', keywords: ['ดำเทา', 'เทาดำ', 'charcoal'], family: 'black', shade: 'soft' }
  ];

  // Filter colors based on search query
  const filteredColors = useMemo(() => {
    if (!colorSearchQuery.trim()) return colorDatabase;
    
    const query = colorSearchQuery.toLowerCase();
    return colorDatabase.filter(color => 
      color.keywords.some(keyword => keyword.toLowerCase().includes(query)) ||
      color.name.toLowerCase().includes(query) ||
      color.family.toLowerCase().includes(query)
    );
  }, [colorSearchQuery]);

  // Group filtered colors by family and shade
  const groupedColors = useMemo(() => {
    const groups: Record<string, { light: any[], medium: any[], dark: any[], bright: any[], pure: any[], soft: any[] }> = {};
    
    filteredColors.forEach(color => {
      if (!groups[color.family]) {
        groups[color.family] = { light: [], medium: [], dark: [], bright: [], pure: [], soft: [] };
      }
      groups[color.family][color.shade as keyof typeof groups[string]].push(color);
    });
    
    return groups;
  }, [filteredColors]);

  // Queries
  const { data: colors, isLoading: colorsLoading } = useQuery<Color[]>({
    queryKey: ["/api/colors"]
  });

  const { data: sizes, isLoading: sizesLoading } = useQuery<Size[]>({
    queryKey: ["/api/sizes"]
  });

  const { data: workTypes, isLoading: workTypesLoading } = useQuery<WorkType[]>({
    queryKey: ["/api/work-types"]
  });

  // Forms
  const colorForm = useForm({
    resolver: zodResolver(insertColorSchema.omit({ tenantId: true })),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      isActive: true
    }
  });

  const sizeForm = useForm({
    resolver: zodResolver(insertSizeSchema.omit({ tenantId: true })),
    defaultValues: {
      name: "",
      isActive: true
    }
  });

  const workTypeForm = useForm({
    resolver: zodResolver(insertWorkTypeSchema.omit({ tenantId: true })),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      sortOrder: 0,
      isActive: true
    }
  });

  // Color mutations
  const createColorMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/colors", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
      setIsColorDialogOpen(false);
      colorForm.reset();
    }
  });

  const updateColorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/colors/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
      setIsColorDialogOpen(false);
      setEditingColor(null);
      colorForm.reset();
    }
  });

  const deleteColorMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/colors/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
    }
  });

  // Size mutations
  const createSizeMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/sizes", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sizes"] });
      setIsSizeDialogOpen(false);
      sizeForm.reset();
    }
  });

  const updateSizeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/sizes/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sizes"] });
      setIsSizeDialogOpen(false);
      setEditingSize(null);
      sizeForm.reset();
    }
  });

  const deleteSizeMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/sizes/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sizes"] });
    }
  });

  // Work Type mutations
  const createWorkTypeMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/work-types", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-types"] });
      setIsWorkTypeDialogOpen(false);
      workTypeForm.reset();
    }
  });

  const updateWorkTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/work-types/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-types"] });
      setIsWorkTypeDialogOpen(false);
      setEditingWorkType(null);
      workTypeForm.reset();
    }
  });

  const deleteWorkTypeMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/work-types/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-types"] });
    }
  });

  // Handlers
  const handleColorSubmit = (data: any) => {
    if (editingColor) {
      updateColorMutation.mutate({ id: editingColor.id, data });
    } else {
      createColorMutation.mutate(data);
    }
  };

  const handleSizeSubmit = (data: any) => {
    if (editingSize) {
      updateSizeMutation.mutate({ id: editingSize.id, data });
    } else {
      createSizeMutation.mutate(data);
    }
  };

  const handleWorkTypeSubmit = (data: any) => {
    if (editingWorkType) {
      updateWorkTypeMutation.mutate({ id: editingWorkType.id, data });
    } else {
      createWorkTypeMutation.mutate(data);
    }
  };

  const handleEditColor = (color: Color) => {
    setEditingColor(color);
    colorForm.reset({
      name: color.name,
      code: color.code || "",
      description: color.description || "",
      isActive: color.isActive ?? true
    });
    setIsColorDialogOpen(true);
  };

  const handleEditSize = (size: Size) => {
    setEditingSize(size);
    sizeForm.reset({
      name: size.name,
      isActive: size.isActive ?? true
    });
    setIsSizeDialogOpen(true);
  };

  const handleDeleteColor = (id: number) => {
    deleteColorMutation.mutate(id);
  };

  const handleDeleteSize = (id: number) => {
    deleteSizeMutation.mutate(id);
  };

  const handleEditWorkType = (workType: WorkType) => {
    setEditingWorkType(workType);
    workTypeForm.reset({
      name: workType.name,
      code: workType.code || "",
      description: workType.description || "",
      sortOrder: workType.sortOrder || 0,
      isActive: workType.isActive ?? true
    });
    setIsWorkTypeDialogOpen(true);
  };

  const handleDeleteWorkType = (id: number) => {
    deleteWorkTypeMutation.mutate(id);
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag and drop for colors
  const handleColorDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || !colors) return;

    const oldIndex = colors.findIndex(item => item.id.toString() === active.id);
    const newIndex = colors.findIndex(item => item.id.toString() === over.id);

    if (oldIndex !== newIndex) {
      const items = arrayMove(colors, oldIndex, newIndex);
      
      // Update the sort order for all items
      const updatedItems = items.map((item, index) => ({
        ...item,
        sortOrder: index + 1
      }));
      
      // Update each item's sort order in the database
      updatedItems.forEach(async (item) => {
        try {
          await apiRequest(`/api/colors/${item.id}`, "PATCH", { sortOrder: item.sortOrder });
        } catch (error) {
          console.error("Error updating color order:", error);
        }
      });
      
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
    }
  };

  // Handle drag and drop for sizes
  const handleSizeDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || !sizes) return;

    const oldIndex = sizes.findIndex(item => item.id.toString() === active.id);
    const newIndex = sizes.findIndex(item => item.id.toString() === over.id);

    if (oldIndex !== newIndex) {
      const items = arrayMove(sizes, oldIndex, newIndex);
      
      // Update the sort order for all items
      const updatedItems = items.map((item, index) => ({
        ...item,
        sortOrder: index + 1
      }));
      
      // Update each item's sort order in the database
      updatedItems.forEach(async (item) => {
        try {
          await apiRequest(`/api/sizes/${item.id}`, "PATCH", { sortOrder: item.sortOrder });
        } catch (error) {
          console.error("Error updating size order:", error);
        }
      });
      
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/sizes"] });
    }
  };

  const handleAddNewColor = () => {
    setEditingColor(null);
    colorForm.reset();
    setIsColorDialogOpen(true);
  };

  const handleAddNewSize = () => {
    setEditingSize(null);
    sizeForm.reset();
    setIsSizeDialogOpen(true);
  };

  const handleAddNewWorkType = () => {
    setEditingWorkType(null);
    workTypeForm.reset();
    setIsWorkTypeDialogOpen(true);
  };

  if (colorsLoading || sizesLoading || workTypesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t("nav.master_data")}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            จัดการสี
          </TabsTrigger>
          <TabsTrigger value="sizes" className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            จัดการไซส์
          </TabsTrigger>
          <TabsTrigger value="work-types" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            ประเภทงาน
          </TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">จัดการข้อมูลสี</h2>
            <Dialog open={isColorDialogOpen} onOpenChange={setIsColorDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNewColor}>
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มสีใหม่
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingColor ? "แก้ไขข้อมูลสี" : "เพิ่มสีใหม่"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingColor 
                      ? "แก้ไขข้อมูลสีที่มีอยู่ในระบบ รวมถึงชื่อสี รหัสสี และคำอธิบาย" 
                      : "เพิ่มสีใหม่ลงในระบบ กรุณาใส่ชื่อสีและรหัสสี (ถ้ามี) พร้อมคำอธิบายเพิ่มเติม"
                    }
                  </DialogDescription>
                </DialogHeader>
                <Form {...colorForm}>
                  <form onSubmit={colorForm.handleSubmit(handleColorSubmit)} className="space-y-4">
                    <FormField
                      control={colorForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ชื่อสี *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={colorForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Pipette className="h-4 w-4" />
                            รหัสสี (Hex Color Code)
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Input 
                                  {...field} 
                                  placeholder="#000000"
                                  pattern="^#[0-9A-Fa-f]{6}$"
                                  onChange={(e) => {
                                    let value = e.target.value;
                                    if (value && !value.startsWith('#')) {
                                      value = '#' + value;
                                    }
                                    field.onChange(value.toUpperCase());
                                  }}
                                />
                                {field.value && field.value.startsWith('#') && (
                                  <div 
                                    className="w-8 h-8 rounded border border-gray-300"
                                    style={{ backgroundColor: field.value }}
                                  />
                                )}
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border">
                                <div className="p-4 space-y-4">
                                  {/* Current Color Preview */}
                                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                                    <div className="relative">
                                      <div 
                                        className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-inner"
                                        style={{ backgroundColor: field.value || '#f3f4f6' }}
                                      />
                                      {field.value && field.value.startsWith('#') && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        สีที่เลือก
                                      </p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                                        {field.value || 'ยังไม่ได้เลือกสี'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Color Search */}
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                      placeholder="ค้นหาสี เช่น แดง, เขียว, ฟ้า, เข้ม, อ่อน..."
                                      value={colorSearchQuery}
                                      onChange={(e) => setColorSearchQuery(e.target.value)}
                                      className="pl-10"
                                    />
                                  </div>

                                  {/* Search Results */}
                                  {colorSearchQuery && (
                                    <div className="bg-white dark:bg-gray-900 rounded-lg border p-3">
                                      <p className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                                        ผลการค้นหา "{colorSearchQuery}" ({filteredColors.length} สี)
                                      </p>
                                      <div className="grid grid-cols-8 gap-2">
                                        {filteredColors.slice(0, 16).map((color) => (
                                          <button
                                            key={color.hex}
                                            type="button"
                                            className="relative group"
                                            onClick={() => field.onChange(color.hex)}
                                          >
                                            <div 
                                              className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-all hover:scale-110 shadow-sm"
                                              style={{ backgroundColor: color.hex }}
                                            />
                                            {field.value === color.hex && (
                                              <div className="absolute inset-0 border-2 border-blue-500 rounded-lg" />
                                            )}
                                            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                              {color.name}
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                      {filteredColors.length > 16 && (
                                        <p className="text-xs text-gray-500 mt-2">
                                          แสดง 16 สีแรก จากทั้งหมด {filteredColors.length} สี
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Color Groups by Family and Shade */}
                                  {!colorSearchQuery && (
                                    <div className="space-y-4">
                                      {/* Quick Colors */}
                                      <div>
                                        <p className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">สีด่วน</p>
                                        <div className="grid grid-cols-8 gap-2">
                                          {[
                                            { name: 'แดง', hex: '#EF4444' },
                                            { name: 'ส้ม', hex: '#F97316' },
                                            { name: 'เหลือง', hex: '#EAB308' },
                                            { name: 'เขียว', hex: '#22C55E' },
                                            { name: 'ฟ้า', hex: '#0EA5E9' },
                                            { name: 'น้ำเงิน', hex: '#3B82F6' },
                                            { name: 'ม่วง', hex: '#A855F7' },
                                            { name: 'ชมพู', hex: '#EC4899' }
                                          ].map((color) => (
                                            <button
                                              key={color.hex}
                                              type="button"
                                              className="relative group w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-all hover:scale-105 shadow-sm"
                                              style={{ backgroundColor: color.hex }}
                                              onClick={() => {
                                                field.onChange(color.hex);
                                                setColorSearchQuery(color.name);
                                              }}
                                            >
                                              {field.value === color.hex && (
                                                <div className="absolute inset-0 border-2 border-blue-500 rounded-lg" />
                                              )}
                                              <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                ค้นหา "{color.name}"
                                              </div>
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Suggestion buttons */}
                                      <div>
                                        <p className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">คำแนะนำ</p>
                                        <div className="flex flex-wrap gap-2">
                                          {['อ่อน', 'เข้ม', 'พาสเทล', 'เก่า', 'สด', 'ทอง', 'เงิน'].map((suggestion) => (
                                            <button
                                              key={suggestion}
                                              type="button"
                                              className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                                              onClick={() => setColorSearchQuery(suggestion)}
                                            >
                                              {suggestion}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Recently Used Colors */}
                                      <div>
                                        <p className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">สีที่ใช้ล่าสุด</p>
                                        <div className="grid grid-cols-10 gap-2">
                                          {colors?.slice(0, 10).map((color) => (
                                            <button
                                              key={`recent-${color.id}`}
                                              type="button"
                                              className="relative group w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                              style={{ backgroundColor: color.code }}
                                              onClick={() => field.onChange(color.code)}
                                            >
                                              {field.value === color.code && (
                                                <div className="absolute inset-0 border border-blue-500 rounded" />
                                              )}
                                              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {color.name}
                                              </div>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Display color families when searching */}
                                  {colorSearchQuery && Object.keys(groupedColors).length > 0 && (
                                    <div className="space-y-3">
                                      {Object.entries(groupedColors).map(([family, shades]) => {
                                        const allShades = [...shades.light, ...shades.medium, ...shades.dark, ...shades.bright, ...shades.pure, ...shades.soft];
                                        if (allShades.length === 0) return null;
                                        
                                        return (
                                          <div key={family} className="bg-white dark:bg-gray-900 rounded-lg border p-3">
                                            <p className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100 capitalize">
                                              กลุ่มสี{family === 'red' ? 'แดง' : family === 'blue' ? 'น้ำเงิน' : family === 'green' ? 'เขียว' : family === 'yellow' ? 'เหลือง' : family === 'orange' ? 'ส้ม' : family === 'purple' ? 'ม่วง' : family === 'pink' ? 'ชมพู' : family === 'cyan' ? 'ฟ้า' : family === 'brown' ? 'น้ำตาล' : family === 'gray' ? 'เทา' : family === 'white' ? 'ขาว' : family === 'black' ? 'ดำ' : family}
                                            </p>
                                            <div className="space-y-2">
                                              {/* Light shades */}
                                              {shades.light.length > 0 && (
                                                <div>
                                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">เฉดอ่อน</p>
                                                  <div className="grid grid-cols-8 gap-1">
                                                    {shades.light.map((color) => (
                                                      <button
                                                        key={`light-${color.hex}`}
                                                        type="button"
                                                        className="relative group w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                                        style={{ backgroundColor: color.hex }}
                                                        onClick={() => field.onChange(color.hex)}
                                                      >
                                                        {field.value === color.hex && (
                                                          <div className="absolute inset-0 border border-blue-500 rounded" />
                                                        )}
                                                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                          {color.name}
                                                        </div>
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {/* Medium shades */}
                                              {shades.medium.length > 0 && (
                                                <div>
                                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">เฉดกลาง</p>
                                                  <div className="grid grid-cols-8 gap-1">
                                                    {shades.medium.map((color) => (
                                                      <button
                                                        key={`medium-${color.hex}`}
                                                        type="button"
                                                        className="relative group w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                                        style={{ backgroundColor: color.hex }}
                                                        onClick={() => field.onChange(color.hex)}
                                                      >
                                                        {field.value === color.hex && (
                                                          <div className="absolute inset-0 border border-blue-500 rounded" />
                                                        )}
                                                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                          {color.name}
                                                        </div>
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {/* Dark shades */}
                                              {shades.dark.length > 0 && (
                                                <div>
                                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">เฉดเข้ม</p>
                                                  <div className="grid grid-cols-8 gap-1">
                                                    {shades.dark.map((color) => (
                                                      <button
                                                        key={`dark-${color.hex}`}
                                                        type="button"
                                                        className="relative group w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                                        style={{ backgroundColor: color.hex }}
                                                        onClick={() => field.onChange(color.hex)}
                                                      >
                                                        {field.value === color.hex && (
                                                          <div className="absolute inset-0 border border-blue-500 rounded" />
                                                        )}
                                                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                          {color.name}
                                                        </div>
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                              {/* Bright/Pure/Soft shades */}
                                              {(shades.bright.length > 0 || shades.pure.length > 0 || shades.soft.length > 0) && (
                                                <div>
                                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">เฉดพิเศษ</p>
                                                  <div className="grid grid-cols-8 gap-1">
                                                    {[...shades.bright, ...shades.pure, ...shades.soft].map((color) => (
                                                      <button
                                                        key={`special-${color.hex}`}
                                                        type="button"
                                                        className="relative group w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                                        style={{ backgroundColor: color.hex }}
                                                        onClick={() => field.onChange(color.hex)}
                                                      >
                                                        {field.value === color.hex && (
                                                          <div className="absolute inset-0 border border-blue-500 rounded" />
                                                        )}
                                                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                          {color.name}
                                                        </div>
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      💡 เคล็ดลับ: ค้นหาสีด้วยคำ เช่น "แดง", "อ่อน", "เข้ม" หรือใส่รหัส hex ในช่องด้านบน
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={colorForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>คำอธิบาย</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsColorDialogOpen(false)}>
                        ยกเลิก
                      </Button>
                      <Button type="submit" disabled={createColorMutation.isPending || updateColorMutation.isPending}>
                        {editingColor ? "บันทึกการแก้ไข" : "เพิ่มสี"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-6">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleColorDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>ชื่อสี</TableHead>
                      <TableHead>รหัสสี</TableHead>
                      <TableHead>คำอธิบาย</TableHead>
                      <TableHead>จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <SortableContext 
                    items={colors?.map(color => color.id.toString()) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    <TableBody>
                      {colors?.map((color, index) => (
                        <SortableItem key={color.id} id={color.id.toString()}>
                          <TableCell className="cursor-grab">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                          </TableCell>
                          <TableCell className="font-medium">{color.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {color.code && color.code.startsWith('#') && (
                                <div 
                                  className="w-4 h-4 rounded border border-gray-300"
                                  style={{ backgroundColor: color.code }}
                                />
                              )}
                              <span className="font-mono text-sm">{color.code || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell>{color.description || "-"}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditColor(color)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDeleteColor(color.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </SortableItem>
                      ))}
                      {colors?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            ยังไม่มีข้อมูลสี
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </SortableContext>
                </Table>
              </DndContext>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sizes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">จัดการข้อมูลไซส์</h2>
            <Dialog open={isSizeDialogOpen} onOpenChange={setIsSizeDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNewSize}>
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มไซส์ใหม่
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingSize ? "แก้ไขข้อมูลไซส์" : "เพิ่มไซส์ใหม่"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSize 
                      ? "แก้ไขข้อมูลไซส์ที่มีอยู่ในระบบ รวมถึงชื่อไซส์ หมวดหมู่ และลำดับการแสดง" 
                      : "เพิ่มไซส์ใหม่ลงในระบบ กรุณาระบุชื่อไซส์ หมวดหมู่ และลำดับการแสดงผล"
                    }
                  </DialogDescription>
                </DialogHeader>
                <Form {...sizeForm}>
                  <form onSubmit={sizeForm.handleSubmit(handleSizeSubmit)} className="space-y-4">
                    <FormField
                      control={sizeForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ชื่อไซส์ *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="เช่น S, M, L, XL หรือ 28, 30, 32" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsSizeDialogOpen(false)}>
                        ยกเลิก
                      </Button>
                      <Button type="submit" disabled={createSizeMutation.isPending || updateSizeMutation.isPending}>
                        {editingSize ? "บันทึกการแก้ไข" : "เพิ่มไซส์"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-6">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSizeDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>ชื่อไซส์</TableHead>
                      <TableHead>จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <SortableContext 
                    items={sizes?.map(size => size.id.toString()) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    <TableBody>
                      {sizes?.map((size) => (
                        <SortableItem key={size.id} id={size.id.toString()}>
                          <TableCell className="cursor-grab">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                          </TableCell>
                          <TableCell className="font-medium">{size.name}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditSize(size)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDeleteSize(size.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </SortableItem>
                      ))}
                      {sizes?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                            ยังไม่มีข้อมูลไซส์
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </SortableContext>
                </Table>
              </DndContext>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work-types" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">จัดการประเภทงาน</h2>
            <Dialog open={isWorkTypeDialogOpen} onOpenChange={setIsWorkTypeDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNewWorkType}>
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มประเภทงานใหม่
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingWorkType ? "แก้ไขประเภทงาน" : "เพิ่มประเภทงานใหม่"}
                  </DialogTitle>
                  <DialogDescription>
                    กรอกข้อมูลประเภทงานที่ต้องการ{editingWorkType ? "แก้ไข" : "เพิ่ม"}
                  </DialogDescription>
                </DialogHeader>

                <Form {...workTypeForm}>
                  <form onSubmit={workTypeForm.handleSubmit(handleWorkTypeSubmit)} className="space-y-4">
                    <FormField
                      control={workTypeForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ชื่อประเภทงาน</FormLabel>
                          <FormControl>
                            <Input placeholder="เช่น เสื้อยืด" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={workTypeForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>รหัสประเภทงาน</FormLabel>
                          <FormControl>
                            <Input placeholder="เช่น T-SHIRT" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={workTypeForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>คำอธิบาย</FormLabel>
                          <FormControl>
                            <Textarea placeholder="รายละเอียดประเภทงาน" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={workTypeForm.control}
                      name="sortOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ลำดับการเรียง</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsWorkTypeDialogOpen(false)}>
                        ยกเลิก
                      </Button>
                      <Button type="submit" disabled={createWorkTypeMutation.isPending || updateWorkTypeMutation.isPending}>
                        {editingWorkType ? "บันทึกการแก้ไข" : "เพิ่มประเภทงาน"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>รายการประเภทงาน</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อประเภทงาน</TableHead>
                    <TableHead>รหัส</TableHead>
                    <TableHead>คำอธิบาย</TableHead>
                    <TableHead>ลำดับ</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workTypes?.map((workType) => (
                    <TableRow key={workType.id}>
                      <TableCell className="font-medium">{workType.name}</TableCell>
                      <TableCell>
                        {workType.code && (
                          <Badge variant="outline">{workType.code}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{workType.description}</TableCell>
                      <TableCell>{workType.sortOrder}</TableCell>
                      <TableCell>
                        <Badge variant={workType.isActive ? "default" : "secondary"}>
                          {workType.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditWorkType(workType)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>ยืนยันการลบ</DialogTitle>
                                <DialogDescription>
                                  คุณแน่ใจที่จะลบประเภทงาน "{workType.name}" หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline">ยกเลิก</Button>
                                <Button 
                                  variant="destructive" 
                                  onClick={() => handleDeleteWorkType(workType.id)}
                                  disabled={deleteWorkTypeMutation.isPending}
                                >
                                  ยืนยันที่จะลบ
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}