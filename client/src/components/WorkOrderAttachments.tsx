import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, FileText, Image, Download, Trash2, File, Eye } from "lucide-react";
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
  const [previewFile, setPreviewFile] = useState<WorkOrderAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ดึงรายการไฟล์แนบ
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: [`/api/work-orders/${workOrderId}/attachments`],
    queryFn: async () => {
      const response = await fetch(`/api/work-orders/${workOrderId}/attachments`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch attachments');
      }
      return response.json();
    },
    enabled: !!workOrderId,
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
      queryClient.invalidateQueries({ queryKey: [`/api/work-orders/${workOrderId}/attachments`] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/work-orders/${workOrderId}/attachments`] });
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

  // ตรวจสอบว่าไฟล์สามารถ preview ได้หรือไม่
  const canPreview = (mimeType: string) => {
    return (
      mimeType.startsWith('image/') ||
      mimeType === 'application/pdf' ||
      mimeType.startsWith('text/')
    );
  };

  // แสดง preview content ตามประเภทไฟล์
  const renderPreviewContent = (attachment: WorkOrderAttachment) => {
    const { mimeType, fileUrl, originalName } = attachment;

    if (!fileUrl) {
      return (
        <div className="text-center py-8 text-gray-500">
          <File className="h-16 w-16 mx-auto mb-2 opacity-50" />
          <p>ไม่สามารถโหลดไฟล์ได้</p>
        </div>
      );
    }

    if (mimeType.startsWith('image/')) {
      return (
        <div className="flex justify-center">
          <img
            src={fileUrl}
            alt={originalName}
            className="max-w-full max-h-96 object-contain rounded-lg"
          />
        </div>
      );
    }

    if (mimeType === 'application/pdf') {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-96 border rounded-lg"
          title={`PDF: ${originalName}`}
        />
      );
    }

    if (mimeType.startsWith('text/')) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg">
          <iframe
            src={fileUrl}
            className="w-full h-64 border-0"
            title={`Text: ${originalName}`}
          />
        </div>
      );
    }

    return (
      <div className="text-center py-8 text-gray-500">
        <File className="h-16 w-16 mx-auto mb-2 opacity-50" />
        <p>ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้</p>
        <p className="text-sm">กรุณาดาวน์โหลดไฟล์เพื่อดูเนื้อหา</p>
      </div>
    );
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

        {/* Attachments List - ตารางแสดงรายการไฟล์แนบ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-lg">รายการไฟล์แนบ</h4>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {attachments.length} ไฟล์
            </span>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              กำลังโหลดข้อมูลไฟล์แนบ...
            </div>
          ) : attachments.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              <Upload className="h-16 w-16 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium mb-1">ยังไม่มีไฟล์แนบ</p>
              <p className="text-sm">อัปโหลดไฟล์เพื่อแนบกับใบสั่งงานนี้</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 px-4 py-3 border-b font-medium text-sm text-gray-700 grid grid-cols-12 gap-3">
                <div className="col-span-1 text-center">ประเภท</div>
                <div className="col-span-3">ชื่อไฟล์</div>
                <div className="col-span-2">ขนาด</div>
                <div className="col-span-2">วันที่อัปโหลด</div>
                <div className="col-span-2">รายละเอียด</div>
                <div className="col-span-2 text-center">จัดการ</div>
              </div>
              
              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {attachments.map((attachment: WorkOrderAttachment) => (
                  <div
                    key={attachment.id}
                    className="px-4 py-3 hover:bg-gray-50 grid grid-cols-12 gap-3 items-center"
                  >
                    <div className="col-span-1 flex justify-center">
                      {getFileIcon(attachment.mimeType)}
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm font-medium truncate" title={attachment.originalName}>
                        {attachment.originalName}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-600">
                        {formatFileSize(attachment.fileSize)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-600">
                        {new Date(attachment.createdAt!).toLocaleDateString('th-TH', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="col-span-2">
                      {attachment.description ? (
                        <p className="text-xs text-gray-600 truncate" title={attachment.description}>
                          {attachment.description}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>
                    <div className="col-span-2 flex justify-center space-x-1">
                      {canPreview(attachment.mimeType) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewFile(attachment)}
                          className="h-7 w-7 p-0"
                          title="ดูตัวอย่าง"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(attachment)}
                        className="h-7 w-7 p-0"
                        title="ดาวน์โหลด"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(attachment.id)}
                        disabled={deleteMutation.isPending}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                        title="ลบ"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview Dialog */}
        {previewFile && (
          <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  ตัวอย่างไฟล์: {previewFile.originalName}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                {renderPreviewContent(previewFile)}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <strong>ขนาดไฟล์:</strong> {formatFileSize(previewFile.fileSize)}
                  </div>
                  <div>
                    <strong>วันที่อัปโหลด:</strong>{' '}
                    {new Date(previewFile.createdAt!).toLocaleDateString('th-TH', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  {previewFile.description && (
                    <div className="col-span-2">
                      <strong>รายละเอียด:</strong> {previewFile.description}
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}