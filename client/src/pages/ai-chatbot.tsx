import { useState, useEffect, useRef, useMemo } from "react";
// Card imports removed as not used
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MessageSquare, Send, CheckCircle, Settings, User, Bot, BarChart3, TrendingUp, PieChart, Activity, Calendar, Menu, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { AIChart } from "@/components/ui/chart";

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

interface ActionData {
  type: string;
  description: string;
  data: any;
}

function parseActionData(content: string): ActionData | null {
  try {
    const actionMatch = content.match(/\[ACTION\](.*?)\[\/ACTION\]/s);
    if (actionMatch) {
      const actionContent = actionMatch[1].trim();
      const parsed = JSON.parse(actionContent);
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Error parsing action data:', error);
    return null;
  }
}

function parseChartData(content: string) {
  try {
    let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      jsonMatch = content.match(/\[CHART\](.*?)\[\/CHART\]/s);
    }
    if (!jsonMatch) {
      jsonMatch = content.match(/\{[\s\S]*"chart_response"[\s\S]*\}/);
    }
    
    if (jsonMatch) {
      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText.trim());
      
      if (parsed.chart_response) {
        return parsed.chart_response;
      }
      
      if (parsed.type && parsed.data) {
        return parsed;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing chart data:', error)
    return null;
  }
}

function isCodeBlock(content: string): boolean {
  return content.includes('```') || content.includes('<code>');
}

function renderMessageWithLinks(content: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>');
}

export default function AIChatbot() {
  const queryClient = useQueryClient();
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/chat/conversations']
  }) as { data: ChatConversation[]; isLoading: boolean };

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/chat/messages', currentConversationId],
    queryFn: () => currentConversationId ? 
      apiRequest(`/api/chat/messages?conversationId=${currentConversationId}`) : 
      Promise.resolve([]),
    enabled: !!currentConversationId
  });

  const createConversationMutation = useMutation({
    mutationFn: () => apiRequest('/api/chat/conversations', {
      method: 'POST',
      body: { title: `สนทนาใหม่ ${new Date().toLocaleString('th-TH')}` }
    }),
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      setCurrentConversationId(newConversation.id);
      setErrorMessage(null);
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถสร้างการสนทนาใหม่ได้",
        variant: "destructive",
      });
    }
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: number) => apiRequest(`/api/chat/conversations/${conversationId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      // If we deleted the current conversation, clear it
      if (currentConversationId && conversations.find((c: ChatConversation) => c.id === currentConversationId)) {
        setCurrentConversationId(null);
      }
      toast({
        title: "สำเร็จ",
        description: "ลบการสนทนาเรียบร้อยแล้ว",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถลบการสนทนาได้",
        variant: "destructive",
      });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { conversationId: number; message: string }) =>
      apiRequest('/api/chat/messages', {
        method: 'POST',
        body: messageData
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages', currentConversationId] });
      setInputMessage("");
      setErrorMessage(null);
    },
    onError: (error: any) => {
      console.error('Send message error:', error);
      if (error.message.includes('API key')) {
        setErrorMessage("ไม่พบการตั้งค่า AI API Key กรุณาไปที่หน้า 'การตั้งค่า AI' เพื่อเพิ่ม API Key ของ Gemini");
      } else {
        setErrorMessage(error.message || "เกิดข้อผิดพลาดในการส่งข้อความ");
      }
    }
  });

  const executeActionMutation = useMutation({
    mutationFn: async (actionData: ActionData) => {
      return apiRequest('/api/execute-action', {
        method: 'POST',
        body: actionData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-work-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sub-jobs'] });
      toast({
        title: "สำเร็จ",
        description: "ดำเนินการเรียบร้อยแล้ว",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถดำเนินการได้",
        variant: "destructive",
      });
    }
  });

  const executeAction = (actionData: ActionData) => {
    if (confirm(`คุณต้องการให้ AI ดำเนินการ: ${actionData.description} ใช่หรือไม่?`)) {
      executeActionMutation.mutate(actionData);
    }
  };

  useEffect(() => {
    if (conversations.length > 0 && !currentConversationId) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    if (!currentConversationId) {
      const newConversation = await createConversationMutation.mutateAsync();
      setCurrentConversationId(newConversation.id);
    }
    
    sendMessageMutation.mutate({
      conversationId: currentConversationId!,
      message: inputMessage
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      setInputMessage(inputMessage + '\n');
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const groupedMessages = useMemo(() => {
    if (!Array.isArray(messages)) return [];
    
    const grouped = [];
    let currentGroup = null;
    
    for (const message of messages) {
      if (!currentGroup || currentGroup.role !== message.role) {
        currentGroup = {
          role: message.role,
          messages: [message]
        };
        grouped.push(currentGroup);
      } else {
        currentGroup.messages.push(message);
      }
    }
    
    return grouped;
  }, [messages]);

  const suggestedPrompts = [
    { icon: BarChart3, text: "สร้างกราฟแสดงรายได้ของแต่ละทีม", category: "chart" },
    { icon: TrendingUp, text: "วิเคราะห์แนวโน้มการผลิตเดือนนี้", category: "analysis" },
    { icon: PieChart, text: "แสดงสัดส่วนสถานะงานในระบบ", category: "chart" },
    { icon: Activity, text: "สรุปใบบันทึกประจำวันของวันนี้", category: "summary" },
    { icon: Calendar, text: "แสดงงานที่ค้างอยู่ในสัปดาห์นี้", category: "analysis" }
  ];

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      {/* AI Conversations Sidebar */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0'} overflow-hidden bg-white border-r border-gray-200`}>
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">การสนทนา AI</h2>
            <Button
              onClick={() => createConversationMutation.mutate()}
              disabled={createConversationMutation.isPending}
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-2 overflow-y-auto">
            {Array.isArray(conversations) && conversations.map((conversation: ChatConversation) => (
              <div key={conversation.id} className="relative group">
                <Button
                  variant={currentConversationId === conversation.id ? "default" : "ghost"}
                  className={`w-full justify-start text-left h-auto p-3 pr-12 ${
                    currentConversationId === conversation.id 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setCurrentConversationId(conversation.id)}
                >
                  <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{conversation.title}</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-8 w-8 hover:bg-red-100 hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`คุณต้องการลบการสนทนา "${conversation.title}" ใช่หรือไม่?`)) {
                      deleteConversationMutation.mutate(conversation.id);
                    }
                  }}
                  disabled={deleteConversationMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <Button
                onClick={() => setIsSidebarOpen(true)}
                size="sm"
                variant="outline"
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0"
              >
                <Menu className="w-4 h-4 mr-2" />
                แสดงการสนทนา
              </Button>
            )}
            <h1 className="text-xl font-bold text-gray-800">AI ผู้ช่วย</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              size="sm"
              variant="outline"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Settings className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-orange-800 font-medium">การตั้งค่า AI</p>
                <p className="text-orange-700 text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentConversationId ? (
            groupedMessages.length > 0 ? (
              groupedMessages.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-2">
                  {group.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-800'
                        }`}
                      >
                        {(() => {
                          const actionData = parseActionData(message.content);
                          const chartData = parseChartData(message.content);
                          
                          if (actionData) {
                            const cleanContent = message.content.replace(/\[ACTION\](.*?)\[\/ACTION\]/s, '').trim();
                            return (
                              <div className="space-y-3">
                                {cleanContent && (
                                  <div
                                    className="prose prose-sm max-w-none whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{
                                      __html: renderMessageWithLinks(cleanContent)
                                    }}
                                  />
                                )}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-4 h-4 text-blue-600" />
                                    <span className="text-blue-800 font-medium">การดำเนินการที่แนะนำ</span>
                                  </div>
                                  <p className="text-blue-700 text-sm mb-3">{actionData.description}</p>
                                  <Button
                                    onClick={() => executeAction(actionData)}
                                    disabled={executeActionMutation.isPending}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    {executeActionMutation.isPending ? 'กำลังดำเนินการ...' : 'ดำเนินการ'}
                                  </Button>
                                </div>
                              </div>
                            );
                          }
                          
                          if (chartData) {
                            const cleanContent = message.content
                              .replace(/```json[\s\S]*?```/g, '')
                              .replace(/\[CHART\][\s\S]*?\[\/CHART\]/g, '')
                              .replace(/\{[\s\S]*?"chart_response"[\s\S]*?\}/g, '')
                              .trim();
                            return (
                              <div className="space-y-4">
                                {cleanContent && (
                                  <div
                                    className="prose prose-sm max-w-none whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{
                                      __html: renderMessageWithLinks(cleanContent)
                                    }}
                                  />
                                )}
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <AIChart data={chartData} />
                                </div>
                              </div>
                            );
                          }
                          
                          if (isCodeBlock(message.content)) {
                            return (
                              <div
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{
                                  __html: renderMessageWithLinks(message.content.replace(/\n/g, '<br>'))
                                }}
                              />
                            );
                          }
                          
                          return (
                            <div
                              className="prose prose-sm max-w-none whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{
                                __html: renderMessageWithLinks(message.content)
                              }}
                            />
                          );
                        })()}
                      </div>
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">ยินดีต้อนรับสู่ AI ผู้ช่วย</h3>
                  <p className="text-gray-600 mb-6">สร้างการสนทนาใหม่เพื่อเริ่มใช้งาน</p>
                  <div className="grid grid-cols-1 gap-3 max-w-md">
                    <p className="text-sm text-gray-500 mb-2">คำถามที่แนะนำ:</p>
                    {suggestedPrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start text-left p-3 h-auto"
                        onClick={() => setInputMessage(prompt.text)}
                      >
                        <prompt.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">{prompt.text}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">เลือกการสนทนา</h3>
                <p className="text-gray-600">เลือกการสนทนาจากรายการด้านซ้าย หรือสร้างการสนทนาใหม่</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {currentConversationId && (
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="พิมพ์ข้อความ AI ผู้ช่วย... (กด Shift + Enter เพื่อขึ้นบรรทัดใหม่)"
                className="resize-none min-h-[40px] max-h-32"
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending || !inputMessage.trim()}
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6"
              >
                {sendMessageMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}