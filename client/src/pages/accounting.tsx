import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface Transaction {
  id: number;
  type: string;
  category: string;
  description: string;
  amount: string;
  date: string;
  reference?: string;
}

export default function Accounting() {
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"]
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "income":
        return "bg-green-100 text-green-800";
      case "expense":
        return "bg-red-100 text-red-800";
      case "transfer":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "income":
        return "รายได้";
      case "expense":
        return "รายจ่าย";
      case "transfer":
        return "โอนเงิน";
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "income":
        return <TrendingUp className="w-4 h-4" />;
      case "expense":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  // Calculate summary
  const income = transactions?.filter(t => t.type === "income")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
  const expenses = transactions?.filter(t => t.type === "expense")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
  const netIncome = income - expenses;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">ระบบบัญชี</h1>
          <Button disabled>เพิ่มรายการใหม่</Button>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
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
          <h1 className="text-2xl font-bold text-gray-900">ระบบบัญชี</h1>
          <p className="text-gray-600">จัดการรายรับรายจ่ายและติดตามการเงิน</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มรายการใหม่
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">รายได้รวม</p>
                <p className="text-2xl font-bold text-green-600">
                  ฿{income.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">รายจ่ายรวม</p>
                <p className="text-2xl font-bold text-red-600">
                  ฿{expenses.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                netIncome >= 0 ? "bg-blue-100" : "bg-red-100"
              }`}>
                <DollarSign className={`w-5 h-5 ${
                  netIncome >= 0 ? "text-blue-600" : "text-red-600"
                }`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">กำไร/ขาดทุนสุทธิ</p>
                <p className={`text-2xl font-bold ${
                  netIncome >= 0 ? "text-blue-600" : "text-red-600"
                }`}>
                  ฿{netIncome.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>รายการทางการเงินล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">ยังไม่มีรายการทางการเงิน</p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มรายการแรก
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        transaction.type === "income" ? "bg-green-100" :
                        transaction.type === "expense" ? "bg-red-100" : "bg-blue-100"
                      }`}>
                        {getTypeIcon(transaction.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{transaction.description}</h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <Badge className={getTypeColor(transaction.type)}>
                            {getTypeText(transaction.type)}
                          </Badge>
                          <span>{transaction.category}</span>
                          <span>{new Date(transaction.date).toLocaleDateString("th-TH")}</span>
                          {transaction.reference && (
                            <span>เลขที่อ้างอิง: {transaction.reference}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${
                        transaction.type === "income" ? "text-green-600" :
                        transaction.type === "expense" ? "text-red-600" : "text-blue-600"
                      }`}>
                        {transaction.type === "expense" ? "-" : "+"}฿{parseFloat(transaction.amount).toLocaleString()}
                      </p>
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
