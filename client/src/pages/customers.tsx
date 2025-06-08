import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type Customer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Phone, Mail, MapPin, Search, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function Customers() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [companySearchResults, setCompanySearchResults] = useState<any[]>([]);
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [taxIdVerification, setTaxIdVerification] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    data?: any;
    error?: string;
  }>({ status: 'idle' });
  const [companySearch, setCompanySearch] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    data?: any[];
    error?: string;
  }>({ status: 'idle' });

  const [postalCodeSearch, setPostalCodeSearch] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    data?: any;
    error?: string;
  }>({ status: 'idle' });

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"]
  });

  // ฟังก์ชันค้นหาบริษัทจากชื่อ
  const searchCompanyByName = async (companyName: string) => {
    if (!companyName || companyName.length < 2) {
      setCompanySearch({ status: 'error', error: 'ชื่อบริษัทต้องมีอย่างน้อย 2 ตัวอักษร' });
      return;
    }

    setCompanySearch({ status: 'loading' });
    
    try {
      const response = await fetch('/api/search-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ companyName })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setCompanySearch({ 
          status: 'success', 
          data: data.data 
        });
      } else {
        setCompanySearch({ 
          status: 'error', 
          error: data.error || 'ไม่พบบริษัทที่ตรงกับคำค้นหา' 
        });
      }
    } catch (error) {
      setCompanySearch({ 
        status: 'error', 
        error: 'ไม่สามารถค้นหาข้อมูลบริษัทได้ กรุณาลองใหม่อีกครั้ง' 
      });
    }
  };

  // ฟังก์ชันตรวจสอบเลขที่ผู้เสียภาษีจากกรมสรรพากร
  const verifyTaxId = async (taxId: string) => {
    if (!taxId || taxId.length !== 13) {
      setTaxIdVerification({ status: 'error', error: 'เลขที่ผู้เสียภาษีต้องมี 13 หลัก' });
      return;
    }

    setTaxIdVerification({ status: 'loading' });
    
    try {
      // เรียก API ของกรมสรรพากรผ่าน backend
      const response = await fetch('/api/verify-tax-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taxId })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setTaxIdVerification({ 
          status: 'success', 
          data: data.data 
        });
        
        // อัพเดทข้อมูลในฟอร์มหากพบข้อมูล
        if (data.data.name) {
          form.setValue('companyName', data.data.name);
        }
        if (data.data.address) {
          form.setValue('address', data.data.address);
        }
      } else {
        setTaxIdVerification({ 
          status: 'error', 
          error: data.error || 'ไม่พบข้อมูลเลขที่ผู้เสียภาษีนี้' 
        });
      }
    } catch (error) {
      setTaxIdVerification({ 
        status: 'error', 
        error: 'ไม่สามารถตรวจสอบเลขที่ผู้เสียภาษีได้ กรุณาลองใหม่อีกครั้ง' 
      });
    }
  };

  // ฟังก์ชันค้นหารหัสไปรษณีย์ตามที่อยู่
  const searchPostalCode = async (address: string) => {
    if (!address || address.length < 3) {
      setPostalCodeSearch({ status: 'error', error: 'กรุณาใส่ที่อยู่อย่างน้อย 3 ตัวอักษร' });
      return;
    }

    setPostalCodeSearch({ status: 'loading' });
    
    try {
      const response = await fetch('/api/search-postal-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setPostalCodeSearch({ 
          status: 'success', 
          data: data.data 
        });
      } else {
        setPostalCodeSearch({ 
          status: 'error', 
          error: data.error || 'ไม่พบรหัสไปรษณีย์ที่ตรงกับที่อยู่' 
        });
      }
    } catch (error) {
      setPostalCodeSearch({ 
        status: 'error', 
        error: 'ไม่สามารถค้นหารหัสไปรษณีย์ได้ กรุณาลองใหม่อีกครั้ง' 
      });
    }
  };

  const form = useForm({
    resolver: zodResolver(insertCustomerSchema.omit({ tenantId: true })),
    defaultValues: {
      name: "",
      companyName: "",
      taxId: "",
      email: "",
      phone: "",
      address: "",
      postalCode: "",
      country: "Thailand",
      contactPerson: "",
      notes: "",
      isActive: true
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/customers", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsDialogOpen(false);
      form.reset();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/customers/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsDialogOpen(false);
      setEditingCustomer(null);
      form.reset();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/customers/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    }
  });

  const handleSubmit = (data: any) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
      name: customer.name,
      companyName: customer.companyName || "",
      taxId: customer.taxId || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      postalCode: customer.postalCode || "",
      country: customer.country || "Thailand",
      contactPerson: customer.contactPerson || "",
      notes: customer.notes || "",
      isActive: customer.isActive ?? true
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = customers?.filter(customer => 
      customer.name.toLowerCase().includes(term.toLowerCase()) ||
      customer.companyName?.toLowerCase().includes(term.toLowerCase()) ||
      customer.email?.toLowerCase().includes(term.toLowerCase()) ||
      customer.phone?.includes(term) ||
      customer.taxId?.includes(term) ||
      customer.contactPerson?.toLowerCase().includes(term.toLowerCase())
    ) || [];
    
    setSearchResults(filtered);
  };

  const handleSearchDialogOpen = () => {
    setIsSearchDialogOpen(true);
    setSearchTerm("");
    setSearchResults([]);
  };

  const selectCustomerFromSearch = (customer: Customer) => {
    setIsSearchDialogOpen(false);
    // Scroll to customer in the main list
    const element = document.getElementById(`customer-${customer.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-blue-500');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500');
      }, 3000);
    }
  };

  const handleAddNew = () => {
    setEditingCustomer(null);
    form.reset();
    setIsDialogOpen(true);
  };

  if (isLoading) {
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
        <h1 className="text-2xl font-bold text-gray-900">{t("nav.customers")}</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleSearchDialogOpen}>
            <Search className="h-4 w-4 mr-2" />
            ค้นหาลูกค้า
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มลูกค้าใหม่
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer ? "แก้ไขข้อมูลลูกค้าที่เลือก" : "กรอกข้อมูลลูกค้าใหม่"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชื่อลูกค้า *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชื่อบริษัท</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>เลขที่ผู้เสียภาษี</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <div className="text-xs text-gray-600 mb-2">
                              ตรวจสอบข้อมูลได้ที่:{" "}
                              <a 
                                href="https://vsreg.rd.go.th/VATINFOWSWeb/jsp/V001.jsp" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline font-medium"
                              >
                                https://vsreg.rd.go.th/VATINFOWSWeb/jsp/V001.jsp
                              </a>
                            </div>
                            <Input 
                              {...field} 
                              placeholder="เช่น 0123456789012" 
                              maxLength={13}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, ''); // ให้ใส่เฉพาะตัวเลข
                                field.onChange(value);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ผู้ติดต่อ</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>อีเมล</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>เบอร์โทรศัพท์</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ที่อยู่</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>รหัสไปรษณีย์</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <Input 
                              {...field} 
                              placeholder="เช่น 10110"
                              onChange={(e) => {
                                field.onChange(e);
                                setPostalCodeSearch({ status: 'idle' }); // รีเซ็ตสถานะเมื่อแก้ไข
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const address = form.getValues('address');
                                searchPostalCode(address);
                              }}
                              disabled={!form.getValues('address') || postalCodeSearch.status === 'loading'}
                              className="whitespace-nowrap"
                            >
                              {postalCodeSearch.status === 'loading' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MapPin className="h-4 w-4" />
                              )}
                              ค้นหา
                            </Button>
                          </div>
                          <div className="text-xs text-gray-600">
                            กรอกที่อยู่ก่อน แล้วคลิก "ค้นหา" เพื่อหารหัสไปรษณีย์ หรือกรอกเองได้
                          </div>
                          
                          {/* แสดงผลการค้นหารหัสไปรษณีย์ */}
                          {postalCodeSearch.status === 'success' && postalCodeSearch.data && (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 text-green-600 text-sm">
                                <CheckCircle className="h-4 w-4" />
                                <span>พบรหัสไปรษณีย์</span>
                              </div>
                              <div 
                                className="p-3 border border-green-200 rounded-lg bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
                                onClick={() => {
                                  form.setValue('postalCode', postalCodeSearch.data.postalCode);
                                  setPostalCodeSearch({ status: 'idle' });
                                }}
                              >
                                <div className="text-sm">
                                  <div className="font-semibold text-green-800 mb-1">
                                    รหัสไปรษณีย์: {postalCodeSearch.data.postalCode}
                                  </div>
                                  {postalCodeSearch.data.district && (
                                    <div className="text-green-700 mb-1">
                                      ตำบล/แขวง: {postalCodeSearch.data.district}
                                    </div>
                                  )}
                                  {postalCodeSearch.data.amphoe && (
                                    <div className="text-green-700 mb-1">
                                      อำเภอ/เขต: {postalCodeSearch.data.amphoe}
                                    </div>
                                  )}
                                  {postalCodeSearch.data.province && (
                                    <div className="text-green-700 mb-1">
                                      จังหวัด: {postalCodeSearch.data.province}
                                    </div>
                                  )}
                                  <div className="text-green-600 mt-2 text-xs font-medium">
                                    คลิกเพื่อใช้รหัสไปรษณีย์นี้ →
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {postalCodeSearch.status === 'error' && (
                            <div className="flex items-center space-x-2 text-orange-600 text-sm">
                              <AlertCircle className="h-4 w-4" />
                              <span>{postalCodeSearch.error}</span>
                            </div>
                          )}
                        </div>
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
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingCustomer ? "บันทึกการแก้ไข" : "เพิ่มลูกค้า"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search Dialog */}
      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ค้นหาลูกค้า</DialogTitle>
            <DialogDescription>
              ค้นหาลูกค้าจากชื่อ บริษัท อีเมล เบอร์โทร หรือเลขที่ผู้เสียภาษี
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="ค้นหาจากชื่อ, บริษัท, อีเมล, เบอร์โทร, เลขที่ผู้เสียภาษี..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {searchResults.length > 0 ? (
                searchResults.map((customer) => (
                  <div 
                    key={customer.id} 
                    className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => selectCustomerFromSearch(customer)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{customer.name}</h4>
                        {customer.companyName && (
                          <p className="text-sm text-gray-600">บริษัท: {customer.companyName}</p>
                        )}
                        {customer.email && (
                          <p className="text-sm text-gray-600">{customer.email}</p>
                        )}
                        {customer.phone && (
                          <p className="text-sm text-gray-600">{customer.phone}</p>
                        )}
                      </div>
                      <Badge variant={customer.isActive ? "default" : "secondary"}>
                        {customer.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : searchTerm ? (
                <p className="text-center text-gray-500 py-4">ไม่พบลูกค้าที่ค้นหา</p>
              ) : (
                <p className="text-center text-gray-500 py-4">กรุณาใส่คำค้นหา</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>รายการลูกค้า</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {customers?.map((customer) => (
              <div 
                key={customer.id} 
                id={`customer-${customer.id}`}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-all duration-300"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-lg">{customer.name}</h3>
                    </div>
                    {customer.companyName && (
                      <p className="text-sm text-gray-600 mb-1">บริษัท: {customer.companyName}</p>
                    )}
                    {customer.taxId && (
                      <p className="text-sm text-gray-600 mb-1">เลขที่ผู้เสียภาษี: {customer.taxId}</p>
                    )}
                    {customer.contactPerson && (
                      <p className="text-sm text-gray-600 mb-1">ผู้ติดต่อ: {customer.contactPerson}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      {customer.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {customer.phone}
                        </div>
                      )}

                    </div>
                    {customer.notes && (
                      <p className="text-sm text-gray-500 mt-2">{customer.notes}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(customer)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(customer.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {customers?.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                ยังไม่มีข้อมูลลูกค้า
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}