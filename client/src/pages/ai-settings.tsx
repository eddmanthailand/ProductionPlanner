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
  apiKey: z.string().optional(), // Made optional to allow persona-only updates
  persona: z.string().optional()
});

type AiConfigForm = z.infer<typeof aiConfigSchema>;

interface AiConfiguration {
  id: number;
  provider: string;
  persona?: string;
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
      apiKey: '',
      persona: 'neutral'
    }
  });

  // Query AI configuration
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
      form.reset({ provider: form.getValues('provider'), apiKey: '', persona: form.getValues('persona') });
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
      setIsTestingConnection(false);
      toast({
        title: "ทดสอบการเชื่อมต่อสำเร็จ",
        description: result.message,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "ไม่สามารถทดสอบการเชื่อมต่อได้";
      setTestResult({
        success: false,
        message: errorMessage
      });
      setIsTestingConnection(false);
      toast({
        title: "ทดสอบการเชื่อมต่อไม่สำเร็จ",
        description: errorMessage,
        variant: "destructive",
      });
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
      form.reset({ provider: 'gemini', apiKey: '', persona: 'neutral' });
      setTestResult(null);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "ไม่สามารถลบการตั้งค่าได้";
      
      toast({
        title: "เกิดข้อผิดพลาด",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: AiConfigForm) => {
    // If updating existing config and no API key provided, send current data
    if (aiConfig && !data.apiKey) {
      // For persona-only updates, we don't require the API key
      const updateData = {
        provider: data.provider || aiConfig.provider,
        persona: data.persona
      };
      saveConfigMutation.mutate(updateData);
    } else {
      // For new configs or API key updates, require all fields
      if (!data.apiKey) {
        toast({
          title: "ข้อมูลไม่ครบถ้วน",
          description: "กรุณาใส่ API Key สำหรับการตั้งค่าใหม่",
          variant: "destructive",
        });
        return;
      }
      saveConfigMutation.mutate(data);
    }
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

  // Update form when aiConfig loads
  useEffect(() => {
    if (aiConfig) {
      form.setValue('provider', aiConfig.provider);
      form.setValue('persona', aiConfig.persona || 'neutral');
    }
  }, [aiConfig, form]);

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

      {/* Tenant Information Card */}
      <Card className="mb-6 border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-blue-600" />
            ข้อมูลองค์กร
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">ชื่อองค์กร:</span>
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                {currentTenant?.name || 'กำลังโหลด...'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-xs text-gray-500">
                ระบบ BYOK (Bring Your Own Key) - API key ของคุณเป็นความลับเฉพาะองค์กรนี้เท่านั้น
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current AI Configuration */}
      {aiConfig && (
        <Card className="mb-6 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-green-700">
              <CheckCircle className="h-5 w-5" />
              การตั้งค่า AI ปัจจุบัน
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
                  <span className="text-sm text-gray-600">บุคลิก:</span>
                  <Badge variant="outline" className="text-purple-700 border-purple-300">
                    {aiConfig.persona === 'male' ? 'ชาย (เป็นมิตร)' : 
                     aiConfig.persona === 'female' ? 'หญิง (อบอุ่น)' : 
                     'เป็นกลาง (มืออาชีพ)'}
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
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  ลบการตั้งค่า
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Result */}
      {testResult && (
        <Alert className={`mb-6 ${testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
              <strong>ผลการทดสอบ:</strong> {testResult.message}
              {testResult.response && (
                <div className="mt-2 p-2 bg-white rounded border text-sm">
                  <strong>AI Response:</strong> {testResult.response}
                </div>
              )}
            </AlertDescription>
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
              <Label htmlFor="apiKey">
                API Key {aiConfig && <span className="text-xs text-gray-500">(ใส่เฉพาะเมื่อต้องการเปลี่ยน)</span>}
              </Label>
              <Input
                type="password"
                placeholder={aiConfig ? "ใส่เฉพาะเมื่อต้องการเปลี่ยน API Key" : "ใส่ API Key ของคุณ"}
                {...form.register('apiKey')}
              />
              {form.formState.errors.apiKey && (
                <p className="text-sm text-red-600">{form.formState.errors.apiKey.message}</p>
              )}
              <p className="text-xs text-gray-500">
                API Key ของคุณจะถูกเข้ารหัสอย่างปลอดภัยก่อนบันทึกในระบบ
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="persona">บุคลิก AI</Label>
              <Select
                value={form.watch('persona') || 'neutral'}
                onValueChange={(value) => form.setValue('persona', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบุคลิก AI" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neutral">เป็นกลาง (มืออาชีพ)</SelectItem>
                  <SelectItem value="male">ชาย (เป็นมิตร)</SelectItem>
                  <SelectItem value="female">หญิง (อบอุ่น)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                เลือกบุคลิกและรูปแบบการสื่อสารของ AI ที่เหมาะกับความต้องการของคุณ
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
                {saveConfigMutation.isPending ? 'กำลังบันทึก...' : (aiConfig ? 'อัปเดตการตั้งค่า' : 'บันทึกการตั้งค่า')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Information Notice */}
      <Alert className="mt-6 border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>หมายเหตุ:</strong> ระบบ Multi-tenant BYOK หมายความว่าแต่ละองค์กรจะใช้ API Key ของตนเอง 
          ข้อมูลและการตั้งค่าของคุณจะแยกจากองค์กรอื่นโดยสมบูรณ์ และถูกเข้ารหัสด้วย AES-256-GCM 
          เพื่อความปลอดภัยสูงสุด
        </AlertDescription>
      </Alert>
    </div>
  );
}