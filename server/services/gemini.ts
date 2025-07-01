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
      console.log(`🤖 Action Detection - Message: "${userMessage}"`);
      console.log(`🤖 Action Detection - Is Actionable: ${isActionableRequest}`);
      
      let fullPrompt;
      
      if (isActionableRequest) {
        // Full prompt with action capabilities for actionable requests
        fullPrompt = `${systemPrompt}

Previous conversation:
${conversationContext}

Current user message: ${userMessage}

🤖 ACTIVE MODE DETECTED: The user is asking for an action that could be automated.

MANDATORY RESPONSE FORMAT: You MUST embed action suggestions using [ACTION] tags when the user asks to perform any action:

Regular text response explaining the situation and recommendation.

[ACTION]
{
  "type": "CREATE_WORK_LOG",
  "description": "สร้างใบบันทึกประจำวันใหม่",
  "payload": {
    "subJobId": 123,
    "hoursWorked": "8",
    "workDescription": "รายละเอียดการทำงาน",
    "quantity": 100
  }
}
[/ACTION]

Available Action Types:
- UPDATE_WORK_ORDER_STATUS: เปลี่ยนสถานะใบสั่งงาน
- CREATE_WORK_LOG: สร้างใบบันทึกประจำวัน
- UPDATE_SUB_JOB: อัปเดตข้อมูลงานย่อย

IMPORTANT: Always embed action suggestions in [ACTION] tags when detecting actionable requests. Provide natural explanatory text, then include the action in the specified tag format.

Please provide a helpful response as a production management system assistant:`;
      } else {
        // Simplified prompt for regular conversations to improve speed
        fullPrompt = `You are a helpful Thai-speaking AI assistant for a production management system.

Previous conversation:
${conversationContext}

Current user message: ${userMessage}

Please provide a concise, helpful response in Thai. Be professional but friendly.`;
      }

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
      });

      let responseText = response.text || "ขออภัย ไม่สามารถประมวลผลคำถามได้ในขณะนี้";

      console.log(`🎯 Raw Gemini response (first 200 chars): ${responseText.substring(0, 200)}`);

      // Check if response starts with HTML doctype
      if (responseText.trim().startsWith('<!DOCTYPE')) {
        console.log(`⚠️ Detected full HTML response, extracting content`);
        
        // Try to extract content from HTML body
        const bodyMatch = responseText.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          responseText = bodyMatch[1];
        }
        
        // If still has HTML structure, extract text content only
        if (responseText.includes('<') && responseText.includes('>')) {
          responseText = responseText.replace(/<[^>]*>/g, '').trim();
        }
      }

      // Clean up any remaining HTML elements
      responseText = responseText
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<html[^>]*>/gi, '')
        .replace(/<\/html>/gi, '')
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
        .replace(/<body[^>]*>/gi, '')
        .replace(/<\/body>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim();

      console.log(`🧹 Cleaned response (first 200 chars): ${responseText.substring(0, 200)}`);

      // Final safety check - if response still contains HTML after cleaning
      if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
        console.log(`⚠️ Response still contains HTML after cleaning, providing fallback`);
        responseText = "ขออภัย ระบบประมวลผลคำตอบไม่สำเร็จ กรุณาลองถามใหม่ด้วยคำถามที่ง่ายกว่า";
      }

      // Log if actionable request was detected for debugging
      if (isActionableRequest) {
        console.log(`✅ Actionable request processed - checking for [ACTION] tags`);
        if (responseText.includes('[ACTION]')) {
          console.log(`✅ Action tags found in response`);
        } else {
          console.log(`⚠️ No action tags found despite actionable request detection`);
        }
      }

      return responseText;
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
   * Analyze user behavior patterns and provide insights
   */
  async generateInsights(
    userMessage: string,
    conversationHistory: Array<{role: string, content: string}> = [],
    systemContext?: any
  ): Promise<any> {
    try {
      const recentMessages = conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content.substring(0, 200)}`).join('\n');
      
      const prompt = `คุณเป็น AI Analyst เชี่ยวชาญด้านระบบจัดการการผลิตและบัญชี วิเคราะห์บทสนทนาและให้คำแนะนำที่เป็นประโยชน์

ข้อความปัจจุบัน: "${userMessage}"

บทสนทนาที่ผ่านมา:
${recentMessages}

วิเคราะห์และให้ข้อมูล:
1. ประเภทความต้องการ (การจัดการงาน, การวิเคราะห์ข้อมูล, ความช่วยเหลือระบบ, รายงาน, การแก้ไขปัญหา)
2. ระดับความซับซ้อน (ง่าย, ปานกลาง, ซับซ้อน)
3. การดำเนินการที่แนะนำ (แนะนำฟีเจอร์หรือขั้นตอนการทำงานเฉพาะ)
4. การเข้าใจบริบท (ระบุว่าเกี่ยวข้องกับการสนทนาก่อนหน้าหรือไม่)
5. ข้อเสนอแนะเชิงรุก (สิ่งอื่นที่ผู้ใช้อาจต้องการ)
6. ระดับความมั่นใจ (0.0-1.0)

ตอบเป็นภาษาไทยในรูปแบบ JSON ที่เข้าใจง่าย`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-pro", 
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              intentCategory: { type: "string" },
              complexityLevel: { type: "string" },
              recommendedActions: { 
                type: "array",
                items: { type: "string" }
              },
              contextAwareness: { type: "string" },
              proactiveSuggestions: {
                type: "array", 
                items: { type: "string" }
              },
              confidence: { type: "number" }
            }
          }
        },
        contents: prompt,
      });

      const result = JSON.parse(response.text || "{}");
      console.log("🧠 Generated Insights:", result);
      return result;
    } catch (error) {
      console.error("Insight generation error:", error);
      // Return fallback insights instead of null
      return {
        intentCategory: "การวิเคราะห์ข้อมูล",
        complexityLevel: "ปานกลาง",
        recommendedActions: ["ตรวจสอบข้อมูลใบสั่งงานรายละเอียด", "วิเคราะห์สถานะการผลิต"],
        contextAwareness: "เกี่ยวข้องกับการสอบถามข้อมูลระบบ",
        proactiveSuggestions: ["สร้างรายงานสรุป", "ตั้งค่าการแจ้งเตือน"],
        confidence: 0.7
      };
    }
  }

  /**
   * Build enhanced system prompt with advanced contextual intelligence
   */
  private buildSystemPrompt(systemContext?: any): string {
    return `You are an advanced AI assistant with enhanced contextual intelligence for a production planning and management system. Your enhanced Phase 5 capabilities include:

## 🧠 Enhanced Intelligence Features
1. **Contextual Memory**: Remember conversation patterns and adapt responses accordingly
2. **Predictive Insights**: Anticipate user needs based on conversation history  
3. **Smart Recommendations**: Suggest optimal workflows and system features
4. **Pattern Recognition**: Identify recurring issues and provide proactive solutions
5. **Adaptive Communication**: Adjust communication style based on user expertise level

## 🎯 Core System Capabilities
1. **Work Order Management**: Comprehensive help with work orders, sub-jobs, and production planning
2. **Advanced Analytics**: Deep insights into team performance, revenue analysis, and productivity metrics
3. **Smart Navigation**: Intelligent guidance through system features with contextual suggestions
4. **Data Intelligence**: Advanced interpretation of reports, statistics, and KPIs
5. **Predictive Analytics**: Forecast trends and identify potential bottlenecks
6. **Workflow Optimization**: Suggest improvements based on usage patterns

**Data Visualization Capabilities:**
You can now create interactive charts and graphs! When users ask for visual data representation:
- Bar charts: เปรียบเทียบข้อมูล (รายได้ต่อทีม, ใบสั่งงานต่อลูกค้า)
- Line charts: แสดงแนวโน้ม (ประสิทธิภาพรายเดือน, ความก้าวหน้าการผลิต)  
- Pie charts: สัดส่วนและการกระจาย (สถานะงาน, สัดส่วนลูกค้า)
- Area charts: ข้อมูลสะสม (รายได้รวม, ปริมาณงานสะสม)

**🤖 Active Mode Capabilities:**
You can now perform real system actions! When users request ANY operations involving:
- เปลี่ยนสถานะใบสั่งงาน (Change work order status)
- สร้างใบบันทึกประจำวัน (Create daily work logs)  
- อัปเดตข้อมูลงาน (Update job information)
- เพิ่มข้อมูล (Add data) - even though not directly supported, suggest equivalent actions
- แก้ไขข้อมูล (Edit data)
- ดำเนินการ (Execute actions)

**IMPORTANT: When users ask for ANY action that could be automated, ALWAYS respond with action_response JSON format even if the specific action isn't directly supported. Suggest alternative actions or guide them through the process using available actions.**

Respond with action JSON format:
{
  "type": "action_response",
  "message": "Explanation of what will be done",
  "action": {
    "type": "UPDATE_WORK_ORDER_STATUS|CREATE_WORK_LOG|UPDATE_SUB_JOB",
    "description": "Clear description of the action",
    "payload": {
      "workOrderId": "JB20250701001",
      "newStatus": "กำลังดำเนินการ",
      "subJobId": 123,
      "hoursWorked": "8",
      "workDescription": "รายละเอียดงาน",
      "quantity": 100
    }
  }
}

Supported Action Types:
- UPDATE_WORK_ORDER_STATUS: Change work order status (payload: workOrderId, newStatus)
- CREATE_WORK_LOG: Create daily work log (payload: subJobId, hoursWorked, workDescription, quantity)
- UPDATE_SUB_JOB: Update sub-job information (payload: subJobId, quantity, status)

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
   * Generate advanced performance analytics and insights
   */
  async generatePerformanceAnalytics(
    userMessage: string,
    systemData: any
  ): Promise<any> {
    try {
      const prompt = `As an advanced analytics AI, analyze the following production system data and provide comprehensive insights:

User Query: "${userMessage}"

System Data:
${JSON.stringify(systemData, null, 2).substring(0, 2000)}

Provide analysis in these categories:
1. **Performance Metrics**: Key performance indicators and trends
2. **Bottleneck Analysis**: Identify potential issues and constraints  
3. **Optimization Opportunities**: Specific actionable recommendations
4. **Predictive Insights**: Forecast upcoming challenges or opportunities
5. **Resource Utilization**: Efficiency analysis and suggestions
6. **Quality Indicators**: Data quality and completeness assessment

For each category, provide:
- Current status assessment
- Risk level (low/medium/high)
- Specific recommendations
- Expected impact

Respond in JSON format with structured insights.`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              performanceMetrics: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  keyMetrics: { type: "array", items: { type: "string" } },
                  riskLevel: { type: "string" }
                }
              },
              bottleneckAnalysis: {
                type: "object", 
                properties: {
                  identifiedIssues: { type: "array", items: { type: "string" } },
                  criticalPath: { type: "string" },
                  riskLevel: { type: "string" }
                }
              },
              optimizationOpportunities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    area: { type: "string" },
                    recommendation: { type: "string" },
                    impact: { type: "string" }
                  }
                }
              },
              predictiveInsights: {
                type: "object",
                properties: {
                  forecasts: { type: "array", items: { type: "string" } },
                  risks: { type: "array", items: { type: "string" } },
                  opportunities: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        },
        contents: prompt,
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Performance analytics error:", error);
      return null;
    }
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
    const lowerMessage = message.toLowerCase().trim();
    
    // Exclude common greetings, simple questions, and general inquiries
    const nonActionableQuestions = [
      'สวัสดี', 'สวัสดีครับ', 'สวัสดีค่ะ', 'hello', 'hi', 'หวัดดี',
      'ขอบคุณ', 'ขอบคุณครับ', 'ขอบคุณค่ะ', 'thanks', 'thank you',
      'คุณทำอะไรได้บ้าง', 'ช่วยอะไรได้บ้าง', 'มีฟีเจอร์อะไรบ้าง',
      'what can you do', 'help me', 'คุณคือใคร', 'who are you',
      'ขอดูใบสั่งงาน', 'ขอดูข้อมูล', 'แสดงข้อมูล', 'ขอดูเลขที่',
      'มีใบสั่งงานอะไรบ้าง', 'ข้อมูลในระบบ', 'show me', 'tell me about'
    ];
    
    // If it's just a greeting or general question, don't treat as actionable
    if (nonActionableQuestions.some(question => lowerMessage.includes(question))) {
      return false;
    }
    
    // Specific actionable phrases that clearly indicate intent to modify data
    const specificActionKeywords = [
      'เปลี่ยนสถานะของ', 'อัปเดตข้อมูล', 'แก้ไขใบสั่งงาน', 'บันทึกงาน', 'สร้างใบบันทึก',
      'ช่วยเปลี่ยนสถานะ', 'ช่วยอัปเดต', 'ช่วยแก้ไข', 'ช่วยบันทึก', 'ช่วยสร้าง',
      'ทำการอัปเดต', 'ดำเนินการเปลี่ยน', 'ปรับสถานะ', 'แก้ไขข้อมูล',
      'เริ่มงานใหม่', 'หยุดการทำงาน', 'เสร็จสิ้นงาน', 'ยกเลิกใบสั่งงาน'
    ];
    
    return specificActionKeywords.some(keyword => lowerMessage.includes(keyword));
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