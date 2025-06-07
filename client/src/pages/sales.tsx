import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, FileText, Calendar, User, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertQuotationSchema, type Quotation, type Customer, type Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface QuotationItem {
  productId: number;
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
  items: QuotationItem[];
}

const quotationFormSchema = insertQuotationSchema.extend({
  items: z.array(z.object({
    productId: z.number(),
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

  // Generate quotation number
  const generateQuotationNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `QT${year}${month}${day}-${random}`;
  };

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

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      quotationNumber: generateQuotationNumber(),
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
      terms: "ชำระเงินภายใน 30 วัน",
      items: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Fetch quotations
  const { data: quotations, isLoading: isLoadingQuotations } = useQuery({
    queryKey: ['/api/quotations'],
    enabled: !!tenant?.id,
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
    enabled: !!tenant?.id,
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    enabled: !!tenant?.id,
  });

  // Create/Update quotation mutation
  const quotationMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      const endpoint = editingQuotation 
        ? `/api/quotations/${editingQuotation.id}`
        : '/api/quotations';
      
      return apiRequest(endpoint, {
        method: editingQuotation ? 'PATCH' : 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      toast({
        title: editingQuotation ? "อัปเดตใบเสนอราคาสำเร็จ" : "สร้างใบเสนอราคาสำเร็จ",
      });
      setIsDialogOpen(false);
      setEditingQuotation(null);
      form.reset({
        quotationNumber: generateQuotationNumber(),
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
        terms: "ชำระเงินภายใน 30 วัน",
        items: []
      });
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถบันทึกใบเสนอราคาได้",
        variant: "destructive",
      });
    },
  });

  // Calculate totals when items change
  const calculateTotals = () => {
    const items = form.watch("items");
    const discountPercent = form.getValues("discountPercent") || 0;
    const taxPercent = form.getValues("taxPercent") || 7;

    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const discountAmount = (subtotal * discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * taxPercent) / 100;
    const grandTotal = afterDiscount + taxAmount;

    form.setValue("subtotal", subtotal);
    form.setValue("discountAmount", discountAmount);
    form.setValue("taxAmount", taxAmount);
    form.setValue("grandTotal", grandTotal);
  };

  // Add new item
  const addItem = () => {
    append({
      productId: 0,
      quantity: 1,
      unitPrice: 0,
      total: 0
    });
  };

  // Update item total when quantity or price changes
  const updateItemTotal = (index: number, quantity: number, unitPrice: number) => {
    const total = quantity * unitPrice;
    form.setValue(`items.${index}.total`, total);
    calculateTotals();
  };

  // Handle form submission
  const onSubmit = (data: QuotationFormData) => {
    quotationMutation.mutate({
      ...data,
      tenantId: tenant!.id
    });
  };

  // Handle edit
  const handleEdit = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    form.reset({
      ...quotation,
      items: quotation.items || []
    });
    setIsDialogOpen(true);
  };

  // Handle new quotation
  const handleAddNew = () => {
    setEditingQuotation(null);
    form.reset({
      quotationNumber: generateQuotationNumber(),
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
      terms: "ชำระเงินภายใน 30 วัน",
      items: []
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: t("sales.status.draft"), variant: "secondary" as const },
      sent: { label: t("sales.status.sent"), variant: "default" as const },
      accepted: { label: t("sales.status.accepted"), variant: "default" as const },
      rejected: { label: t("sales.status.rejected"), variant: "destructive" as const },
      expired: { label: t("sales.status.expired"), variant: "outline" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoadingQuotations) {
    return <div className="p-6">{t("common.loading")}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t("sales.title")}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              {t("sales.new_quotation")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQuotation ? "แก้ไขใบเสนอราคา" : t("sales.new_quotation")}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            {customers?.map((customer: Customer) => (
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

                {/* Items Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">{t("sales.items")}</h3>
                    <Button type="button" variant="outline" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("sales.add_item")}
                    </Button>
                  </div>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("sales.product")}</TableHead>
                          <TableHead className="w-24">{t("sales.quantity")}</TableHead>
                          <TableHead className="w-32">{t("sales.unit_price")}</TableHead>
                          <TableHead className="w-32">{t("sales.total")}</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((field, index) => (
                          <TableRow key={field.id}>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.productId`}
                                render={({ field: productField }) => (
                                  <Select 
                                    onValueChange={(value) => productField.onChange(parseInt(value))} 
                                    value={productField.value?.toString()}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("sales.select_product")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {products?.map((product: Product) => (
                                        <SelectItem key={product.id} value={product.id.toString()}>
                                          {product.name} ({product.sku})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field: qtyField }) => (
                                  <Input
                                    type="number"
                                    min="1"
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
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.unitPrice`}
                                render={({ field: priceField }) => (
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
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
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.total`}
                                render={({ field: totalField }) => (
                                  <Input
                                    type="number"
                                    {...totalField}
                                    readOnly
                                    className="bg-gray-50"
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
                      name="terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("sales.terms")}</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} />
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
            {quotations?.map((quotation: Quotation) => {
              const customer = customers?.find((c: Customer) => c.id === quotation.customerId);
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
                          รายการ: {quotation.items?.length || 0} รายการ
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
            
            {quotations?.length === 0 && (
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