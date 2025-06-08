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
import { Plus, Edit, Trash2, Phone, Mail, MapPin, Search } from "lucide-react";

export default function Customers() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    initialData: [
      {
        id: 1,
        name: "บริษัท เอบีซี จำกัด",
        companyName: "ABC Company Limited",
        taxId: "0105558001234",
        email: "contact@abc.co.th",
        phone: "02-123-4567",
        address: "123 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย",
        postalCode: "10110",
        country: "Thailand",
        contactPerson: "คุณสมชาย ใจดี",
        notes: "",
        isActive: true,
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        name: "บริษัท เอ็กซ์วาย แซด จำกัด",
        companyName: "XYZ Corporation",
        taxId: "0105559002345",
        email: "info@xyz.com",
        phone: "02-234-5678",
        address: "456 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร",
        postalCode: "10900",
        country: "Thailand",
        contactPerson: "คุณสมหญิง รักงาน",
        notes: "",
        isActive: true,
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        name: "ห้างหุ้นส่วนจำกัด ดีอี เอฟ",
        companyName: "DEF Partnership Ltd.",
        taxId: "0205560003456",
        email: "sales@def.co.th",
        phone: "02-345-6789",
        address: "789 ถนนราชดำริ แขวงลุมพินี เขตปทุมวัน",
        postalCode: "10330",
        country: "Thailand",
        contactPerson: "คุณวิชัย มั่นใจ",
        notes: "",
        isActive: true,
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 4,
        name: "บริษัท ไฮเทค โซลูชั่น จำกัด",
        companyName: "HiTech Solutions Co., Ltd.",
        taxId: "0105561004567",
        email: "support@hitech.net",
        phone: "02-456-7890",
        address: "321 ถนนสีลม แขวงสีลม เขตบางรัก",
        postalCode: "10500",
        country: "Thailand",
        contactPerson: "คุณประชา เก่งงาน",
        notes: "",
        isActive: true,
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 5,
        name: "ร้านค้าปลีก สมบูรณ์",
        companyName: "Somboon Retail Shop",
        taxId: null,
        email: "somboon@email.com",
        phone: "08-123-4567",
        address: "99 ตลาดนัด แขวงวังทองหลาง เขตวังทองหลาง",
        postalCode: "10310",
        country: "Thailand",
        contactPerson: "คุณสมบูรณ์ ขายดี",
        notes: "",
        isActive: true,
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  });

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
                          <Input {...field} placeholder="เช่น 0123456789012" />
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
                        <Input {...field} />
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