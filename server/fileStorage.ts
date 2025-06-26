import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

export interface FileInfo {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  fileUrl: string;
}

export interface FileStorageService {
  upload(file: multer.File, workOrderId: string): Promise<FileInfo>;
  download(storagePath: string): Promise<Buffer>;
  delete(storagePath: string): Promise<boolean>;
  getFileUrl(storagePath: string): string;
}

export class LocalFileStorage implements FileStorageService {
  private baseUploadPath = './uploads/work-orders';

  constructor() {
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.baseUploadPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  async upload(file: multer.File, workOrderId: string): Promise<FileInfo> {
    try {
      // สร้าง directory สำหรับ work order
      const workOrderDir = path.join(this.baseUploadPath, workOrderId);
      await fs.mkdir(workOrderDir, { recursive: true });

      // สร้างชื่อไฟล์ใหม่เพื่อป้องกันการซ้ำ
      const fileExtension = path.extname(file.originalname);
      const fileName = `${nanoid()}_${Date.now()}${fileExtension}`;
      const storagePath = path.join(workOrderId, fileName);
      const fullPath = path.join(this.baseUploadPath, storagePath);

      // เขียนไฟล์ลงดิสก์
      await fs.writeFile(fullPath, file.buffer);

      const fileInfo: FileInfo = {
        id: nanoid(),
        fileName,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storagePath,
        fileUrl: this.getFileUrl(storagePath)
      };

      return fileInfo;
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  async download(storagePath: string): Promise<Buffer> {
    try {
      const fullPath = path.join(this.baseUploadPath, storagePath);
      return await fs.readFile(fullPath);
    } catch (error) {
      console.error('File download error:', error);
      throw new Error('Failed to download file');
    }
  }

  async delete(storagePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseUploadPath, storagePath);
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      console.error('File delete error:', error);
      return false;
    }
  }

  getFileUrl(storagePath: string): string {
    return `/api/files/${encodeURIComponent(storagePath)}`;
  }

  async fileExists(storagePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseUploadPath, storagePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

// Factory function สำหรับสร้าง storage service
export function createFileStorageService(type: string = 'local'): FileStorageService {
  switch (type) {
    case 'local':
      return new LocalFileStorage();
    // สำหรับอนาคต
    // case 'google_cloud':
    //   return new GoogleCloudStorage();
    // case 'aws_s3':
    //   return new AWSStorage();
    default:
      return new LocalFileStorage();
  }
}

export const fileStorageService = createFileStorageService();