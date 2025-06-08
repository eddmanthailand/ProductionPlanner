import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Search, Edit, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Customer, Product, Quotation } from "@shared/schema";

// Schema for validation with proper transformations
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
  const [searchTerm, setSearchTerm] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [unitDropdownStates, setUnitDropdownStates] = useState<{[key: number]: boolean}>({});

  // Form - use any to bypass strict typing issues
  const form = useForm<any>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      customerId: "",
      projectName: "",
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priceIncludesVat: false,
      items: Array.from({ length: 10 }, () => ({
        productName: "",
        description: "",
        quantity: "",
        unit: "ชิ้น",
        unitPrice: "",
        discount: "",
        total: 0
      })),
      subtotal: 0,
      discountAmount: 0,
      subtotalAfterDiscount: 0,
      vatAmount: 0,
      grandTotal: 0,
      notes: ""
    }
  });

  // Load customers from database
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setCustomersLoading(true);
        const response = await fetch('/api/customers');
        const data = await response.json();
        setCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast({
          title: "ข้อผิดพลาด",
          description: "ไม่สามารถโหลดข้อมูลลูกค้าได้",
          variant: "destructive",
        });
      } finally {
        setCustomersLoading(false);
      }
    };

    fetchCustomers();
  }, [toast]);

  // Queries
  const { data: quotations } = useQuery({
    queryKey: ['/api/quotations'],
    enabled: true
  });

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    enabled: true
  });

  // Calculate item total
  const updateItemTotal = (index: number, quantity: number, unitPrice: number, discount: number) => {
    const total = (quantity * unitPrice) - (quantity * discount);
    form.setValue(`items.${index}.total`, total);
    calculateTotals();
  };

  // Calculate all totals
  const calculateTotals = () => {
    const items = form.getValues('items');
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
    const discountAmount = items.reduce((sum: number, item: any) => {
      const qty = typeof item.quantity === 'string' ? parseInt(item.quantity) || 0 : item.quantity || 0;
      const disc = typeof item.discount === 'string' ? parseFloat(item.discount) || 0 : item.discount || 0;
      return sum + (qty * disc);
    }, 0);
    
    form.setValue('subtotal', subtotal);
    form.setValue('discountAmount', discountAmount);
    
    const subtotalAfterDiscount = subtotal - discountAmount;
    form.setValue('subtotalAfterDiscount', subtotalAfterDiscount);
    
    const priceIncludesVat = form.getValues('priceIncludesVat');
    let vatAmount: number;
    let grandTotal: number;
    
    if (priceIncludesVat) {
      grandTotal = subtotalAfterDiscount;
      vatAmount = subtotalAfterDiscount - (subtotalAfterDiscount / 1.07);
    } else {
      vatAmount = subtotalAfterDiscount * 0.07;
      grandTotal = subtotalAfterDiscount + vatAmount;
    }
    
    form.setValue('vatAmount', vatAmount);
    form.setValue('grandTotal', grandTotal);
  };

  // Add new item
  const addItem = () => {
    const currentItems = form.getValues('items');
    form.setValue('items', [...currentItems, {
      productName: "",
      description: "",
      quantity: "",
      unit: "ชิ้น",
      unitPrice: "",
      discount: "",
      total: 0
    }]);
  };

  // Remove item
  const removeItem = (index: number) => {
    const currentItems = form.getValues('items');
    
    // ตรวจสอบว่ามีแถวที่มีข้อมูลอยู่หรือไม่
    const itemsWithData = currentItems.filter((item: any) => 
      item.productName || item.description || item.quantity || item.unitPrice || item.discount
    );
    
    // ถ้ามีแถวที่มีข้อมูลแค่แถวเดียว ไม่ให้ลบ
    if (itemsWithData.length <= 1 && (
      currentItems[index].productName || 
      currentItems[index].description || 
      currentItems[index].quantity || 
      currentItems[index].unitPrice || 
      currentItems[index].discount
    )) {
      return;
    }
    
    // ลบแถวที่เลือก
    const newItems = currentItems.filter((_: any, i: number) => i !== index);
    
    // ตรวจสอบว่ายังมีแถวเหลืออยู่หรือไม่ ถ้าไม่มีให้เพิ่มแถวเปล่า
    if (newItems.length === 0) {
      newItems.push({
        productName: "",
        description: "",
        quantity: "",
        unit: "ชิ้น",
        unitPrice: "",
        discount: "",
        total: 0
      });
    }
    
    form.setValue('items', newItems);
    calculateTotals();
  };

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue("customerId", customer.id.toString());
    setSearchTerm(customer.name);
    setShowCustomerDropdown(false);
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.companyName && customer.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Create quotation mutation
  const createQuotationMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      await apiRequest('/api/quotations', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      toast({
        title: "สำเร็จ",
        description: "สร้างใบเสนอราคาเรียบร้อยแล้ว",
      });
      setIsDialogOpen(false);
      form.reset();
      setSelectedCustomer(null);
      setSearchTerm("");
    },
    onError: (error) => {
      toast({
        title: "ข้อผิดพลาด",
        description: `ไม่สามารถสร้างใบเสนอราคาได้: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    console.log("Form data:", data);
    createQuotationMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t("sales.title")}</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("sales.newQuotation")}
        </Button>
      </div>

      {/* Create Quotation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("sales.newQuotation")}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-6">
                {/* Header Section */}
                <div className="grid grid-cols-3 gap-6">
                  {/* Customer Search */}
                  <div className="relative">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ลูกค้า *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="text"
                                placeholder="ค้นหาลูกค้า..."
                                value={searchTerm}
                                onChange={(e) => {
                                  setSearchTerm(e.target.value);
                                  setShowCustomerDropdown(true);
                                }}
                                onFocus={() => setShowCustomerDropdown(true)}
                                className="pr-10"
                              />
                              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              
                              {showCustomerDropdown && filteredCustomers.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {customersLoading ? (
                                    <div className="p-3 text-center text-gray-500">กำลังโหลด...</div>
                                  ) : (
                                    filteredCustomers.map((customer) => (
                                      <div
                                        key={customer.id}
                                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        onClick={() => handleCustomerSelect(customer)}
                                      >
                                        <div className="font-medium text-gray-900">{customer.name}</div>
                                        {customer.companyName && (
                                          <div className="text-sm text-gray-600">{customer.companyName}</div>
                                        )}
                                        <div className="text-xs text-gray-500">
                                          {customer.address}
                                          {customer.postalCode && ` ${customer.postalCode}`}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Project Name */}
                  <div>
                    <FormField
                      control={form.control}
                      name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ชื่องาน/โปรเจค</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="ระบุชื่องานหรือโปรเจค (ไม่บังคับ)"
                              className="w-full"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Date */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>วันที่ *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Valid Until */}
                  <FormField
                    control={form.control}
                    name="validUntil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>วันหมดอายุ *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* VAT Toggle */}
                <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                  <FormField
                    control={form.control}
                    name="priceIncludesVat"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              calculateTotals();
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-medium">
                          ราคารวม VAT 7% แล้ว
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <div className="text-xs text-blue-600">
                    {form.watch('priceIncludesVat') ? 
                      'ราคาที่ใส่รวม VAT แล้ว ระบบจะคำนวณ VAT ย้อนกลับ' : 
                      'ราคาที่ใส่ยังไม่รวม VAT ระบบจะเพิ่ม VAT 7%'}
                  </div>
                </div>

                {/* Items Table */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">รายการสินค้า</CardTitle>
                      <Button type="button" onClick={addItem} size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        เพิ่มสินค้า
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 p-3 text-left min-w-[200px]">ชื่อสินค้า</th>
                            <th className="border border-gray-300 p-3 text-left min-w-[200px]">รายละเอียด</th>
                            <th className="border border-gray-300 p-3 text-center min-w-[100px]">จำนวน</th>
                            <th className="border border-gray-300 p-3 text-center min-w-[80px]">หน่วย</th>
                            <th className="border border-gray-300 p-3 text-center min-w-[120px]">ราคาต่อหน่วย</th>
                            <th className="border border-gray-300 p-3 text-center min-w-[120px]">ส่วนลดต่อหน่วย</th>
                            <th className="border border-gray-300 p-3 text-center min-w-[120px]">รวม</th>
                            <th className="border border-gray-300 p-3 text-center min-w-[80px]">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.watch('items').map((item: any, index: number) => (
                            <tr key={index}>
                              {/* Product Name */}
                              <td className="border border-gray-300 p-2">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.productName`}
                                  render={({ field }) => (
                                    <Input 
                                      {...field}
                                      placeholder="ชื่อสินค้า"
                                      className="w-full border-0 focus:ring-0 p-2 text-sm"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const descInput = document.querySelector(`textarea[name="items.${index}.description"]`) as HTMLTextAreaElement;
                                          if (descInput) {
                                            descInput.focus();
                                          }
                                        }
                                      }}
                                    />
                                  )}
                                />
                              </td>
                              
                              {/* Description */}
                              <td className="border border-gray-300 p-2">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.description`}
                                  render={({ field }) => (
                                    <textarea
                                      {...field}
                                      placeholder="รายละเอียด (กด Enter เพื่อขึ้นบรรทัดใหม่)"
                                      className="w-full border-0 focus:ring-0 p-2 text-sm resize-none overflow-hidden min-h-[40px]"
                                      rows={2}
                                      onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = Math.max(40, target.scrollHeight) + 'px';
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Tab') {
                                          e.preventDefault();
                                          const quantityInput = document.querySelector(`input[name="items.${index}.quantity"]`) as HTMLInputElement;
                                          if (quantityInput) {
                                            quantityInput.focus();
                                          }
                                        }
                                      }}
                                    />
                                  )}
                                />
                              </td>
                              
                              {/* Quantity */}
                              <td className="border border-gray-300 p-2">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.quantity`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder=""
                                      className="w-full text-center border-0 focus:ring-0 p-2 text-sm"
                                      {...field}
                                      onChange={(e) => {
                                        const quantity = parseInt(e.target.value) || 0;
                                        field.onChange(e.target.value);
                                        const unitPrice = parseFloat(form.getValues(`items.${index}.unitPrice`)) || 0;
                                        const discount = parseFloat(form.getValues(`items.${index}.discount`)) || 0;
                                        updateItemTotal(index, quantity, unitPrice, discount);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const priceInput = document.querySelector(`input[name="items.${index}.unitPrice"]`) as HTMLInputElement;
                                          if (priceInput) {
                                            priceInput.focus();
                                          }
                                        }
                                      }}
                                    />
                                  )}
                                />
                              </td>
                              
                              {/* Unit */}
                              <td className="border border-gray-300 p-2">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.unit`}
                                  render={({ field }) => (
                                    <div className="relative">
                                      <Input
                                        {...field}
                                        placeholder="หน่วย"
                                        className="w-full text-center border-0 focus:ring-0 p-2 text-sm"
                                        onFocus={() => {
                                          setUnitDropdownStates({...unitDropdownStates, [index]: true});
                                        }}
                                        onBlur={() => {
                                          setTimeout(() => {
                                            setUnitDropdownStates({...unitDropdownStates, [index]: false});
                                          }, 200);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const priceInput = document.querySelector(`input[name="items.${index}.unitPrice"]`) as HTMLInputElement;
                                            if (priceInput) {
                                              priceInput.focus();
                                            }
                                          }
                                        }}
                                      />
                                      
                                      {unitDropdownStates[index] && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-auto">
                                          <div className="p-2 text-xs text-gray-500 border-b">หน่วยที่แนะนำ:</div>
                                          {suggestedUnits
                                            .filter(unit => unit.toLowerCase().includes(field.value?.toLowerCase() || ''))
                                            .map((unit) => (
                                              <div
                                                key={unit}
                                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                                                onClick={() => {
                                                  field.onChange(unit);
                                                  setUnitDropdownStates({...unitDropdownStates, [index]: false});
                                                }}
                                              >
                                                {unit}
                                              </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                />
                              </td>
                              
                              {/* Unit Price */}
                              <td className="border border-gray-300 p-2">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.unitPrice`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder=""
                                      className="w-full text-right border-0 focus:ring-0 p-2 text-sm"
                                      {...field}
                                      onChange={(e) => {
                                        const unitPrice = parseFloat(e.target.value) || 0;
                                        field.onChange(e.target.value);
                                        const quantity = parseInt(form.getValues(`items.${index}.quantity`)) || 0;
                                        const discount = parseFloat(form.getValues(`items.${index}.discount`)) || 0;
                                        updateItemTotal(index, quantity, unitPrice, discount);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const discountInput = document.querySelector(`input[name="items.${index}.discount"]`) as HTMLInputElement;
                                          if (discountInput) {
                                            discountInput.focus();
                                          }
                                        }
                                      }}
                                    />
                                  )}
                                />
                              </td>

                              {/* Discount per Unit */}
                              <td className="border border-gray-300 p-2">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.discount`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder=""
                                      className="w-full text-right border-0 focus:ring-0 p-2 text-sm"
                                      {...field}
                                      onChange={(e) => {
                                        const discount = parseFloat(e.target.value) || 0;
                                        field.onChange(e.target.value);
                                        const quantity = parseInt(form.getValues(`items.${index}.quantity`)) || 0;
                                        const unitPrice = parseFloat(form.getValues(`items.${index}.unitPrice`)) || 0;
                                        updateItemTotal(index, quantity, unitPrice, discount);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const isLastRow = index === form.getValues('items').length - 1;
                                          if (isLastRow) {
                                            addItem();
                                            setTimeout(() => {
                                              const newRowIndex = form.getValues('items').length - 1;
                                              const newInput = document.querySelector(`input[name="items.${newRowIndex}.productName"]`) as HTMLInputElement;
                                              if (newInput) {
                                                newInput.focus();
                                              }
                                            }, 100);
                                          } else {
                                            const nextRowInput = document.querySelector(`input[name="items.${index + 1}.productName"]`) as HTMLInputElement;
                                            if (nextRowInput) {
                                              nextRowInput.focus();
                                            }
                                          }
                                        }
                                      }}
                                    />
                                  )}
                                />
                              </td>
                              
                              {/* Total */}
                              <td className="border border-gray-300 p-2">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.total`}
                                  render={({ field }) => (
                                    <Input
                                      type="text"
                                      className="w-full text-right bg-gray-50 border-0 focus:ring-0 p-2 text-sm font-medium"
                                      value={`฿${field.value?.toFixed(2) || '0.00'}`}
                                      readOnly
                                    />
                                  )}
                                />
                              </td>
                              
                              {/* Remove Button */}
                              <td className="border border-gray-300 p-2 text-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 border-red-300 hover:text-red-700 hover:bg-red-50 hover:border-red-400"
                                  title="ลบแถวนี้"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Bottom Section - Summary and Actions */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">สรุปยอด</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>ยอดรวมก่อนส่วนลด:</span>
                          <span>฿{form.watch('subtotal')?.toFixed(2) || '0.00'}</span>
                        </div>
                        
                        {form.watch('discountAmount') > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>ส่วนลดรวม:</span>
                            <span>-฿{form.watch('discountAmount')?.toFixed(2) || '0.00'}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between">
                          <span>ยอดหลังหักส่วนลด:</span>
                          <span>฿{form.watch('subtotalAfterDiscount')?.toFixed(2) || '0.00'}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span>
                            ภาษีมูลค่าเพิ่ม 7%
                            {form.watch('priceIncludesVat') && <span className="text-xs text-gray-500"> (รวมอยู่แล้ว)</span>}
                          </span>
                          <span>฿{form.watch('vatAmount')?.toFixed(2) || '0.00'}</span>
                        </div>
                        
                        <div className="border-t pt-2">
                          <div className="flex justify-between font-bold text-lg">
                            <span>ยอดรวมทั้งสิ้น:</span>
                            <span className="text-blue-600">฿{form.watch('grandTotal')?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                          <div>วิธีการคำนวณ:</div>
                          {form.watch('priceIncludesVat') ? (
                            <div>• ราคารวม VAT แล้ว: VAT = ยอดสุทธิ - (ยอดสุทธิ ÷ 1.07)</div>
                          ) : (
                            <div>• ราคายังไม่รวม VAT: VAT = ยอดสุทธิ × 7%</div>
                          )}
                          <div>• ส่วนลด = ส่วนลดต่อหน่วย × จำนวน</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">หมายเหตุ</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <textarea 
                                {...field}
                                className="w-full p-3 border rounded resize-none"
                                rows={4}
                                placeholder="หมายเหตุเพิ่มเติม..."
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      type="submit"
                      disabled={createQuotationMutation.isPending}
                    >
                      {createQuotationMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกใบเสนอราคา'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Quotations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>{t("sales.quotations")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!quotations || !Array.isArray(quotations) || quotations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              ไม่มีใบเสนอราคา
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">เลขที่ใบเสนอราคา</th>
                    <th className="text-left p-3">ลูกค้า</th>
                    <th className="text-left p-3">ชื่องาน/โปรเจค</th>
                    <th className="text-left p-3">วันที่</th>
                    <th className="text-left p-3">ยอดรวม</th>
                    <th className="text-left p-3">สถานะ</th>
                    <th className="text-left p-3">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(quotations) ? quotations : []).map((quotation: any) => {
                    const customer = customers.find(c => c.id === quotation.customerId);
                    return (
                      <tr key={quotation.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{quotation.quotationNumber}</td>
                        <td className="p-3">{customer?.name || 'ไม่พบข้อมูลลูกค้า'}</td>
                        <td className="p-3">{quotation.projectName || '-'}</td>
                        <td className="p-3">{quotation.date}</td>
                        <td className="p-3">฿{parseFloat(quotation.grandTotal || 0).toFixed(2)}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                            รอการอนุมัติ
                          </span>
                        </td>
                        <td className="p-3">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
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