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

// Sortable Item component for drag and drop
function SortableSubJobItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-50" : ""}
    >
      {children}
    </TableRow>
  );
}

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
    queryKey: [`/api/work-orders/${workOrderId}`],
    enabled: isEditMode && !!workOrderId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  // Mutation for creating and updating work orders
  const createWorkOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditMode && workOrderId) {
        return await apiRequest(`/api/work-orders/${workOrderId}`, "PUT", data);
      } else {
        return await apiRequest("/api/work-orders", "POST", data);
      }
    },
    onSuccess: (responseData: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
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
        navigate("/production/work-orders");
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
      
      const response = await apiRequest("/api/work-orders/count", "POST", {
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

  // Handle drag and drop for sub-jobs reordering
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = subJobs.findIndex((_, index) => index.toString() === active.id);
      const newIndex = subJobs.findIndex((_, index) => index.toString() === over.id);

      setSubJobs((items) => {
        return arrayMove(items, oldIndex, newIndex);
      });
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
  );
}