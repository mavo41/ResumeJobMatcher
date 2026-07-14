// app/chat/api/route.ts
import { NextResponse } from "next/server";
import { generateChatCompletion } from "../../lib/ai/aiProvider";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ApiRequest {
  messages: ChatMessage[];
  currentSection?: string;
}

export async function POST(req: Request) {
  try {
    const { messages, currentSection }: ApiRequest = await req.json();

    const conversationHistory = messages
      .map((msg) => `${msg.role === "user" ? "User" : "model"}: ${msg.content}`)
      .join("\n");

    const userMessage = messages[messages.length - 1]?.content || "";

    const systemPrompt = `
You are a friendly resume-building assistant named Mzee Resume Coach. 
Your goal is to build a user's resume step by step through conversation. 
Follow this exact order of sections, asking one section at a time:
CURRENT SECTION: ${currentSection || "personalInfo"}

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
- IMPORTANT: For object-shaped sections (personalInfo, skills, custom, settings), always include ALL fields you know so far for that section in "data", not just the field just discussed — the client will use exactly what you send, it will not remember older fields on its own.
- For array-shaped sections (workExperience, education, projects, internships), return "data" as a single object representing ONE new entry to add (the client appends it), unless the user is editing a previous entry, in which case return the full array.
- Only advance to next section after confirming the current one.
- If skipped, note it and proceed.
- At the end: "Resume complete! Here's a summary. Ready to download?"

Respond with ONLY a JSON object (no prose, no markdown fences) in this exact shape:
{
  "section": "sectionName",
  "data": { /* extracted data for this section, per the rules above */ },
  "nextSection": "nextSectionName",
  "message": "Your conversational response here"
}

CONVERSATION HISTORY:
${conversationHistory}

Now continue the conversation to help build the resume:
User: ${userMessage}`;

    const result = await generateChatCompletion(systemPrompt, { taskType: "structured_json" });

    const parsedData = JSON.parse(result.text);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "AI request failed", details: error.message },
      { status: 500 }
    );
  }
}