// app/employer/candidates/components/AI/AICopilot.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, Lightbulb, Users, Target, Calendar } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Candidate } from "./types";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface AICopilotProps {
  userId: string;
  jobId?: string;
  candidates?: Candidate[];
}

export default function AICopilot({ userId, jobId, candidates }: AICopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `👋 Hello! I'm your AI hiring assistant. I can help you with:

• **Find the best candidates** - "Who are my top candidates?"
• **Compare applicants** - "Compare Sarah and John"
• **Generate interview questions** - "Create questions for the top candidate"
• **Analyze skill gaps** - "What skills are missing in this applicant pool?"
• **Get hiring insights** - "What trends do you see in these applications?"

What would you like to know?`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Who are my top candidates?",
    "Compare the best 3 candidates",
    "Generate interview questions",
    "What skills are missing?",
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveConversation = useMutation(api.ai.saveAIConversation);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          context: {
            userId,
            jobId,
            jobTitle: candidates?.[0]?.jobTitle || "Not specified",
            candidates: candidates?.map(c => ({
              id: c._id,
              name: c.name,
              skills: c.skills,
              experience: c.experience,
              status: c.status,
              matchScore: c.matchScore,
              resumeText: c.notes || "",
            })),
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save conversation
      await saveConversation({
        employerId: userId,
        messages: [...messages, userMessage, assistantMessage],
        context: { jobId: jobId as any },
      });
    } catch (error) {
      console.error("AI Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm having trouble processing your request. Please try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold">AI Hiring Assistant</span>
            <p className="text-xs text-zinc-500">Powered by AI • {candidates?.length || 0} candidates in context</p>
          </div>
        </div>
        <Sparkles className="w-4 h-4 text-indigo-500" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] p-3 rounded-xl ${
              msg.role === "user" 
                ? "bg-indigo-600 text-white" 
                : "bg-zinc-100 dark:bg-zinc-800"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {msg.role === "assistant" && <Bot className="w-4 h-4 text-indigo-500" />}
                <span className="text-xs font-medium opacity-70">
                  {msg.role === "user" ? "You" : "AI Assistant"}
                </span>
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about candidates, comparisons, or hiring insights..."
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}