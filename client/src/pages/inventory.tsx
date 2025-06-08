import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Package, AlertTriangle, CheckCircle, Wrench, Box, Archive, Edit, Trash2 } from "lucide-react";
import { insertProductSchema, type Product } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Remove duplicate interface, using the one from schema instead

export default function Inventory() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/inventory"]
  });

  const form = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      type: "service",
      price: "0",
      cost: "0",
      category: "",
      unit: "ชิ้น",
      currentStock: 0,
      minStock: 0,
      maxStock: 0,
      location: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("/api/inventory", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest(`/api/inventory/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/inventory/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });

  const handleSubmit = (data: any) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      sku: product.sku,
      type: product.type,
      price: String(product.price || 0),
      cost: String(product.cost || 0),
      category: product.category || "",
      unit: product.unit,
      currentStock: product.currentStock || 0,
      minStock: product.minStock || 0,
      maxStock: product.maxStock || 0,
      location: product.location || "",
      isActive: product.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    const productToDelete = products?.find(p => p.id === id);
    const productName = productToDelete?.name || 'สินค้า/บริการ';
    
    const confirmDelete = window.confirm(
      `คุณต้องการลบ "${productName}" หรือไม่?\n\nการลบนี้ไม่สามารถย้อนกลับได้`
    );
    
    if (confirmDelete) {
      deleteMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    form.reset({
      name: "",
      description: "",
      sku: "",
      type: "service",
      price: "0",
      cost: "0",
      category: "",
      unit: "ชิ้น",
      currentStock: 0,
      minStock: 0,
      maxStock: 0,
      location: "",
      isActive: true,
    });
  };

  const getStockStatus = (product: Product) => {
    if (product.type !== "stock_product") return "not_tracked";
    const stock = product.currentStock || 0;
    const minStock = product.minStock || 0;
    
    if (stock <= 0) return "out_of_stock";
    if (stock <= minStock) return "low_stock";
    return "in_stock";
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "service": return "บริการ";
      case "non_stock_product": return "สินค้าไม่นับสต็อก";
      case "stock_product": return "สินค้านับสต็อก";
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "service": return "bg-blue-100 text-blue-800";
      case "non_stock_product": return "bg-purple-100 text-purple-800";
      case "stock_product": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "service": return <Wrench className="h-4 w-4" />;
      case "non_stock_product": return <Box className="h-4 w-4" />;
      case "stock_product": return <Archive className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "out_of_stock":
        return "bg-red-100 text-red-800";
      case "low_stock":
        return "bg-yellow-100 text-yellow-800";
      case "in_stock":
        return "bg-green-100 text-green-800";
      case "not_tracked":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "out_of_stock":
        return <AlertTriangle className="h-4 w-4" />;
      case "low_stock":
        return <AlertTriangle className="h-4 w-4" />;
      case "in_stock":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "out_of_stock": return "หมด";
      case "low_stock": return "ใกล้หมด";
      case "in_stock": return "พอเพียง";
      case "not_tracked": return "ไม่ติดตาม";
      default: return "-";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">{t("nav.inventory")}</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  // Group products by type
  const serviceProducts = products?.filter(p => p.type === "service") || [];
  const nonStockProducts = products?.filter(p => p.type === "non_stock_product") || [];
  const stockProducts = products?.filter(p => p.type === "stock_product") || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t("nav.inventory")}</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มสินค้า/บริการใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "แก้ไขสินค้า/บริการ" : "เพิ่มสินค้า/บริการใหม่"}
              </DialogTitle>
              <DialogDescription>
                กรุณากรอกข้อมูลสินค้าหรือบริการ
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชื่อสินค้า/บริการ *</FormLabel>
                        <FormControl>
                          <Input placeholder="กรอกชื่อสินค้าหรือบริการ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>รหัสสินค้า (SKU) *</FormLabel>
                        <FormControl>
                          <Input placeholder="เช่น PRD001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>รายละเอียด</FormLabel>
                      <FormControl>
                        <Textarea placeholder="รายละเอียดของสินค้าหรือบริการ" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ประเภท *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกประเภท" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="service">บริการ</SelectItem>
                            <SelectItem value="non_stock_product">สินค้าไม่นับสต็อก</SelectItem>
                            <SelectItem value="stock_product">สินค้านับสต็อก</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>หน่วย *</FormLabel>
                        <FormControl>
                          <Input placeholder="เช่น ชิ้น, กิโลกรัม, ชั่วโมง" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ราคาขาย (บาท)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ต้นทุน (บาท)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>หมวดหมู่</FormLabel>
                      <FormControl>
                        <Input placeholder="เช่น อิเล็กทรอนิกส์, เสื้อผ้า, บริการทำความสะอาด" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Stock fields only for stock products */}
                {form.watch("type") === "stock_product" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="currentStock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>สต็อกปัจจุบัน</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="minStock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>สต็อกขั้นต่ำ</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxStock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>สต็อกสูงสุด</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ตำแหน่งจัดเก็บ</FormLabel>
                          <FormControl>
                            <Input placeholder="เช่น คลังสินค้า A ชั้น 2" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    ยกเลิก
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? "กำลังบันทึก..." : 
                     editingProduct ? "อัพเดท" : "บันทึก"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">บริการ</p>
                <p className="text-2xl font-bold text-blue-600">{serviceProducts.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Wrench className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">สินค้าไม่นับสต็อก</p>
                <p className="text-2xl font-bold text-purple-600">{nonStockProducts.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Box className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">สินค้านับสต็อก</p>
                <p className="text-2xl font-bold text-green-600">{stockProducts.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Archive className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>สินค้าและบริการทั้งหมด</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!products || products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              ไม่มีข้อมูลสินค้าและบริการ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">รหัส</th>
                    <th className="text-left p-3">ชื่อ</th>
                    <th className="text-left p-3">ประเภท</th>
                    <th className="text-left p-3">หมวดหมู่</th>
                    <th className="text-left p-3">หน่วย</th>
                    <th className="text-left p-3">ราคา</th>
                    <th className="text-left p-3">สต็อกคงเหลือ</th>
                    <th className="text-left p-3">สถานะ</th>
                    <th className="text-left p-3">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const status = getStockStatus(product);
                    return (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{product.sku}</td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-gray-500">{product.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={`${getTypeColor(product.type)} flex items-center space-x-1`}>
                            {getTypeIcon(product.type)}
                            <span>{getTypeLabel(product.type)}</span>
                          </Badge>
                        </td>
                        <td className="p-3">{product.category || '-'}</td>
                        <td className="p-3">{product.unit}</td>
                        <td className="p-3">
                          {product.price ? `฿${parseFloat(product.price.toString()).toFixed(2)}` : '-'}
                        </td>
                        <td className="p-3">
                          {product.type === "stock_product" ? 
                            `${product.currentStock || 0} / ${product.minStock || 0}` : 
                            '-'
                          }
                        </td>
                        <td className="p-3">
                          <Badge className={`${getStatusColor(status)} flex items-center space-x-1`}>
                            {getStatusIcon(status)}
                            <span>{getStatusText(status)}</span>
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}