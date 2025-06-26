import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, FileText, Image, Download, Trash2, File } from "lucide-react";
import { WorkOrderAttachment } from "@shared/schema";

interface WorkOrderAttachmentsProps {
  workOrderId: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <Image className="h-5 w-5" />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="h-5 w-5" />;
  }
  return <File className="h-5 w-5" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function WorkOrderAttachments({ workOrderId }: WorkOrderAttachmentsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ดึงรายการไฟล์แนบ
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["/api/work-orders", workOrderId, "attachments"],
    queryFn: async () => {
      const response = await fetch(`/api/work-orders/${workOrderId}/attachments`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch attachments');
      }
      return response.json();
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, description }: { file: File; description: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', description);

      const response = await fetch(`/api/work-orders/${workOrderId}/attachments`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'การอัปโหลดล้มเหลว');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "attachments"] });
      setDescription("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast({
        title: "สำเร็จ",
        description: "อัปโหลดไฟล์เรียบร้อยแล้ว",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const response = await fetch(`/api/work-orders/${workOrderId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete attachment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "attachments"] });
      toast({
        title: "สำเร็จ",
        description: "ลบไฟล์แนบเรียบร้อยแล้ว",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบไฟล์ได้",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ตรวจสอบขนาดไฟล์ (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "ไฟล์ใหญ่เกินไป",
        description: "ขนาดไฟล์ต้องไม่เกิน 50MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync({ file, description });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (attachment: WorkOrderAttachment) => {
    try {
      const response = await fetch(`${attachment.fileUrl}?id=${attachment.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('ไม่สามารถดาวน์โหลดไฟล์ได้');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = attachment.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดาวน์โหลดไฟล์ได้",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (confirm("คุณต้องการลบไฟล์แนบนี้หรือไม่?")) {
      await deleteMutation.mutateAsync(attachmentId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          เอกสารแนบ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="space-y-3">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="file">เลือกไฟล์</Label>
            <Input
              id="file"
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              disabled={isUploading}
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            />
          </div>
          
          <div className="grid w-full gap-1.5">
            <Label htmlFor="description">รายละเอียด (ไม่บังคับ)</Label>
            <Textarea
              id="description"
              placeholder="อธิบายไฟล์แนบ..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
            />
          </div>

          <div className="text-sm text-gray-500">
            ประเภทไฟล์ที่รองรับ: JPG, PNG, PDF, Word, Excel, CSV, TXT (ขนาดไม่เกิน 50MB)
          </div>
        </div>

        {/* Attachments List */}
        <div className="space-y-2">
          <h4 className="font-medium">ไฟล์แนบ ({attachments.length})</h4>
          
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">กำลังโหลด...</div>
          ) : attachments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
              ยังไม่มีไฟล์แนบ
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment: WorkOrderAttachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getFileIcon(attachment.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.originalName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.fileSize)} • 
                        {new Date(attachment.createdAt!).toLocaleDateString('th-TH')}
                      </p>
                      {attachment.description && (
                        <p className="text-xs text-gray-600 mt-1">
                          {attachment.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(attachment.id)}
                      disabled={deleteMutation.isPending}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}