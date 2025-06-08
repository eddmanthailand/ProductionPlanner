import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Plus, Clock, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";

interface WorkEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  type: "production" | "maintenance" | "meeting" | "deadline";
  priority: "low" | "medium" | "high";
  assignedTo: string;
  status: "pending" | "in-progress" | "completed";
}

export default function ProductionCalendar() {
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<WorkEvent[]>([
    {
      id: 1,
      title: "ผลิตชุดบอดี้สูท 208 ตัว",
      date: "2025-06-08",
      time: "08:00",
      type: "production",
      priority: "high",
      assignedTo: "ทีมผลิต A",
      status: "in-progress"
    },
    {
      id: 2,
      title: "ตรวจสอบเครื่องจักร",
      date: "2025-06-09",
      time: "14:00",
      type: "maintenance",
      priority: "medium",
      assignedTo: "ช่างเทคนิค",
      status: "pending"
    },
    {
      id: 3,
      title: "ประชุมวางแผนสัปดาห์ถัดไป",
      date: "2025-06-10",
      time: "10:00",
      type: "meeting",
      priority: "medium",
      assignedTo: "ทีมบริหาร",
      status: "pending"
    }
  ]);

  const getEventsByDate = (date: string) => {
    return events.filter(event => event.date === date);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "production": return "bg-blue-100 text-blue-800";
      case "maintenance": return "bg-orange-100 text-orange-800";
      case "meeting": return "bg-purple-100 text-purple-800";
      case "deadline": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "border-l-red-500";
      case "medium": return "border-l-yellow-500";
      case "low": return "border-l-green-500";
      default: return "border-l-gray-500";
    }
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
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

  const formatDateForEvents = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-blue-600" />
            ปฏิทินการทำงาน
          </h1>
          <p className="text-gray-600 mt-1">จัดการและติดตามกำหนดการผลิต</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มกิจกรรม
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {currentDate.toLocaleDateString('th-TH', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                  >
                    ←
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('next')}
                  >
                    →
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((day, index) => {
                  if (!day) {
                    return <div key={index} className="h-20"></div>;
                  }
                  
                  const dateStr = formatDateForEvents(day);
                  const dayEvents = getEventsByDate(dateStr);
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  
                  return (
                    <div
                      key={day}
                      className={`h-20 border rounded-lg p-1 cursor-pointer hover:bg-gray-50 ${
                        isToday ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedDate(new Date(dateStr))}
                    >
                      <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                        {day}
                      </div>
                      <div className="space-y-1 mt-1">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${getEventTypeColor(event.type)}`}
                          >
                            {event.time} {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{dayEvents.length - 2} เพิ่มเติม
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {/* Today's Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">กิจกรรมวันนี้</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {getEventsByDate(new Date().toISOString().split('T')[0]).map(event => (
                <div
                  key={event.id}
                  className={`p-3 border-l-4 rounded-lg bg-white shadow-sm ${getPriorityColor(event.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <Clock className="w-3 h-3" />
                        {event.time}
                        <Users className="w-3 h-3 ml-2" />
                        {event.assignedTo}
                      </div>
                    </div>
                    <Badge className={getEventTypeColor(event.type)}>
                      {event.type}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {getEventsByDate(new Date().toISOString().split('T')[0]).length === 0 && (
                <p className="text-gray-500 text-center py-4">ไม่มีกิจกรรมวันนี้</p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">งานที่กำลังจะมาถึง</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.filter(event => event.status === 'pending').slice(0, 3).map(event => (
                <div
                  key={event.id}
                  className="p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <CalendarIcon className="w-3 h-3" />
                        {new Date(event.date).toLocaleDateString('th-TH')}
                        <Clock className="w-3 h-3 ml-2" />
                        {event.time}
                      </div>
                    </div>
                    {event.priority === 'high' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}