import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Search, Edit, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Customer, Product, Quotation } from "@shared/schema";

const quotationFormSchema = z.object({
  customerId: z.string().min(1, "กรุณาเลือกลูกค้า"),
  date: z.string().min(1, "กรุณาใส่วันที่"),
  validUntil: z.string().min(1, "กรุณาใส่วันหมดอายุ"),
  items: z.array(z.object({
    productId: z.number().optional(),
    productName: z.string().min(1, "กรุณาใส่ชื่อสินค้า"),
    description: z.string().default(""),
    quantity: z.number().min(1, "จำนวนต้องมากกว่า 0"),
    unitPrice: z.number().min(0, "ราคาต้องมากกว่าหรือเท่ากับ 0"),
    total: z.number().default(0)
  })).min(1, "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ"),
  subtotal: z.number().default(0),
  vatAmount: z.number().default(0),
  grandTotal: z.number().default(0),
  notes: z.string().default("")
});

type QuotationFormData = z.infer<typeof quotationFormSchema>;

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
  
  const t = (key: string) => translations[language][key] || key;

  // States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);

  // Form
  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      customerId: "",
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{
        productName: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        total: 0
      }],
      subtotal: 0,
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
        
        if (response.ok) {
          const data = await response.json();
          setCustomers(data);
        } else {
          console.error('Failed to fetch customers:', response.status);
          setCustomers([]);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
        setCustomers([]);
      } finally {
        setCustomersLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Query for quotations
  const { data: quotations = [] } = useQuery({
    queryKey: ["/api/quotations"]
  });

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"]
  });

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => {
    if (!customerSearchTerm) return false;
    const searchLower = customerSearchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.companyName?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower)
    );
  });

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchTerm(customer.name);
    setShowCustomerDropdown(false);
    form.setValue('customerId', customer.id.toString());
  };

  // Calculate totals
  const calculateTotals = () => {
    const items = form.getValues('items');
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = subtotal * 0.07;
    const grandTotal = subtotal + vatAmount;
    
    form.setValue('subtotal', subtotal);
    form.setValue('vatAmount', vatAmount);
    form.setValue('grandTotal', grandTotal);
  };

  // Update item total
  const updateItemTotal = (index: number, quantity: number, unitPrice: number) => {
    const total = quantity * unitPrice;
    form.setValue(`items.${index}.total`, total);
    calculateTotals();
  };

  // Add new item
  const addItem = () => {
    const currentItems = form.getValues('items');
    form.setValue('items', [...currentItems, {
      productName: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0
    }]);
  };

  // Remove item
  const removeItem = (index: number) => {
    const currentItems = form.getValues('items');
    if (currentItems.length > 1) {
      form.setValue('items', currentItems.filter((_, i) => i !== index));
      calculateTotals();
    }
  };

  // Create quotation mutation
  const createQuotationMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      return apiRequest('/api/quotations', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: "สร้างใบเสนอราคาเรียบร้อยแล้ว"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      setIsDialogOpen(false);
      form.reset();
      setSelectedCustomer(null);
      setCustomerSearchTerm("");
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถสร้างใบเสนอราคาได้",
        variant: "destructive"
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: QuotationFormData) => {
    createQuotationMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("sales.title")}</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("sales.newQuotation")}
        </Button>
      </div>

      {/* Create Quotation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("sales.newQuotation")}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-8">
                {/* Left column - Customer and Items */}
                <div className="space-y-6">
                  {/* Customer Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">ข้อมูลลูกค้า</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Autocomplete Search */}
                      <div className="relative">
                        <Input
                          placeholder="ค้นหาลูกค้า... (พิมพ์ชื่อ บริษัท อีเมล หรือเบอร์โทร)"
                          value={customerSearchTerm}
                          onChange={(e) => {
                            setCustomerSearchTerm(e.target.value);
                            setShowCustomerDropdown(true);
                          }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          className="w-full"
                        />
                        
                        {/* Autocomplete Dropdown */}
                        {showCustomerDropdown && customerSearchTerm && (
                          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {customersLoading ? (
                              <div className="p-3 text-center text-gray-500">กำลังโหลด...</div>
                            ) : filteredCustomers.length > 0 ? (
                              <div className="divide-y">
                                {filteredCustomers.map((customer) => (
                                  <div
                                    key={customer.id}
                                    className="p-3 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => handleCustomerSelect(customer)}
                                  >
                                    <div className="font-medium">{customer.name}</div>
                                    {customer.companyName && (
                                      <div className="text-sm text-gray-600">{customer.companyName}</div>
                                    )}
                                    <div className="text-xs text-gray-500">
                                      {customer.email && <span>{customer.email}</span>}
                                      {customer.phone && (
                                        <span className="ml-3">{customer.phone}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-3 text-center text-gray-500 text-sm">
                                ไม่พบลูกค้าที่ตรงกับการค้นหา
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Selected Customer Display */}
                      {selectedCustomer && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-blue-800">{selectedCustomer.name}</div>
                              {selectedCustomer.companyName && (
                                <div className="text-sm text-blue-600">{selectedCustomer.companyName}</div>
                              )}
                              {selectedCustomer.address && (
                                <div className="text-xs text-gray-600 mt-1">{selectedCustomer.address}</div>
                              )}
                              {selectedCustomer.taxId && (
                                <div className="text-xs text-gray-600">เลขประจำตัวผู้เสียภาษี: {selectedCustomer.taxId}</div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCustomer(null);
                                setCustomerSearchTerm('');
                                form.setValue('customerId', '');
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ✕
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex justify-between items-center">
                        รายการสินค้า
                        <Button type="button" onClick={addItem} size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          เพิ่มรายการ
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {form.watch('items').map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded">
                            {/* Product */}
                            <div className="col-span-4 space-y-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.productName`}
                                render={({ field }) => (
                                  <Input 
                                    {...field}
                                    placeholder="ชื่อสินค้า"
                                    className="h-8 text-xs"
                                  />
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`items.${index}.description`}
                                render={({ field }) => (
                                  <Input 
                                    {...field}
                                    placeholder="รายละเอียด"
                                    className="h-8 text-xs"
                                  />
                                )}
                              />
                            </div>
                            
                            {/* Quantity */}
                            <div className="col-span-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    min="1"
                                    className="w-full h-8 text-xs text-center"
                                    {...field}
                                    onChange={(e) => {
                                      const quantity = parseInt(e.target.value) || 0;
                                      field.onChange(quantity);
                                      const unitPrice = form.getValues(`items.${index}.unitPrice`);
                                      updateItemTotal(index, quantity, unitPrice);
                                    }}
                                  />
                                )}
                              />
                            </div>
                            
                            {/* Unit */}
                            <div className="col-span-1 text-center text-xs text-gray-600">
                              ชิ้น
                            </div>
                            
                            {/* Unit Price */}
                            <div className="col-span-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.unitPrice`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-full h-8 text-xs text-right"
                                    {...field}
                                    onChange={(e) => {
                                      const unitPrice = parseFloat(e.target.value) || 0;
                                      field.onChange(unitPrice);
                                      const quantity = form.getValues(`items.${index}.quantity`);
                                      updateItemTotal(index, quantity, unitPrice);
                                    }}
                                  />
                                )}
                              />
                            </div>
                            
                            {/* Total */}
                            <div className="col-span-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.total`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    className="w-full h-8 text-xs text-right bg-gray-50"
                                    {...field}
                                    readOnly
                                  />
                                )}
                              />
                            </div>
                            
                            {/* Remove */}
                            <div className="col-span-1">
                              {form.watch('items').length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right column - Summary and Details */}
                <div className="space-y-6">
                  {/* Date Fields */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">วันที่</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>วันที่ใบเสนอราคา</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
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
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">สรุปยอด</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>ยอดรวม:</span>
                          <span>฿{form.watch('subtotal')?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ภาษีมูลค่าเพิ่ม 7%:</span>
                          <span>฿{form.watch('vatAmount')?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>ยอดรวมทั้งสิ้น:</span>
                          <span className="text-blue-600">฿{form.watch('grandTotal')?.toFixed(2) || '0.00'}</span>
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
          {!quotations || quotations.length === 0 ? (
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
                    <th className="text-left p-3">วันที่</th>
                    <th className="text-left p-3">ยอดรวม</th>
                    <th className="text-left p-3">สถานะ</th>
                    <th className="text-left p-3">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quotation: any) => {
                    const customer = customers.find(c => c.id === quotation.customerId);
                    return (
                      <tr key={quotation.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{quotation.quotationNumber}</td>
                        <td className="p-3">{customer?.name || 'ไม่พบข้อมูลลูกค้า'}</td>
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