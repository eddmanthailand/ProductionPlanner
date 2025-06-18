import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
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
import { Plus, Edit, Trash2, Palette, Ruler, GripVertical } from "lucide-react";
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("colors");
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [isSizeDialogOpen, setIsSizeDialogOpen] = useState(false);
  const [isWorkTypeDialogOpen, setIsWorkTypeDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);
  const [editingSize, setEditingSize] = useState<Size | null>(null);
  const [editingWorkType, setEditingWorkType] = useState<WorkType | null>(null);

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
                          <FormLabel>ชื่อสีภาษาอังกฤษ (เช่น Red, Blue, Green)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="ใส่ชื่อสีภาษาอังกฤษ"
                              onChange={(e) => {
                                // แปลงเป็นภาษาอังกฤษโดยอัตโนมัติ
                                const englishValue = e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z\s]/g, '') // เอาเฉพาะตัวอักษรและช่องว่าง
                                  .replace(/\s+/g, ' ') // ลดช่องว่างซ้ำ
                                  .split(' ')
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(' ');
                                field.onChange(englishValue);
                              }}
                            />
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
                      <TableHead>ชื่อภาษาอังกฤษ</TableHead>
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
                          <TableCell>{color.code || "-"}</TableCell>
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