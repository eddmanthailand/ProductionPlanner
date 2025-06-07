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
import { insertColorSchema, insertSizeSchema, type Color, type Size } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Palette, Ruler, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MasterData() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("colors");
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [isSizeDialogOpen, setIsSizeDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);
  const [editingSize, setEditingSize] = useState<Size | null>(null);

  // Queries
  const { data: colors, isLoading: colorsLoading } = useQuery<Color[]>({
    queryKey: ["/api/colors"]
  });

  const { data: sizes, isLoading: sizesLoading } = useQuery<Size[]>({
    queryKey: ["/api/sizes"]
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
      category: "",
      sortOrder: 0,
      description: "",
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
      category: size.category || "",
      sortOrder: size.sortOrder || 0,
      description: size.description || "",
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

  // Handle drag and drop for colors
  const handleColorDragEnd = (result: DropResult) => {
    if (!result.destination || !colors) return;
    
    const items = Array.from(colors);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
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
  };

  // Handle drag and drop for sizes
  const handleSizeDragEnd = (result: DropResult) => {
    if (!result.destination || !sizes) return;
    
    const items = Array.from(sizes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
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

  if (colorsLoading || sizesLoading) {
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            จัดการสี
          </TabsTrigger>
          <TabsTrigger value="sizes" className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            จัดการไซส์
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
              <DragDropContext onDragEnd={handleColorDragEnd}>
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
                  <Droppable droppableId="colors">
                    {(provided) => (
                      <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                        {colors?.map((color, index) => (
                          <Draggable key={color.id} draggableId={color.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <TableRow 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={snapshot.isDragging ? "bg-gray-100" : ""}
                              >
                                <TableCell {...provided.dragHandleProps} className="cursor-grab">
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
                              </TableRow>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {colors?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                              ยังไม่มีข้อมูลสี
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    )}
                  </Droppable>
                </Table>
              </DragDropContext>
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
                    <FormField
                      control={sizeForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>หมวดหมู่</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="เลือกหมวดหมู่" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="เสื้อผ้า">เสื้อผ้า</SelectItem>
                              <SelectItem value="รองเท้า">รองเท้า</SelectItem>
                              <SelectItem value="หมวก">หมวก</SelectItem>
                              <SelectItem value="กระเป๋า">กระเป๋า</SelectItem>
                              <SelectItem value="อื่นๆ">อื่นๆ</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={sizeForm.control}
                      name="sortOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ลำดับการแสดง</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={sizeForm.control}
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
              <DragDropContext onDragEnd={handleSizeDragEnd}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>ชื่อไซส์</TableHead>
                      <TableHead>หมวดหมู่</TableHead>
                      <TableHead>ลำดับ</TableHead>
                      <TableHead>คำอธิบาย</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <Droppable droppableId="sizes">
                    {(provided) => (
                      <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                        {sizes?.map((size, index) => (
                          <Draggable key={size.id} draggableId={size.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <TableRow 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={snapshot.isDragging ? "bg-gray-100" : ""}
                              >
                                <TableCell {...provided.dragHandleProps} className="cursor-grab">
                                  <GripVertical className="h-4 w-4 text-gray-400" />
                                </TableCell>
                                <TableCell className="font-medium">{size.name}</TableCell>
                                <TableCell>{size.category || "-"}</TableCell>
                                <TableCell>{size.sortOrder || "-"}</TableCell>
                                <TableCell>{size.description || "-"}</TableCell>
                                <TableCell>
                                  <Badge variant={size.isActive ? "default" : "secondary"}>
                                    {size.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
                                  </Badge>
                                </TableCell>
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
                              </TableRow>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {sizes?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                              ยังไม่มีข้อมูลไซส์
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    )}
                  </Droppable>
                </Table>
              </DragDropContext>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}