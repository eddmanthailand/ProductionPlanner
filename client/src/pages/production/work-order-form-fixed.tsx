import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Save, FileText, User, Calendar, Package, Settings, Plus, Trash2, Search, GripVertical } from "lucide-react";
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

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

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

interface Quotation {
  id: number;
  customerId: number;
  status: string;
  validUntil: string;
  total: number;
  createdAt: string;
  customer?: Customer;
  items?: QuotationItem[];
}

interface Department {
  id: string;
  name: string;
}

interface WorkStep {
  id: string;
  name: string;
  departmentId: string;
}

interface Color {
  id: number;
  name: string;
}

interface Size {
  id: number;
  name: string;
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

interface WorkOrderFormData {
  jobNumber: string;
  description: string;
  notes: string;
  customerId: number | null;
  quotationId: number | null;
  priority: string;
  dueDate: string;
}

export default function WorkOrderForm() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/production/work-orders/:action/:id?");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isEditMode = params?.action === "edit";
  const workOrderId = params?.id;

  const [formData, setFormData] = useState<WorkOrderFormData>({
    jobNumber: "",
    description: "",
    notes: "",
    customerId: null,
    quotationId: null,
    priority: "medium",
    dueDate: ""
  });

  const [subJobs, setSubJobs] = useState<SubJob[]>([]);
  const [isQuotationDialogOpen, setIsQuotationDialogOpen] = useState(false);
  const [quotationSearchTerm, setQuotationSearchTerm] = useState("");

