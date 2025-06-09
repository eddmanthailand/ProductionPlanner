import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Trash2, Save, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubJob {
  id?: number;
  productName: string;
  departmentId: string;
  teamId: string;
  workStepId: string;
  colorId: string;
  sizeId: string;
  quantity: number;
  productionCost: number;
  totalCost: number;
}

export default function JobFormDemo() {
  const { toast } = useToast();
  
  const [subJobs, setSubJobs] = useState<SubJob[]>([
    { 
      productName: "", 
      departmentId: "", 
      teamId: "", 
      workStepId: "", 
      colorId: "", 
      sizeId: "", 
      quantity: 1, 
      productionCost: 0, 
      totalCost: 0 
    }
  ]);

  const [formData, setFormData] = useState({
    jobNumber: "JB202506001",
    title: "",
    description: "",
    workTypeId: "",
    deliveryDate: "",
    notes: ""
  });

  // Mock data
  const departments = [
    { id: "1", name: "แผนกการผลิต" },
    { id: "2", name: "แผนกควบคุมคุณภาพ" },
    { id: "3", name: "แผนกบรรจุภัณฑ์" }
  ];

  const teams = [
    { id: "1", name: "ทีมผลิต A", departmentId: "1" },
    { id: "2", name: "ทีมผลิต B", departmentId: "1" },
    { id: "3", name: "ทีม QC", departmentId: "2" },
    { id: "4", name: "ทีมบรรจุ", departmentId: "3" }
  ];

  const workSteps = [
    { id: "1", name: "เตรียมวัตถุดิบ", departmentId: "1" },
    { id: "2", name: "กระบวนการผลิต", departmentId: "1" },
    { id: "3", name: "ตรวจสอบคุณภาพ", departmentId: "2" },
    { id: "4", name: "บรรจุสินค้า", departmentId: "3" }
  ];

  const colors = [
    { id: "1", name: "แดง" },
    { id: "2", name: "น้ำเงิน" },
    { id: "3", name: "เขียว" },
    { id: "4", name: "เหลือง" },
    { id: "5", name: "ขาว" },
    { id: "6", name: "ดำ" }
  ];

  const sizes = [
    { id: "1", name: "XS" },
    { id: "2", name: "S" },
    { id: "3", name: "M" },
    { id: "4", name: "L" },
    { id: "5", name: "XL" },
    { id: "6", name: "XXL" }
  ];

  const workTypes = [
    { id: "1", name: "SAMPLE" },
    { id: "2", name: "PRODUCTION" }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubJobChange = (index: number, field: keyof SubJob, value: string | number) => {
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

    setSubJobs(updatedSubJobs);
  };

  const addSubJob = () => {
    setSubJobs([
      ...subJobs,
      { 
        productName: "", 
        departmentId: "", 
        teamId: "", 
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
    if (!formData.title || !formData.deliveryDate) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกชื่องานและกำหนดวันส่งสินค้า",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "สำเร็จ",
      description: "บันทึก Job เรียบร้อยแล้ว",
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>สร้าง Job</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobNumber">เลขที่ Job</Label>
                    <Input
                      id="jobNumber"
                      value={formData.jobNumber}
                      readOnly
                      className="bg-gray-100"
                    />
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
                        {workTypes.map((workType) => (
                          <SelectItem key={workType.id} value={workType.id}>
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

            {/* Sub Jobs */}
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
              <CardContent>
                <div className="space-y-4">
                  {subJobs.map((subJob, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Sub-job ที่ {index + 1}</h4>
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
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>ชื่อสินค้า/งาน *</Label>
                          <Input
                            value={subJob.productName}
                            onChange={(e) => handleSubJobChange(index, 'productName', e.target.value)}
                            placeholder="ชื่อสินค้าหรืองาน"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>แผนก *</Label>
                          <Select 
                            value={subJob.departmentId} 
                            onValueChange={(value) => {
                              handleSubJobChange(index, 'departmentId', value);
                              handleSubJobChange(index, 'teamId', '');
                              handleSubJobChange(index, 'workStepId', '');
                            }}
                          >
                            <SelectTrigger>
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
                        </div>

                        <div className="space-y-2">
                          <Label>ทีม *</Label>
                          <Select 
                            value={subJob.teamId} 
                            onValueChange={(value) => handleSubJobChange(index, 'teamId', value)}
                            disabled={!subJob.departmentId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกทีม" />
                            </SelectTrigger>
                            <SelectContent>
                              {teams
                                .filter(team => team.departmentId === subJob.departmentId)
                                .map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>ขั้นตอน *</Label>
                          <Select 
                            value={subJob.workStepId} 
                            onValueChange={(value) => handleSubJobChange(index, 'workStepId', value)}
                            disabled={!subJob.departmentId}
                          >
                            <SelectTrigger>
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
                        </div>

                        <div className="space-y-2">
                          <Label>สี *</Label>
                          <Select 
                            value={subJob.colorId} 
                            onValueChange={(value) => handleSubJobChange(index, 'colorId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกสี" />
                            </SelectTrigger>
                            <SelectContent>
                              {colors.map((color) => (
                                <SelectItem key={color.id} value={color.id}>
                                  {color.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>ไซส์ *</Label>
                          <Select 
                            value={subJob.sizeId} 
                            onValueChange={(value) => handleSubJobChange(index, 'sizeId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกไซส์" />
                            </SelectTrigger>
                            <SelectContent>
                              {sizes.map((size) => (
                                <SelectItem key={size.id} value={size.id}>
                                  {size.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>จำนวน *</Label>
                          <Input
                            type="number"
                            value={subJob.quantity}
                            onChange={(e) => handleSubJobChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>ค่าผลิต (บาท/หน่วย) *</Label>
                          <Input
                            type="number"
                            value={subJob.productionCost}
                            onChange={(e) => handleSubJobChange(index, 'productionCost', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>ต้นทุนรวม (บาท)</Label>
                          <Input
                            value={subJob.totalCost.toLocaleString()}
                            readOnly
                            className="bg-gray-100"
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
                  <FileText className="h-5 w-5" />
                  <span>สรุป Job</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">เลขที่ Job:</span>
                    <span className="font-medium">{formData.jobNumber}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">ประเภทงาน:</span>
                    {formData.workTypeId && workTypes.find(wt => wt.id === formData.workTypeId) ? (
                      <Badge variant="default">
                        {workTypes.find(wt => wt.id === formData.workTypeId)?.name}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">ยังไม่ได้เลือก</span>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">จำนวน Sub-jobs:</span>
                    <span className="font-medium">{subJobs.length} รายการ</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>ต้นทุนรวมทั้งสิ้น:</span>
                    <span className="text-blue-600">{calculateGrandTotal().toLocaleString()} บาท</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button 
                    onClick={handleSubmit} 
                    className="w-full" 
                    size="lg"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    บันทึก Job
                  </Button>

                  <Button 
                    variant="outline" 
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