import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Clock, Users, RefreshCw, Trash2, Filter, List, LayoutList } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface WorkQueueItem {
  id: number;
  teamId: string;
  teamName: string;
  workOrderId: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  quantity: number;
  startDate: string;
  endDate: string;
  status: string;
  estimatedDays: number;
}

export default function WorkQueueTable() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("all");
  const [isCompactView, setIsCompactView] = useState(false);
  const { toast } = useToast();

  // ดึงรายชื่อทีมจาก API เพื่อรองรับทีมใหม่
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  // ดึงข้อมูลแผนการผลิตจาก localStorage ทุกทีม
  const { data: allWorkQueues = [], isLoading, refetch } = useQuery<WorkQueueItem[]>({
    queryKey: ["/api/work-queue-table", refreshKey],
    queryFn: async () => {
      const allData: WorkQueueItem[] = [];
      
      // อ่านข้อมูลจาก localStorage ทุก key ที่ขึ้นต้นด้วย calculatedPlan_
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('calculatedPlan_')) {
          try {
            const teamData = JSON.parse(localStorage.getItem(key) || '{}');
            if (teamData.data && Array.isArray(teamData.data)) {
              allData.push(...teamData.data);
            }
          } catch (error) {
            console.error(`Error parsing data for key ${key}:`, error);
          }
        }
      }
      
      return allData;
    },
  });

  // กรองข้อมูลตามทีมที่เลือก
  const workQueues = selectedTeamFilter === "all" 
    ? allWorkQueues 
    : allWorkQueues.filter(item => item.teamId === selectedTeamFilter);

  // จัดกรุ๊ปข้อมูลตามเลขที่ใบสั่งงานสำหรับโหมดย่อ (รวมทุกสีไซส์)
  const groupedWorkQueues = workQueues.reduce((groups: any[], item) => {
    const groupKey = `${item.orderNumber}-${item.productName}`;
    const existingGroup = groups.find(group => 
      group.orderNumber === item.orderNumber && group.productName === item.productName
    );
    
    if (existingGroup) {
      existingGroup.totalQuantity += item.quantity;
      existingGroup.items.push(item);
      // อัพเดทวันที่สิ้นสุดหากรายการนี้มีวันที่หลังกว่า
      if (new Date(item.endDate) > new Date(existingGroup.endDate)) {
        existingGroup.endDate = item.endDate;
      }
      // อัพเดทวันที่เริ่มต้นหากรายการนี้มีวันที่ก่อนหน้า
      if (new Date(item.startDate) < new Date(existingGroup.startDate)) {
        existingGroup.startDate = item.startDate;
      }
      // รวมทีมที่เกี่ยวข้อง
      if (!existingGroup.teamNames.includes(item.teamName)) {
        existingGroup.teamNames.push(item.teamName);
      }
    } else {
      groups.push({
        orderNumber: item.orderNumber,
        customerName: item.customerName,
        productName: item.productName,
        totalQuantity: item.quantity,
        startDate: item.startDate,
        endDate: item.endDate,
        teamId: item.teamId,
        teamName: item.teamName,
        teamNames: [item.teamName],
        totalCost: parseFloat((item as any).totalCost || '0'),
        items: [item]
      });
    }
    return groups;
  }, []);

  // คำนวณต้นทุนรวมสำหรับแต่ละกรุ๊ป
  groupedWorkQueues.forEach(group => {
    group.totalCost = group.items.reduce((sum: number, item: any) => 
      sum + parseFloat((item as any).totalCost || '0'), 0
    );
  });

  // ดึงรายการทีมที่มีการคำนวณแล้ว
  const { data: calculatedTeams = [] } = useQuery({
    queryKey: ["/api/calculated-teams", refreshKey],
    queryFn: async () => {
      return JSON.parse(localStorage.getItem('calculatedTeams') || '[]');
    },
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const handleDeleteTeamData = (teamId: string) => {
    const teamKey = `calculatedPlan_${teamId}`;
    localStorage.removeItem(teamKey);
    
    // อัพเดท calculatedTeams index
    const existingTeams = JSON.parse(localStorage.getItem('calculatedTeams') || '[]');
    const updatedTeams = existingTeams.filter((t: any) => t.teamId !== teamId);
    localStorage.setItem('calculatedTeams', JSON.stringify(updatedTeams));
    
    toast({
      title: "ลบข้อมูลสำเร็จ",
      description: `ลบข้อมูลการคำนวณของทีม ${(teams as any[]).find(t => t.id === teamId)?.name || teamId} แล้ว`,
    });
    
    handleRefresh();
  };

  const handleClearAllData = () => {
    // ลบข้อมูลทั้งหมด
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('calculatedPlan_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('calculatedTeams');
    
    toast({
      title: "ลบข้อมูลทั้งหมดสำเร็จ",
      description: "ลบข้อมูลการคำนวณของทุกทีมแล้ว",
    });
    
    handleRefresh();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "รอดำเนินการ", variant: "secondary" as const },
      in_progress: { label: "กำลังดำเนินการ", variant: "default" as const },
      completed: { label: "เสร็จสิ้น", variant: "default" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-blue-600" />
            ตารางคิวงาน
          </h1>
          <p className="text-gray-600 mt-1">แสดงตารางคิวงานของแต่ละทีมพร้อมวันเริ่มงานและวันจบงาน</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          {allWorkQueues.length > 0 && (
            <Button onClick={handleClearAllData} variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              ลบทั้งหมด
            </Button>
          )}
        </div>
      </div>

      {/* Controls */}
      {allWorkQueues.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">กรองตามทีม:</span>
                <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="เลือกทีม" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกทีม</SelectItem>
                    {(teams as any[]).map((team: any) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={isCompactView ? "outline" : "default"}
                  size="sm"
                  onClick={() => setIsCompactView(false)}
                >
                  <List className="w-4 h-4 mr-2" />
                  แสดงทั้งหมด
                </Button>
                <Button
                  variant={isCompactView ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsCompactView(true)}
                >
                  <LayoutList className="w-4 h-4 mr-2" />
                  คิวงานแบบย่อ
                </Button>
              </div>
              
              {selectedTeamFilter !== "all" && (
                <Button 
                  onClick={() => handleDeleteTeamData(selectedTeamFilter)} 
                  variant="outline" 
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  ลบข้อมูลทีมนี้
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Status Cards */}
      {calculatedTeams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              สถานะการคำนวณแต่ละทีม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {calculatedTeams.map((team: any) => (
                <div key={team.teamId} className="p-4 border rounded-lg bg-green-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{team.teamName}</h4>
                      <p className="text-sm text-gray-500">
                        คำนวณล่าสุด: {new Date(team.calculatedAt).toLocaleString('th-TH')}
                      </p>
                    </div>
                    <Button 
                      onClick={() => handleDeleteTeamData(team.teamId)} 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Work Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            ตารางคิวงานทีมการผลิต
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">กำลังโหลดข้อมูล...</p>
            </div>
          ) : workQueues.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">ยังไม่มีข้อมูลคิวงาน</p>
              <p className="text-sm text-gray-400">กรุณาไปที่หน้า "วางแผนและคิวงาน" เพื่อคำนวณแผนการผลิตก่อน</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isCompactView && <TableHead>ทีมที่เกี่ยวข้อง</TableHead>}
                    {!isCompactView && <TableHead>ทีม</TableHead>}
                    <TableHead>เลขที่ใบสั่งงาน</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead>สินค้า</TableHead>
                    <TableHead className="text-center">จำนวน{isCompactView ? " (รวม)" : ""}</TableHead>
                    <TableHead className="text-center">วันเริ่มงาน</TableHead>
                    <TableHead className="text-center">วันจบงาน</TableHead>
                    {!isCompactView && <TableHead className="text-center">ระยะเวลา (วัน)</TableHead>}
                    {!isCompactView && <TableHead className="text-center">สถานะ</TableHead>}
                    {isCompactView && <TableHead className="text-center">รายการย่อย</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCompactView ? (
                    groupedWorkQueues.map((group, index) => (
                      <TableRow key={`group-${group.orderNumber}-${group.productName}-${index}`}>
                        <TableCell className="font-medium">
                          <div className="flex flex-wrap gap-1">
                            {group.teamNames.map((teamName: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {teamName}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{group.orderNumber}</TableCell>
                        <TableCell>{group.customerName}</TableCell>
                        <TableCell>{group.productName}</TableCell>
                        <TableCell className="text-center font-bold text-blue-600">{group.totalQuantity}</TableCell>
                        <TableCell className="text-center">{formatDate(group.startDate)}</TableCell>
                        <TableCell className="text-center">{formatDate(group.endDate)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{group.items.length} รายการ</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    workQueues.map((item) => (
                      <TableRow key={`${item.teamId}-${item.id}`}>
                        <TableCell className="font-medium">{item.teamName}</TableCell>
                        <TableCell>{item.orderNumber}</TableCell>
                        <TableCell>{item.customerName}</TableCell>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-center">{formatDate(item.startDate)}</TableCell>
                        <TableCell className="text-center">{formatDate(item.endDate)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-4 h-4" />
                            {item.estimatedDays}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {workQueues.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {isCompactView ? "ใบสั่งงาน" : (selectedTeamFilter === "all" ? "งานทั้งหมด" : "งานของทีมนี้")}
                  </p>
                  <p className="text-2xl font-bold">
                    {isCompactView ? groupedWorkQueues.length : workQueues.length}
                  </p>
                </div>
                <CalendarDays className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {selectedTeamFilter === "all" ? "ทีมที่มีงาน" : "ทีมที่เลือก"}
                  </p>
                  <p className="text-2xl font-bold">
                    {selectedTeamFilter === "all" 
                      ? new Set(workQueues.map(item => item.teamId)).size 
                      : 1}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {isCompactView ? "จำนวนรวม" : "วันทำงานรวม"}
                  </p>
                  <p className="text-2xl font-bold">
                    {isCompactView 
                      ? groupedWorkQueues.reduce((sum, group) => sum + group.totalQuantity, 0)
                      : workQueues.reduce((sum, item) => sum + item.estimatedDays, 0)
                    }
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">ทีมที่คำนวณแล้ว</p>
                  <p className="text-2xl font-bold">{calculatedTeams.length}</p>
                  <p className="text-xs text-gray-500">จาก {(teams as any[]).length} ทีม</p>
                </div>
                <Filter className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}