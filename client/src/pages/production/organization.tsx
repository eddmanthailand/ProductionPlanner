import { useState } from "react";
import { Network, Users, Settings, Plus, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Department {
  id: string;
  name: string;
  type: "production" | "quality" | "management" | "support";
  employees: Employee[];
  manager: string;
  location: string;
  status: "active" | "maintenance" | "inactive";
}

interface Employee {
  id: string;
  name: string;
  position: string;
  skill: string[];
  status: "available" | "busy" | "break" | "absent";
  workload: number;
}

export default function OrganizationChart() {
  const [departments] = useState<Department[]>([
    {
      id: "prod-a",
      name: "ทีมผลิต A",
      type: "production",
      manager: "สมชาย วิทยากุล",
      location: "ชั้น 1 - โซน A",
      status: "active",
      employees: [
        { id: "emp1", name: "สมหญิง จันทร์ดี", position: "ช่างตัด", skill: ["การตัดผ้า", "การวัดขนาด"], status: "busy", workload: 85 },
        { id: "emp2", name: "สมศักดิ์ แสงทอง", position: "ช่างเย็บ", skill: ["เย็บผ้า", "การติดซิป"], status: "available", workload: 60 },
        { id: "emp3", name: "สมปอง เหลืองทอง", position: "ช่างโอเวอร์ล็อค", skill: ["โอเวอร์ล็อค", "การแก้ไข"], status: "busy", workload: 90 },
      ]
    },
    {
      id: "qual-1",
      name: "ทีมควบคุมคุณภาพ",
      type: "quality",
      manager: "สุภาพร คุณวงษ์",
      location: "ชั้น 1 - โซน B",
      status: "active",
      employees: [
        { id: "emp4", name: "อัญชลี สีขาว", position: "หัวหน้า QC", skill: ["ตรวจสอบคุณภาพ", "การรายงาน"], status: "available", workload: 70 },
        { id: "emp5", name: "พิมพ์ใจ น้ำใส", position: "เจ้าหน้าที่ QC", skill: ["ตรวจสอบสินค้า"], status: "busy", workload: 80 },
      ]
    },
    {
      id: "maint-1",
      name: "ทีมบำรุงรักษา",
      type: "support",
      manager: "วิชัย เครื่องใหม่",
      location: "ชั้นล่าง - ห้องเครื่องจักร",
      status: "active",
      employees: [
        { id: "emp6", name: "สมคิด ช่างเก่ง", position: "ช่างเทคนิค", skill: ["ซ่อมเครื่องจักร", "การบำรุงรักษา"], status: "available", workload: 45 },
        { id: "emp7", name: "ชาตรี ไฟฟ้า", position: "ช่างไฟฟ้า", skill: ["ระบบไฟฟ้า", "มอเตอร์"], status: "break", workload: 30 },
      ]
    }
  ]);

  const getDepartmentTypeColor = (type: string) => {
    switch (type) {
      case "production": return "bg-blue-100 text-blue-800";
      case "quality": return "bg-green-100 text-green-800";
      case "management": return "bg-purple-100 text-purple-800";
      case "support": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "maintenance": return "bg-yellow-100 text-yellow-800";
      case "inactive": return "bg-red-100 text-red-800";
      case "available": return "bg-green-100 text-green-800";
      case "busy": return "bg-red-100 text-red-800";
      case "break": return "bg-yellow-100 text-yellow-800";
      case "absent": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getWorkloadColor = (workload: number) => {
    if (workload >= 80) return "bg-red-500";
    if (workload >= 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Network className="w-8 h-8 text-blue-600" />
            แผนผังหน่วยงาน
          </h1>
          <p className="text-gray-600 mt-1">จัดการโครงสร้างองค์กรและทรัพยากรบุคคล</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มแผนก
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">จำนวนแผนก</p>
                <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
              </div>
              <Network className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">พนักงานทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">
                  {departments.reduce((total, dept) => total + dept.employees.length, 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">พนักงานที่ว่าง</p>
                <p className="text-2xl font-bold text-green-600">
                  {departments.reduce((total, dept) => 
                    total + dept.employees.filter(emp => emp.status === 'available').length, 0
                  )}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">อัตราการใช้งาน</p>
                <p className="text-2xl font-bold text-orange-600">
                  {Math.round(departments.reduce((total, dept) => 
                    total + dept.employees.reduce((sum, emp) => sum + emp.workload, 0), 0
                  ) / departments.reduce((total, dept) => total + dept.employees.length, 0))}%
                </p>
              </div>
              <Settings className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {departments.map(department => (
          <Card key={department.id} className="overflow-hidden">
            <CardHeader className="bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {department.name}
                    <Badge className={getDepartmentTypeColor(department.type)}>
                      {department.type}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    หัวหน้า: {department.manager} | {department.location}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(department.status)}>
                    {department.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">พนักงาน ({department.employees.length} คน)</span>
                  <span className="text-gray-500">ภาระงาน</span>
                </div>
                
                {department.employees.map(employee => (
                  <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{employee.name}</h4>
                        <Badge className={getStatusColor(employee.status)}>
                          {employee.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{employee.position}</p>
                      <div className="flex flex-wrap gap-1">
                        {employee.skill.map(skill => (
                          <span key={skill} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {employee.workload}%
                      </div>
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${getWorkloadColor(employee.workload)}`}
                          style={{ width: `${employee.workload}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" className="w-full mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มพนักงาน
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Organization Tree View */}
      <Card>
        <CardHeader>
          <CardTitle>โครงสร้างองค์กร</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-block p-4 bg-purple-100 rounded-lg">
                <h3 className="font-bold text-purple-800">ผู้จัดการโรงงาน</h3>
                <p className="text-sm text-purple-600">อำนาจ ใจดี</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {departments.map(dept => (
                <div key={dept.id} className="text-center">
                  <div className="inline-block p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <h4 className="font-semibold text-blue-800">{dept.name}</h4>
                    <p className="text-sm text-blue-600">{dept.manager}</p>
                    <p className="text-xs text-gray-500 mt-1">{dept.employees.length} คน</p>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    {dept.employees.map(emp => (
                      <div key={emp.id} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-gray-600 text-xs">{emp.position}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}