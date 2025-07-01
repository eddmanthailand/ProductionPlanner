import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Send, Bot, User, MessageSquare, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import AIChart from '@/components/ui/chart';

interface ChatMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ChatConversation {
  id: number;
  tenantId: string;
  userId: number;
  title: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AIChatbot() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [contextBanner, setContextBanner] = useState<string | null>(null);
  const [conversationContext, setConversationContext] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<ChatConversation[]>({
    queryKey: ['/api/chat/conversations'],
    retry: false,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/chat/conversations/${selectedConversation}/messages`],
    enabled: !!selectedConversation,
    retry: false,
  });

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/chat/conversations', { title: 'การสนทนาใหม่' }),
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      setSelectedConversation(newConversation.id);
      
      // Send the pending message after creating conversation
      if (inputMessage.trim()) {
        setIsLoading(true);
        sendMessageMutation.mutate({ 
          content: inputMessage.trim(), 
          conversationId: newConversation.id 
        });
      }
    },
    onError: () => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างการสนทนาใหม่ได้",
        variant: "destructive",
      });
    }
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: ({ content, conversationId }: { content: string; conversationId?: number }) => 
      apiRequest('POST', `/api/chat/conversations/${conversationId || selectedConversation}/messages`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/chat/conversations/${selectedConversation}/messages`] 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      setInputMessage('');
      setIsLoading(false);
      // Clear context banner after a short delay
      setTimeout(() => setContextBanner(null), 3000);
    },
    onError: () => {
      setIsLoading(false);
      setContextBanner(null);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งข้อความได้",
        variant: "destructive",
      });
    }
  });

  // Delete conversation
  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: number) => 
      apiRequest('DELETE', `/api/chat/conversations/${conversationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      setSelectedConversation(null);
      toast({
        title: "สำเร็จ",
        description: "ลบการสนทนาเรียบร้อยแล้ว",
      });
    },
    onError: () => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบการสนทนาได้",
        variant: "destructive",
      });
    }
  });

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-select first conversation if none selected, or clear selection if no conversations
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0].id);
    } else if (conversations.length === 0 && selectedConversation) {
      setSelectedConversation(null);
    }
  }, [conversations, selectedConversation]);

  // Update conversation context when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const context = detectConversationContext(messages);
      setConversationContext(context);
    } else {
      setConversationContext('');
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isLoading) return;
    
    // Detect context banner before sending
    const banner = detectContextBanner(inputMessage.trim(), messages);
    setContextBanner(banner);
    
    // If no conversation is selected, create one first
    if (!selectedConversation) {
      createConversationMutation.mutate();
      return;
    }
    
    setIsLoading(true);
    sendMessageMutation.mutate({ content: inputMessage.trim(), conversationId: selectedConversation });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // Shift + Enter จะยอมให้ขึ้นบรรทัดใหม่โดยอัตโนมัติ
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = async (text: string, messageId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      toast({
        title: "คัดลอกแล้ว",
        description: "คัดลอกข้อความไปยัง clipboard แล้ว",
      });
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถคัดลอกข้อความได้",
        variant: "destructive",
      });
    }
  };

  const isCodeBlock = (content: string) => {
    return content.includes('```') || content.includes('SELECT') || content.includes('JSON') || content.includes('{') || content.includes('[');
  };

  // Enhanced function to check if message contains chart data
  const hasChartData = (content: string) => {
    try {
      // Check for direct JSON with chartData
      const parsed = JSON.parse(content);
      if (parsed && parsed.chartData && parsed.chartData.type) {
        return true;
      }
      
      // Check for chart_response type from new format
      if (parsed && parsed.type === 'chart_response' && parsed.chart) {
        return true;
      }
      
      return false;
    } catch {
      // Also check for JSON patterns in text
      return content.includes('"type": "chart_response"') || content.includes('"chartData"');
    }
  };

  // Enhanced function to parse chart data from message
  const parseChartData = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      
      // Handle new chart_response format
      if (parsed && parsed.type === 'chart_response' && parsed.chart) {
        return {
          message: parsed.message || 'แสดงข้อมูลเป็นกราฟ',
          chartData: parsed.chart
        };
      }
      
      // Handle legacy format
      if (parsed && parsed.chartData) {
        return {
          message: parsed.message || '',
          chartData: parsed.chartData
        };
      }
      
      return null;
    } catch (error) {
      // Try to extract JSON from text if parsing fails
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = JSON.parse(jsonMatch[0]);
          if (extractedJson.type === 'chart_response' && extractedJson.chart) {
            return {
              message: extractedJson.message || 'แสดงข้อมูลเป็นกราฟ',
              chartData: extractedJson.chart
            };
          }
        }
      } catch (extractError) {
        console.log('Chart data extraction failed:', extractError);
      }
      return null;
    }
  };

  // Function to detect conversation context from messages
  const detectConversationContext = (messages: ChatMessage[]) => {
    const recentMessages = messages.slice(-6);
    const keywords = {
      'ใบสั่งงาน': 'Work Orders',
      'ใบบันทึกประจำวัน': 'Daily Work Logs', 
      'รายได้ทีม': 'Team Revenue',
      'การผลิต': 'Production Management',
      'ลูกค้า': 'Customer Management',
      'สินค้า': 'Product Management'
    };

    for (const [thai, english] of Object.entries(keywords)) {
      if (recentMessages.some(msg => msg.content.includes(thai))) {
        return english;
      }
    }
    return '';
  };

  // Function to detect context for "Responding to..." banner
  const detectContextBanner = (currentMessage: string, previousMessages: ChatMessage[]) => {
    const lastUserMessage = previousMessages
      .filter(msg => msg.role === 'user')
      .slice(-1)[0];
    
    if (!lastUserMessage) return null;

    // Check if current message seems to be following up on previous question
    const followUpKeywords = ['แล้ว', 'ของ', 'นั้น', 'เหล่านั้น', 'ที่กล่าวมา', 'ดังกล่าว'];
    const hasFollowUp = followUpKeywords.some(keyword => currentMessage.includes(keyword));
    
    if (hasFollowUp && lastUserMessage.content.length > 10) {
      return lastUserMessage.content.substring(0, 50) + (lastUserMessage.content.length > 50 ? '...' : '');
    }
    
    return null;
  };

  // Function to make data in AI responses clickable
  const renderMessageWithLinks = (content: string) => {
    // Pattern to match work order numbers (WO-XXX or similar patterns)
    const workOrderPattern = /(WO-\d+|ใบสั่งงาน\s*#?\s*\d+)/g;
    // Pattern to match customer names in quotes
    const customerPattern = /"([^"]+)"/g;
    // Pattern to match report numbers
    const reportPattern = /(RP\d+|รายงาน\s*#?\s*\d+)/g;

    let processedContent = content;
    
    // Replace work order references with clickable links
    processedContent = processedContent.replace(workOrderPattern, (match) => {
      return `<span class="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium cursor-pointer hover:bg-blue-200 transition-colors" onclick="window.open('/production/work-orders', '_blank')" title="คลิกเพื่อดูใบสั่งงาน">${match}</span>`;
    });

    // Replace customer names with clickable links  
    processedContent = processedContent.replace(customerPattern, (match, customerName) => {
      return `<span class="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium cursor-pointer hover:bg-green-200 transition-colors" onclick="window.open('/sales/customers', '_blank')" title="คลิกเพื่อดูข้อมูลลูกค้า">"${customerName}"</span>`;
    });

    // Replace report numbers with clickable links
    processedContent = processedContent.replace(reportPattern, (match) => {
      return `<span class="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-medium cursor-pointer hover:bg-purple-200 transition-colors" onclick="window.open('/reports', '_blank')" title="คลิกเพื่อดูรายงาน">${match}</span>`;
    });

    return processedContent;
  };

  return (
    <div className="flex h-[calc(100vh-200px)] bg-gray-50 rounded-lg overflow-hidden">
        {/* Sidebar Toggle Button */}
        <Button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          variant="ghost"
          size="sm"
          className={`absolute top-4 z-10 bg-white shadow-md hover:bg-gray-50 border ${
            sidebarCollapsed ? 'left-4' : 'left-[300px]'
          } transition-all duration-300`}
          title={sidebarCollapsed ? 'แสดงรายการสนทนา' : 'ซ่อนรายการสนทนา'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        {/* Sidebar - Conversations List */}
        <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'
        }`}>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <Button
                onClick={() => createConversationMutation.mutate()}
                disabled={createConversationMutation.isPending}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              ผู้ช่วย AI สำหรับระบบจัดการการผลิต
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {conversationsLoading ? (
                <div className="text-center py-8 text-gray-500">
                  กำลังโหลด...
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>ยังไม่มีการสนทนา</p>
                  <p className="text-xs">คลิกปุ่ม + เพื่อเริ่มสนทนาใหม่</p>
                </div>
              ) : (
                conversations.map((conversation: ChatConversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors group ${
                      selectedConversation === conversation.id
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-gray-900 truncate">
                          {conversation.title || 'การสนทนาใหม่'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(conversation.updatedAt).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversationMutation.mutate(conversation.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'ml-0' : 'ml-0'
        }`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">AI Assistant</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">พร้อมใช้งาน</span>
                        {conversationContext && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                              {conversationContext}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Context Banner */}
                {contextBanner && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white">↗</span>
                      </div>
                      <span className="text-amber-800 font-medium">กำลังตอบกลับโดยอ้างอิงจาก:</span>
                      <span className="text-amber-700 italic">"{contextBanner}"</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messagesLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      กำลังโหลดข้อความ...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <Bot className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        ยินดีต้อนรับสู่ AI Assistant
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        ฉันเป็นผู้ช่วย AI สำหรับระบบจัดการการผลิต พร้อมช่วยเหลือคุณในเรื่อง:
                      </p>
                      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto text-left">
                        <Card className="p-4">
                          <h4 className="font-medium text-sm mb-2">การจัดการใบสั่งงาน</h4>
                          <p className="text-xs text-gray-600">สอบถามสถานะ แก้ไขข้อมูล</p>
                        </Card>
                        <Card className="p-4">
                          <h4 className="font-medium text-sm mb-2">📊 สร้างกราฟและรายงาน</h4>
                          <p className="text-xs text-gray-600">วิเคราะห์ข้อมูลเป็นกราฟ</p>
                        </Card>
                        <Card className="p-4">
                          <h4 className="font-medium text-sm mb-2">การใช้งานระบบ</h4>
                          <p className="text-xs text-gray-600">คู่มือ วิธีการใช้งาน</p>
                        </Card>
                        <Card className="p-4">
                          <h4 className="font-medium text-sm mb-2">การแก้ปัญหา</h4>
                          <p className="text-xs text-gray-600">ช่วยแก้ไขปัญหาต่างๆ</p>
                        </Card>
                      </div>
                      
                      {/* Chart Generation Suggestions */}
                      <div className="mt-8 max-w-2xl mx-auto">
                        <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">💡 ตัวอย่างคำสั่งสร้างกราฟ:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { text: "สร้างกราฟแสดงรายได้ของแต่ละทีม", icon: "📊" },
                            { text: "แสดงแนวโน้มการผลิตเป็นกราฟเส้น", icon: "📈" },
                            { text: "เปรียบเทียบผลงานทีมเป็นแผนภูมิ", icon: "📋" },
                            { text: "วิเคราะห์ประสิทธิภาพการทำงาน", icon: "⚡" }
                          ].map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => setInputMessage(suggestion.text)}
                              className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
                            >
                              <span className="mr-2">{suggestion.icon}</span>
                              {suggestion.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    messages.map((message: ChatMessage) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                      >
                        <div
                          className={`relative group max-w-[70%] rounded-2xl shadow-sm ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white ml-12'
                              : 'bg-white border border-gray-200 mr-12'
                          }`}
                        >
                          {/* Avatar */}
                          {message.role === 'assistant' && (
                            <div className="absolute -left-10 top-0">
                              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                <Bot className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}
                          {message.role === 'user' && (
                            <div className="absolute -right-10 top-0">
                              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}

                          <div className="p-4">
                            {/* Message Content */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                {message.role === 'assistant' && hasChartData(message.content) ? (
                                  // Display chart for AI responses with chart data
                                  (() => {
                                    const chartContent = parseChartData(message.content);
                                    return chartContent ? (
                                      <div className="space-y-4">
                                        {chartContent.message && (
                                          <p className="text-sm leading-relaxed text-gray-800">
                                            {chartContent.message}
                                          </p>
                                        )}
                                        <AIChart 
                                          chartData={chartContent.chartData} 
                                          className="max-w-full"
                                        />
                                      </div>
                                    ) : (
                                      <p className="text-sm leading-relaxed text-gray-800">
                                        ข้อมูลกราฟไม่สมบูรณ์
                                      </p>
                                    );
                                  })()
                                ) : isCodeBlock(message.content) ? (
                                  <div className="bg-gray-900 rounded-lg p-3 text-sm font-mono text-green-400 overflow-x-auto">
                                    <pre className="whitespace-pre-wrap">{message.content}</pre>
                                  </div>
                                ) : message.role === 'assistant' ? (
                                  <div 
                                    className="text-sm leading-relaxed text-gray-800"
                                    dangerouslySetInnerHTML={{ 
                                      __html: renderMessageWithLinks(message.content).replace(/\n/g, '<br>') 
                                    }}
                                  />
                                ) : (
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">
                                    {message.content}
                                  </p>
                                )}
                              </div>
                              
                              {/* Copy Button */}
                              {message.role === 'assistant' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(message.content, message.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto hover:bg-gray-100"
                                >
                                  {copiedMessageId === message.id ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-gray-500" />
                                  )}
                                </Button>
                              )}
                            </div>

                            {/* Timestamp */}
                            <p className={`text-xs mt-2 ${
                              message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {formatMessageTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Loading Indicator */}
                  {isLoading && (
                    <div className="flex justify-start mb-4">
                      <div className="relative bg-white border border-gray-200 rounded-2xl shadow-sm mr-12">
                        {/* AI Avatar */}
                        <div className="absolute -left-10 top-0">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="text-sm text-gray-600">AI กำลังคิดคำตอบ...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Suggested Prompts (show when no messages and not loading) */}
                  {messages.length === 0 && !isLoading && selectedConversation && (
                    <div className="space-y-3 mb-6">
                      <h4 className="text-sm font-medium text-gray-700 text-center">💡 คำถามที่พบบ่อย</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          "สรุปใบสั่งงานที่ค้างอยู่",
                          "วิเคราะห์ประสิทธิภาพการผลิตเดือนที่แล้ว", 
                          "แสดงรายได้ทีมสำหรับสัปดาห์นี้เป็นกราฟ",
                          "สร้างแผนภูมิเปรียบเทียบทีมงาน",
                          "แสดงแนวโน้มการผลิตรายเดือน",
                          "ช่วยแก้ปัญหาการใช้งานระบบ"
                        ].map((prompt, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            onClick={() => {
                              setInputMessage(prompt);
                              // Auto send the message
                              if (selectedConversation) {
                                setIsLoading(true);
                                sendMessageMutation.mutate({ 
                                  content: prompt, 
                                  conversationId: selectedConversation 
                                });
                              }
                            }}
                            className="text-left justify-start text-sm py-3 px-4 h-auto bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:from-blue-100 hover:to-purple-100 text-gray-700"
                          >
                            {prompt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-200">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <div className="relative">
                      <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="พิมพ์ข้อความของคุณ..."
                        disabled={isLoading}
                        rows={1}
                        className="w-full pr-14 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-400 bg-white shadow-sm min-h-[48px] resize-none focus:outline-none focus:ring-0 overflow-hidden"
                        style={{ 
                          minHeight: '48px',
                          maxHeight: '120px',
                          height: 'auto'
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = '48px';
                          target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                        }}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        size="sm"
                        className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-full transition-all ${
                          inputMessage.trim() && !isLoading
                            ? 'bg-blue-600 hover:bg-blue-700 scale-100'
                            : 'bg-gray-400 scale-95'
                        }`}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    💡 กด Enter เพื่อส่ง • Shift + Enter เพื่อขึ้นบรรทัดใหม่
                  </p>
                  {isLoading && (
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse"></div>
                      กำลังประมวลผล...
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {sidebarCollapsed ? 'AI Assistant' : 'เลือกการสนทนา'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {sidebarCollapsed 
                    ? 'ผู้ช่วย AI สำหรับระบบจัดการการผลิต' 
                    : 'เลือกการสนทนาจากแถบด้านซ้าย หรือสร้างการสนทนาใหม่'
                  }
                </p>
                {sidebarCollapsed && (
                  <Button
                    onClick={() => createConversationMutation.mutate()}
                    disabled={createConversationMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    เริ่มสนทนาใหม่
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
  );
}