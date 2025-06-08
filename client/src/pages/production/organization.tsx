import { useState } from "react";
import { Network, Users, Settings, Plus, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Department {
  id: string;
  name: string;
  type: "production" | "quality" | "management" | "support";
  manager: string;
  location: string;
  status: "active" | "maintenance" | "inactive";
  teams: Team[];
  workSteps: WorkStep[];
}

interface Team {
  id: string;
  name: string;
  departmentId: string;
  leader: string;
  employees: Employee[];
  status: "active" | "inactive";
}

interface Employee {
  id: string;
  name: string;
  position: string;
  skill: string[];
  status: "available" | "busy" | "break" | "absent";
  workload: number;
}

interface WorkStep {
  id: string;
  name: string;
  departmentId: string;
  description: string;
  duration: number; // minutes
  requiredSkills: string[];
  order: number;
}

export default function OrganizationChart() {
  const [departments] = useState<Department[]>([
    {
      id: "dept-production",
      name: "แผนกผลิต",
      type: "production",
      manager: "สมชาย วิทยากุล",
      location: "ชั้น 1 - โซน A",
      status: "active",
      teams: [
        {
          id: "team-cutting",
          name: "ทีมตัดผ้า",
          departmentId: "dept-production",
          leader: "สมหญิง จันทร์ดี",
          status: "active",
          employees: [
            { id: "emp1", name: "สมหญิง จันทร์ดี", position: "หัวหน้าทีมตัด", skill: ["การตัดผ้า", "การวัดขนาด"], status: "busy", workload: 85 },
            { id: "emp2", name: "มานะ ช่างตัด", position: "ช่างตัด", skill: ["การตัดผ้า"], status: "available", workload: 60 }
          ]
        },
        {
          id: "team-sewing",
          name: "ทีมเย็บ",
          departmentId: "dept-production",
          leader: "สมศักดิ์ แสงทอง",
          status: "active",
          employees: [
            { id: "emp3", name: "สมศักดิ์ แสงทอง", position: "หัวหน้าทีมเย็บ", skill: ["เย็บผ้า", "การติดซิป"], status: "available", workload: 75 },
            { id: "emp4", name: "สมปอง เหลืองทอง", position: "ช่างโอเวอร์ล็อค", skill: ["โอเวอร์ล็อค", "การแก้ไข"], status: "busy", workload: 90 },
            { id: "emp5", name: "วันดี เย็บเก่ง", position: "ช่างเย็บ", skill: ["เย็บผ้า"], status: "available", workload: 55 }
          ]
        }
      ],
      workSteps: [
        { id: "step1", name: "วัดและตัดผ้า", departmentId: "dept-production", description: "วัดขนาดและตัดผ้าตามแบบ", duration: 30, requiredSkills: ["การตัดผ้า", "การวัดขนาด"], order: 1 },
        { id: "step2", name: "เย็บชิ้นส่วนหลัก", departmentId: "dept-production", description: "เย็บชิ้นส่วนหลักของเสื้อผ้า", duration: 45, requiredSkills: ["เย็บผ้า"], order: 2 },
        { id: "step3", name: "ติดซิปและกระดุม", departmentId: "dept-production", description: "ติดซิปและกระดุมตามแบบ", duration: 20, requiredSkills: ["การติดซิป"], order: 3 },
        { id: "step4", name: "โอเวอร์ล็อคขอบ", departmentId: "dept-production", description: "โอเวอร์ล็อคขอบผ้าให้เรียบร้อย", duration: 25, requiredSkills: ["โอเวอร์ล็อค"], order: 4 }
      ]
    },
    {
      id: "dept-quality",
      name: "แผนกควบคุมคุณภาพ",
      type: "quality",
      manager: "สุภาพร คุณวงษ์",
      location: "ชั้น 1 - โซน B",
      status: "active",
      teams: [
        {
          id: "team-inspection",
          name: "ทีมตรวจสอบ",
          departmentId: "dept-quality",
          leader: "อัญชลี สีขาว",
          status: "active",
          employees: [
            { id: "emp6", name: "อัญชลี สีขาว", position: "หัวหน้า QC", skill: ["ตรวจสอบคุณภาพ", "การรายงาน"], status: "available", workload: 70 },
            { id: "emp7", name: "พิมพ์ใจ น้ำใส", position: "เจ้าหน้าที่ QC", skill: ["ตรวจสอบสินค้า"], status: "busy", workload: 80 }
          ]
        }
      ],
      workSteps: [
        { id: "step5", name: "ตรวจสอบขนาด", departmentId: "dept-quality", description: "ตรวจสอบขนาดสินค้าให้ตรงตามมาตรฐาน", duration: 10, requiredSkills: ["ตรวจสอบคุณภาพ"], order: 1 },
        { id: "step6", name: "ตรวจสอบคุณภาพการเย็บ", departmentId: "dept-quality", description: "ตรวจสอบคุณภาพการเย็บและความเรียบร้อย", duration: 15, requiredSkills: ["ตรวจสอบคุณภาพ"], order: 2 },
        { id: "step7", name: "ตรวจสอบสีและลวดลาย", departmentId: "dept-quality", description: "ตรวจสอบสีและลวดลายให้ตรงตามออเดอร์", duration: 8, requiredSkills: ["ตรวจสอบสินค้า"], order: 3 }
      ]
    },
    {
      id: "dept-maintenance",
      name: "แผนกบำรุงรักษา",
      type: "support",
      manager: "วิชัย เครื่องใหม่",
      location: "ชั้นล่าง - ห้องเครื่องจักร",
      status: "active",
      teams: [
        {
          id: "team-maintenance",
          name: "ทีมซ่อมบำรุง",
          departmentId: "dept-maintenance",
          leader: "สมคิด ช่างเก่ง",
          status: "active",
          employees: [
            { id: "emp8", name: "สมคิด ช่างเก่ง", position: "หัวหน้าช่างเทคนิค", skill: ["ซ่อมเครื่องจักร", "การบำรุงรักษา"], status: "available", workload: 45 },
            { id: "emp9", name: "ชาตรี ไฟฟ้า", position: "ช่างไฟฟ้า", skill: ["ระบบไฟฟ้า", "มอเตอร์"], status: "break", workload: 30 }
          ]
        }
      ],
      workSteps: [
        { id: "step8", name: "ตรวจสอบเครื่องจักรประจำวัน", departmentId: "dept-maintenance", description: "ตรวจสอบสภาพเครื่องจักรก่อนเริ่มงาน", duration: 20, requiredSkills: ["การบำรุงรักษา"], order: 1 },
        { id: "step9", name: "บำรุงรักษาเครื่องจักร", departmentId: "dept-maintenance", description: "ทำความสะอาดและหล่อลื่นเครื่องจักร", duration: 60, requiredSkills: ["ซ่อมเครื่องจักร"], order: 2 },
        { id: "step10", name: "ซ่อมแซมเครื่องจักร", departmentId: "dept-maintenance", description: "ซ่อมแซมเครื่องจักรที่ชำรุด", duration: 120, requiredSkills: ["ซ่อมเครื่องจักร", "ระบบไฟฟ้า"], order: 3 }
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
                <p className="text-sm font-medium text-gray-600">จำนวนทีม</p>
                <p className="text-2xl font-bold text-gray-900">
                  {departments.reduce((total, dept) => total + dept.teams.length, 0)}
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
                <p className="text-sm font-medium text-gray-600">พนักงานทั้งหมด</p>
                <p className="text-2xl font-bold text-green-600">
                  {departments.reduce((total, dept) => 
                    total + dept.teams.reduce((teamTotal, team) => teamTotal + team.employees.length, 0), 0
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
                <p className="text-sm font-medium text-gray-600">ขั้นตอนงานทั้งหมด</p>
                <p className="text-2xl font-bold text-orange-600">
                  {departments.reduce((total, dept) => total + dept.workSteps.length, 0)}
                </p>
              </div>
              <Settings className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Cards */}
      <div className="space-y-8">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Teams Section */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">ทีมงาน ({department.teams.length} ทีม)</h3>
                  <div className="space-y-4">
                    {department.teams.map(team => (
                      <div key={team.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">{team.name}</h4>
                          <Badge className={getStatusColor(team.status)}>
                            {team.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">หัวหน้าทีม: {team.leader}</p>
                        
                        <div className="space-y-2">
                          {team.employees.map(employee => (
                            <div key={employee.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{employee.name}</span>
                                  <Badge className={getStatusColor(employee.status)} variant="outline">
                                    {employee.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600">{employee.position}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-medium text-gray-900">
                                  {employee.workload}%
                                </div>
                                <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-300 ${getWorkloadColor(employee.workload)}`}
                                    style={{ width: `${employee.workload}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Work Steps Section */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">ขั้นตอนงาน ({department.workSteps.length} ขั้นตอน)</h3>
                  <div className="space-y-3">
                    {department.workSteps
                      .sort((a, b) => a.order - b.order)
                      .map(step => (
                        <div key={step.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                                {step.order}
                              </span>
                              <h4 className="font-medium text-gray-900">{step.name}</h4>
                            </div>
                            <span className="text-xs text-gray-500">{step.duration} นาที</span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                          
                          <div className="flex flex-wrap gap-1">
                            {step.requiredSkills.map(skill => (
                              <span key={skill} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6 pt-4 border-t">
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มทีม
                </Button>
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มขั้นตอนงาน
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
                    <p className="text-xs text-gray-500 mt-1">
                      {dept.teams.reduce((total, team) => total + team.employees.length, 0)} คน
                    </p>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    {dept.teams.map(team => (
                      <div key={team.id} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium">{team.name}</div>
                        <div className="text-gray-600 text-xs">หัวหน้า: {team.leader}</div>
                        <div className="text-gray-500 text-xs">{team.employees.length} คน</div>
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