import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, AlertTriangle, CheckCircle } from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit: string;
}

interface InventoryItem {
  id: number;
  productId: number;
  quantity: number;
  minStock: number;
  maxStock?: number;
  location?: string;
}

export default function Inventory() {
  const { data: inventory, isLoading: inventoryLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"]
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"]
  });

  const isLoading = inventoryLoading || productsLoading;

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity <= 0) return "out_of_stock";
    if (item.quantity <= item.minStock) return "low_stock";
    return "in_stock";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "out_of_stock":
        return "bg-red-100 text-red-800";
      case "low_stock":
        return "bg-yellow-100 text-yellow-800";
      case "in_stock":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "out_of_stock":
        return "หมดสต็อก";
      case "low_stock":
        return "สต็อกต่ำ";
      case "in_stock":
        return "พร้อมใช้";
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "out_of_stock":
        return <AlertTriangle className="w-4 h-4" />;
      case "low_stock":
        return <AlertTriangle className="w-4 h-4" />;
      case "in_stock":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  // Get product info for inventory items
  const enrichedInventory = inventory?.map(item => {
    const product = products?.find(p => p.id === item.productId);
    return {
      ...item,
      product,
      status: getStockStatus(item)
    };
  });

  // Calculate stats
  const totalItems = enrichedInventory?.length || 0;
  const lowStockItems = enrichedInventory?.filter(item => item.status === "low_stock").length || 0;
  const outOfStockItems = enrichedInventory?.filter(item => item.status === "out_of_stock").length || 0;
  const inStockItems = enrichedInventory?.filter(item => item.status === "in_stock").length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">สินค้าคงคลัง</h1>
          <Button disabled>เพิ่มสินค้าใหม่</Button>
        </div>
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">สินค้าคงคลัง</h1>
          <p className="text-gray-600">จัดการสต็อกสินค้าและติดตามปริมาณคงเหลือ</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มสินค้าใหม่
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">รายการทั้งหมด</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">พร้อมใช้</p>
                <p className="text-2xl font-bold text-green-600">{inStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">สต็อกต่ำ</p>
                <p className="text-2xl font-bold text-yellow-600">{lowStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">หมดสต็อก</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <CardTitle>รายการสินค้าคงคลัง</CardTitle>
        </CardHeader>
        <CardContent>
          {!enrichedInventory || enrichedInventory.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">ยังไม่มีข้อมูลสินค้าคงคลัง</p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มสินค้าแรก
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {enrichedInventory.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        item.status === "in_stock" ? "bg-green-100" :
                        item.status === "low_stock" ? "bg-yellow-100" : "bg-red-100"
                      }`}>
                        {getStatusIcon(item.status)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {item.product?.name || `Product ID: ${item.productId}`}
                        </h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <span>SKU: {item.product?.sku}</span>
                          <span>หมวดหมู่: {item.product?.category}</span>
                          {item.location && <span>ที่เก็บ: {item.location}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge className={getStatusColor(item.status)}>
                        {getStatusText(item.status)}
                      </Badge>
                      <div>
                        <p className="text-xl font-bold">
                          {item.quantity} {item.product?.unit || 'ชิ้น'}
                        </p>
                        <p className="text-sm text-gray-600">
                          ขั้นต่ำ: {item.minStock} {item.product?.unit || 'ชิ้น'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
