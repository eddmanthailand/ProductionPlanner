import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Plus, MessageSquare, Send, CheckCircle, Settings, User, Bot, BarChart3, TrendingUp, PieChart, Activity, Calendar, Menu } from "lucide-react";
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

// Parse action data from AI response
function parseActionData(content: string): ActionData | null {
  try {
    // Early exit if content appears to be full HTML document
    if (content.trim().startsWith('<!DOCTYPE')) {
      console.log('⚠️ Detected HTML document, skipping action parsing');
      return null;
    }

    // Clean content first - remove HTML and unwanted characters  
    const cleanContent = content
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<html[^>]*>[\s\S]*?<\/html>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<body[^>]*>/gi, '')
      .replace(/<\/body>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&[#\w]+;/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim();
    
    // Look for JSON blocks in the cleaned content
    const jsonMatch = cleanContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                     cleanContent.match(/\{[\s\S]*?"type":\s*"action_response"[\s\S]*?\}/) ||
                     cleanContent.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
    
    if (!jsonMatch) return null;
    
    let jsonStr = jsonMatch[1] || jsonMatch[0];
    
    // Additional cleanup for JSON string
    jsonStr = jsonStr
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .replace(/^\s*[\r\n]+|[\r\n]+\s*$/g, '')
      .trim();
    
    // Validate JSON format
    if (!jsonStr.startsWith('{') || !jsonStr.endsWith('}')) {
      return null;
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Check for different JSON structures
    if (parsed.type === "action_response" && parsed.action) {
      return {
        type: parsed.action.type,
        description: parsed.action.description || parsed.message,
        data: parsed.action.payload || parsed.action
      };
    }
    
    if (parsed.action_response) {
      return {
        type: parsed.action_response.type,
        description: parsed.action_response.description,
        data: parsed.action_response.data
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing action data:', error);
    return null;
  }
}

// Parse chart data from AI response
function parseChartData(content: string) {
  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                     content.match(/\{[\s\S]*"chart_response"[\s\S]*\}/);
    
    if (!jsonMatch) return null;
    
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);
    
    return parsed.chart_response || parsed;
  } catch (error) {
    console.error('Error parsing chart data:', error);
    return null;
  }
}

// Check if content is a code block
function isCodeBlock(content: string): boolean {
  return content.includes('```') && (
    content.includes('SELECT') || 
    content.includes('INSERT') || 
    content.includes('UPDATE') || 
    content.includes('DELETE') ||
    content.includes('CREATE TABLE') ||
    content.includes('function') ||
    content.includes('const ') ||
    content.includes('import ')
  );
}

// Render message with clickable links
function renderMessageWithLinks(content: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>');
}

export default function AIChatbot() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  // Add error handler for better UX
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Query conversations
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['/api/chat/conversations'],
    refetchOnWindowFocus: false
  });

  // Query messages for current conversation
  const { data: conversationMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: [`/api/chat/messages?conversationId=${currentConversationId}`],
    enabled: !!currentConversationId,
    refetchOnWindowFocus: false
  });

  // Use messages directly from query to avoid state issues
  const messages = Array.isArray(conversationMessages) ? conversationMessages : [];

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/chat/conversations', {
        method: 'POST',
        body: { title: 'การสนทนาใหม่' }
      });
      return response;
    },
    onSuccess: (newConversation) => {
      setCurrentConversationId(newConversation.id);
      refetchConversations();
      toast({ 
        title: "สำเร็จ", 
        description: "สร้างการสนทนาใหม่แล้ว" 
      });
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!currentConversationId) {
        throw new Error('ไม่พบการสนทนา');
      }
      
      // Clear any previous errors
      setErrorMessage(null);
      
      const response = await apiRequest('/api/chat/messages', {
        method: 'POST',
        body: {
          conversationId: currentConversationId,
          message: messageText
        }
      });
      return response;
    },
    onSuccess: () => {
      refetchMessages();
      setMessage('');
      setErrorMessage(null);
    },
    onError: (error: any) => {
      console.error('Send message error:', error);
      
      // Handle JSON parsing errors specifically
      if (error.message && error.message.includes('DOCTYPE')) {
        setErrorMessage("ระบบตอบกลับในรูปแบบที่ไม่ถูกต้อง กรุณาลองใหม่");
      } else if (error.message && error.message.includes('JSON')) {
        setErrorMessage("เกิดข้อผิดพลาดในการประมวลผลคำตอบ กรุณาลองใหม่");
      } else {
        const errorMsg = error.message || "ไม่สามารถส่งข้อความได้";
        setErrorMessage(errorMsg);
      }
      
      // Show user-friendly error
      toast({
        title: "การเชื่อมต่อมีปัญหา",
        description: "AI กำลังประมวลผล กรุณารอสักครู่แล้วลองใหม่",
        variant: "destructive"
      });
    }
  });

  // Execute action mutation
  const executeActionMutation = useMutation({
    mutationFn: async (actionData: ActionData) => {
      const response = await apiRequest('/api/execute-action', {
        method: 'POST',
        body: actionData
      });
      return response;
    },
    onSuccess: (result) => {
      toast({
        title: "สำเร็จ",
        description: "ดำเนินการเรียบร้อยแล้ว",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/daily-work-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sub-jobs'] });
    },
    onError: (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถดำเนินการได้",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    if (!currentConversationId) {
      toast({
        title: "แจ้งเตือน",
        description: "กรุณาสร้างการสนทนาใหม่ก่อน",
        variant: "destructive"
      });
      return;
    }

    sendMessageMutation.mutate(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const executeAction = (actionData: ActionData) => {
    executeActionMutation.mutate(actionData);
  };

  // Suggested prompts for quick start
  const suggestedPrompts = [
    { icon: BarChart3, text: "สร้างกราฟแสดงรายได้ของแต่ละทีม", category: "chart" },
    { icon: TrendingUp, text: "วิเคราะห์แนวโน้มการผลิตของเดือนนี้", category: "analysis" },
    { icon: PieChart, text: "แสดงสัดส่วนสินค้าที่ผลิตมากที่สุด", category: "chart" },
    { icon: Activity, text: "สรุปใบบันทึกประจำวันของวันนี้", category: "summary" },
    { icon: Calendar, text: "แสดงงานที่ค้างอยู่ในสัปดาห์นี้", category: "analysis" }
  ];

  return (
    <SidebarProvider>
      <div className="flex h-full max-h-screen bg-gray-50 overflow-hidden">
        <Sidebar className={`transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
          <SidebarContent className="p-4">
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
                <Button
                  key={conversation.id}
                  variant={currentConversationId === conversation.id ? "default" : "ghost"}
                  className={`w-full justify-start text-left h-auto p-3 ${
                    currentConversationId === conversation.id 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setCurrentConversationId(conversation.id)}
                >
                  <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{conversation.title}</span>
                </Button>
              ))}
            </div>
          </SidebarContent>
        </Sidebar>

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
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">!</span>
                </div>
                <div className="text-sm text-orange-800">
                  <span className="font-medium">การเชื่อมต่อมีปัญหา:</span> {errorMessage}
                </div>
                <Button
                  onClick={() => setErrorMessage(null)}
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
                >
                  ×
                </Button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-w-0">
            {!currentConversationId ? (
              <div className="text-center py-12">
                <Bot className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">ยินดีต้อนรับสู่ AI ผู้ช่วย</h3>
                <p className="text-gray-500 mb-6">สร้างการสนทนาใหม่เพื่อเริ่มต้น</p>
                
                <div className="max-w-2xl mx-auto">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">คำสั่งที่แนะนำ:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {suggestedPrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto p-3 text-left justify-start bg-white hover:bg-gray-50"
                        onClick={() => {
                          if (!currentConversationId) {
                            createConversationMutation.mutate();
                          }
                          setMessage(prompt.text);
                        }}
                      >
                        <prompt.icon className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="text-sm">{prompt.text}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'} rounded-lg p-4 shadow-sm border`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-blue-600' : 'bg-gray-100'}`}>
                          {message.role === 'user' ? (
                            <User className="w-4 h-4 text-white" />
                          ) : (
                            <Bot className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1 space-y-3">
                          {/* Chart rendering */}
                          {message.role === 'assistant' && (() => {
                            const chartData = parseChartData(message.content);
                            if (chartData) {
                              try {
                                return <AIChart chartData={chartData} />;
                              } catch (error) {
                                return (
                                  <p className="text-sm text-red-600">
                                    ข้อมูลกราฟไม่สมบูรณ์
                                  </p>
                                );
                              }
                            }
                            return null;
                          })()} 
                          
                          {/* Code block rendering */}
                          {isCodeBlock(message.content) ? (
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-sm font-mono text-green-400 overflow-x-auto border border-slate-700 shadow-lg">
                              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-600">
                                <div className="flex gap-1">
                                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                </div>
                                <span className="text-slate-400 text-xs ml-2">โค้ด</span>
                              </div>
                              <pre className="whitespace-pre-wrap text-green-300">{message.content}</pre>
                            </div>
                          ) : message.role === 'assistant' ? (
                            <div className="space-y-4">
                              {/* Clean content without HTML tags for display */}
                              <div className="prose prose-sm max-w-none">
                                <div 
                                  className="text-sm leading-relaxed text-gray-800"
                                  dangerouslySetInnerHTML={{ 
                                    __html: renderMessageWithLinks(message.content)
                                      .replace(/<!DOCTYPE[^>]*>/gi, '')
                                      .replace(/<[^>]*>/g, '')
                                      .replace(/&[#\w]+;/g, '')
                                      .replace(/\n/g, '<br>') 
                                  }}
                                />
                              </div>
                              
                              {/* Action Buttons - Active Mode */}
                              {(() => {
                                const actionData = parseActionData(message.content);
                                if (!actionData) return null;
                                
                                return (
                                  <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl shadow-sm">
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                                        <span className="text-xs text-white font-bold">✨</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                                          <span>🤖 การดำเนินการที่แนะนำ</span>
                                        </div>
                                        <div className="text-sm text-emerald-700 mb-4 leading-relaxed">
                                          {actionData.description || 'AI แนะนำให้ดำเนินการดังต่อไปนี้'}
                                        </div>
                                        <Button
                                          onClick={() => executeAction(actionData)}
                                          disabled={executeActionMutation.isPending}
                                          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-5 py-2.5 text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border-0"
                                        >
                                          {executeActionMutation.isPending ? (
                                            <>
                                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                              กำลังดำเนินการ...
                                            </>
                                          ) : (
                                            <>
                                              <CheckCircle className="w-4 h-4 mr-2" />
                                              ยืนยันดำเนินการ
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">
                              {message.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="พิมพ์ข้อความหา AI ผู้ช่วย... (กด Shift+Enter เพื่อขึ้นบรรทัดใหม่)"
                className="flex-1 min-h-[44px] max-h-32 resize-none"
                disabled={sendMessageMutation.isPending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
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
        </div>
      </div>
    </SidebarProvider>
  );
}