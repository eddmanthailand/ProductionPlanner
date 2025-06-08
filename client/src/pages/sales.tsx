import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Calculator, User, Calendar, FileText, Package2 as Package, X, ChevronDown, Wrench, Box, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertQuotationSchema, type Quotation, type Customer, type Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Schema for validation
const quotationFormSchema = z.object({
  customerId: z.string().min(1, "กรุณาเลือกลูกค้า"),
  projectName: z.string().default(""),
  date: z.string().min(1, "กรุณาใส่วันที่"),
  validUntil: z.string().min(1, "กรุณาใส่วันหมดอายุ"),
  priceIncludesVat: z.boolean().default(false),
  items: z.array(z.object({
    productId: z.number().optional(),
    productName: z.string().min(1, "กรุณาใส่ชื่อสินค้า"),
    description: z.string().default(""),
    type: z.enum(['service', 'non_stock_product', 'stock_product']).optional(),
    quantity: z.union([z.string(), z.number()]).transform((val) => {
      if (typeof val === 'string' && val === '') return 1;
      return typeof val === 'string' ? parseInt(val) || 1 : val;
    }),
    unit: z.string().default("ชิ้น"),
    unitPrice: z.union([z.string(), z.number()]).transform((val) => {
      if (typeof val === 'string' && val === '') return 0;
      return typeof val === 'string' ? parseFloat(val) || 0 : val;
    }),
    discount: z.union([z.string(), z.number()]).transform((val) => {
      if (typeof val === 'string' && val === '') return 0;
      return typeof val === 'string' ? parseFloat(val) || 0 : val;
    }),
    total: z.number().default(0)
  })).min(1, "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ"),
  subtotal: z.number().default(0),
  discountAmount: z.number().default(0),
  subtotalAfterDiscount: z.number().default(0),
  vatAmount: z.number().default(0),
  grandTotal: z.number().default(0),
  notes: z.string().default("")
});

type QuotationFormData = z.infer<typeof quotationFormSchema>;

// รายการหน่วยที่แนะนำ
const suggestedUnits = [
  "ชิ้น", "อัน", "ใบ", "แผ่น", "ชุด", "คู่", "ตัว", "หลอด", "เล่ม", "กล่อง",
  "ลิตร", "มิลลิลิตร", "กิโลกรัม", "กรัม", "ตัน", "ปอนด์", "ออนซ์",
  "เมตร", "เซนติเมตร", "มิลลิเมตร", "กิโลเมตร", "นิ้ว", "ฟุต", "หลา",
  "ตารางเมตร", "ตารางนิ้ว", "ตารางฟุต", "ไร่", "งาน", "วา",
  "ลูกบาศก์เมตร", "ลูกบาศก์ฟุต", "แกลลอน", "ขวด", "ถุง", "หีบ",
  "ชั่วโมง", "วัน", "เดือน", "ปี", "ครั้ง", "รอบ", "บริการ", "แพ็ค"
];

const translations = {
  th: {
    "sales.title": "การขาย",
    "sales.quotations": "ใบเสนอราคา",
    "sales.newQuotation": "สร้างใบเสนอราคาใหม่"
  },
  en: {
    "sales.title": "Sales", 
    "sales.quotations": "Quotations",
    "sales.newQuotation": "Create New Quotation"
  }
};

