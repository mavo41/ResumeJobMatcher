// app/chat/api/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";



// Definition pf types for our request and response
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ApiRequest {
  messages: ChatMessage[];
  currentSection?: string;
}
export async function POST(req: Request) {
  try {
    const { messages, currentSection }: ApiRequest = await req.json();
    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_KEY) {
      return NextResponse.json(
        {
          error: "Gemini API key not configured. Please set GEMINI_API_KEY.",
        },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      

     // conversation history for context
    const conversationHistory = messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'model'}: ${msg.content}`)
      .join('\n');

    // structured prompt with clear instructions
    const userMessage = messages[messages.length - 1]?.content || "";
    const systemPrompt = `
You are a friendly resume-building assistant named Mzee Resume Coach. 
Your goal is to build a user's resume step by step through conversation. 
Follow this exact order of sections, asking one section at a time:
CURRENT SECTION: ${currentSection|| 'personalInfo'}

1. Personal Info: Ask for first/last name, email, phone, location, website.
2. Professional Summary: Ask for a brief overview (400-600 chars).
3. Work Experience: Ask for job title, company, start/end dates (MM/YYYY), city, description. Allow multiple entries (ask "Add another?").
4. Education: Ask for degree/major, school, start/end dates, city. Allow multiple.
5. Skills: Ask for a comma-separated list, then optional featured skills (name + proficiency 1-5).
6. Projects: Ask for name, date, description. Allow multiple.
7. Internships: Ask for job title, employer, start/end dates, city, description. Allow multiple.
8. Custom Section: Ask if they want one (title + content).
9. Resume Settings: Ask for font family (Arial/Times/Helvetica/Courier), size (10/11/12/14 pt), line spacing (1/1.15/1.5/2).

Rules:
- Be conversational and encouraging (e.g., "Great, let's start with your name!").
- Ask clarifying questions if input is unclear.
- After each response, extract data as JSON:
  { "section": "personalInfo", "data": { ...full object... } }
- For multiple entries (e.g., workExperience), append to array.
- Only advance to next section after confirming the current one.
- If skipped, note it and proceed.
- At the end: "Resume complete! Here's a summary. Ready to download?"
- Always end with JSON in this format:
\`\`\`json
{
  "section": "sectionName",
  "data": { /* extracted data */ },
  "nextSection": "nextSectionName",
  "message": "Your conversational response here"
}
\`\`\` for parsing.

CONVERSATION HISTORY:
${conversationHistory}

Now continue the conversation to help build the resume:

`;

    const prompt = `${systemPrompt}\nUser: ${userMessage}`;

    
    // Generation configuration
    const generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    };

    // Safety settings
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      }
    ];


      try {
  const userMessage = messages[messages.length - 1]?.content || "";

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
      });
    const text = result.response.text();

    // Extract JSON from the response
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      
      if (!jsonMatch || !jsonMatch[1]) {
        throw new Error('No JSON found in Gemini response');
      }

      const parsedData = JSON.parse(jsonMatch[1]);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { 
         error: "AI request failed",
         details: error.message 
        },
      { status: 500 }
    );
  }
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

