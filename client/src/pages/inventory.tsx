import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, AlertTriangle, CheckCircle, Wrench, Box, Archive } from "lucide-react";

interface Product {
  id: number;
  name: string;
  description?: string;
  sku: string;
  type: "service" | "non_stock_product" | "stock_product";
  price?: number;
  cost?: number;
  category?: string;
  unit: string;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  location?: string;
  isActive: boolean;
}

export default function Inventory() {
  const { t } = useLanguage();
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/inventory"]
  });

  const getStockStatus = (product: Product) => {
    if (product.type !== "stock_product") return "not_tracked";
    const stock = product.currentStock || 0;
    const minStock = product.minStock || 0;
    
    if (stock <= 0) return "out_of_stock";
    if (stock <= minStock) return "low_stock";
    return "in_stock";
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "service": return "บริการ";
      case "non_stock_product": return "สินค้าไม่นับสต็อก";
      case "stock_product": return "สินค้านับสต็อก";
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "service": return "bg-blue-100 text-blue-800";
      case "non_stock_product": return "bg-purple-100 text-purple-800";
      case "stock_product": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "service": return <Wrench className="h-4 w-4" />;
      case "non_stock_product": return <Box className="h-4 w-4" />;
      case "stock_product": return <Archive className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "out_of_stock":
        return "bg-red-100 text-red-800";
      case "low_stock":
        return "bg-yellow-100 text-yellow-800";
      case "in_stock":
        return "bg-green-100 text-green-800";
      case "not_tracked":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "out_of_stock":
        return <AlertTriangle className="h-4 w-4" />;
      case "low_stock":
        return <AlertTriangle className="h-4 w-4" />;
      case "in_stock":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "out_of_stock": return "หมด";
      case "low_stock": return "ใกล้หมด";
      case "in_stock": return "พอเพียง";
      case "not_tracked": return "ไม่ติดตาม";
      default: return "-";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">{t("nav.inventory")}</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  // Group products by type
  const serviceProducts = products?.filter(p => p.type === "service") || [];
  const nonStockProducts = products?.filter(p => p.type === "non_stock_product") || [];
  const stockProducts = products?.filter(p => p.type === "stock_product") || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t("nav.inventory")}</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มสินค้า/บริการใหม่
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">บริการ</p>
                <p className="text-2xl font-bold text-blue-600">{serviceProducts.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Wrench className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">สินค้าไม่นับสต็อก</p>
                <p className="text-2xl font-bold text-purple-600">{nonStockProducts.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Box className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">สินค้านับสต็อก</p>
                <p className="text-2xl font-bold text-green-600">{stockProducts.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Archive className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>สินค้าและบริการทั้งหมด</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!products || products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              ไม่มีข้อมูลสินค้าและบริการ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">รหัส</th>
                    <th className="text-left p-3">ชื่อ</th>
                    <th className="text-left p-3">ประเภท</th>
                    <th className="text-left p-3">หมวดหมู่</th>
                    <th className="text-left p-3">หน่วย</th>
                    <th className="text-left p-3">ราคา</th>
                    <th className="text-left p-3">สต็อกคงเหลือ</th>
                    <th className="text-left p-3">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const status = getStockStatus(product);
                    return (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{product.sku}</td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-gray-500">{product.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={`${getTypeColor(product.type)} flex items-center space-x-1`}>
                            {getTypeIcon(product.type)}
                            <span>{getTypeLabel(product.type)}</span>
                          </Badge>
                        </td>
                        <td className="p-3">{product.category || '-'}</td>
                        <td className="p-3">{product.unit}</td>
                        <td className="p-3">
                          {product.price ? `฿${parseFloat(product.price.toString()).toFixed(2)}` : '-'}
                        </td>
                        <td className="p-3">
                          {product.type === "stock_product" ? 
                            `${product.currentStock || 0} / ${product.minStock || 0}` : 
                            '-'
                          }
                        </td>
                        <td className="p-3">
                          <Badge className={`${getStatusColor(status)} flex items-center space-x-1`}>
                            {getStatusIcon(status)}
                            <span>{getStatusText(status)}</span>
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}