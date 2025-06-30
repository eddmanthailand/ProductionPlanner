import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, Key, CheckCircle, AlertCircle, TestTube, Trash2, Building2, Shield, Info } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';

// Validation schema for AI configuration
const aiConfigSchema = z.object({
  provider: z.string().min(1, "กรุณาเลือก AI Provider"),
  apiKey: z.string().min(1, "กรุณาใส่ API Key").min(10, "API Key ต้องมีความยาวอย่างน้อย 10 ตัวอักษร")
});

type AiConfigForm = z.infer<typeof aiConfigSchema>;

interface AiConfiguration {
  id: number;
  provider: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiError {
  message: string;
  error?: string;
}

export default function AiSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; response?: string } | null>(null);

  const form = useForm<AiConfigForm>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      provider: 'gemini',
      apiKey: ''
    }
  });

  // Query to get current AI configuration
  const { data: aiConfig, isLoading: isLoadingConfig } = useQuery<AiConfiguration>({
    queryKey: ['/api/integrations/ai'],
    retry: false,
  });

  // Query to get tenant information
  const { data: tenants = [] } = useQuery<any[]>({
    queryKey: ['/api/tenants'],
    retry: false,
  });

  // Save AI configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: (data: AiConfigForm) => 
      apiRequest('POST', '/api/integrations/ai', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/ai'] });
      toast({
        title: "สำเร็จ",
        description: "บันทึกการตั้งค่า AI เรียบร้อยแล้ว",
      });
      form.reset({ provider: form.getValues('provider'), apiKey: '' });
      setTestResult(null);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "ไม่สามารถบันทึกการตั้งค่าได้";
      
      toast({
        title: "เกิดข้อผิดพลาด",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Test AI connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/integrations/ai/test', {}),
    onSuccess: (result: any) => {
      setTestResult({
        success: true,
        message: result.message,
        response: result.testResponse
      });
      toast({
        title: "การทดสอบสำเร็จ",
        description: "การเชื่อมต่อ AI ทำงานได้ปกติ",
      });
    },
    onError: (error: any) => {
      setTestResult({
        success: false,
        message: error.message || "การทดสอบไม่สำเร็จ"
      });
      toast({
        title: "การทดสอบไม่สำเร็จ",
        description: error.message || "ไม่สามารถเชื่อมต่อ AI ได้",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsTestingConnection(false);
    }
  });

  // Delete AI configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', '/api/integrations/ai', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/ai'] });
      toast({
        title: "สำเร็จ",
        description: "ลบการตั้งค่า AI เรียบร้อยแล้ว",
      });
      setTestResult(null);
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถลบการตั้งค่าได้",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: AiConfigForm) => {
    saveConfigMutation.mutate(data);
  };

  const handleTestConnection = () => {
    if (!aiConfig) {
      toast({
        title: "ไม่พบการตั้งค่า",
        description: "กรุณาบันทึกการตั้งค่า AI ก่อนทดสอบ",
        variant: "destructive",
      });
      return;
    }
    setIsTestingConnection(true);
    setTestResult(null);
    testConnectionMutation.mutate();
  };

  const handleDeleteConfig = () => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบการตั้งค่า AI นี้?')) {
      deleteConfigMutation.mutate();
    }
  };

  // Get current tenant info
  const currentTenant = (tenants as any[]).find((t: any) => t.id === user?.tenantId);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">การตั้งค่า AI</h1>
        </div>
        <p className="text-gray-600">
          จัดการการเชื่อมต่อ AI สำหรับระบบ Chatbot และคุณสมบัติอื่นๆ (Multi-tenant BYOK)
        </p>
      </div>

      {/* Tenant Information */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Building2 className="h-5 w-5" />
            ข้อมูลองค์กร (Tenant)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">ชื่อองค์กร:</span>
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  {currentTenant?.name || 'ไม่ระบุ'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">ผู้ใช้งาน:</span>
                <span className="text-sm font-medium text-gray-800">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Tenant ID:</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {user?.tenantId?.substring(0, 8)}...
                </code>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-700 font-medium">
                  ข้อมูลแยกต่างหากและปลอดภัย
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert className="mb-6 border-amber-200 bg-amber-50">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>BYOK (Bring Your Own Key):</strong> API Key ของคุณจะถูกเข้ารหัสด้วย AES-256-GCM และจัดเก็บแยกตาม Tenant 
          ไม่มีการใช้งานร่วมกับองค์กรอื่น รับประกันความปลอดภัยสูงสุด
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {/* Current Configuration Status */}
        {aiConfig && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                การตั้งค่า AI ขององค์กรนี้
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">AI Provider:</span>
                    <Badge variant="outline" className="capitalize">
                      {aiConfig.provider}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">สถานะ:</span>
                    <Badge variant={aiConfig.isActive ? "default" : "secondary"}>
                      {aiConfig.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">เฉพาะ Tenant:</span>
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      {currentTenant?.name || 'องค์กรนี้'}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    อัปเดตล่าสุด: {new Date(aiConfig.updatedAt).toLocaleString('th-TH')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleTestConnection}
                    disabled={isTestingConnection || testConnectionMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    {isTestingConnection ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
                  </Button>
                  <Button
                    onClick={handleDeleteConfig}
                    disabled={deleteConfigMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    ลบการตั้งค่า
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Results */}
        {testResult && (
          <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <div className="flex items-start gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <AlertDescription>
                  <div className="font-medium mb-1">
                    {testResult.success ? "การทดสอบสำเร็จ" : "การทดสอบไม่สำเร็จ"}
                  </div>
                  <div className="text-sm">{testResult.message}</div>
                  {testResult.response && (
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                      <strong>การตอบกลับจาก AI:</strong><br />
                      {testResult.response}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              {aiConfig ? 'อัปเดตการตั้งค่า AI' : 'ตั้งค่า AI ใหม่'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">AI Provider</Label>
                <Select
                  value={form.watch('provider')}
                  onValueChange={(value) => form.setValue('provider', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือก AI Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai" disabled>
                      OpenAI (เร็วๆ นี้)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.provider && (
                  <p className="text-sm text-red-600">{form.formState.errors.provider.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  type="password"
                  placeholder="ใส่ API Key ของคุณ"
                  {...form.register('apiKey')}
                />
                {form.formState.errors.apiKey && (
                  <p className="text-sm text-red-600">{form.formState.errors.apiKey.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  API Key ของคุณจะถูกเข้ารหัสอย่างปลอดภัยก่อนบันทึกในระบบ
                </p>
              </div>

              <Separator />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={saveConfigMutation.isPending}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={saveConfigMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saveConfigMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">ข้อมูลสำคัญ</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700">
            <ul className="space-y-2 text-sm">
              <li>• การตั้งค่านี้จะใช้สำหรับระบบ AI Chatbot และคุณสมบัติอื่นๆ ที่เกี่ยวข้อง</li>
              <li>• API Key ของคุณจะถูกเข้ารหัสด้วยระบบความปลอดภัยระดับ Enterprise</li>
              <li>• สำหรับ Google Gemini: ไปที่ <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a> เพื่อสร้าง API Key</li>
              <li>• คุณสามารถทดสอบการเชื่อมต่อได้ทันทีหลังจากบันทึกการตั้งค่า</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}