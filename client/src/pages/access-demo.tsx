import { usePageAccess } from "@/hooks/usePageAccess";
import { AccessControl, ProtectedButton } from "@/components/ui/access-control";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Plus, Trash2, Shield } from "lucide-react";

export default function AccessDemo() {
  const { user } = useAuth();
  const { accessLevel, canRead, canEdit, canCreate, canDelete } = usePageAccess("/access-demo");

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'edit': return 'bg-blue-100 text-blue-800';
      case 'read': return 'bg-yellow-100 text-yellow-800';
      case 'none': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccessLevelText = (level: string) => {
    switch (level) {
      case 'create': return 'สร้าง (ทำได้ทุกอย่าง)';
      case 'edit': return 'แก้ไข (แก้ไข + ดู)';
      case 'read': return 'ดู (ดูอย่างเดียว)';
      case 'none': return 'ไม่มีสิทธิ์';
      default: return 'ไม่ระบุ';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ทดสอบระบบสิทธิ์การเข้าถึง</h1>
          <p className="text-muted-foreground">หน้าสำหรับทดสอบการทำงานของระบบตรวจสอบสิทธิ์ตามลำดับชั้น</p>
        </div>
      </div>

      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>ข้อมูลผู้ใช้ปัจจุบัน</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>ชื่อผู้ใช้:</strong> {user?.firstName} {user?.lastName}</p>
            <p><strong>บทบาท:</strong> ID {user?.roleId}</p>
            <p className="flex items-center space-x-2">
              <strong>สิทธิ์สำหรับหน้านี้:</strong>
              <Badge className={getAccessLevelColor(accessLevel)}>
                {getAccessLevelText(accessLevel)}
              </Badge>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Permission Testing */}
      <Card>
        <CardHeader>
          <CardTitle>ทดสอบการตรวจสอบสิทธิ์</CardTitle>
          <CardDescription>
            ระบบจะแสดงปุ่มและฟังก์ชันต่างๆ ตามระดับสิทธิ์ของคุณ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Permission Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`p-4 rounded-lg ${canRead() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <Eye className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">ดู</p>
                  <p className="text-xs">{canRead() ? 'อนุญาต' : 'ไม่อนุญาต'}</p>
                </div>
              </div>
              <div className="text-center">
                <div className={`p-4 rounded-lg ${canEdit() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <Edit className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">แก้ไข</p>
                  <p className="text-xs">{canEdit() ? 'อนุญาต' : 'ไม่อนุญาต'}</p>
                </div>
              </div>
              <div className="text-center">
                <div className={`p-4 rounded-lg ${canCreate() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <Plus className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">สร้าง</p>
                  <p className="text-xs">{canCreate() ? 'อนุญาต' : 'ไม่อนุญาต'}</p>
                </div>
              </div>
              <div className="text-center">
                <div className={`p-4 rounded-lg ${canDelete() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <Trash2 className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">ลบ</p>
                  <p className="text-xs">{canDelete() ? 'อนุญาต' : 'ไม่อนุญาต'}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <h4 className="font-medium">ปุ่มทดสอบการทำงาน:</h4>
              
              <div className="flex flex-wrap gap-2">
                <AccessControl requiredLevel="read">
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>ดูข้อมูล</span>
                  </Button>
                </AccessControl>

                <AccessControl 
                  requiredLevel="edit" 
                  fallback={
                    <Button variant="outline" disabled className="flex items-center space-x-2 opacity-50">
                      <Edit className="w-4 h-4" />
                      <span>แก้ไขข้อมูล (ไม่มีสิทธิ์)</span>
                    </Button>
                  }
                >
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Edit className="w-4 h-4" />
                    <span>แก้ไขข้อมูล</span>
                  </Button>
                </AccessControl>

                <ProtectedButton
                  requiredLevel="create"
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  onClick={() => alert('สร้างข้อมูลใหม่!')}
                >
                  <Plus className="w-4 h-4" />
                  <span>สร้างใหม่</span>
                </ProtectedButton>

                <ProtectedButton
                  requiredLevel="create"
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  onClick={() => alert('ลบข้อมูล!')}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ลบ</span>
                </ProtectedButton>
              </div>
            </div>

            {/* Permission Explanation */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium mb-2">คำอธิบายระบบสิทธิ์:</h5>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• <strong>สร้าง:</strong> ทำได้ทุกอย่าง (สร้าง, แก้ไข, ดู, ลบ)</li>
                <li>• <strong>แก้ไข:</strong> แก้ไขและดูได้ (ไม่สามารถสร้างหรือลบ)</li>
                <li>• <strong>ดู:</strong> ดูอย่างเดียว (ไม่สามารถแก้ไข, สร้าง, หรือลบ)</li>
                <li>• <strong>ไม่มีสิทธิ์:</strong> ไม่สามารถเข้าถึงได้เลย</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Content */}
      <AccessControl 
        requiredLevel="read"
        fallback={
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">คุณไม่มีสิทธิ์ในการดูเนื้อหานี้</p>
            </CardContent>
          </Card>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>เนื้อหาทดสอบ</CardTitle>
            <CardDescription>เนื้อหานี้จะแสดงเฉพาะผู้ที่มีสิทธิ์ "ดู" ขึ้นไป</CardDescription>
          </CardHeader>
          <CardContent>
            <p>นี่คือเนื้อหาที่ต้องมีสิทธิ์อย่างน้อยระดับ "ดู" เพื่อเข้าถึง</p>
            
            <AccessControl 
              requiredLevel="edit"
              fallback={<p className="text-gray-500 mt-4">ส่วนแก้ไขซ่อนอยู่ (ต้องมีสิทธิ์ "แก้ไข")</p>}
            >
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <p className="text-blue-800">ส่วนนี้แสดงเฉพาะผู้ที่มีสิทธิ์ "แก้ไข" ขึ้นไป</p>
              </div>
            </AccessControl>

            <AccessControl 
              requiredLevel="create"
              fallback={<p className="text-gray-500 mt-4">ส่วนจัดการซ่อนอยู่ (ต้องมีสิทธิ์ "สร้าง")</p>}
            >
              <div className="mt-4 p-3 bg-green-50 rounded">
                <p className="text-green-800">ส่วนนี้แสดงเฉพาะผู้ที่มีสิทธิ์ "สร้าง" (ทำได้ทุกอย่าง)</p>
              </div>
            </AccessControl>
          </CardContent>
        </Card>
      </AccessControl>
    </div>
  );
}