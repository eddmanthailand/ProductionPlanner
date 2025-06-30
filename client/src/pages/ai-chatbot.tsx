import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Send, Bot, User, MessageSquare } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

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
    queryKey: ['/api/chat/conversations', selectedConversation, 'messages'],
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
        queryKey: ['/api/chat/conversations', selectedConversation, 'messages'] 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      setInputMessage('');
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
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

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isLoading) return;
    
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
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-[calc(100vh-200px)] bg-gray-50 rounded-lg overflow-hidden">
        {/* Sidebar - Conversations List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
              </div>
              <Button
                onClick={() => createConversationMutation.mutate()}
                disabled={createConversationMutation.isPending}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
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
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Assistant</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">พร้อมใช้งาน</span>
                    </div>
                  </div>
                </div>
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
                          <h4 className="font-medium text-sm mb-2">รายงานประสิทธิภาพ</h4>
                          <p className="text-xs text-gray-600">วิเคราะห์ผลผลิต รายได้ทีม</p>
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
                    </div>
                  ) : (
                    messages.map((message: ChatMessage) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {message.role === 'assistant' && (
                              <Bot className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm whitespace-pre-wrap">
                                {message.content}
                              </p>
                              <p
                                className={`text-xs mt-2 ${
                                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                                }`}
                              >
                                {formatMessageTime(message.createdAt)}
                              </p>
                            </div>
                            {message.role === 'user' && (
                              <User className="h-5 w-5 text-blue-100 mt-0.5 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-lg p-3 max-w-[70%]">
                        <div className="flex items-center gap-2">
                          <Bot className="h-5 w-5 text-blue-600" />
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="พิมพ์ข้อความ..."
                      disabled={isLoading}
                      className="pr-12"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      size="sm"
                      className="absolute right-1 top-1 h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  กด Enter เพื่อส่งข้อความ • Shift + Enter เพื่อขึ้นบรรทัดใหม่
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  เลือกการสนทนา
                </h3>
                <p className="text-gray-600">
                  เลือกการสนทนาจากแถบด้านซ้าย หรือสร้างการสนทนาใหม่
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}