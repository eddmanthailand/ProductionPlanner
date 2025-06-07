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
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="quotationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("sales.quotation_number")}</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly className="bg-gray-50" />
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
                        <FormLabel>{t("sales.customer")}</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("sales.select_customer")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(customers as any[]).map((customer: Customer) => (
                              <SelectItem key={customer.id} value={customer.id.toString()}>
                                {customer.name} {customer.companyName && `(${customer.companyName})`}
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("sales.status")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">แบบร่าง</SelectItem>
                            <SelectItem value="sent">ส่งแล้ว</SelectItem>
                            <SelectItem value="accepted">ยอมรับ</SelectItem>
                            <SelectItem value="rejected">ปฏิเสธ</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("sales.date")}</FormLabel>
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
                        <FormLabel>{t("sales.valid_until")}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Tax Calculation Option */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <FormField
                    control={form.control}
                    name="taxInclusive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => {
                              field.onChange(e.target.checked);
                              calculateTotals();
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            ราคารวมภาษี (ราคาที่ใส่รวมภาษีแล้ว)
                          </FormLabel>
                          <p className="text-xs text-gray-600">
                            {field.value ? "ราคาสินค้ารวมภาษีมูลค่าเพิ่ม" : "ราคาสินค้าไม่รวมภาษีมูลค่าเพิ่ม"}
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Items Section */}
                <div className="space-y-4">
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