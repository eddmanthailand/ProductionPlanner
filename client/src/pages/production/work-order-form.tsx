import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Save, FileText, User, Calendar, Package, Settings, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  taxId: string;
  address: string;
  companyName: string;
}

interface Team {
  id: string;
  name: string;
  leader: string;
  status: string;
}

interface WorkType {
  id: number;
  name: string;
  code: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

interface Quotation {
  id: number;
  quotationNumber: string;
  customerId: number;
  customerName: string;
  title: string;
  description: string | null;
  grandTotal: string;
  status: string;
  validUntil: string;
  createdAt: string;
}

interface QuotationItem {
  id: number;
  quotationId: number;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: string;
}

interface WorkOrderItem {
  id?: number;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications: string;
}

export default function WorkOrderForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchValue, setCustomerSearchValue] = useState("");
  const [workOrderItems, setWorkOrderItems] = useState<WorkOrderItem[]>([
    { productName: "", description: "", quantity: 1, unitPrice: 0, totalPrice: 0, specifications: "" }
  ]);

  const [formData, setFormData] = useState({
    orderNumber: "",
    quotationId: "",
    customerId: "",
    title: "",
    description: "",
    workTypeId: "",
    startDate: "",
    dueDate: "",
    assignedTeamId: "",
    notes: ""
  });

  // Auto-login for development
  useEffect(() => {
    const autoLogin = async () => {
      try {
        await apiRequest("/api/auth/login", "POST", {
          username: "demo",
          password: "demo"
        });
      } catch (error) {
        console.log("Auto-login failed, user may already be logged in");
      }
    };
    autoLogin();
  }, []);

  // Generate order number
  useEffect(() => {
    const generateOrderNumber = async () => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        
        // Get current count for this month
        const response = await fetch('/api/work-orders/count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year, month })
        });
        
        let sequence = "001";
        if (response.ok) {
          const data = await response.json();
          sequence = String(data.count + 1).padStart(3, '0');
        }
        
        return `JB${year}${month}${sequence}`;
      } catch (error) {
        // Fallback to simple sequence if API fails
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `JB${year}${month}001`;
      }
    };

    if (!formData.orderNumber) {
      generateOrderNumber().then(orderNumber => {
        setFormData(prev => ({
          ...prev,
          orderNumber
        }));
      });
    }
  }, [formData.orderNumber]);

  // Queries
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: quotations = [] } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
  });

  const { data: workTypes = [] } = useQuery<WorkType[]>({
    queryKey: ["/api/work-types"],
  });

  // Mutation
  const createWorkOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/work-orders", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({
        title: "สำเร็จ",
        description: "สร้างใบสั่งงานแล้ว",
      });
      navigate("/production/work-orders");
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถสร้างใบสั่งงานได้",
        variant: "destructive",
      });
    }
  });

  const handleQuotationSelect = async (quotationId: string) => {
    if (!quotationId || quotationId === "none") {
      setSelectedQuotation(null);
      setQuotationItems([]);
      setFormData(prev => ({
        ...prev,
        quotationId: "",
        title: "",
        description: "",
        customerId: ""
      }));
      return;
    }

    const quotation = quotations.find(q => q.id === parseInt(quotationId));
    if (quotation) {
      setSelectedQuotation(quotation);
      setFormData(prev => ({
        ...prev,
        quotationId: quotationId,
        title: quotation.title,
        description: quotation.description || "",
        customerId: quotation.customerId.toString()
      }));

      // Fetch quotation items
      try {
        const items = await apiRequest(`/api/quotations/${quotationId}/items`, "GET");
        setQuotationItems(Array.isArray(items) ? items : []);
      } catch (error) {
        console.error("Failed to fetch quotation items:", error);
        setQuotationItems([]);
      }
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (index: number, field: keyof WorkOrderItem, value: string | number) => {
    const updatedItems = [...workOrderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // Calculate total price when quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const unitPrice = field === 'unitPrice' ? Number(value) : updatedItems[index].unitPrice;
      updatedItems[index].totalPrice = quantity * unitPrice;
    }

    setWorkOrderItems(updatedItems);
  };

  const addItem = () => {
    setWorkOrderItems([
      ...workOrderItems,
      { productName: "", description: "", quantity: 1, unitPrice: 0, totalPrice: 0, specifications: "" }
    ]);
  };

  const removeItem = (index: number) => {
    if (workOrderItems.length > 1) {
      setWorkOrderItems(workOrderItems.filter((_, i) => i !== index));
    }
  };

  const calculateGrandTotal = () => {
    return workOrderItems.reduce((total, item) => total + item.totalPrice, 0);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.customerId) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกข้อมูลที่จำเป็น",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      ...formData,
      customerId: parseInt(formData.customerId),
      quotationId: formData.quotationId ? parseInt(formData.quotationId) : null,
      totalAmount: calculateGrandTotal(),
      items: workOrderItems
    };

    createWorkOrderMutation.mutate(orderData);
  };

  const getCustomerById = (id: number) => {
    return customers.find(c => c.id === id);
  };

  // Update selected customer when customerId changes
  useEffect(() => {
    if (formData.customerId) {
      const customer = getCustomerById(parseInt(formData.customerId));
      setSelectedCustomer(customer || null);
      setCustomerSearchValue(customer ? `${customer.name} - ${customer.companyName}` : "");
    } else {
      setSelectedCustomer(null);
      setCustomerSearchValue("");
    }
  }, [formData.customerId, customers]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customerId: customer.id.toString()
    }));
    setCustomerSearchValue(`${customer.name} - ${customer.companyName}`);
    setCustomerSearchOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate("/production/work-orders")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>กลับ</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">สร้างใบสั่งงานใหม่</h1>
              <p className="text-gray-600">กรอกข้อมูลใบสั่งงานการผลิต</p>
            </div>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {formData.orderNumber}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>ข้อมูลพื้นฐาน</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quotation">อ้างอิงใบเสนอราคา (ไม่บังคับ)</Label>
                    <Select value={formData.quotationId} onValueChange={handleQuotationSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกใบเสนอราคา" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">สร้างใหม่ (ไม่อ้างอิง)</SelectItem>
                        {quotations.filter(q => q.status === "approved").map((quotation) => (
                          <SelectItem key={quotation.id} value={quotation.id.toString()}>
                            {quotation.quotationNumber} - {quotation.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workTypeId">ประเภทงาน</Label>
                    <Select 
                      value={formData.workTypeId} 
                      onValueChange={(value) => handleInputChange('workTypeId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกประเภทงาน" />
                      </SelectTrigger>
                      <SelectContent>
                        {workTypes.filter(wt => wt.isActive).map((workType) => (
                          <SelectItem key={workType.id} value={workType.id.toString()}>
                            {workType.name} {workType.code && `(${workType.code})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">ชื่องาน *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="ระบุชื่องาน"
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">รายละเอียดงาน</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="รายละเอียดและข้อกำหนดของงาน"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>ข้อมูลลูกค้า</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">เลือกลูกค้า *</Label>
                  <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={customerSearchOpen}
                        className="w-full justify-between"
                        disabled={!!selectedQuotation}
                      >
                        {customerSearchValue || "ค้นหาลูกค้า..."}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="ค้นหาลูกค้า..." />
                        <CommandEmpty>ไม่พบลูกค้า</CommandEmpty>
                        <CommandGroup>
                          <CommandList>
                            {customers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={`${customer.name} ${customer.companyName}`}
                                onSelect={() => handleCustomerSelect(customer)}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{customer.name}</span>
                                  <span className="text-sm text-gray-500">{customer.companyName}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandList>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {selectedCustomer && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">ข้อมูลลูกค้า</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                      <div>
                        <span className="font-medium">ชื่อบริษัท:</span> {selectedCustomer.companyName}
                      </div>
                      <div>
                        <span className="font-medium">เลขประจำตัวผู้เสียภาษี:</span> {selectedCustomer.taxId}
                      </div>
                      <div>
                        <span className="font-medium">โทรศัพท์:</span> {selectedCustomer.phone}
                      </div>
                      <div>
                        <span className="font-medium">อีเมล:</span> {selectedCustomer.email}
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-medium">ที่อยู่:</span> {selectedCustomer.address}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quotation Items Display */}
            {selectedQuotation && quotationItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>รายการสินค้าในใบเสนอราคา</span>
                    <Badge variant="outline" className="ml-2">
                      {selectedQuotation.quotationNumber}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>สินค้า/งาน</TableHead>
                          <TableHead>รายละเอียด</TableHead>
                          <TableHead className="text-center">จำนวน</TableHead>
                          <TableHead className="text-right">ราคาต่อหน่วย</TableHead>
                          <TableHead className="text-right">ราคารวม</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotationItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {item.productName}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {item.description}
                              {item.specifications && (
                                <div className="text-xs text-gray-500 mt-1">
                                  ข้อกำหนด: {item.specifications}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.quantity.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              ฿{item.unitPrice.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ฿{item.totalPrice.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        ยอดรวมจากใบเสนอราคา:
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        ฿{selectedQuotation.grandTotal}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Schedule & Team */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>กำหนดการและทีมงาน</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">วันที่เริ่มงาน</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">วันที่กำหนดเสร็จ</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team">ทีมที่รับผิดชอบ</Label>
                  <Select 
                    value={formData.assignedTeamId} 
                    onValueChange={(value) => handleInputChange('assignedTeamId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกทีม" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} - หัวหน้าทีม: {team.leader}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">หมายเหตุ</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="หมายเหตุเพิ่มเติม ข้อกำหนดพิเศษ หรือคำแนะนำ"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Work Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>รายการสินค้า/งาน</span>
                  </div>
                  <Button onClick={addItem} size="sm" className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>เพิ่มรายการ</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workOrderItems.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">รายการที่ {index + 1}</h4>
                        {workOrderItems.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>ชื่อสินค้า/งาน</Label>
                          <Input
                            value={item.productName || ""}
                            onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                            placeholder="ชื่อสินค้าหรืองาน"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>จำนวน</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>ราคาต่อหน่วย (บาท)</Label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>ราคารวม (บาท)</Label>
                          <Input
                            value={item.totalPrice.toLocaleString()}
                            readOnly
                            className="bg-gray-100"
                          />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <Label>รายละเอียด</Label>
                          <Input
                            value={item.description || ""}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="รายละเอียดเพิ่มเติม"
                          />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <Label>ข้อกำหนดพิเศษ</Label>
                          <Input
                            value={item.specifications || ""}
                            onChange={(e) => handleItemChange(index, 'specifications', e.target.value)}
                            placeholder="ข้อกำหนดหรือคุณสมบัติพิเศษ"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>สรุปใบสั่งงาน</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">เลขที่ใบสั่งงาน:</span>
                    <span className="font-medium">{formData.orderNumber}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">ประเภทงาน:</span>
                    {formData.workTypeId && workTypes.find(wt => wt.id.toString() === formData.workTypeId) ? (
                      <Badge variant="default">
                        {workTypes.find(wt => wt.id.toString() === formData.workTypeId)?.name}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">ยังไม่ได้เลือก</span>
                    )}
                  </div>

                  {selectedCustomer && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">ลูกค้า:</span>
                      <span className="font-medium text-right max-w-32 truncate">{selectedCustomer.name}</span>
                    </div>
                  )}

                  {selectedQuotation && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">อ้างอิงใบเสนอราคา:</span>
                      <span className="font-medium text-right max-w-32 truncate">{selectedQuotation.quotationNumber}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-600">จำนวนรายการ:</span>
                    <span className="font-medium">{workOrderItems.length} รายการ</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>ยอดรวมทั้งสิ้น:</span>
                    <span className="text-blue-600">{calculateGrandTotal().toLocaleString()} บาท</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button 
                    onClick={handleSubmit} 
                    className="w-full" 
                    size="lg"
                    disabled={createWorkOrderMutation.isPending}
                  >
                    <Save className="h-5 w-5 mr-2" />
                    {createWorkOrderMutation.isPending ? "กำลังบันทึก..." : "บันทึกใบสั่งงาน"}
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/production/work-orders")} 
                    className="w-full"
                  >
                    ยกเลิก
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}