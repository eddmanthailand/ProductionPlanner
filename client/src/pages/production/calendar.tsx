import { useState } from "react";
import { Calendar as CalendarIcon, Plus, Edit2, Trash2, Save, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: "national" | "company" | "religious";
  recurring: boolean;
}

export default function ProductionCalendar() {
  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [holidayName, setHolidayName] = useState("");
  const [holidayType, setHolidayType] = useState<"national" | "company" | "religious">("national");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  
  const [holidays, setHolidays] = useState<Holiday[]>([
    {
      id: "h1",
      date: "2025-01-01",
      name: "วันปีใหม่",
      type: "national",
      recurring: true
    },
    {
      id: "h2",
      date: "2025-02-12",
      name: "วันมาฆบูชา",
      type: "religious",
      recurring: true
    },
    {
      id: "h3",
      date: "2025-04-06",
      name: "วันจักรี",
      type: "national",
      recurring: true
    },
    {
      id: "h4",
      date: "2025-04-13",
      name: "วันสงกรานต์",
      type: "national",
      recurring: true
    },
    {
      id: "h5",
      date: "2025-05-01",
      name: "วันแรงงานแห่งชาติ",
      type: "national",
      recurring: true
    },
    {
      id: "h6",
      date: "2025-05-05",
      name: "วันฉัตรมงคล",
      type: "national",
      recurring: true
    },
    {
      id: "h7",
      date: "2025-07-28",
      name: "วันเฉลิมพระชนมพรรษา",
      type: "national",
      recurring: true
    },
    {
      id: "h8",
      date: "2025-08-12",
      name: "วันแม่แห่งชาติ",
      type: "national",
      recurring: true
    },
    {
      id: "h9",
      date: "2025-10-13",
      name: "วันคล้ายวันสวรรคต",
      type: "national",
      recurring: true
    },
    {
      id: "h10",
      date: "2025-10-23",
      name: "วันปิยมหาราช",
      type: "national",
      recurring: true
    },
    {
      id: "h11",
      date: "2025-12-05",
      name: "วันพ่อแห่งชาติ",
      type: "national",
      recurring: true
    },
    {
      id: "h12",
      date: "2025-12-10",
      name: "วันรัฐธรรมนูญ",
      type: "national",
      recurring: true
    },
    {
      id: "h13",
      date: "2025-12-31",
      name: "วันสิ้นปี",
      type: "national",
      recurring: true
    }
  ]);

  const getHolidaysByDate = (date: string) => {
    return holidays.filter(holiday => holiday.date === date);
  };

  const getHolidayTypeColor = (type: string) => {
    switch (type) {
      case "national": return "bg-red-100 text-red-800";
      case "company": return "bg-blue-100 text-blue-800";
      case "religious": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getHolidayTypeName = (type: string) => {
    switch (type) {
      case "national": return "วันหยุดราชการ";
      case "company": return "วันหยุดบริษัท";
      case "religious": return "วันสำคัญทางศาสนา";
      default: return "อื่นๆ";
    }
  };

  const generateMonthCalendar = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const formatDateForHoliday = (year: number, month: number, day: number) => {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentYear(prev => prev + 1);
    }
  };

  const handleDateClick = (year: number, month: number, day: number) => {
    const dateStr = formatDateForHoliday(year, month, day);
    const existingHolidays = getHolidaysByDate(dateStr);
    
    if (existingHolidays.length > 0) {
      // If there's already a holiday, remove it
      setHolidays(prev => prev.filter(holiday => holiday.date !== dateStr));
      toast({
        title: "ลบวันหยุดแล้ว",
        description: `ลบ ${existingHolidays[0].name} เรียบร้อย`
      });
    } else {
      // Create new holiday with default name
      const defaultName = `วันหยุด ${new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}`;
      const newHoliday: Holiday = {
        id: `h${Date.now()}`,
        date: dateStr,
        name: defaultName,
        type: "company",
        recurring: true
      };
      setHolidays(prev => [...prev, newHoliday]);
      toast({
        title: "เพิ่มวันหยุดแล้ว",
        description: `เพิ่ม ${defaultName} เรียบร้อย`
      });
    }
  };

  const saveHoliday = () => {
    if (!selectedDate || !holidayName.trim()) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกชื่อวันหยุด",
        variant: "destructive"
      });
      return;
    }

    if (editingHoliday) {
      // Update existing holiday
      setHolidays(prev => prev.map(holiday => 
        holiday.id === editingHoliday.id 
          ? { ...holiday, name: holidayName, type: holidayType }
          : holiday
      ));
      toast({
        title: "อัปเดตสำเร็จ",
        description: "วันหยุดได้รับการอัปเดตแล้ว"
      });
    } else {
      // Create new holiday
      const newHoliday: Holiday = {
        id: `h${Date.now()}`,
        date: selectedDate,
        name: holidayName,
        type: holidayType,
        recurring: true
      };
      setHolidays(prev => [...prev, newHoliday]);
      toast({
        title: "บันทึกสำเร็จ",
        description: "วันหยุดใหม่ได้รับการบันทึกแล้ว"
      });
    }

    closeDialog();
  };

  const deleteHoliday = (holidayId: string) => {
    setHolidays(prev => prev.filter(holiday => holiday.id !== holidayId));
    toast({
      title: "ลบสำเร็จ",
      description: "วันหยุดได้รับการลบแล้ว"
    });
    closeDialog();
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedDate(null);
    setHolidayName("");
    setEditingHoliday(null);
  };

  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-blue-600" />
            ปฏิทินวันหยุดประจำปี
          </h1>
          <p className="text-gray-600 mt-1">คลิกวันในปฏิทินเพื่อเพิ่ม/ลบวันหยุด</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
              <span>วันหยุดที่มีอยู่</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
              <span>วันนี้</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateYear('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xl font-semibold min-w-20 text-center">
              {currentYear}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateYear('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">วันหยุดทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{holidays.length}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">วันหยุดราชการ</p>
                <p className="text-2xl font-bold text-red-600">
                  {holidays.filter(h => h.type === 'national').length}
                </p>
              </div>
              <CalendarIcon className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">วันหยุดบริษัท</p>
                <p className="text-2xl font-bold text-blue-600">
                  {holidays.filter(h => h.type === 'company').length}
                </p>
              </div>
              <CalendarIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">วันสำคัญทางศาสนา</p>
                <p className="text-2xl font-bold text-purple-600">
                  {holidays.filter(h => h.type === 'religious').length}
                </p>
              </div>
              <CalendarIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 12 Month Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }, (_, monthIndex) => (
          <Card key={monthIndex} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-center">
                {monthNames[monthIndex]} {currentYear}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {generateMonthCalendar(currentYear, monthIndex).map((day, dayIndex) => {
                  if (!day) {
                    return <div key={`empty-${monthIndex}-${dayIndex}`} className="h-8"></div>;
                  }
                  
                  const dateStr = formatDateForHoliday(currentYear, monthIndex, day);
                  const dayHolidays = getHolidaysByDate(dateStr);
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  const hasHoliday = dayHolidays.length > 0;
                  
                  return (
                    <div
                      key={`${monthIndex}-${day}`}
                      className={`h-8 border rounded cursor-pointer flex items-center justify-center text-sm transition-all duration-200 ${
                        isToday ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200' : 
                        hasHoliday ? 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200' : 
                        'border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
                      }`}
                      onClick={() => handleDateClick(currentYear, monthIndex, day)}
                      title={hasHoliday ? `${dayHolidays[0].name} - คลิกเพื่อลบ` : "คลิกเพื่อเพิ่มวันหยุด"}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Holiday List */}
      <Card>
        <CardHeader>
          <CardTitle>รายการวันหยุดประจำปี {currentYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {holidays
              .filter(holiday => holiday.date.startsWith(currentYear.toString()))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map(holiday => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(holiday.date).toLocaleDateString('th-TH', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{holiday.name}</h4>
                    </div>
                    <Badge className={getHolidayTypeColor(holiday.type)}>
                      {getHolidayTypeName(holiday.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingHoliday(holiday);
                        setHolidayName(holiday.name);
                        setHolidayType(holiday.type);
                        setSelectedDate(holiday.date);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteHoliday(holiday.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            
            {holidays.filter(holiday => holiday.date.startsWith(currentYear.toString())).length === 0 && (
              <p className="text-gray-500 text-center py-8">ไม่มีวันหยุดในปี {currentYear}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Holiday Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? 'แก้ไขวันหยุด' : 'เพิ่มวันหยุดใหม่'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">วันที่</label>
              <Input
                value={selectedDate ? new Date(selectedDate).toLocaleDateString('th-TH') : ''}
                disabled
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">ชื่อวันหยุด</label>
              <Input
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder="กรอกชื่อวันหยุด"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">ประเภทวันหยุด</label>
              <Select value={holidayType} onValueChange={(value: any) => setHolidayType(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">วันหยุดราชการ</SelectItem>
                  <SelectItem value="company">วันหยุดบริษัท</SelectItem>
                  <SelectItem value="religious">วันสำคัญทางศาสนา</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={closeDialog}>
                <X className="w-4 h-4 mr-2" />
                ยกเลิก
              </Button>
              {editingHoliday && (
                <Button 
                  variant="destructive" 
                  onClick={() => deleteHoliday(editingHoliday.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  ลบ
                </Button>
              )}
              <Button onClick={saveHoliday}>
                <Save className="w-4 h-4 mr-2" />
                บันทึก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}