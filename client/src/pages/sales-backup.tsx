import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Calculator, User, Calendar, FileText, Package2 as Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertQuotationSchema, type Quotation, type Customer, type Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface QuotationItem {
  productId?: number;
  productName?: string;
  description?: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuotationFormData {
  quotationNumber: string;
  customerId: number;
  date: string;
  validUntil: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  status: string;
  notes?: string;
  terms?: string;
  paymentTerms?: string;
  taxInclusive: boolean;
  items: QuotationItem[];
}

const quotationFormSchema = insertQuotationSchema.extend({
  items: z.array(z.object({
    productId: z.number().optional(),
    productName: z.string().min(1, "ต้องระบุชื่อสินค้า"),
    description: z.string().optional(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    total: z.number().min(0)
  })).min(1, "ต้องมีรายการสินค้าอย่างน้อย 1 รายการ")
});

export default function Sales() {
  const { t } = useLanguage();
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  // Get today's date and 30 days later for default values
  const getDefaultDates = () => {
    const today = new Date();
    const validUntil = new Date();
    validUntil.setDate(today.getDate() + 30);
    
    return {
      date: today.toISOString().split('T')[0],
      validUntil: validUntil.toISOString().split('T')[0]
    };
  };

  // Generate quotation number in format QT+YYYY+MM+sequence
  const generateQuotationNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    return `QT${year}${month}-${sequence}`;
  };

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      quotationNumber: "",
      customerId: 0,
      ...getDefaultDates(),
      subtotal: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 7,
      taxAmount: 0,
      grandTotal: 0,
      status: "draft",
      notes: "",
      terms: "",
      paymentTerms: "",
      taxInclusive: false,
      items: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    enabled: !!tenant
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    enabled: !!tenant
  });

  // Fetch quotations
  const { data: quotations = [] } = useQuery({
    queryKey: ["/api/quotations"],
    enabled: !!tenant
  });

  // Create/Update quotation mutation
  const quotationMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      const url = editingQuotation ? `/api/quotations/${editingQuotation.id}` : "/api/quotations";
      const method = editingQuotation ? "PATCH" : "POST";
      
      return apiRequest(url, method, { ...data, tenantId: tenant?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: editingQuotation ? "แก้ไขใบเสนอราคาสำเร็จ" : "สร้างใบเสนอราคาสำเร็จ",
        description: editingQuotation ? "บันทึกการแก้ไขเรียบร้อยแล้ว" : "ใบเสนอราคาใหม่ถูกสร้างแล้ว"
      });
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถบันทึกใบเสนอราคาได้",
        variant: "destructive"
      });
    },
  });

  // Calculate totals with tax inclusive/exclusive options
  const calculateTotals = useCallback(() => {
    const items = form.getValues("items");
    const discountPercent = form.getValues("discountPercent") || 0;
    const taxPercent = form.getValues("taxPercent") || 7;
    const taxInclusive = form.getValues("taxInclusive") || false;

    let subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    
    if (taxInclusive) {
      // If prices are tax-inclusive, extract the tax amount
      const taxMultiplier = 1 + (taxPercent / 100);
      const baseAmount = subtotal / taxMultiplier;
      const taxAmount = subtotal - baseAmount;
      const discountAmount = (baseAmount * discountPercent) / 100;
      const afterDiscount = baseAmount - discountAmount;
      const finalTax = (afterDiscount * taxPercent) / 100;
      const grandTotal = afterDiscount + finalTax;

      form.setValue("subtotal", baseAmount, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
      form.setValue("discountAmount", discountAmount, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
      form.setValue("taxAmount", finalTax, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
      form.setValue("grandTotal", grandTotal, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
    } else {
      // Tax-exclusive calculation (original method)
      const discountAmount = (subtotal * discountPercent) / 100;
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = (afterDiscount * taxPercent) / 100;
      const grandTotal = afterDiscount + taxAmount;

      form.setValue("subtotal", subtotal, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
      form.setValue("discountAmount", discountAmount, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
      form.setValue("taxAmount", taxAmount, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
      form.setValue("grandTotal", grandTotal, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
    }
  }, [form]);

  // Add new item
  const addItem = () => {
    append({
      productId: undefined,
      productName: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0
    });
  };

  // Update item total when quantity or price changes
  const updateItemTotal = (index: number, quantity: number, unitPrice: number) => {
    const total = quantity * unitPrice;
    form.setValue(`items.${index}.total`, total, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
    
    // Calculate totals without triggering infinite loop
    setTimeout(() => calculateTotals(), 0);
  };

  // Handle form submission
  const onSubmit = (data: QuotationFormData) => {
    quotationMutation.mutate(data);
  };

  // Handle edit
  const handleEdit = (quotation: any) => {
    setEditingQuotation(quotation);
    form.reset({
      quotationNumber: quotation.quotationNumber,
      customerId: quotation.customerId,
      date: quotation.date,
      validUntil: quotation.validUntil,
      subtotal: parseFloat(quotation.subtotal) || 0,
      discountPercent: parseFloat(quotation.discountPercent) || 0,
      discountAmount: parseFloat(quotation.discountAmount) || 0,
      taxPercent: parseFloat(quotation.taxPercent) || 7,
      taxAmount: parseFloat(quotation.taxAmount) || 0,
      grandTotal: parseFloat(quotation.grandTotal) || 0,
      status: quotation.status,
      notes: quotation.notes || "",
      terms: quotation.terms || "",
      paymentTerms: quotation.paymentTerms || "",
      taxInclusive: quotation.taxInclusive || false,
      items: (quotation.items || []).map((item: any) => ({
        productId: item.productId,
        productName: item.productName || "",
        description: item.description || "",
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice) || 0,
        total: parseFloat(item.total) || 0
      }))
    });
    setIsDialogOpen(true);
  };

  // Handle new quotation
  const handleAddNew = () => {
    setEditingQuotation(null);
    const newQuotationNumber = generateQuotationNumber();
    form.reset({
      quotationNumber: newQuotationNumber,
      customerId: 0,
      ...getDefaultDates(),
      subtotal: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 7,
      taxAmount: 0,
      grandTotal: 0,
      status: "draft",
      notes: "",
      terms: "",
      paymentTerms: "",
      taxInclusive: false,
      items: []
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: t("sales.status.draft"), variant: "secondary" as const },
      sent: { label: t("sales.status.sent"), variant: "default" as const },
      accepted: { label: t("sales.status.accepted"), variant: "default" as const },
      rejected: { label: t("sales.status.rejected"), variant: "destructive" as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t("sales.title")}</h1>
          <p className="text-gray-600 mt-2">จัดการใบเสนอราคาและการขาย</p>
        </div>
        <Button onClick={handleAddNew} size="lg" className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-5 w-5 mr-2" />
          สร้างใบเสนอราคาใหม่
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQuotation ? "แก้ไขใบเสนอราคา" : "สร้างใบเสนอราคาใหม่"}
              </DialogTitle>
              <DialogDescription>
                {editingQuotation ? "แก้ไขข้อมูลใบเสนอราคา" : "กรอกข้อมูลสำหรับสร้างใบเสนอราคาใหม่"}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Header with quotation number and action buttons */}
                <div className="flex justify-between items-start bg-white p-4 border-b">
                  <div className="flex items-center space-x-4">
                    <div className="text-blue-600">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">สร้างใบเสนอราคา</h2>
                      <FormField
                        control={form.control}
                        name="quotationNumber"
                        render={({ field }) => (
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-lg font-medium text-blue-600">{field.value}</span>
                            <Button type="button" variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                      ยกเลิก
                    </Button>
                    <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">
                      บันทึกข้อมูล
                    </Button>
                  </div>
                </div>

                {/* Two column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
                  {/* Left column - Customer and details */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Customer Information */}
                    <div className="bg-white border rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">ลูกค้า</h3>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="customerId"
                          render={({ field }) => (
                            <div>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="เลือกลูกค้า หรือสร้างลูกค้าใหม่" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(customers as any[]).map((customer: Customer) => (
                                    <SelectItem key={customer.id} value={customer.id.toString()}>
                                      {customer.name} {customer.companyName && `(${customer.companyName})`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <label className="text-gray-600">ชื่อลูกค้า</label>
                            <input 
                              type="text" 
                              className="w-full mt-1 p-2 border rounded bg-gray-50" 
                              placeholder="ชื่อบริษัท/ลูกค้า"
                              readOnly 
                            />
                          </div>
                          <div>
                            <label className="text-gray-600">เลขประจำตัวผู้เสียภาษี</label>
                            <input 
                              type="text" 
                              className="w-full mt-1 p-2 border rounded bg-gray-50" 
                              placeholder="เลขประจำตัวผู้เสียภาษี"
                              readOnly 
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-gray-600">ที่อยู่</label>
                            <textarea 
                              className="w-full mt-1 p-2 border rounded bg-gray-50" 
                              rows={2}
                              placeholder="ที่อยู่ลูกค้า"
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Project Details */}
                    <div className="bg-white border rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm text-gray-600">โครงการ</label>
                          <Select>
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="เลือกโครงการ" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="project1">โครงการ A</SelectItem>
                              <SelectItem value="project2">โครงการ B</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-sm text-gray-600">เพื่อการขาย</label>
                          <Select>
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="เลือกประเภท" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sale1">การขายทั่วไป</SelectItem>
                              <SelectItem value="sale2">การขายส่ง</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-sm text-gray-600">ราคาเสนอจ่าย</label>
                          <Select>
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="ราคาโดยรวมที่เสนอ" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="price1">ราคามาตรฐาน</SelectItem>
                              <SelectItem value="price2">ราคาพิเศษ</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="text-sm text-gray-600">รายละเอียด</label>
                          <Select>
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="ระบุรายละเอียด" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="detail1">รายละเอียดทั่วไป</SelectItem>
                              <SelectItem value="detail2">รายละเอียดพิเศษ</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-sm text-gray-600">คลังสินค้า</label>
                          <Select>
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="คลังสินค้า" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="warehouse1">คลังหลัก</SelectItem>
                              <SelectItem value="warehouse2">คลังสำรอง</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right column - Summary */}
                  <div className="space-y-4">
                    <div className="bg-white border rounded-lg p-4">
                      <h3 className="text-lg font-bold text-center mb-2">จำนวนเงินรวมทั้งสิ้น</h3>
                      <div className="text-center text-3xl font-bold text-blue-600 mb-4">
                        <FormField
                          control={form.control}
                          name="grandTotal"
                          render={({ field }) => (
                            <span>{field.value?.toFixed(2) || "0.00"}</span>
                          )}
                        />
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>วันที่:</span>
                          <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                              <input 
                                type="date" 
                                {...field} 
                                className="border rounded px-2 py-1 text-xs"
                              />
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-between">
                          <span>หมดวันที่ (วัน):</span>
                          <input 
                            type="number" 
                            className="border rounded px-2 py-1 w-16 text-xs" 
                            defaultValue="0"
                          />
                        </div>
                        
                        <div className="flex justify-between">
                          <span>หมดวันที่:</span>
                          <FormField
                            control={form.control}
                            name="validUntil"
                            render={({ field }) => (
                              <input 
                                type="date" 
                                {...field} 
                                className="border rounded px-2 py-1 text-xs"
                              />
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-between">
                          <span>ผู้ขาย/พนง:</span>
                          <Select>
                            <SelectTrigger className="w-32 h-7 text-xs">
                              <SelectValue placeholder="เลือก" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sales1">พนักงานขาย A</SelectItem>
                              <SelectItem value="sales2">พนักงานขาย B</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span>สกุลเงิน:</span>
                          <div className="flex items-center space-x-1">
                            <span className="w-6 h-4 bg-red-500 rounded-sm flex items-center justify-center">
                              <span className="text-white text-xs font-bold">TH</span>
                            </span>
                            <span className="text-xs">- ไทย</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Section with Table */}
                <div className="p-4">
                  <div className="bg-white border rounded-lg overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-cyan-500 text-white">
                      <div className="grid grid-cols-12 gap-2 p-3 text-sm font-medium">
                        <div className="col-span-1 text-center">ลำดับ</div>
                        <div className="col-span-4">รายการ / รายละเอียด</div>
                        <div className="col-span-1 text-center">จำนวน</div>
                        <div className="col-span-1 text-center">หน่วย</div>
                        <div className="col-span-2 text-center">ราคาต่อหน่วย</div>
                        <div className="col-span-2 text-center">ส่วนลด (%)</div>
                        <div className="col-span-1 text-center">รวมราคา</div>
                      </div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y">
                      {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-2 p-3 items-center">
                          <div className="col-span-1 text-center text-sm font-medium">
                            {index + 1}
                          </div>
                          
                          <div className="col-span-4 space-y-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.productId`}
                              render={({ field: productField }) => (
                                <Select 
                                  onValueChange={(value) => {
                                    if (value === "custom") {
                                      productField.onChange(undefined);
                                      form.setValue(`items.${index}.productName`, "");
                                    } else {
                                      const selectedProduct = (products as any[]).find(p => p.id.toString() === value);
                                      productField.onChange(parseInt(value));
                                      if (selectedProduct) {
                                        form.setValue(`items.${index}.productName`, selectedProduct.name);
                                      }
                                    }
                                  }} 
                                  value={productField.value?.toString() || "custom"}
                                >
                                  <SelectTrigger className="w-full h-8 text-xs">
                                    <SelectValue placeholder="เลือกสินค้า" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="custom">พิมพ์ชื่อสินค้าเอง</SelectItem>
                                    {(products as any[]).map((product: Product) => (
                                      <SelectItem key={product.id} value={product.id.toString()}>
                                        {product.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            
                            {!form.watch(`items.${index}.productId`) && (
                              <FormField
                                control={form.control}
                                name={`items.${index}.productName`}
                                render={({ field: nameField }) => (
                                  <Input 
                                    {...nameField}
                                    placeholder="ชื่อสินค้า"
                                    className="h-8 text-xs"
                                  />
                                )}
                              />
                            )}
                            
                            <FormField
                              control={form.control}
                              name={`items.${index}.description`}
                              render={({ field: descField }) => (
                                <Input 
                                  {...descField}
                                  placeholder="รายละเอียด"
                                  className="h-8 text-xs"
                                />
                              )}
                            />
                          </div>
                          
                          <div className="col-span-1">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field: qtyField }) => (
                                <Input
                                  type="number"
                                  min="1"
                                  className="w-full h-8 text-xs text-center"
                                  {...qtyField}
                                  onChange={(e) => {
                                    const quantity = parseInt(e.target.value) || 0;
                                    qtyField.onChange(quantity);
                                    const unitPrice = form.getValues(`items.${index}.unitPrice`);
                                    updateItemTotal(index, quantity, unitPrice);
                                  }}
                                />
                              )}
                            />
                          </div>
                          
                          <div className="col-span-1 text-center text-xs text-gray-600">
                            ชิ้น
                          </div>
                          
                          <div className="col-span-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitPrice`}
                              render={({ field: priceField }) => (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-full h-8 text-xs text-right"
                                  {...priceField}
                                  onChange={(e) => {
                                    const unitPrice = parseFloat(e.target.value) || 0;
                                    priceField.onChange(unitPrice);
                                    const quantity = form.getValues(`items.${index}.quantity`);
                                    updateItemTotal(index, quantity, unitPrice);
                                  }}
                                />
                              )}
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              className="w-full h-8 text-xs text-center"
                              placeholder="0"
                            />
                          </div>
                          
                          <div className="col-span-1">
                            <FormField
                              control={form.control}
                              name={`items.${index}.total`}
                              render={({ field: totalField }) => (
                                <div className="text-right text-sm font-medium">
                                  {totalField.value?.toFixed(2) || "0.00"}
                                </div>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                      
                      {/* Empty rows to show 3 total rows like in the image */}
                      {Array.from({ length: Math.max(0, 3 - fields.length) }).map((_, index) => (
                        <div key={`empty-${index}`} className="grid grid-cols-12 gap-2 p-3 items-center min-h-[60px]">
                          <div className="col-span-1 text-center text-sm font-medium">
                            {fields.length + index + 1}
                          </div>
                          <div className="col-span-4"></div>
                          <div className="col-span-1"></div>
                          <div className="col-span-1"></div>
                          <div className="col-span-2"></div>
                          <div className="col-span-2"></div>
                          <div className="col-span-1 text-right text-sm font-medium">0.00</div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add Item Button */}
                    <div className="p-3 border-t bg-gray-50">
                      <Button type="button" onClick={addItem} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        เพิ่มรายการสินค้า
                      </Button>
                    </div>
                  </div>
                  
                  {/* Summary Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* Left side - Notes and Terms */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">หมายเหตุ:</label>
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <Textarea 
                              {...field}
                              className="min-h-[80px] resize-none"
                              placeholder="หมายเหตุเพิ่มเติม"
                            />
                          )}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">เงื่อนไขการชำระเงิน:</label>
                        <FormField
                          control={form.control}
                          name="terms"
                          render={({ field }) => (
                            <Textarea 
                              {...field}
                              className="min-h-[80px] resize-none"
                              placeholder="เงื่อนไขการชำระเงิน"
                            />
                          )}
                        />
                      </div>
                    </div>
                    
                    {/* Right side - Price Summary */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-600">รวมเป็นเงิน:</span>
                        <span className="font-medium">
                          <FormField
                            control={form.control}
                            name="subtotal"
                            render={({ field }) => (
                              <span>{field.value?.toFixed(2) || "0.00"}</span>
                            )}
                          />
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-blue-600">ส่วนลดรวม:</span>
                        <span className="font-medium">
                          <FormField
                            control={form.control}
                            name="discountAmount"
                            render={({ field }) => (
                              <span>{field.value?.toFixed(2) || "0.00"}</span>
                            )}
                          />
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-blue-600">จำนวนเงินก่อนภาษี:</span>
                        <span className="font-medium">0.00</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="taxInclusive"
                            render={({ field }) => (
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={(e) => {
                                  field.onChange(e.target.checked);
                                  calculateTotals();
                                }}
                                className="w-4 h-4"
                              />
                            )}
                          />
                          <span className="text-blue-600">ภาษีมูลค่าเพิ่ม 7%</span>
                        </div>
                        <span className="font-medium">
                          <FormField
                            control={form.control}
                            name="taxAmount"
                            render={({ field }) => (
                              <span>{field.value?.toFixed(2) || "0.00"}</span>
                            )}
                          />
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-blue-600">จำนวนเงินรวมทั้งสิ้น:</span>
                        <span className="font-medium">
                          <FormField
                            control={form.control}
                            name="grandTotal"
                            render={({ field }) => (
                              <span>{field.value?.toFixed(2) || "0.00"}</span>
                            )}
                          />
                        </span>
                      </div>
                      
                      <div className="pt-3 border-t">
                        <div className="text-right">
                          <span className="text-blue-600 font-medium">ยอดเป็น ตัวอักษร</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quotations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>{t("sales.quotations")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quotations?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              ไม่มีใบเสนอราคา
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">{t("sales.quotation_number")}</th>
                    <th className="text-left p-3">{t("sales.customer")}</th>
                    <th className="text-left p-3">{t("sales.date")}</th>
                    <th className="text-left p-3">{t("sales.grand_total")}</th>
                    <th className="text-left p-3">{t("common.status")}</th>
                    <th className="text-left p-3">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations?.map((quotation: any) => {
                    const customer = customers?.find(c => c.id === quotation.customerId);
                    return (
                      <tr key={quotation.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{quotation.quotationNumber}</td>
                        <td className="p-3">{customer?.name}</td>
                        <td className="p-3">{quotation.date}</td>
                        <td className="p-3">฿{parseFloat(quotation.grandTotal || 0).toFixed(2)}</td>
                        <td className="p-3">
                          {getStatusBadge(quotation.status)}
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(quotation)}
                            >
                              <Edit className="h-4 w-4" />
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
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{t("sales.items")}</h3>
                    <Button type="button" onClick={addItem} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      {t("sales.add_item")}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Product Selection */}
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">
                                สินค้า
                              </label>
                              <FormField
                                control={form.control}
                                name={`items.${index}.productId`}
                                render={({ field: productField }) => (
                                  <Select 
                                    onValueChange={(value) => {
                                      if (value === "custom") {
                                        productField.onChange(undefined);
                                        form.setValue(`items.${index}.productName`, "");
                                      } else {
                                        const selectedProduct = (products as any[]).find(p => p.id.toString() === value);
                                        productField.onChange(parseInt(value));
                                        if (selectedProduct) {
                                          form.setValue(`items.${index}.productName`, selectedProduct.name);
                                        }
                                      }
                                    }} 
                                    value={productField.value?.toString() || "custom"}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="เลือกสินค้าหรือพิมพ์เอง" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="custom">พิมพ์ชื่อสินค้าเอง</SelectItem>
                                      {(products as any[]).map((product: Product) => (
                                        <SelectItem key={product.id} value={product.id.toString()}>
                                          {product.name} ({product.sku})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                            
                            {/* Custom Product Name Input */}
                            {!form.watch(`items.${index}.productId`) && (
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                  ชื่อสินค้า
                                </label>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.productName`}
                                  render={({ field: nameField }) => (
                                    <Input
                                      {...nameField}
                                      placeholder="ระบุชื่อสินค้า"
                                      className="w-full"
                                    />
                                  )}
                                />
                              </div>
                            )}

                            {/* Product Description */}
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">
                                รายละเอียดสินค้า
                              </label>
                              <FormField
                                control={form.control}
                                name={`items.${index}.description`}
                                render={({ field: descField }) => (
                                  <Textarea
                                    {...descField}
                                    placeholder="รายละเอียด คุณสมบัติ หรือข้อมูลเพิ่มเติม"
                                    rows={2}
                                    className="w-full"
                                  />
                                )}
                              />
                            </div>
                          </div>

                          {/* Quantity and Pricing */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                  จำนวน
                                </label>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.quantity`}
                                  render={({ field: qtyField }) => (
                                    <Input
                                      type="number"
                                      min="1"
                                      className="w-full"
                                      {...qtyField}
                                      onChange={(e) => {
                                        const quantity = parseInt(e.target.value) || 0;
                                        qtyField.onChange(quantity);
                                        const unitPrice = form.getValues(`items.${index}.unitPrice`);
                                        updateItemTotal(index, quantity, unitPrice);
                                      }}
                                    />
                                  )}
                                />
                              </div>

                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                  ราคาต่อหน่วย (บาท)
                                </label>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.unitPrice`}
                                  render={({ field: priceField }) => (
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="w-full"
                                      {...priceField}
                                      onChange={(e) => {
                                        const unitPrice = parseFloat(e.target.value) || 0;
                                        priceField.onChange(unitPrice);
                                        const quantity = form.getValues(`items.${index}.quantity`);
                                        updateItemTotal(index, quantity, unitPrice);
                                      }}
                                    />
                                  )}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">
                                ราคารวม (บาท)
                              </label>
                              <FormField
                                control={form.control}
                                name={`items.${index}.total`}
                                render={({ field: totalField }) => (
                                  <Input
                                    type="number"
                                    className="w-full bg-gray-50 font-medium"
                                    {...totalField}
                                    readOnly
                                  />
                                )}
                              />
                            </div>

                            <div className="flex justify-end pt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => remove(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                ลบรายการ
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {fields.length === 0 && (
                      <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>ยังไม่มีรายการสินค้า</p>
                        <p className="text-sm">กดปุ่ม "เพิ่มรายการ" เพื่อเริ่มต้น</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Totals Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("sales.notes")}</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>เงื่อนไขการชำระเงิน</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              rows={2}
                              placeholder="เช่น ชำระเงินภายใน 30 วัน, โอนเงินผ่านธนาคาร, เงินสดเท่านั้น"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>โน้ตภายในบริษัท</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              rows={3}
                              placeholder="บันทึกภายในบริษัท (ลูกค้าจะไม่เห็น)"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div className="flex justify-between">
                        <span>{t("sales.subtotal")}:</span>
                        <span>฿{form.watch("subtotal")?.toLocaleString() || "0"}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>{t("sales.discount")} (%):</span>
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="discountPercent"
                            render={({ field }) => (
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-20"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseFloat(e.target.value) || 0);
                                  calculateTotals();
                                }}
                              />
                            )}
                          />
                          <span>= ฿{form.watch("discountAmount")?.toLocaleString() || "0"}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>{t("sales.tax")} (%):</span>
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="taxPercent"
                            render={({ field }) => (
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-20"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseFloat(e.target.value) || 0);
                                  calculateTotals();
                                }}
                              />
                            )}
                          />
                          <span>= ฿{form.watch("taxAmount")?.toLocaleString() || "0"}</span>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3">
                        <div className="flex justify-between font-bold text-lg">
                          <span>{t("sales.grand_total")}:</span>
                          <span>฿{form.watch("grandTotal")?.toLocaleString() || "0"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={quotationMutation.isPending}>
                    {quotationMutation.isPending 
                      ? t("common.loading") 
                      : editingQuotation 
                        ? "บันทึกการแก้ไข" 
                        : "สร้างใบเสนอราคา"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("sales.quotations")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {(quotations as any[]).map((quotation: any) => {
              const customer = (customers as any[]).find((c: any) => c.id === quotation.customerId);
              return (
                <div key={quotation.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-lg">{quotation.quotationNumber}</h3>
                        {getStatusBadge(quotation.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {customer?.name} {customer?.companyName && `(${customer.companyName})`}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {quotation.date} - {quotation.validUntil}
                        </div>
                        <div className="flex items-center">
                          <Calculator className="h-4 w-4 mr-1" />
                          รวม: ฿{parseFloat(quotation.grandTotal).toLocaleString()}
                        </div>
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          รายการ: {quotation.items ? quotation.items.length : 0} รายการ
                        </div>
                      </div>
                      
                      {quotation.notes && (
                        <p className="text-sm text-gray-500 mt-2">{quotation.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(quotation)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {(quotations as any[]).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                ยังไม่มีใบเสนอราคา
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}