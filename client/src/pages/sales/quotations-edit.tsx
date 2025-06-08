import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, X, Save } from "lucide-react";

interface QuotationItem {
  id?: number;
  productId?: number;
  productName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountType: "percent" | "amount";
  discount: number;
  total: number;
}

interface QuotationFormData {
  quotationNumber: string;
  customerId: number;
  projectName?: string;
  date: string;
  validUntil: string;
  priceIncludesVat: boolean;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  status: string;
  notes?: string;
  items: QuotationItem[];
}

const quotationFormSchema = z.object({
  quotationNumber: z.string().min(1, "เลขที่ใบเสนอราคาจำเป็น"),
  customerId: z.number().min(1, "กรุณาเลือกลูกค้า"),
  projectName: z.string().optional(),
  date: z.string().min(1, "วันที่จำเป็น"),
  validUntil: z.string().min(1, "วันที่สิ้นสุดจำเป็น"),
  priceIncludesVat: z.boolean(),
  subtotal: z.number().min(0),
  discountPercent: z.number().min(0).max(100),
  discountAmount: z.number().min(0),
  taxPercent: z.number().min(0).max(100),
  taxAmount: z.number().min(0),
  grandTotal: z.number().min(0),
  status: z.string().default("draft"),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().optional(),
    productName: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().min(0),
    unit: z.string().optional(),
    unitPrice: z.number().min(0),
    discountType: z.enum(["percent", "amount"]),
    discount: z.number().min(0),
    total: z.number().min(0)
  })).optional()
});

