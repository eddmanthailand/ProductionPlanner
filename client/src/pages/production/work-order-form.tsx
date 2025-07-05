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
import { usePermissions } from "@/hooks/usePermissions";
import WorkOrderAttachments from "@/components/WorkOrderAttachments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  teamId?: string;
  workStepId: string;
  colorId: string;
  sizeId: string;
  quantity: number;
  productionCost: number;
  totalCost: number;
}

export default function WorkOrderForm() {
  const { toast } = useToast();
  const { canAccess } = usePermissions();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Check if we're in edit mode
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const isEditMode = !!editId;
  const workOrderId = editId;
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
  const [originalSubJobs, setOriginalSubJobs] = useState<SubJob[]>([]);
  const [savedWorkOrderId, setSavedWorkOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [bulkGeneratorOpen, setBulkGeneratorOpen] = useState(false);

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
        await apiRequest("POST", "/api/auth/login", {
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
        
        // Get current count for this month using apiRequest
        const data = await apiRequest('POST', '/api/work-orders/count', { year, month });
        
        const sequence = String(data.count + 1).padStart(3, '0');
        return `JB${year}${month}${sequence}`;
      } catch (error) {
        console.error('Failed to generate order number:', error);
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
      }).catch(error => {
        console.error('Error setting order number:', error);
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
    queryKey: [`/api/work-orders/${workOrderId}`],
    enabled: isEditMode && !!workOrderId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  // Mutation for creating and updating work orders
  const createWorkOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditMode && workOrderId) {
        return await apiRequest("PUT", `/api/work-orders/${workOrderId}`, data);
      } else {
        return await apiRequest("POST", "/api/work-orders", data);
      }
    },
    onSuccess: (responseData: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      
      // If creating new work order, save the workOrderId and enable attachments tab
      if (!isEditMode && responseData?.id) {
        setSavedWorkOrderId(responseData.id);
        setActiveTab("attachments");
      }
      
      if (isEditMode && workOrderId) {
        queryClient.invalidateQueries({ queryKey: [`/api/work-orders/${workOrderId}`] });
        // Force refetch data immediately
        queryClient.refetchQueries({ queryKey: [`/api/work-orders/${workOrderId}`] });
      }

      // Check if prices were changed and there are queued jobs
      if (isEditMode && responseData?.hasQueuedJobs && responseData?.priceChanged) {
        toast({
          title: "มีการเปลี่ยนราคา",
          description: "กรุณากดคำนวณแผนการผลิตใหม่",
          variant: "default",
        });
        // Navigate to work queue planning page
        setTimeout(() => {
          navigate("/production/work-queue-planning");
        }, 2000);
      } else {
        toast({
          title: "สำเร็จ",
          description: isEditMode ? "แก้ไขใบสั่งงานเรียบร้อยแล้ว" : "สร้างใบสั่งงานแล้ว",
        });
        
        // Don't navigate away if we just created a new work order (let user upload files)
        if (isEditMode) {
          navigate("/production/work-orders");
        }
      }
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: isEditMode ? "ไม่สามารถแก้ไขใบสั่งงานได้" : "ไม่สามารถสร้างใบสั่งงานได้",
        variant: "destructive",
      });
    }
  });

  // Mutation for reordering sub-jobs
  const reorderSubJobsMutation = useMutation({
    mutationFn: async (reorderedSubJobs: SubJob[]) => {
      if (!workOrderId) return;
      return await apiRequest(`/api/work-orders/${workOrderId}/sub-jobs/reorder`, "PUT", {
        subJobs: reorderedSubJobs
      });
    },
    onSuccess: () => {
      if (workOrderId) {
        queryClient.invalidateQueries({ queryKey: [`/api/work-orders/${workOrderId}`] });
      }
      toast({
        title: "สำเร็จ",
        description: "เรียงลำดับ Sub-jobs แล้ว",
      });
    },
    onError: () => {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถเรียงลำดับ Sub-jobs ได้",
        variant: "destructive",
      });
    },
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

  // Generate order number on component mount (only for new orders)
  useEffect(() => {
    if (!isEditMode) {
      generateOrderNumber();
    }
  }, [isEditMode]);

  // Load existing work order data in edit mode
  useEffect(() => {
    if (isEditMode && existingWorkOrder) {
      const workOrder = existingWorkOrder as any;
      console.log("Loading work order data:", workOrder);
      
      setFormData({
        orderNumber: workOrder.orderNumber || workOrder.order_number || "",
        quotationId: workOrder.quotationId?.toString() || workOrder.quotation_id?.toString() || "",
        customerId: workOrder.customerId?.toString() || workOrder.customer_id?.toString() || "",
        title: workOrder.title || "",
        description: workOrder.description || "",
        workTypeId: workOrder.workTypeId?.toString() || workOrder.work_type_id?.toString() || "",
        deliveryDate: workOrder.deliveryDate || workOrder.delivery_date || workOrder.dueDate || workOrder.due_date || "",
        notes: workOrder.notes || ""
      });

      // Load customer data when customers are available
      if (customers.length > 0) {
        const customerId = workOrder.customerId || workOrder.customer_id;
        if (customerId) {
          const customer = customers.find(c => c.id === customerId);
          if (customer) {
            setSelectedCustomer(customer);
            setCustomerSearchValue(`${customer.name} - ${customer.companyName || customer.name}`);
          }
        }
      }

      // Load quotation data when quotations are available
      if (quotations.length > 0) {
        const quotationId = workOrder.quotationId || workOrder.quotation_id;
        if (quotationId) {
          const quotation = quotations.find(q => q.id === quotationId);
          if (quotation) {
            setSelectedQuotation(quotation);
          }
        }
      }

      // Load sub-jobs data and sort by sort_order
      if (workOrder.sub_jobs && workOrder.sub_jobs.length > 0) {
        const sortedSubJobs = workOrder.sub_jobs
          .map((sj: any) => ({
            id: sj.id,
            productName: sj.product_name || sj.productName || "",
            departmentId: sj.department_id || sj.departmentId || "",
            workStepId: sj.work_step_id || sj.workStepId || "",
            colorId: sj.color_id?.toString() || sj.colorId?.toString() || "",
            sizeId: sj.size_id?.toString() || sj.sizeId?.toString() || "",
            quantity: sj.quantity || 1,
            productionCost: sj.production_cost || sj.productionCost || 0,
            totalCost: sj.total_cost || sj.totalCost || 0,
            sortOrder: sj.sort_order || sj.sortOrder || 0
          }))
          .sort((a: any, b: any) => a.sortOrder - b.sortOrder);
        setSubJobs(sortedSubJobs);
        // Store original sub-jobs for price change detection
        setOriginalSubJobs(JSON.parse(JSON.stringify(sortedSubJobs)));
      } else {
        // If no sub-jobs, ensure we have at least one empty sub-job for the form
        setSubJobs([{
          productName: "", 
          departmentId: "", 
          workStepId: "", 
          colorId: "", 
          sizeId: "", 
          quantity: 1, 
          productionCost: 0, 
          totalCost: 0 
        }]);
      }
    }
  }, [isEditMode, existingWorkOrder, customers, quotations, workOrderId]);

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

  const generateOrderNumber = async () => {
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      
      const response = await apiRequest("POST", "/api/work-orders/count", {
        year: year,
        month: month
      });
      
      const count = (response as any).count || 0;
      const sequence = String(count + 1).padStart(3, '0');
      const orderNumber = `JB${year}${month}${sequence}`;
      
      setFormData(prev => ({
        ...prev,
        orderNumber: orderNumber
      }));
    } catch (error) {
      console.error("Failed to generate order number:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างเลขที่ใบสั่งงานได้",
        variant: "destructive",
      });
    }
  };

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

  // Handle sub-jobs reordering with simple move up/down buttons
  const moveSubJobUp = (index: number) => {
    if (index > 0) {
      const newSubJobs = [...subJobs];
      [newSubJobs[index], newSubJobs[index - 1]] = [newSubJobs[index - 1], newSubJobs[index]];
      setSubJobs(newSubJobs);
    }
  };

  const moveSubJobDown = (index: number) => {
    if (index < subJobs.length - 1) {
      const newSubJobs = [...subJobs];
      [newSubJobs[index], newSubJobs[index + 1]] = [newSubJobs[index + 1], newSubJobs[index]];
      setSubJobs(newSubJobs);
    }
  };

  const calculateGrandTotal = () => {
    return subJobs.reduce((total, subJob) => {
      const totalCost = typeof subJob.totalCost === 'string' ? parseFloat(subJob.totalCost) || 0 : subJob.totalCost || 0;
      return total + totalCost;
    }, 0);
  };

  // Function to detect price changes
  const detectPriceChanges = () => {
    if (!isEditMode || originalSubJobs.length === 0) return false;
    
    console.log("Checking price changes...");
    console.log("Original sub-jobs:", originalSubJobs.length);
    console.log("Current sub-jobs:", subJobs.length);
    
    // Check if any production cost has changed
    for (let i = 0; i < subJobs.length; i++) {
      const currentSubJob = subJobs[i];
      const originalSubJob = originalSubJobs.find(osj => {
        // Try to match by ID first, then by attributes
        if (osj.id && currentSubJob.id && osj.id === currentSubJob.id) {
          return true;
        }
        // For new items without ID, match by product attributes
        return osj.productName === currentSubJob.productName && 
               osj.colorId === currentSubJob.colorId &&
               osj.sizeId === currentSubJob.sizeId;
      });
      
      if (originalSubJob) {
        const originalCost = parseFloat(originalSubJob.productionCost.toString()) || 0;
        const currentCost = parseFloat(currentSubJob.productionCost.toString()) || 0;
        
        console.log(`Comparing costs for ${currentSubJob.productName}: ${originalCost} vs ${currentCost}`);
        
        if (originalCost !== currentCost) {
          console.log("Price change detected!");
          return true;
        }
      }
    }
    return false;
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

    const priceChanged = detectPriceChanges();
    
    const orderData = {
      ...formData,
      customerId: parseInt(formData.customerId),
      quotationId: formData.quotationId ? parseInt(formData.quotationId) : null,
      workTypeId: formData.workTypeId ? parseInt(formData.workTypeId) : null,
      totalAmount: calculateGrandTotal(),
      priceChanged: priceChanged,
      items: subJobs.map((subJob, index) => ({
        ...subJob,
        sortOrder: index + 1
      }))
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
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditMode ? "แก้ไขใบสั่งงาน" : "สร้างใบสั่งงานใหม่"}
              </h1>
              <p className="text-gray-600">
                {isEditMode ? "แก้ไขข้อมูลใบสั่งงานการผลิต" : "กรอกข้อมูลใบสั่งงานการผลิต"}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {formData.orderNumber}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-3 space-y-6">
            {/* Basic Information */}
            <Card className="shadow-lg border border-gray-200">
              <CardHeader className="py-3 px-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-gray-800 font-medium">ข้อมูลพื้นฐาน</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
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

                  <div className="space-y-1.5">
                    <Label htmlFor="workTypeId" className="text-sm font-medium text-gray-700">ประเภทงาน</Label>
                    <Select 
                      value={formData.workTypeId} 
                      onValueChange={(value) => handleInputChange('workTypeId', value)}
                    >
                      <SelectTrigger className="h-8 text-sm border-gray-200 focus:border-green-400 focus:ring-1 focus:ring-green-200 shadow-sm">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700">ชื่องาน *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="ระบุชื่องาน"
                      className="h-9 text-sm border-gray-200 focus:border-green-400 focus:ring-1 focus:ring-green-200 shadow-sm font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="deliveryDate" className="text-sm font-medium text-gray-700">วันกำหนดส่งสินค้า *</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                      className="h-9 text-sm border-gray-200 focus:border-green-400 focus:ring-1 focus:ring-green-200 shadow-sm"
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
                      placeholder="รายละเอียดและข้อกำหนดของงาน"
                      rows={2}
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
                    value={formData.customerId || ""} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, customerId: value }));
                      const customer = customers.find(c => c.id.toString() === value);
                      setSelectedCustomer(customer || null);
                    }}
                    disabled={!!selectedQuotation}
                  >
                    <SelectTrigger className="h-8 text-sm border-gray-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-200 shadow-sm">
                      <SelectValue placeholder="เลือกลูกค้า" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name} - {customer.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCustomer && (
                  <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
                    <h4 className="font-medium text-purple-900 mb-2 text-sm">ข้อมูลลูกค้า</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-purple-800">
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
              <Card className="shadow-lg border border-gray-200">
                <CardHeader className="py-3 px-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Package className="h-4 w-4 text-orange-600" />
                    <span className="text-gray-800 font-medium">รายการสินค้าในใบเสนอราคา</span>
                    <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-800 border-orange-300">
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
                          <TableHead className="text-center">หน่วย</TableHead>
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
                              {item.product?.description || item.product?.sku || 'N/A'}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {item.product?.unit || 'ไม่ระบุ'}
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
                        ฿{parseFloat(selectedQuotation.grandTotal).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}



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
                      <Button onClick={() => setBulkGeneratorOpen(true)} size="sm" className="flex items-center space-x-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs px-3 py-1 h-7">
                        <Package className="h-3 w-3" />
                        <span>🚀 สร้างหลาย Sub-jobs</span>
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

            {/* Tabs for File Attachments */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">รายละเอียดใบสั่งงาน</TabsTrigger>
                <TabsTrigger value="attachments" disabled={!isEditMode && !savedWorkOrderId}>
                  ไฟล์แนบ {!isEditMode && !savedWorkOrderId && "(บันทึกก่อน)"}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="mt-0">
                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/production/work-orders")} 
                    className="px-6"
                  >
                    ยกเลิก
                  </Button>
                  {((isEditMode && canAccess("work_orders", "update")) || (!isEditMode && canAccess("work_orders", "create"))) && (
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
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="attachments" className="mt-4">
                {(isEditMode && workOrderId) || (!isEditMode && savedWorkOrderId) ? (
                  <WorkOrderAttachments workOrderId={workOrderId || savedWorkOrderId || ""} />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    กรุณาบันทึกใบสั่งงานก่อนเพื่อแนบไฟล์
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Bulk SubJobs Generator Dialog */}
      <BulkSubJobsGenerator 
        open={bulkGeneratorOpen}
        onOpenChange={setBulkGeneratorOpen}
        departments={departments}
        teams={teams}
        workSteps={workSteps}
        colors={colors}
        sizes={sizes}
        onGenerate={(generatedSubJobs) => {
          setSubJobs([...subJobs, ...generatedSubJobs]);
          setBulkGeneratorOpen(false);
          toast({
            title: "สำเร็จ",
            description: `สร้าง Sub-jobs จำนวน ${generatedSubJobs.length} รายการเรียบร้อย`,
          });
        }}
      />
    </div>
  );
}

interface BulkSubJobsGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  teams: Team[];
  workSteps: WorkStep[];
  colors: Color[];
  sizes: Size[];
  onGenerate: (subJobs: SubJob[]) => void;
}

function BulkSubJobsGenerator({ 
  open, 
  onOpenChange, 
  departments, 
  teams, 
  workSteps, 
  colors, 
  sizes, 
  onGenerate 
}: BulkSubJobsGeneratorProps) {
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [productNames, setProductNames] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generatedSubJobs, setGeneratedSubJobs] = useState<SubJob[]>([]);

  const toggleDepartment = (deptId: string) => {
    setSelectedDepartments(prev => 
      prev.includes(deptId) 
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const addColor = (colorId: string) => {
    if (!selectedColors.includes(colorId)) {
      setSelectedColors(prev => [...prev, colorId]);
    }
  };

  const removeColor = (colorId: string) => {
    setSelectedColors(prev => prev.filter(id => id !== colorId));
    // Remove quantities for this color
    setQuantities(prev => {
      const newQuantities = { ...prev };
      Object.keys(newQuantities).forEach(deptId => {
        if (newQuantities[deptId]?.[colorId]) {
          delete newQuantities[deptId][colorId];
        }
      });
      return newQuantities;
    });
  };

  const addSize = (sizeId: string) => {
    if (!selectedSizes.includes(sizeId)) {
      setSelectedSizes(prev => [...prev, sizeId]);
    }
  };

  const removeSize = (sizeId: string) => {
    setSelectedSizes(prev => prev.filter(id => id !== sizeId));
    // Remove quantities for this size
    setQuantities(prev => {
      const newQuantities = { ...prev };
      Object.keys(newQuantities).forEach(deptId => {
        Object.keys(newQuantities[deptId] || {}).forEach(colorId => {
          if (newQuantities[deptId]?.[colorId]?.[sizeId] !== undefined) {
            delete newQuantities[deptId][colorId][sizeId];
          }
        });
      });
      return newQuantities;
    });
  };

  const updateQuantity = (departmentId: string, colorId: string, sizeId: string, quantity: number) => {
    setQuantities(prev => ({
      ...prev,
      [departmentId]: {
        ...prev[departmentId],
        [colorId]: {
          ...prev[departmentId]?.[colorId],
          [sizeId]: quantity
        }
      }
    }));
  };

  const updateProductName = (departmentId: string, colorId: string, sizeId: string, productName: string) => {
    setProductNames(prev => ({
      ...prev,
      [departmentId]: {
        ...prev[departmentId],
        [colorId]: {
          ...prev[departmentId]?.[colorId],
          [sizeId]: productName
        }
      }
    }));
  };

  const generateSubJobs = () => {
    const newSubJobs: SubJob[] = [];
    
    selectedDepartments.forEach(deptId => {
      const department = departments.find(d => d.id === deptId);
      const deptWorkSteps = workSteps.filter(ws => ws.departmentId === deptId);
      const deptTeams = teams.filter(t => t.departmentId === deptId && selectedTeams.includes(t.id));
      
      selectedColors.forEach(colorId => {
        const color = colors.find(c => c.id.toString() === colorId);
        selectedSizes.forEach(sizeId => {
          const size = sizes.find(s => s.id.toString() === sizeId);
          const quantity = quantities[deptId]?.[colorId]?.[sizeId] || 0;
          const productName = productNames[deptId]?.[colorId]?.[sizeId] || `${department?.name || ''} - ${color?.name} ${size?.name}`;
          
          if (quantity > 0) {
            deptWorkSteps.forEach(workStep => {
              // สร้าง SubJob สำหรับแต่ละทีมที่เลือก หรือไม่ระบุทีมถ้าไม่มีการเลือก
              if (deptTeams.length > 0) {
                deptTeams.forEach(team => {
                  newSubJobs.push({
                    productName: productName,
                    departmentId: deptId,
                    teamId: team.id,
                    workStepId: workStep.id,
                    colorId: colorId,
                    sizeId: sizeId,
                    quantity: quantity,
                    productionCost: 0,
                    totalCost: 0
                  });
                });
              } else {
                newSubJobs.push({
                  productName: productName,
                  departmentId: deptId,
                  workStepId: workStep.id,
                  colorId: colorId,
                  sizeId: sizeId,
                  quantity: quantity,
                  productionCost: 0,
                  totalCost: 0
                });
              }
            });
          }
        });
      });
    });

    setGeneratedSubJobs(newSubJobs);
    setPreviewOpen(true);
  };

  const confirmGenerate = () => {
    onGenerate(generatedSubJobs);
    setPreviewOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedDepartments([]);
    setSelectedTeams([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setQuantities({});
    setProductNames({});
    setGeneratedSubJobs([]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-800">🚀 Bulk SubJobs Generator</DialogTitle>
            <DialogDescription>
              สร้าง Sub-jobs หลายรายการพร้อมกัน โดยเลือกแผนก ทีม จากนั้นเพิ่มสีและไซส์ที่ต้องการ แล้วกรอกจำนวนในตาราง
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Department Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">เลือกแผนก</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {departments.map(dept => (
                  <label key={dept.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDepartments.includes(dept.id)}
                      onChange={() => toggleDepartment(dept.id)}
                      className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium">{dept.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Team Selection */}
            {selectedDepartments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800">เลือกทีม</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {teams
                    .filter(team => selectedDepartments.includes(team.departmentId))
                    .map(team => (
                      <label key={team.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTeams.includes(team.id)}
                          onChange={() => toggleTeam(team.id)}
                          className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium">{team.name}</span>
                      </label>
                    ))}
                </div>
              </div>
            )}

            {/* Dynamic Color and Size Selection */}
            {selectedDepartments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-800">สร้างตารางสินค้า</h3>
                
                {/* Color Selection */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold text-purple-700">เลือกสี</h4>
                    <Select onValueChange={(value) => addColor(value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="➕ เพิ่มแถว (สี)" />
                      </SelectTrigger>
                      <SelectContent>
                        {colors
                          .filter(color => !selectedColors.includes(color.id.toString()))
                          .map(color => (
                            <SelectItem key={color.id} value={color.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded border"
                                  style={{ backgroundColor: color.code || '#000000' }}
                                ></div>
                                {color.name}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {selectedColors.map(colorId => {
                      const color = colors.find(c => c.id.toString() === colorId);
                      return (
                        <div key={colorId} className="flex items-center gap-2 bg-purple-100 px-3 py-1 rounded-full">
                          <div 
                            className="w-3 h-3 rounded border"
                            style={{ backgroundColor: color?.code || '#000000' }}
                          ></div>
                          <span className="text-sm">{color?.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0 hover:bg-red-200"
                            onClick={() => removeColor(colorId)}
                          >
                            ×
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Size Selection */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold text-indigo-700">เลือกไซส์</h4>
                    <Select onValueChange={(value) => addSize(value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="➕ เพิ่มคอลัมน์ (ไซส์)" />
                      </SelectTrigger>
                      <SelectContent>
                        {sizes
                          .filter(size => !selectedSizes.includes(size.id.toString()))
                          .map(size => (
                            <SelectItem key={size.id} value={size.id.toString()}>
                              {size.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {selectedSizes.map(sizeId => {
                      const size = sizes.find(s => s.id.toString() === sizeId);
                      return (
                        <div key={sizeId} className="flex items-center gap-2 bg-indigo-100 px-3 py-1 rounded-full">
                          <span className="text-sm">{size?.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0 hover:bg-red-200"
                            onClick={() => removeSize(sizeId)}
                          >
                            ×
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Help Text */}
                {selectedDepartments.length > 0 && (selectedColors.length === 0 || selectedSizes.length === 0) && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          💡 <strong>วิธีใช้งาน:</strong> เพิ่มสีและไซส์ที่ต้องการก่อน จากนั้นตารางจะปรากฏให้กรอกจำนวน
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dynamic Quantity Table */}
                {selectedColors.length > 0 && selectedSizes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">กรอกจำนวนสินค้า</h3>
                    
                    {selectedDepartments.map(deptId => {
                      const department = departments.find(d => d.id === deptId);
                      return (
                        <div key={deptId} className="mb-6">
                          <h4 className="text-md font-semibold mb-3 text-purple-700 bg-purple-50 p-2 rounded">
                            {department?.name}
                          </h4>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full border border-gray-300 rounded-lg">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">สี</th>
                                  {selectedSizes.map(sizeId => {
                                    const size = sizes.find(s => s.id.toString() === sizeId);
                                    return (
                                      <th key={sizeId} className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">
                                        {size?.name}
                                      </th>
                                    );
                                  })}
                                </tr>
                              </thead>
                              <tbody>
                                {selectedColors.map(colorId => {
                                  const color = colors.find(c => c.id.toString() === colorId);
                                  return (
                                    <tr key={colorId} className="hover:bg-gray-50">
                                      <td className="border border-gray-300 px-3 py-2 font-medium text-sm">
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-4 h-4 rounded border"
                                            style={{ backgroundColor: color?.code || '#000000' }}
                                          ></div>
                                          {color?.name}
                                        </div>
                                      </td>
                                      {selectedSizes.map(sizeId => (
                                        <td key={sizeId} className="border border-gray-300 px-1 py-1">
                                          <div className="space-y-1">
                                            <Input
                                              type="text"
                                              value={productNames[deptId]?.[colorId]?.[sizeId] || ''}
                                              onChange={(e) => updateProductName(deptId, colorId, sizeId, e.target.value)}
                                              className="w-24 h-6 text-xs border-gray-200"
                                              placeholder="ชื่อสินค้า"
                                            />
                                            <Input
                                              type="number"
                                              min="0"
                                              value={quantities[deptId]?.[colorId]?.[sizeId] || ''}
                                              onChange={(e) => updateQuantity(deptId, colorId, sizeId, parseInt(e.target.value) || 0)}
                                              className="w-24 h-6 text-center text-xs border-gray-200"
                                              placeholder="จำนวน"
                                            />
                                          </div>
                                        </td>
                                      ))}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                ยกเลิก
              </Button>
              <Button 
                onClick={resetForm}
                variant="outline"
                className="text-gray-600"
              >
                รีเซ็ต
              </Button>
              <Button 
                onClick={generateSubJobs}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                disabled={selectedDepartments.length === 0 || selectedColors.length === 0 || selectedSizes.length === 0}
              >
                🚀 สร้าง SubJobs ทั้งหมด
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-800">👀 ตัวอย่าง SubJobs ที่จะสร้าง</DialogTitle>
            <DialogDescription>
              จำนวน SubJobs ที่จะสร้าง: {generatedSubJobs.length} รายการ
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>แผนก</TableHead>
                  <TableHead>ทีม</TableHead>
                  <TableHead>ขั้นตอนงาน</TableHead>
                  <TableHead>สี</TableHead>
                  <TableHead>ขนาด</TableHead>
                  <TableHead className="text-center">จำนวน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedSubJobs.map((subJob, index) => {
                  const department = departments.find(d => d.id === subJob.departmentId);
                  const team = teams.find(t => t.id === subJob.teamId);
                  const workStep = workSteps.find(ws => ws.id === subJob.workStepId);
                  const color = colors.find(c => c.id.toString() === subJob.colorId);
                  const size = sizes.find(s => s.id.toString() === subJob.sizeId);

                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{subJob.productName}</TableCell>
                      <TableCell>{department?.name}</TableCell>
                      <TableCell>{team?.name || '-'}</TableCell>
                      <TableCell>{workStep?.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: color?.code || '#000000' }}
                          ></div>
                          {color?.name}
                        </div>
                      </TableCell>
                      <TableCell>{size?.name}</TableCell>
                      <TableCell className="text-center">{subJob.quantity}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              แก้ไข
            </Button>
            <Button 
              onClick={confirmGenerate}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              ✅ ยืนยันและสร้าง
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}