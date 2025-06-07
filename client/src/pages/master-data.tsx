import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertColorSchema, insertSizeSchema, type Color, type Size } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Palette, Ruler } from "lucide-react";

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
      isActive: color.isActive
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
      isActive: size.isActive
    });
    setIsSizeDialogOpen(true);
  };

  const handleDeleteColor = (id: number) => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบสีนี้?")) {
      deleteColorMutation.mutate(id);
    }
  };

  const handleDeleteSize = (id: number) => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบไซส์นี้?")) {
      deleteSizeMutation.mutate(id);
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
                          <FormLabel>รหัสสี (เช่น #FF0000)</FormLabel>
                          <FormControl>
                            <Input {...field} type="color" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {colors?.map((color) => (
                  <div key={color.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        {color.code && (
                          <div 
                            className="w-6 h-6 rounded border border-gray-300"
                            style={{ backgroundColor: color.code }}
                          />
                        )}
                        <h3 className="font-semibold">{color.name}</h3>
                      </div>
                      <Badge variant={color.isActive ? "default" : "secondary"}>
                        {color.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
                      </Badge>
                    </div>
                    {color.code && (
                      <p className="text-sm text-gray-600 mb-2">{color.code}</p>
                    )}
                    {color.description && (
                      <p className="text-sm text-gray-500 mb-3">{color.description}</p>
                    )}
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
                  </div>
                ))}
                {colors?.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    ยังไม่มีข้อมูลสี
                  </div>
                )}
              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sizes?.map((size) => (
                  <div key={size.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{size.name}</h3>
                      <Badge variant={size.isActive ? "default" : "secondary"}>
                        {size.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
                      </Badge>
                    </div>
                    {size.category && (
                      <p className="text-sm text-gray-600 mb-2">หมวดหมู่: {size.category}</p>
                    )}
                    {size.description && (
                      <p className="text-sm text-gray-500 mb-3">{size.description}</p>
                    )}
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
                  </div>
                ))}
                {sizes?.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    ยังไม่มีข้อมูลไซส์
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}