export default function Sales() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const t = (key: string) => (translations as any)[language][key] || key;

  // State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [productSearchTerms, setProductSearchTerms] = useState<{[key: number]: string}>({});
  const [showProductDropdown, setShowProductDropdown] = useState<{[key: number]: boolean}>({});

  // Refs for outside click detection
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

  // Data fetching
  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"]
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/inventory"]
  });

  const { data: quotations = [], isLoading: quotationsLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"]
  });

  // Form setup
  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      customerId: "",
      projectName: "",
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priceIncludesVat: false,
      items: [{
        productName: "",
        description: "",
        quantity: 1,
        unit: "ชิ้น",
        unitPrice: 0,
        discount: 0,
        total: 0
      }],
      subtotal: 0,
      discountAmount: 0,
      subtotalAfterDiscount: 0,
      vatAmount: 0,
      grandTotal: 0,
      notes: ""
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Close customer dropdown
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(target)) {
        setShowCustomerDropdown(false);
      }
      
      // Close product dropdowns
      Object.keys(showProductDropdown).forEach(key => {
        const index = parseInt(key);
        const ref = productDropdownRefs.current[index];
        if (ref && !ref.contains(target)) {
          setShowProductDropdown(prev => ({ ...prev, [index]: false }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProductDropdown]);

  // Filter functions
  const getFilteredCustomers = () => {
    if (!customerSearchTerm) return customers;
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      (customer.companyName && customer.companyName.toLowerCase().includes(customerSearchTerm.toLowerCase()))
    );
  };

  const getFilteredProducts = (searchTerm: string) => {
    if (!searchTerm) return products;
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Helper functions
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "service": return <Wrench className="h-4 w-4" />;
      case "non_stock_product": return <Box className="h-4 w-4" />;
      case "stock_product": return <Archive className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "service": return "บริการ";
      case "non_stock_product": return "สินค้าไม่นับสต็อก";
      case "stock_product": return "สินค้านับสต็อก";
      default: return type;
    }
  };

  // Calculate totals
  const calculateItemTotal = (quantity: number, unitPrice: number, discount: number) => {
    const subtotal = quantity * unitPrice;
    const discountAmount = (subtotal * discount) / 100;
    return subtotal - discountAmount;
  };

  const calculateTotals = () => {
    const items = form.getValues("items");
    const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item.quantity, item.unitPrice, item.discount), 0);
    const discountAmount = form.getValues("discountAmount");
    const subtotalAfterDiscount = subtotal - discountAmount;
    const vatAmount = form.getValues("priceIncludesVat") ? 0 : (subtotalAfterDiscount * 7) / 100;
    const grandTotal = subtotalAfterDiscount + vatAmount;

    form.setValue("subtotal", subtotal);
    form.setValue("subtotalAfterDiscount", subtotalAfterDiscount);
    form.setValue("vatAmount", vatAmount);
    form.setValue("grandTotal", grandTotal);
  };

  // Handle product selection
  const handleProductSelect = (index: number, product: Product) => {
    form.setValue(`items.${index}.productId`, product.id);
    form.setValue(`items.${index}.productName`, product.name);
    form.setValue(`items.${index}.description`, product.description || "");
    form.setValue(`items.${index}.type`, product.type);
    form.setValue(`items.${index}.unit`, product.unit);
    form.setValue(`items.${index}.unitPrice`, parseFloat(product.price?.toString() || "0"));
    
    setProductSearchTerms(prev => ({ ...prev, [index]: product.name }));
    setShowProductDropdown(prev => ({ ...prev, [index]: false }));
    
    calculateTotals();
  };

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue("customerId", customer.id.toString());
    setCustomerSearchTerm(customer.name);
    setShowCustomerDropdown(false);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      await apiRequest("/api/quotations", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "สำเร็จ",
        description: "สร้างใบเสนอราคาเรียบร้อยแล้ว",
      });
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถสร้างใบเสนอราคาได้",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: QuotationFormData) => {
    calculateTotals();
    createMutation.mutate(data);
  };

  // Generate quotation number
  const generateQuotationNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const existingCount = quotations.filter(q => 
      q.quotationNumber?.startsWith(`QT${year}${month}`)
    ).length;
    const nextNumber = String(existingCount + 1).padStart(3, '0');
    return `QT${year}${month}${nextNumber}`;
  };

  if (quotationsLoading || customersLoading || productsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">{t("sales.title")}</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t("sales.title")}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("sales.newQuotation")}
          </Button>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>สร้างใบเสนอราคาใหม่</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ลูกค้า *</FormLabel>
                          <div className="relative" ref={customerDropdownRef}>
                            <FormControl>
                              <Input
                                placeholder="ค้นหาลูกค้า..."
                                value={customerSearchTerm}
                                onChange={(e) => {
                                  setCustomerSearchTerm(e.target.value);
                                  setShowCustomerDropdown(true);
                                }}
                                onFocus={() => setShowCustomerDropdown(true)}
                              />
                            </FormControl>
                            {showCustomerDropdown && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {getFilteredCustomers().map((customer) => (
                                  <div
                                    key={customer.id}
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleCustomerSelect(customer)}
                                  >
                                    <div className="font-medium">{customer.name}</div>
                                    {customer.companyName && (
                                      <div className="text-sm text-gray-500">{customer.companyName}</div>
                                    )}
                                  </div>
                                ))}
                                {getFilteredCustomers().length === 0 && (
                                  <div className="px-4 py-2 text-gray-500">ไม่พบลูกค้า</div>
                                )}
                              </div>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="projectName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชื่อโครงการ</FormLabel>
                        <FormControl>
                          <Input placeholder="ชื่อโครงการ (ถ้ามี)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>วันที่ *</FormLabel>
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
                        <FormLabel>วันหมดอายุ *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priceIncludesVat"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">ราคารวม VAT</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Items Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">รายการสินค้า/บริการ</h3>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => append({
                        productName: "",
                        description: "",
                        quantity: 1,
                        unit: "ชิ้น",
                        unitPrice: 0,
                        discount: 0,
                        total: 0
                      })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      เพิ่มรายการ
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 p-2 text-left">สินค้า/บริการ</th>
                          <th className="border border-gray-200 p-2 text-left">รายละเอียด</th>
                          <th className="border border-gray-200 p-2 text-left">จำนวน</th>
                          <th className="border border-gray-200 p-2 text-left">หน่วย</th>
                          <th className="border border-gray-200 p-2 text-left">ราคาต่อหน่วย</th>
                          <th className="border border-gray-200 p-2 text-left">ส่วนลด (%)</th>
                          <th className="border border-gray-200 p-2 text-left">รวม</th>
                          <th className="border border-gray-200 p-2 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, index) => (
                          <tr key={field.id}>
                            <td className="border border-gray-200 p-2">
                              <div className="relative" ref={el => productDropdownRefs.current[index] = el}>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.productName`}
                                  render={({ field: productField }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          placeholder="ค้นหาสินค้า..."
                                          value={productSearchTerms[index] || productField.value}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            setProductSearchTerms(prev => ({ ...prev, [index]: value }));
                                            productField.onChange(value);
                                            setShowProductDropdown(prev => ({ ...prev, [index]: true }));
                                          }}
                                          onFocus={() => setShowProductDropdown(prev => ({ ...prev, [index]: true }))}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                {showProductDropdown[index] && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {getFilteredProducts(productSearchTerms[index] || "").map((product) => (
                                      <div
                                        key={product.id}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={() => handleProductSelect(index, product)}
                                      >
                                        <div className="flex items-center space-x-2">
                                          {getTypeIcon(product.type)}
                                          <div>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-sm text-gray-500">
                                              {product.sku} • {getTypeLabel(product.type)} • {product.unit}
                                              {product.price && ` • ฿${parseFloat(product.price.toString()).toFixed(2)}`}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {getFilteredProducts(productSearchTerms[index] || "").length === 0 && (
                                      <div className="px-4 py-2 text-gray-500">ไม่พบสินค้า</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            
                            <td className="border border-gray-200 p-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.description`}
                                render={({ field }) => (
                                  <FormControl>
                                    <Textarea 
                                      placeholder="รายละเอียดเพิ่มเติม"
                                      className="min-h-[60px]"
                                      {...field}
                                    />
                                  </FormControl>
                                )}
                              />
                            </td>
                            
                            <td className="border border-gray-200 p-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={field.value}
                                      onChange={(e) => {
                                        field.onChange(parseInt(e.target.value) || 1);
                                        calculateTotals();
                                      }}
                                    />
                                  </FormControl>
                                )}
                              />
                            </td>
                            
                            <td className="border border-gray-200 p-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.unit`}
                                render={({ field }) => (
                                  <FormControl>
                                    <Input value={field.value} onChange={field.onChange} />
                                  </FormControl>
                                )}
                              />
                            </td>
                            
                            <td className="border border-gray-200 p-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.unitPrice`}
                                render={({ field }) => (
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={field.value}
                                      onChange={(e) => {
                                        field.onChange(parseFloat(e.target.value) || 0);
                                        calculateTotals();
                                      }}
                                    />
                                  </FormControl>
                                )}
                              />
                            </td>
                            
                            <td className="border border-gray-200 p-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.discount`}
                                render={({ field }) => (
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="100"
                                      value={field.value}
                                      onChange={(e) => {
                                        field.onChange(parseFloat(e.target.value) || 0);
                                        calculateTotals();
                                      }}
                                    />
                                  </FormControl>
                                )}
                              />
                            </td>
                            
                            <td className="border border-gray-200 p-2 text-right">
                              {calculateItemTotal(
                                form.watch(`items.${index}.quantity`),
                                form.watch(`items.${index}.unitPrice`),
                                form.watch(`items.${index}.discount`)
                              ).toFixed(2)}
                            </td>
                            
                            <td className="border border-gray-200 p-2 text-center">
                              {fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    remove(index);
                                    calculateTotals();
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary */}
                <div className="border-t pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>หมายเหตุ</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="หมายเหตุเพิ่มเติม"
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>ยอดรวม:</span>
                        <span>฿{form.watch("subtotal").toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>ส่วนลดเพิ่มเติม:</span>
                        <FormField
                          control={form.control}
                          name="discountAmount"
                          render={({ field }) => (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-32 text-right"
                              value={field.value}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0);
                                calculateTotals();
                              }}
                            />
                          )}
                        />
                      </div>
                      
                      <div className="flex justify-between">
                        <span>ยอดหลังหักส่วนลด:</span>
                        <span>฿{form.watch("subtotalAfterDiscount").toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>VAT 7%:</span>
                        <span>฿{form.watch("vatAmount").toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>ยอดรวมสุทธิ:</span>
                        <span>฿{form.watch("grandTotal").toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    ยกเลิก
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "กำลังบันทึก..." : "บันทึกใบเสนอราคา"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quotations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>{t("sales.quotations")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              ไม่มีใบเสนอราคา
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">เลขที่</th>
                    <th className="text-left p-3">ลูกค้า</th>
                    <th className="text-left p-3">โครงการ</th>
                    <th className="text-left p-3">วันที่</th>
                    <th className="text-left p-3">ยอดรวม</th>
                    <th className="text-left p-3">สถานะ</th>
                    <th className="text-left p-3">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quotation) => (
                    <tr key={quotation.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{quotation.quotationNumber}</td>
                      <td className="p-3">
                        {customers.find(c => c.id.toString() === quotation.customerId)?.name || '-'}
                      </td>
                      <td className="p-3">{quotation.projectName || '-'}</td>
                      <td className="p-3">{new Date(quotation.date).toLocaleDateString('th-TH')}</td>
                      <td className="p-3">฿{quotation.grandTotal.toFixed(2)}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                          รอดำเนินการ
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}