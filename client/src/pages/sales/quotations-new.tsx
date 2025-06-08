import { useState, useEffect, useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, FileText, X, Wrench, Box, Archive, Package2 as Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertQuotationSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface QuotationItem {
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

const quotationFormSchema = insertQuotationSchema.extend({
  projectName: z.string().optional(),
  priceIncludesVat: z.boolean(),
  items: z.array(z.object({
    productId: z.number().optional(),
    productName: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().min(0),
    unit: z.string().optional(),
    unitPrice: z.number().min(0),
    discountType: z.enum(["percent", "amount"]),
    discount: z.number().min(0).max(100),
    total: z.number().min(0)
  })).optional()
});

export default function QuotationsNew() {
  const { t } = useLanguage();
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers'],
  });

  const { data: products = [] } = useQuery({
    queryKey: ['/api/inventory'],
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ['/api/quotations'],
  });

  // State
  const [productSearchTerms, setProductSearchTerms] = useState<{[key: number]: string}>({});
  const [showProductDropdowns, setShowProductDropdowns] = useState<{[key: number]: boolean}>({});
  const productDropdownRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

  // Generate quotation number in format QT+YYYY+MM+sequence
  const generateQuotationNumber = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Find the highest sequence number for current year/month
    const currentQuotations = quotations || [];
    const currentPrefix = `QT${year}${month}`;
    
    let maxSequence = 0;
    if (Array.isArray(currentQuotations)) {
      currentQuotations.forEach((q: any) => {
        if (q.quotationNumber && q.quotationNumber.startsWith(currentPrefix)) {
          const sequenceStr = q.quotationNumber.substring(currentPrefix.length);
          const sequence = parseInt(sequenceStr);
          if (!isNaN(sequence) && sequence > maxSequence) {
            maxSequence = sequence;
          }
        }
      });
    }
    
    const nextSequence = String(maxSequence + 1).padStart(3, '0');
    return `${currentPrefix}${nextSequence}`;
  }, [quotations]);

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
      projectName: "",
      ...getDefaultDates(),
      priceIncludesVat: false,
      subtotal: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 7,
      taxAmount: 0,
      grandTotal: 0,
      status: "draft",
      notes: "",
      items: Array(5).fill(null).map(() => ({
        productName: "",
        description: "",
        quantity: 0,
        unit: "",
        unitPrice: 0,
        discountType: "percent" as const,
        discount: 0,
        total: 0
      }))
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      let clickedInsideAnyDropdown = false;
      
      Object.keys(productDropdownRefs.current).forEach(key => {
        const ref = productDropdownRefs.current[parseInt(key)];
        if (ref && ref.contains(target)) {
          clickedInsideAnyDropdown = true;
        }
      });
      
      if (!clickedInsideAnyDropdown) {
        setShowProductDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Product filtering and selection
  const getFilteredProducts = (searchTerm: string) => {
    const productList = Array.isArray(products) ? products : [];
    if (!searchTerm) return productList.slice(0, 10);
    return productList.filter((product: any) => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'service': return <Wrench className="w-4 h-4 text-blue-500" />;
      case 'non_stock': return <Box className="w-4 h-4 text-green-500" />;
      case 'stock': return <Archive className="w-4 h-4 text-orange-500" />;
      default: return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'service': return 'บริการ';
      case 'non_stock': return 'สินค้าไม่จัดเก็บ';
      case 'stock': return 'สินค้าจัดเก็บ';
      default: return 'ไม่ระบุ';
    }
  };

  const handleProductSelect = (index: number, product: any) => {
    form.setValue(`items.${index}.productId`, product.id);
    form.setValue(`items.${index}.productName`, product.name);
    form.setValue(`items.${index}.description`, product.description || "");
    form.setValue(`items.${index}.unit`, product.unit);
    form.setValue(`items.${index}.unitPrice`, parseFloat(product.price || "0"));
    
    setProductSearchTerms(prev => ({ ...prev, [index]: product.name }));
    setShowProductDropdowns(prev => ({ ...prev, [index]: false }));
    
    calculateTotals();
  };

  // Calculate totals
  const calculateTotals = () => {
    const items = form.getValues("items");
    const taxPercent = form.getValues("taxPercent") / 100;
    const priceIncludesVat = form.getValues("priceIncludesVat");
    
    let subtotal = 0;
    
    // Calculate individual item totals
    items.forEach((item, index) => {
      let basePrice = item.unitPrice;
      
      // If price includes VAT, calculate the price without VAT
      if (priceIncludesVat) {
        basePrice = item.unitPrice / (1 + taxPercent);
      }
      
      // Calculate discount based on type
      let discountAmount = 0;
      if (item.discountType === "percent") {
        discountAmount = basePrice * (item.discount / 100);
      } else {
        discountAmount = item.discount; // discount per unit in baht
      }
      
      const priceAfterDiscount = basePrice - discountAmount;
      const itemTotal = item.quantity * priceAfterDiscount;
      
      form.setValue(`items.${index}.total`, itemTotal);
      subtotal += itemTotal;
    });
    
    const discountAmount = subtotal * (form.getValues("discountPercent") / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxAmount = subtotalAfterDiscount * taxPercent;
    const grandTotal = subtotalAfterDiscount + taxAmount;

    form.setValue("subtotal", subtotal);
    form.setValue("discountAmount", discountAmount);
    form.setValue("taxAmount", taxAmount);
    form.setValue("grandTotal", grandTotal);
  };

  // Mutations
  const quotationMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      const response = await apiRequest('/api/quotations', 'POST', data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "บันทึกใบเสนอราคาเรียบร้อยแล้ว",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      navigate('/sales/quotations');
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกใบเสนอราคาได้",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: QuotationFormData) => {
    calculateTotals();
    quotationMutation.mutate(data);
  };

  const addItem = () => {
    append({
      productName: "",
      description: "",
      quantity: 0,
      unit: "",
      unitPrice: 0,
      discountType: "percent" as const,
      discount: 0,
      total: 0
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-full mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/sales/quotations')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับ
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                สร้างใบเสนอราคาใหม่
              </h1>
              <p className="text-gray-600 mt-1">กรอกข้อมูลใบเสนอราคา</p>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Header Information Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="quotationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">เลขที่ใบเสนอราคา *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            readOnly 
                            className="bg-gray-50 text-sm h-9"
                          />
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
                        <FormLabel className="text-sm font-medium text-gray-700">ลูกค้า *</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger className="h-9 text-sm">
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">สถานะ</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 text-sm">
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
                </div>

                {/* Project and Date Information */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="projectName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">ชื่อโปรเจค</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ระบุชื่อโปรเจค" 
                            {...field} 
                            className="h-9 text-sm"
                          />
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
                        <FormLabel className="text-sm font-medium text-gray-700">วันที่ *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-9 text-sm" />
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
                        <FormLabel className="text-sm font-medium text-gray-700">วันหมดอายุ *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priceIncludesVat"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-200 p-3 shadow-sm bg-slate-50">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium text-gray-700">ราคารวม VAT</FormLabel>
                        </div>
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => {
                              field.onChange(e.target.checked);
                              calculateTotals();
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Items Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">รายการสินค้า/บริการ</h3>
                    <Button type="button" onClick={addItem} size="sm" className="bg-blue-500 hover:bg-blue-600">
                      <Plus className="h-4 w-4 mr-2" />
                      เพิ่มรายการ
                    </Button>
                  </div>

                  {/* Table Format */}
                  <div className="border border-gray-200 rounded-lg">
                    <table className="w-full border-collapse table-fixed">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border-b border-gray-200 p-3 text-left text-sm font-medium text-gray-700 w-[18%]">สินค้า/บริการ</th>
                          <th className="border-b border-gray-200 p-3 text-left text-sm font-medium text-gray-700 w-[18%]">รายละเอียด</th>
                          <th className="border-b border-gray-200 p-3 text-center text-sm font-medium text-gray-700 w-[8%]">จำนวน</th>
                          <th className="border-b border-gray-200 p-3 text-center text-sm font-medium text-gray-700 w-[8%]">หน่วย</th>
                          <th className="border-b border-gray-200 p-3 text-center text-sm font-medium text-gray-700 w-[12%]">ราคา/หน่วย</th>
                          <th className="border-b border-gray-200 p-3 text-center text-sm font-medium text-gray-700 w-[10%]">ประเภทส่วนลด</th>
                          <th className="border-b border-gray-200 p-3 text-center text-sm font-medium text-gray-700 w-[10%]">ส่วนลด</th>
                          <th className="border-b border-gray-200 p-3 text-center text-sm font-medium text-gray-700 w-[10%]">รวม</th>
                          <th className="border-b border-gray-200 p-3 text-center text-sm font-medium text-gray-700 w-[6%]">ลบ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, index) => (
                          <tr key={field.id} className="hover:bg-gray-50">
                            {/* Product Selection */}
                            <td className="border-b border-gray-200 p-2">
                              <div className="relative" ref={el => productDropdownRefs.current[index] = el}>
                                <Input
                                  placeholder="ชื่อสินค้า/บริการ"
                                  value={productSearchTerms[index] || form.watch(`items.${index}.productName`)}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setProductSearchTerms(prev => ({ ...prev, [index]: value }));
                                    form.setValue(`items.${index}.productName`, value);
                                    setShowProductDropdowns(prev => ({ ...prev, [index]: true }));
                                  }}
                                  onFocus={() => setShowProductDropdowns(prev => ({ ...prev, [index]: true }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      setShowProductDropdowns(prev => ({ ...prev, [index]: false }));
                                    }
                                  }}
                                  className="w-full text-sm h-8"
                                />
                                
                                {showProductDropdowns[index] && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {getFilteredProducts(productSearchTerms[index] || "").map((product: any) => (
                                      <div
                                        key={product.id}
                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={() => handleProductSelect(index, product)}
                                      >
                                        <div className="flex items-center space-x-2">
                                          {getTypeIcon(product.type)}
                                          <div>
                                            <div className="font-medium text-sm">{product.name}</div>
                                            <div className="text-xs text-gray-500">
                                              {product.sku} • {getTypeLabel(product.type)} • {product.unit}
                                              {product.price && ` • ฿${parseFloat(product.price.toString()).toFixed(2)}`}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {getFilteredProducts(productSearchTerms[index] || "").length === 0 && (
                                      <div className="px-3 py-2 text-gray-500 text-sm">ไม่พบสินค้า</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Description */}
                            <td className="border-b border-gray-200 p-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Textarea 
                                        placeholder="รายละเอียด"
                                        className="min-h-[32px] text-sm resize-none"
                                        {...field}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </td>

                            {/* Quantity */}
                            <td className="border-b border-gray-200 p-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        className="w-full text-center text-sm h-8"
                                        {...field}
                                        onChange={(e) => {
                                          field.onChange(parseInt(e.target.value) || 0);
                                          calculateTotals();
                                        }}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </td>

                            {/* Unit */}
                            <td className="border-b border-gray-200 p-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.unit`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input {...field} placeholder="หน่วย" className="w-full text-center text-sm h-8" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </td>

                            {/* Unit Price */}
                            <td className="border-b border-gray-200 p-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.unitPrice`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        className="w-full text-right text-sm h-8"
                                        {...field}
                                        onChange={(e) => {
                                          field.onChange(parseFloat(e.target.value) || 0);
                                          calculateTotals();
                                        }}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </td>

                            {/* Discount Type */}
                            <td className="border-b border-gray-200 p-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.discountType`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Select onValueChange={(value) => {
                                      field.onChange(value);
                                      form.setValue(`items.${index}.discount`, 0);
                                      calculateTotals();
                                    }} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="w-full text-sm h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="percent">%</SelectItem>
                                        <SelectItem value="amount">฿/หน่วย</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                            </td>

                            {/* Discount */}
                            <td className="border-b border-gray-200 p-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.discount`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder="0"
                                        step="0.01"
                                        min="0"
                                        max={form.watch(`items.${index}.discountType`) === "percent" ? "100" : undefined}
                                        className="w-full text-right text-sm h-8"
                                        {...field}
                                        onChange={(e) => {
                                          field.onChange(parseFloat(e.target.value) || 0);
                                          calculateTotals();
                                        }}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </td>

                            {/* Total */}
                            <td className="border-b border-gray-200 p-2 text-right font-medium text-sm">
                              ฿{(form.watch(`items.${index}.total`) || 0).toFixed(2)}
                            </td>

                            {/* Delete */}
                            <td className="border-b border-gray-200 p-2 text-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  remove(index);
                                  calculateTotals();
                                }}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                disabled={fields.length <= 1}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Notes */}
                  <div>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">หมายเหตุ</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="หมายเหตุเพิ่มเติม"
                              className="min-h-[120px] text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Totals */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-gray-900">สรุปยอดรวม</h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>ยอดรวมก่อนส่วนลด:</span>
                        <span>฿{(form.watch("subtotal") || 0).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>ส่วนลด (%):</span>
                        <div className="flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name="discountPercent"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="w-20 text-right text-sm h-8"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(parseFloat(e.target.value) || 0);
                                      calculateTotals();
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <span>%</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>จำนวนส่วนลด:</span>
                        <span>-฿{(form.watch("discountAmount") || 0).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>ยอดหลังหักส่วนลด:</span>
                        <span>฿{((form.watch("subtotal") || 0) - (form.watch("discountAmount") || 0)).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>VAT ({form.watch("taxPercent")}%):</span>
                        <span>฿{(form.watch("taxAmount") || 0).toFixed(2)}</span>
                      </div>
                      
                      <hr className="my-2" />
                      
                      <div className="flex justify-between font-bold text-lg">
                        <span>ยอดรวมสุทธิ:</span>
                        <span className="text-blue-600">฿{(form.watch("grandTotal") || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate('/sales/quotations')}
                  >
                    ยกเลิก
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={quotationMutation.isPending}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    {quotationMutation.isPending ? "กำลังบันทึก..." : "บันทึกใบเสนอราคา"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}