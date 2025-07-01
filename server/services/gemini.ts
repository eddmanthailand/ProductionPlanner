import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private apiKey: string;
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    if (apiKey) {
      // Use provided API key (already decrypted if needed)
      this.apiKey = apiKey;
    } else {
      // Use system-wide API key for development
      this.apiKey = process.env.GEMINI_API_KEY || "";
    }
    
    if (!this.apiKey) {
      throw new Error("Gemini API key not found");
    }
    
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  /**
   * Generate chat response for support chatbot with action support
   */
  async generateChatResponse(
    userMessage: string, 
    conversationHistory: Array<{role: string, content: string}> = [],
    systemContext?: any
  ): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(systemContext);
      
      // Build conversation context
      const conversationContext = conversationHistory
        .slice(-10) // Keep only last 10 messages for context
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      // Check if this could be an actionable request
      const isActionableRequest = this.detectActionableRequest(userMessage);
      
      let fullPrompt = `${systemPrompt}

Previous conversation:
${conversationContext}

Current user message: ${userMessage}`;

      if (isActionableRequest) {
        fullPrompt += `

SPECIAL INSTRUCTIONS FOR ACTIONABLE REQUESTS:
If you can help the user by performing a specific action (like updating work order status, creating records, etc.), please respond in this JSON format:

{
  "type": "action_request",
  "displayText": "Your helpful response in Thai",
  "action": {
    "type": "ACTION_TYPE",
    "payload": {
      "key": "value"
    }
  }
}

Available actions:
- UPDATE_WORK_ORDER_STATUS: Update work order status
- CREATE_WORK_LOG: Create daily work log entry
- UPDATE_SUB_JOB: Update sub-job details
- GENERATE_REPORT: Generate specific reports

If the request is not actionable, respond normally with helpful information.`;
      }

      fullPrompt += `

Please provide a helpful response as a production management system assistant:`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
      });

      return response.text || "ขออภัย ไม่สามารถประมวลผลคำถามได้ในขณะนี้";
    } catch (error: any) {
      console.error("Gemini API error:", error);
      throw new Error(`Failed to generate response: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Analyze user intent and suggest actions
   */
  async analyzeUserIntent(userMessage: string): Promise<{
    intent: string;
    confidence: number;
    suggestedAction?: string;
    parameters?: any;
  }> {
    try {
      const prompt = `Analyze the following user message and determine the intent related to a production management system.

User message: "${userMessage}"

Classify the intent into one of these categories:
- work_order_query: asking about work orders
- production_status: asking about production status
- team_performance: asking about team performance
- system_help: asking for help with system features
- data_search: looking for specific data
- report_request: requesting reports
- general_chat: general conversation

Respond in JSON format:
{
  "intent": "category_name",
  "confidence": 0.95,
  "suggestedAction": "specific_action_if_applicable",
  "parameters": {}
}`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              intent: { type: "string" },
              confidence: { type: "number" },
              suggestedAction: { type: "string" },
              parameters: { type: "object" }
            },
            required: ["intent", "confidence"]
          }
        },
        contents: prompt,
      });

      const result = JSON.parse(response.text || "{}");
      return result;
    } catch (error) {
      console.error("Intent analysis error:", error);
      return {
        intent: "general_chat",
        confidence: 0.5
      };
    }
  }

  /**
   * Build system prompt with context about the production system
   */
  private buildSystemPrompt(systemContext?: any): string {
    return `You are an AI assistant for a production planning and management system. Your role is to help users with:

1. **Work Order Management**: Help users understand work orders, sub-jobs, and production planning
2. **Team Performance**: Answer questions about team productivity, revenue reports, and daily work logs
3. **System Navigation**: Guide users through different features and modules
4. **Data Interpretation**: Explain reports, statistics, and system data
5. **Data Visualization**: Create interactive charts and graphs when requested
6. **Troubleshooting**: Help with common system issues and workflows

**Data Visualization Capabilities:**
You can now create interactive charts and graphs! When users ask for visual data representation:
- Bar charts: เปรียบเทียบข้อมูล (รายได้ต่อทีม, ใบสั่งงานต่อลูกค้า)
- Line charts: แสดงแนวโน้ม (ประสิทธิภาพรายเดือน, ความก้าวหน้าการผลิต)  
- Pie charts: สัดส่วนและการกระจาย (สถานะงาน, สัดส่วนลูกค้า)
- Area charts: ข้อมูลสะสม (รายได้รวม, ปริมาณงานสะสม)

**Important:** Only use real data from the system. Never create mock or example data.

**System Context:**
- Multi-tenant SaaS production management system
- Features: Work Orders, Production Planning, Team Management, Revenue Reports  
- Modules: Production, Sales, Inventory, Master Data, Accounting
- Role-based access control with 8 permission levels
- Thai language interface with production terminology
- Chart.js integration for data visualization

**Guidelines:**
- Be helpful, professional, and concise
- Use Thai language when appropriate
- Create visual charts when data would be better understood visually
- Use real system data only - never mock data
- Provide step-by-step instructions when needed
- Reference specific system features accurately
- If you don't know something, admit it and suggest alternatives
- Always prioritize user safety and data security

**Available Data Context:**
${systemContext ? JSON.stringify(systemContext, null, 2) : 'No specific context provided'}

Remember: You're here to make the production management system easier to use and understand.`;
  }

  /**
   * Generate summary of conversation
   */
  async generateConversationSummary(messages: Array<{role: string, content: string}>): Promise<string> {
    try {
      const conversation = messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      const prompt = `Summarize this conversation in a concise title (max 50 characters):

${conversation}

Generate a short, descriptive title in Thai that captures the main topic discussed.`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return response.text?.trim() || "การสนทนาเกี่ยวกับระบบ";
    } catch (error) {
      console.error("Summary generation error:", error);
      return "การสนทนาเกี่ยวกับระบบ";
    }
  }

  /**
   * Detect if user message contains actionable requests
   */
  private detectActionableRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Keywords that suggest actionable requests
    const actionKeywords = [
      'เปลี่ยนสถานะ', 'อัปเดต', 'แก้ไข', 'เพิ่ม', 'ลบ', 'บันทึก', 'สร้าง',
      'update', 'change', 'modify', 'add', 'create', 'delete', 'save',
      'ช่วยเปลี่ยน', 'ช่วยอัปเดต', 'ช่วยแก้ไข', 'ช่วยเพิ่ม', 'ช่วยสร้าง',
      'ทำให้', 'จัดการ', 'ดำเนินการ', 'ปรับ', 'แก้', 'ตั้งค่า',
      'เริ่มงาน', 'หยุดงาน', 'เสร็จสิ้น', 'ยกเลิก', 'ลบออก'
    ];
    
    return actionKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Parse AI response and check if it contains actionable JSON
   */
  parseActionResponse(response: string): {
    isAction: boolean;
    displayText: string;
    action?: any;
  } {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      
      if (parsed.type === 'action_request' && parsed.action) {
        return {
          isAction: true,
          displayText: parsed.displayText || response,
          action: parsed.action
        };
      }
    } catch (error) {
      // Not JSON, check if it contains JSON within text
      const jsonMatch = response.match(/\{[^}]*"type":\s*"action_request"[^}]*\}/);
      if (jsonMatch) {
        try {
          const actionData = JSON.parse(jsonMatch[0]);
          return {
            isAction: true,
            displayText: actionData.displayText || response,
            action: actionData.action
          };
        } catch (parseError) {
          // JSON parsing failed, treat as normal response
        }
      }
    }
    
    return {
      isAction: false,
      displayText: response
    };
  }
}