export default function QuotationsEdit() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<QuotationItem[]>([
    { productName: "", description: "", quantity: 0, unit: "", unitPrice: 0, discountType: "percent", discount: 0, total: 0 },
    { productName: "", description: "", quantity: 0, unit: "", unitPrice: 0, discountType: "percent", discount: 0, total: 0 },
    { productName: "", description: "", quantity: 0, unit: "", unitPrice: 0, discountType: "percent", discount: 0, total: 0 },
    { productName: "", description: "", quantity: 0, unit: "", unitPrice: 0, discountType: "percent", discount: 0, total: 0 },
    { productName: "", description: "", quantity: 0, unit: "", unitPrice: 0, discountType: "percent", discount: 0, total: 0 }
  ]);

  // Fetch quotation data
  const { data: quotation, isLoading: quotationLoading } = useQuery({
    queryKey: ['/api/quotations', id],
    enabled: !!id
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['/api/customers']
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ['/api/inventory']
  });

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      quotationNumber: "",
      customerId: 0,
      projectName: "",
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priceIncludesVat: false,
      subtotal: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 7,
      taxAmount: 0,
      grandTotal: 0,
      status: "draft",
      notes: "",
      items: []
    }
  });

  // Load quotation data when available
  useEffect(() => {
    if (quotation && typeof quotation === 'object') {
      const q = Array.isArray(quotation) ? quotation[0] : quotation as any;

      form.reset({
        quotationNumber: q.quotationNumber || "",
        customerId: q.customerId || 0,
        projectName: q.projectName || "",
        date: q.date || new Date().toISOString().split('T')[0],
        validUntil: q.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priceIncludesVat: q.priceIncludesVat || false,
        subtotal: parseFloat(q.subtotal) || 0,
        discountPercent: parseFloat(q.discountPercent) || 0,
        discountAmount: parseFloat(q.discountAmount) || 0,
        taxPercent: parseFloat(q.taxPercent) || 7,
        taxAmount: parseFloat(q.taxAmount) || 0,
        grandTotal: parseFloat(q.grandTotal) || 0,
        status: q.status || "draft",
        notes: q.notes || ""
      });

      // Load quotation items
      if (q.items && Array.isArray(q.items) && q.items.length > 0) {
        const loadedItems = q.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product?.name || "",
          description: item.product?.description || "",
          quantity: item.quantity || 0,
          unit: item.product?.unit || "",
          unitPrice: parseFloat(item.unitPrice) || 0,
          discountType: item.discountType || "percent",
          discount: item.discount || 0,
          total: parseFloat(item.total) || 0
        }));
        
        // Ensure we have at least 5 rows
        while (loadedItems.length < 5) {
          loadedItems.push({
            productName: "", description: "", quantity: 0, unit: "", unitPrice: 0, discountType: "percent", discount: 0, total: 0
          });
        }
        
        setItems(loadedItems);
      }
    }
  }, [quotation, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      const response = await fetch(`/api/quotations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('Failed to update quotation');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "บันทึกการแก้ไขใบเสนอราคาเรียบร้อยแล้ว"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      navigate('/sales/quotations');
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการแก้ไขได้ กรุณาลองใหม่",
        variant: "destructive"
      });
    }
  });

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discountPercent = form.getValues("discountPercent") || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxPercent = form.getValues("taxPercent") || 0;
    const taxAmount = (afterDiscount * taxPercent) / 100;
    const grandTotal = afterDiscount + taxAmount;

    form.setValue("subtotal", subtotal);
    form.setValue("discountAmount", discountAmount);
    form.setValue("taxAmount", taxAmount);
    form.setValue("grandTotal", grandTotal);
  };

  const updateItemTotal = (index: number) => {
    const item = items[index];
    let total = item.quantity * item.unitPrice;
    
    if (item.discountType === "percent") {
      total = total - (total * item.discount / 100);
    } else {
      total = total - (item.discount * item.quantity);
    }
    
    const updatedItems = [...items];
    updatedItems[index] = { ...item, total: Math.max(0, total) };
    setItems(updatedItems);
    
    setTimeout(calculateTotals, 100);
  };

  const addItem = () => {
    setItems([...items, {
      productName: "", description: "", quantity: 0, unit: "", unitPrice: 0, discountType: "percent", discount: 0, total: 0
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);
      setTimeout(calculateTotals, 100);
    }
  };

  const onSubmit = (data: QuotationFormData) => {
    const filteredItems = items.filter(item => 
      item.productName || item.description || item.quantity > 0 || item.unitPrice > 0
    );

    const submissionData = {
      ...data,
      items: filteredItems
    };

    updateMutation.mutate(submissionData);
  };

  if (quotationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/sales/quotations')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>กลับ</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">แก้ไขใบเสนอราคา</h1>
                <p className="text-gray-600 mt-1">แก้ไขข้อมูลใบเสนอราคา {(quotation as any)?.quotationNumber}</p>
              </div>
            </div>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={updateMutation.isPending}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลทั่วไป</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="quotationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>เลขที่ใบเสนอราคา</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ลูกค้า</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกลูกค้า" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(customers) && customers.map((customer: any) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name} - {customer.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อโครงการ</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ระบุชื่อโครงการ" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>วันที่</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>วันหมดอายุ</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>สถานะ</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">ร่าง</SelectItem>
                          <SelectItem value="sent">ส่งแล้ว</SelectItem>
                          <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                          <SelectItem value="rejected">ปฏิเสธ</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>รายการสินค้า/บริการ</CardTitle>
                <div className="flex items-center space-x-2">
                  <FormField
                    control={form.control}
                    name="priceIncludesVat"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm">ราคารวม VAT</FormLabel>
                      </FormItem>
                    )}
                  />
                  <Button type="button" onClick={addItem} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    เพิ่มรายการ
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-2 w-[15%]">สินค้า/บริการ</th>
                        <th className="text-left py-3 px-2 w-[20%]">รายละเอียด</th>
                        <th className="text-center py-3 px-2 w-[12%]">จำนวน</th>
                        <th className="text-center py-3 px-2 w-[8%]">หน่วย</th>
                        <th className="text-right py-3 px-2 w-[12%]">ราคาต่อหน่วย</th>
                        <th className="text-center py-3 px-2 w-[8%]">ส่วนลด</th>
                        <th className="text-center py-3 px-2 w-[6%]">จำนวน</th>
                        <th className="text-right py-3 px-2 w-[10%]">รวม</th>
                        <th className="text-center py-3 px-2 w-[5%]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2 px-2">
                            <Select
                              value={item.productId?.toString() || ""}
                              onValueChange={(value) => {
                                if (value) {
                                  const product = Array.isArray(products) ? products.find((p: any) => p.id === parseInt(value)) : null;
                                  if (product) {
                                    const updatedItems = [...items];
                                    updatedItems[index] = {
                                      ...item,
                                      productId: product.id,
                                      productName: product.name,
                                      unitPrice: product.price || 0
                                    };
                                    setItems(updatedItems);
                                    updateItemTotal(index);
                                  }
                                }
                              }}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="เลือกสินค้า" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.isArray(products) && products.map((product: any) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {!item.productId && (
                              <Input
                                value={item.productName}
                                onChange={(e) => {
                                  const updatedItems = [...items];
                                  updatedItems[index] = { ...item, productName: e.target.value };
                                  setItems(updatedItems);
                                }}
                                placeholder="ชื่อสินค้า/บริการ"
                                className="h-8 mt-1"
                              />
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              value={item.description}
                              onChange={(e) => {
                                const updatedItems = [...items];
                                updatedItems[index] = { ...item, description: e.target.value };
                                setItems(updatedItems);
                              }}
                              placeholder="รายละเอียด"
                              className="h-8"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              value={item.quantity || ""}
                              onChange={(e) => {
                                const updatedItems = [...items];
                                updatedItems[index] = { ...item, quantity: parseFloat(e.target.value) || 0 };
                                setItems(updatedItems);
                                updateItemTotal(index);
                              }}
                              className="h-8 text-center text-lg font-semibold"
                              style={{ fontSize: '16px', minWidth: '100px' }}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              value={item.unit}
                              onChange={(e) => {
                                const updatedItems = [...items];
                                updatedItems[index] = { ...item, unit: e.target.value };
                                setItems(updatedItems);
                              }}
                              placeholder="หน่วย"
                              className="h-8 text-center"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              value={item.unitPrice || ""}
                              onChange={(e) => {
                                const updatedItems = [...items];
                                updatedItems[index] = { ...item, unitPrice: parseFloat(e.target.value) || 0 };
                                setItems(updatedItems);
                                updateItemTotal(index);
                              }}
                              className="h-8 text-right"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Select
                              value={item.discountType}
                              onValueChange={(value: "percent" | "amount") => {
                                const updatedItems = [...items];
                                updatedItems[index] = { ...item, discountType: value, discount: 0 };
                                setItems(updatedItems);
                                updateItemTotal(index);
                              }}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percent">%</SelectItem>
                                <SelectItem value="amount">฿/หน่วย</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              value={item.discount || ""}
                              onChange={(e) => {
                                const updatedItems = [...items];
                                updatedItems[index] = { ...item, discount: parseFloat(e.target.value) || 0 };
                                setItems(updatedItems);
                                updateItemTotal(index);
                              }}
                              className="h-8 text-center"
                            />
                          </td>
                          <td className="py-2 px-2 text-right font-medium">
                            ฿{item.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {items.length > 5 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>สรุปยอดรวม</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="discountPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ส่วนลดรวม (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0);
                                setTimeout(calculateTotals, 100);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="taxPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VAT (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0);
                                setTimeout(calculateTotals, 100);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>หมายเหตุ</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="หมายเหตุเพิ่มเติม" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <span>ยอดรวมก่อนส่วนลด:</span>
                      <span>฿{form.watch("subtotal")?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ส่วนลด ({form.watch("discountPercent") || 0}%):</span>
                      <span>-฿{form.watch("discountAmount")?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT ({form.watch("taxPercent") || 0}%):</span>
                      <span>฿{form.watch("taxAmount")?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || "0.00"}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>ยอดรวมสุทธิ:</span>
                        <span>฿{form.watch("grandTotal")?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || "0.00"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}