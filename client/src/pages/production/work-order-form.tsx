import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { 
  Customer, 
  Team, 
  Quotation, 
  WorkType, 
  Department, 
  WorkStep, 
  Color, 
  Size 
} from "@shared/schema";

interface QuotationItem {
  id: number;
  quotationId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: string;
  product?: {
    id: number;
    name: string;
    description: string;
    sku: string;
    type: string;
    unit: string;
  };
}

interface SubJob {
  id?: number;
  productName: string;
  departmentId: string;
  workStepId: string;
  colorId: string;
  sizeId: string;
  quantity: number;
  productionCost: number;
  totalCost: number;
}

export default function WorkOrderForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Check if we're in edit mode
  const [match, params] = useRoute("/production/work-orders/edit/:id");
  const isEditMode = !!match;
  const workOrderId = params?.id;
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchValue, setCustomerSearchValue] = useState("");
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [subJobs, setSubJobs] = useState<SubJob[]>([
    { 
      productName: "", 
      departmentId: "", 
      workStepId: "", 
      colorId: "", 
      sizeId: "", 
      quantity: 1, 
      productionCost: 0, 
      totalCost: 0 
    }
  ]);



  const [formData, setFormData] = useState({
    orderNumber: "",
    quotationId: "",
    customerId: "",
    title: "",
    description: "",
    workTypeId: "",
    deliveryDate: "",
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

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: workSteps = [] } = useQuery<WorkStep[]>({
    queryKey: ["/api/work-steps"],
  });

  const { data: colors = [] } = useQuery<Color[]>({
    queryKey: ["/api/colors"],
  });

  const { data: sizes = [] } = useQuery<Size[]>({
    queryKey: ["/api/sizes"],
  });

  // Query for existing work order data in edit mode
  const { data: existingWorkOrder, isLoading: loadingWorkOrder } = useQuery({
    queryKey: ["/api/work-orders", workOrderId],
    queryFn: () => apiRequest(`/api/work-orders/${workOrderId}`, "GET"),
    enabled: isEditMode && !!workOrderId,
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

  const handleQuotationSelectFromDialog = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setFormData(prev => ({
      ...prev,
      quotationId: quotation.id.toString(),
      title: (quotation as any).title || (quotation as any).projectName || "",
      description: (quotation as any).notes || "",
      customerId: quotation.customerId.toString()
    }));
    
    // Auto-select customer from quotation's customer relation
    if ((quotation as any).customer) {
      const customer = (quotation as any).customer;
      setSelectedCustomer(customer);
      setCustomerSearchValue(`${customer.name} - ${customer.companyName || customer.name}`);
    } else {
      // Fallback: find customer by ID from customers list
      const customer = customers.find(c => c.id === quotation.customerId);
      if (customer) {
        setSelectedCustomer(customer);
        setCustomerSearchValue(`${customer.name} - ${customer.companyName || customer.name}`);
      }
    }
    
    setQuotationDialogOpen(false);
  };

  const handleClearQuotation = () => {
    setSelectedQuotation(null);
    setQuotationItems([]);
    setFormData(prev => ({
      ...prev,
      quotationId: "",
      title: "",
      description: "",
      customerId: ""
    }));
    setSelectedCustomer(null);
    setCustomerSearchValue("");
  };

  // Use useEffect to handle quotation items when selectedQuotation changes
  useEffect(() => {
    if (selectedQuotation) {
      const quotationWithItems = selectedQuotation as any;
      if (quotationWithItems.items && Array.isArray(quotationWithItems.items)) {
        setQuotationItems(quotationWithItems.items);
      } else {
        // Fallback to API call if items not in object
        const fetchItems = async () => {
          try {
            const items = await apiRequest(`/api/quotations/${selectedQuotation.id}/items`, "GET");
            setQuotationItems(Array.isArray(items) ? items : []);
          } catch (error) {
            console.error("Failed to fetch quotation items:", error);
            setQuotationItems([]);
          }
        };
        fetchItems();
      }
    } else {
      setQuotationItems([]);
    }
  }, [selectedQuotation]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubJobChange = (index: number, field: keyof SubJob, value: string | number) => {
    console.log('SubJob change:', { index, field, value });
    const updatedSubJobs = [...subJobs];
    updatedSubJobs[index] = {
      ...updatedSubJobs[index],
      [field]: value
    };

    // Calculate total cost when quantity or production cost changes
    if (field === 'quantity' || field === 'productionCost') {
      const quantity = field === 'quantity' ? Number(value) : updatedSubJobs[index].quantity;
      const productionCost = field === 'productionCost' ? Number(value) : updatedSubJobs[index].productionCost;
      updatedSubJobs[index].totalCost = quantity * productionCost;
    }

    console.log('Updated SubJobs:', updatedSubJobs);
    setSubJobs(updatedSubJobs);
  };

  const addSubJob = () => {
    setSubJobs([
      ...subJobs,
      { 
        productName: "", 
        departmentId: "", 
        workStepId: "", 
        colorId: "", 
        sizeId: "", 
        quantity: 1, 
        productionCost: 0, 
        totalCost: 0 
      }
    ]);
  };

  const removeSubJob = (index: number) => {
    if (subJobs.length > 1) {
      setSubJobs(subJobs.filter((_, i) => i !== index));
    }
  };

  const calculateGrandTotal = () => {
    return subJobs.reduce((total, subJob) => total + subJob.totalCost, 0);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.customerId) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกชื่องานและเลือกลูกค้า",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      ...formData,
      customerId: parseInt(formData.customerId),
      quotationId: formData.quotationId ? parseInt(formData.quotationId) : null,
      workTypeId: formData.workTypeId ? parseInt(formData.workTypeId) : null,
      totalAmount: calculateGrandTotal(),
      items: subJobs
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
                    
                    {selectedQuotation ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-3 border rounded-lg bg-blue-50">
                          <div className="font-medium text-blue-900">
                            {selectedQuotation.quotationNumber} - {(selectedQuotation as any).projectName || 'ไม่มีชื่อโครงการ'}
                          </div>
                          <div className="text-sm text-blue-700">
                            ลูกค้า: {(selectedQuotation as any).customer?.name || 'ไม่ระบุ'} | ยอดรวม: ฿{selectedQuotation.grandTotal}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearQuotation}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Dialog open={quotationDialogOpen} onOpenChange={setQuotationDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <FileText className="mr-2 h-4 w-4" />
                            เลือกใบเสนอราคา...
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                          <DialogHeader>
                            <DialogTitle>เลือกใบเสนอราคา</DialogTitle>
                            <DialogDescription>
                              เลือกใบเสนอราคาที่ได้รับการอนุมัติแล้วเพื่อสร้างใบสั่งงาน
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="overflow-auto max-h-[60vh]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>เลขที่</TableHead>
                                  <TableHead>ชื่อโครงการ</TableHead>
                                  <TableHead>ลูกค้า</TableHead>
                                  <TableHead>วันที่</TableHead>
                                  <TableHead className="text-right">ยอดรวม</TableHead>
                                  <TableHead className="text-center">สถานะ</TableHead>
                                  <TableHead className="text-center">เลือก</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {quotations.filter(q => q.status === "approved").map((quotation) => (
                                  <TableRow key={quotation.id} className="cursor-pointer hover:bg-gray-50">
                                    <TableCell className="font-medium">
                                      {quotation.quotationNumber}
                                    </TableCell>
                                    <TableCell>
                                      {(quotation as any).projectName || (quotation as any).title || 'ไม่มีชื่อโครงการ'}
                                    </TableCell>
                                    <TableCell>
                                      {(quotation as any).customer?.name || 'ไม่ระบุ'}
                                    </TableCell>
                                    <TableCell>
                                      {new Date(quotation.date).toLocaleDateString('th-TH')}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      ฿{Number(quotation.grandTotal).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="default" className="bg-green-100 text-green-800">
                                        อนุมัติแล้ว
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Button
                                        size="sm"
                                        onClick={() => handleQuotationSelectFromDialog(quotation)}
                                      >
                                        เลือก
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {quotations.filter(q => q.status === "approved").length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                                      ไม่มีใบเสนอราคาที่ได้รับการอนุมัติ
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                          
                          <div className="flex justify-end pt-4 border-t">
                            <Button
                              variant="outline"
                              onClick={() => setQuotationDialogOpen(false)}
                            >
                              ปิด
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
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
                            {workType.name}
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

                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">วันกำหนดส่งสินค้า *</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                  />
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
                              {item.product?.name || `สินค้ารหัส ${item.productId}`}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {item.product?.description || `SKU: ${item.product?.sku || 'N/A'}`}
                              <div className="text-xs text-gray-500 mt-1">
                                หน่วย: {item.product?.unit || 'ไม่ระบุ'}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {item.quantity.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              ฿{item.unitPrice.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ฿{item.total.toLocaleString()}
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



            {/* Sub Jobs Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Sub-jobs</span>
                  </div>
                  <Button onClick={addSubJob} size="sm" className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>เพิ่ม Sub-job</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">ชื่อสินค้า/งาน</TableHead>
                        <TableHead className="w-[150px]">แผนก</TableHead>
                        <TableHead className="w-[150px]">ขั้นตอนงาน</TableHead>
                        <TableHead className="w-[120px]">สี</TableHead>
                        <TableHead className="w-[120px]">ขนาด</TableHead>
                        <TableHead className="w-[80px]">จำนวน</TableHead>
                        <TableHead className="w-[120px]">ต้นทุน/ชิ้น</TableHead>
                        <TableHead className="w-[120px]">รวม</TableHead>
                        <TableHead className="w-[80px]">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subJobs.map((subJob, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              value={subJob.productName || ""}
                              onChange={(e) => handleSubJobChange(index, 'productName', e.target.value)}
                              placeholder="ชื่อสินค้าหรืองาน"
                              className="min-w-[180px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={subJob.departmentId} 
                              onValueChange={(value) => {
                                const updatedSubJobs = [...subJobs];
                                updatedSubJobs[index] = {
                                  ...updatedSubJobs[index],
                                  departmentId: value,
                                  workStepId: '' // Reset work step when department changes
                                };
                                setSubJobs(updatedSubJobs);
                              }}
                            >
                              <SelectTrigger className="min-w-[130px]">
                                <SelectValue placeholder="เลือกแผนก" />
                              </SelectTrigger>
                              <SelectContent>
                                {departments.map((dept) => (
                                  <SelectItem key={dept.id} value={dept.id}>
                                    {dept.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={subJob.workStepId} 
                              onValueChange={(value) => handleSubJobChange(index, 'workStepId', value)}
                              disabled={!subJob.departmentId}
                            >
                              <SelectTrigger className="min-w-[130px]">
                                <SelectValue placeholder="เลือกขั้นตอน" />
                              </SelectTrigger>
                              <SelectContent>
                                {workSteps
                                  .filter(step => step.departmentId === subJob.departmentId)
                                  .map((step) => (
                                    <SelectItem key={step.id} value={step.id}>
                                      {step.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={subJob.colorId} 
                              onValueChange={(value) => handleSubJobChange(index, 'colorId', value)}
                            >
                              <SelectTrigger className="min-w-[100px]">
                                <SelectValue placeholder="เลือกสี" />
                              </SelectTrigger>
                              <SelectContent>
                                {colors.map((color) => (
                                  <SelectItem key={color.id} value={color.id.toString()}>
                                    {color.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={subJob.sizeId} 
                              onValueChange={(value) => handleSubJobChange(index, 'sizeId', value)}
                            >
                              <SelectTrigger className="min-w-[100px]">
                                <SelectValue placeholder="เลือกขนาด" />
                              </SelectTrigger>
                              <SelectContent>
                                {sizes.map((size) => (
                                  <SelectItem key={size.id} value={size.id.toString()}>
                                    {size.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={subJob.quantity || 1}
                              onChange={(e) => handleSubJobChange(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-[70px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={subJob.productionCost || 0}
                              onChange={(e) => handleSubJobChange(index, 'productionCost', parseFloat(e.target.value) || 0)}
                              className="w-[100px]"
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            ฿{subJob.totalCost.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {subJobs.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeSubJob(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                    <span className="text-gray-600">จำนวน Sub-jobs:</span>
                    <span className="font-medium">{subJobs.length} รายการ</span>
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