  // Queries
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: quotations = [] } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
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

  // Mutations
  const createWorkOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = isEditMode ? `/api/work-orders/${workOrderId}` : "/api/work-orders";
      const method = isEditMode ? "PATCH" : "POST";
      return await apiRequest(url, {
        method,
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "สำเร็จ",
        description: isEditMode ? "แก้ไขใบสั่งงานเรียบร้อยแล้ว" : "สร้างใบสั่งงานเรียบร้อยแล้ว",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      navigate("/production/work-orders");
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถบันทึกใบสั่งงานได้",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof WorkOrderFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubJobChange = (index: number, field: keyof SubJob, value: any) => {
    const updatedSubJobs = [...subJobs];
    updatedSubJobs[index] = { ...updatedSubJobs[index], [field]: value };
    
    if (field === 'quantity' || field === 'productionCost') {
      updatedSubJobs[index].totalCost = updatedSubJobs[index].quantity * updatedSubJobs[index].productionCost;
    }
    
    setSubJobs(updatedSubJobs);
  };

  const addSubJob = () => {
    setSubJobs([...subJobs, {
      productName: "",
      departmentId: "",
      workStepId: "",
      colorId: "",
      sizeId: "",
      quantity: 0,
      productionCost: 0,
      totalCost: 0
    }]);
  };

  const removeSubJob = (index: number) => {
    setSubJobs(subJobs.filter((_, i) => i !== index));
  };

  const calculateGrandTotal = () => {
    return subJobs.reduce((total, subJob) => {
      const cost = typeof subJob.totalCost === 'string' ? parseFloat(subJob.totalCost) : subJob.totalCost;
      return total + (cost || 0);
    }, 0);
  };

  const handleQuotationSelectFromDialog = (quotation: Quotation) => {
    handleInputChange('quotationId', quotation.id);
    handleInputChange('customerId', quotation.customerId);
    
    if (quotation.items) {
      const newSubJobs = quotation.items.map(item => ({
        productName: item.product?.name || "",
        departmentId: "",
        workStepId: "",
        colorId: "",
        sizeId: "",
        quantity: item.quantity,
        productionCost: item.unitPrice,
        totalCost: item.total
      }));
      setSubJobs(newSubJobs);
    }
    
    setIsQuotationDialogOpen(false);
    toast({
      title: "สำเร็จ",
      description: "นำเข้าข้อมูลจากใบเสนอราคาเรียบร้อยแล้ว",
    });
  };

  const handleCustomerSelect = (customer: Customer) => {
    handleInputChange('customerId', customer.id);
  };

  const handleSubmit = () => {
    if (!formData.customerId) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกลูกค้า",
        variant: "destructive",
      });
      return;
    }

    if (subJobs.length === 0) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเพิ่ม Sub-job อย่างน้อย 1 รายการ",
        variant: "destructive",
      });
      return;
    }

    const dataToSubmit = {
      ...formData,
      subJobs: subJobs,
      total: calculateGrandTotal()
    };

    createWorkOrderMutation.mutate(dataToSubmit);
  };

  const filteredQuotations = quotations.filter(quotation =>
    quotation.customer?.name.toLowerCase().includes(quotationSearchTerm.toLowerCase()) ||
    quotation.id.toString().includes(quotationSearchTerm)
  );

  const selectedCustomer = customers.find(c => c.id === formData.customerId);
  const selectedQuotation = quotations.find(q => q.id === formData.quotationId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/production/work-orders")}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                กลับ
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? "แก้ไขใบสั่งงาน" : "สร้างใบสั่งงานใหม่"}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {isEditMode ? "แก้ไขข้อมูลใบสั่งงานและ Sub-jobs" : "สร้างใบสั่งงานและเพิ่ม Sub-jobs สำหรับการผลิต"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card className="shadow-lg border border-gray-200">
                <CardHeader className="py-3 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-gray-800 font-medium">ข้อมูลทั่วไป</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="jobNumber" className="text-sm font-medium text-gray-700">หมายเลขงาน</Label>
                      <Input
                        id="jobNumber"
                        value={formData.jobNumber}
                        onChange={(e) => handleInputChange('jobNumber', e.target.value)}
                        placeholder="เช่น JB202506001"
                        className="text-sm border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 shadow-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="priority" className="text-sm font-medium text-gray-700">ความสำคัญ</Label>
                      <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                        <SelectTrigger className="text-sm border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 shadow-sm">
                          <SelectValue placeholder="เลือกความสำคัญ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">ต่ำ</SelectItem>
                          <SelectItem value="medium">ปานกลาง</SelectItem>
                          <SelectItem value="high">สูง</SelectItem>
                          <SelectItem value="urgent">เร่งด่วน</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700">กำหนดส่ง</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => handleInputChange('dueDate', e.target.value)}
                        className="text-sm border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="description" className="text-sm font-medium text-gray-700">รายละเอียดงาน</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="อธิบายรายละเอียดของงาน"
                        rows={3}
                        className="text-sm border-gray-200 focus:border-green-400 focus:ring-1 focus:ring-green-200 shadow-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="notes" className="text-sm font-medium text-gray-700">หมายเหตุ</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="หมายเหตุเพิ่มเติม ข้อกำหนดพิเศษ หรือคำแนะนำ"
                        rows={2}
                        className="text-sm border-gray-200 focus:border-green-400 focus:ring-1 focus:ring-green-200 shadow-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card className="shadow-lg border border-gray-200">
                <CardHeader className="py-3 px-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <User className="h-4 w-4 text-purple-600" />
                    <span className="text-gray-800 font-medium">ข้อมูลลูกค้า</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="customer" className="text-sm font-medium text-gray-700">เลือกลูกค้า *</Label>
                    <Select 
                      value={formData.customerId?.toString() || ""} 
                      onValueChange={(value) => handleInputChange('customerId', parseInt(value))}
                    >
                      <SelectTrigger className="text-sm border-gray-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-200 shadow-sm">
                        <SelectValue placeholder="เลือกลูกค้า" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCustomer && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                      <h4 className="font-medium text-purple-900 text-sm">ข้อมูลลูกค้า</h4>
                      <div className="text-xs text-purple-700 space-y-1">
                        <p><span className="font-medium">ชื่อ:</span> {selectedCustomer.name}</p>
                        <p><span className="font-medium">อีเมล:</span> {selectedCustomer.email}</p>
                        <p><span className="font-medium">โทร:</span> {selectedCustomer.phone}</p>
                        <p><span className="font-medium">ที่อยู่:</span> {selectedCustomer.address}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-gray-500">
                      {formData.quotationId ? `เลือกจากใบเสนอราคา #${formData.quotationId}` : "หรือเลือกจากใบเสนอราคา"}
                    </div>
                    <Dialog open={isQuotationDialogOpen} onOpenChange={setIsQuotationDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs">
                          <Search className="h-3 w-3 mr-1" />
                          เลือกจากใบเสนอราคา
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>เลือกใบเสนอราคา</DialogTitle>
                          <DialogDescription>
                            เลือกใบเสนอราคาเพื่อนำเข้าข้อมูลลูกค้าและรายการสินค้า
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="ค้นหาใบเสนอราคา..."
                            value={quotationSearchTerm}
                            onChange={(e) => setQuotationSearchTerm(e.target.value)}
                            className="text-sm"
                          />
                          <div className="max-h-96 overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>หมายเลข</TableHead>
                                  <TableHead>ลูกค้า</TableHead>
                                  <TableHead>วันที่</TableHead>
                                  <TableHead>ยอดรวม</TableHead>
                                  <TableHead>สถานะ</TableHead>
                                  <TableHead></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredQuotations.map((quotation) => (
                                  <TableRow key={quotation.id}>
                                    <TableCell>#{quotation.id}</TableCell>
                                    <TableCell>{quotation.customer?.name}</TableCell>
                                    <TableCell>{new Date(quotation.createdAt).toLocaleDateString('th-TH')}</TableCell>
                                    <TableCell>฿{quotation.total.toLocaleString()}</TableCell>
                                    <TableCell>
                                      <Badge variant={quotation.status === "approved" ? "default" : "secondary"}>
                                        {quotation.status === "approved" ? "อนุมัติ" : quotation.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        size="sm"
                                        onClick={() => handleQuotationSelectFromDialog(quotation)}
                                      >
                                        เลือก
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* Sub Jobs Table */}
              <Card className="w-full shadow-lg border border-gray-200">
                <CardHeader className="py-2 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <CardTitle className="flex items-center text-base">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="text-gray-800 font-medium">Sub-jobs</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full overflow-x-auto">
                    <Table className="w-full table-fixed">
                      <TableHeader>
                        <TableRow className="bg-gray-100 border-b-2 border-gray-200">
                          <TableHead className="text-center font-semibold text-gray-700 px-1 py-2 w-[5%] text-sm"></TableHead>
                          <TableHead className="text-left font-semibold text-gray-700 px-3 py-2 w-[23%] text-sm">ชื่อสินค้า/งาน</TableHead>
                          <TableHead className="text-left font-semibold text-gray-700 px-2 py-2 w-[12%] text-sm">แผนก</TableHead>
                          <TableHead className="text-left font-semibold text-gray-700 px-2 py-2 w-[13%] text-sm">ขั้นตอนงาน</TableHead>
                          <TableHead className="text-left font-semibold text-gray-700 px-2 py-2 w-[10%] text-sm">สี</TableHead>
                          <TableHead className="text-left font-semibold text-gray-700 px-2 py-2 w-[10%] text-sm">ขนาด</TableHead>
                          <TableHead className="text-center font-semibold text-gray-700 px-2 py-2 w-[8%] text-sm">จำนวน</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 px-2 py-2 w-[9%] text-sm">ต้นทุน/ชิ้น</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 px-2 py-2 w-[10%] text-sm">รวม</TableHead>
                          <TableHead className="text-center font-semibold text-gray-700 px-2 py-2 w-[5%] text-sm">ลบ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subJobs.map((subJob, index) => (
                          <TableRow key={`sub-job-${index}`} className="border-b border-gray-200 hover:bg-gray-50">
                            <TableCell className="cursor-grab text-center py-1.5">
                              <GripVertical className="h-4 w-4 text-gray-400 mx-auto" />
                            </TableCell>
                            <TableCell className="px-3 py-1.5">
                              <Input
                                value={subJob.productName || ""}
                                onChange={(e) => handleSubJobChange(index, 'productName', e.target.value)}
                                placeholder="ชื่อสินค้าหรืองาน"
                                className="w-full border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 h-7 text-xs shadow-sm"
                              />
                            </TableCell>
                            <TableCell className="px-2 py-1.5">
                              <Select 
                                value={subJob.departmentId} 
                                onValueChange={(value) => {
                                  const updatedSubJobs = [...subJobs];
                                  updatedSubJobs[index] = {
                                    ...updatedSubJobs[index],
                                    departmentId: value,
                                    workStepId: ''
                                  };
                                  setSubJobs(updatedSubJobs);
                                }}
                              >
                                <SelectTrigger className="w-full border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 h-7 text-xs shadow-sm">
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
                            <TableCell className="px-2 py-1.5">
                              <Select 
                                value={subJob.workStepId} 
                                onValueChange={(value) => handleSubJobChange(index, 'workStepId', value)}
                                disabled={!subJob.departmentId}
                              >
                                <SelectTrigger className="w-full border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 h-7 text-xs shadow-sm">
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
                            <TableCell className="px-2 py-1.5">
                              <Select 
                                value={subJob.colorId} 
                                onValueChange={(value) => handleSubJobChange(index, 'colorId', value)}
                              >
                                <SelectTrigger className="w-full border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 h-7 text-xs shadow-sm">
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
                            <TableCell className="px-2 py-1.5">
                              <Select 
                                value={subJob.sizeId} 
                                onValueChange={(value) => handleSubJobChange(index, 'sizeId', value)}
                              >
                                <SelectTrigger className="w-full border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 h-7 text-xs shadow-sm">
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
                            <TableCell className="px-2 py-1.5 text-center">
                              <Input
                                type="number"
                                min="0"
                                value={subJob.quantity === 0 ? "" : subJob.quantity || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "") {
                                    handleSubJobChange(index, 'quantity', 0);
                                  } else {
                                    handleSubJobChange(index, 'quantity', parseInt(value) || 0);
                                  }
                                }}
                                className="w-full border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 h-7 text-xs text-center shadow-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                              />
                            </TableCell>
                            <TableCell className="px-2 py-1.5">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={subJob.productionCost || 0}
                                onChange={(e) => handleSubJobChange(index, 'productionCost', parseFloat(e.target.value) || 0)}
                                className="w-full border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 h-7 text-xs text-right shadow-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                              />
                            </TableCell>
                            <TableCell className="px-2 py-1.5 text-right font-medium text-gray-900 text-xs">
                              ฿{(typeof subJob.totalCost === 'string' ? parseFloat(subJob.totalCost) : subJob.totalCost).toLocaleString()}
                            </TableCell>
                            <TableCell className="px-2 py-1.5 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSubJob(index)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0 rounded-full transition-all"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Summary Section */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-t-2 border-blue-200 px-4 py-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <Button onClick={addSubJob} size="sm" className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1 h-7">
                          <Plus className="h-3 w-3" />
                          <span>เพิ่ม Sub-job</span>
                        </Button>
                        <div className="text-xs text-gray-600">
                          จำนวน Sub-jobs: <span className="font-semibold text-gray-800">{subJobs.length} รายการ</span>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-blue-700 bg-white px-3 py-1 rounded-full shadow-sm border border-blue-200">
                        ยอดรวม: ฿{calculateGrandTotal().toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/production/work-orders")} 
                  className="px-6"
                >
                  ยกเลิก
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  className="px-6 bg-blue-600 hover:bg-blue-700" 
                  disabled={createWorkOrderMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createWorkOrderMutation.isPending 
                    ? (isEditMode ? "กำลังแก้ไข..." : "กำลังบันทึก...") 
                    : (isEditMode ? "แก้ไขใบสั่งงาน" : "บันทึกใบสั่งงาน")
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}