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
   * Generate chat response for support chatbot
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

      const fullPrompt = `${systemPrompt}

Previous conversation:
${conversationContext}

Current user message: ${userMessage}

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
}