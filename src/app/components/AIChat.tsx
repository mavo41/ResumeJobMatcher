// components/AIChat.tsx
"use client";

import React, { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useResumeContext } from "../context/ResumeContext";
import Preview from "./Preview";
import {
  ArrowLeft,
  Send,
  Sparkles,
  FileText,
  Download,
  Loader2,
  Bot,
  User,
  Minimize2,
  MoreVertical,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Define the shape of the expected AI response
interface AiChatResponse {
  message: string;
  section: string;
  data: any;
  nextSection: string;
}

const AIChat = () => {
  const {
    messages,
    setMessages,
    resumeData,
    updateResumeData,
    currentSection,
    setCurrentSection,
    downloadResume,
  } = useResumeContext();

  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();
  
  // Initial AI message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Hi! I'm your AI resume assistant. Let's get started. What's your first and last name?",
        },
      ]);
    }
  }, [messages, setMessages]);

  // Auto-scroll to the newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize the textarea based on content
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [userInput]);

  const handleSend = async (userInput: string) => {
    const trimmed = userInput.trim();
    if (!trimmed || isLoading) return;

    // user message added to the chat history
    const newMessages = [
      ...messages,
      { role: "user" as const, content: trimmed },
    ];
    setMessages(newMessages);
    setUserInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/chat/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          currentSection,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("API Error Response:", errorData);
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const aiResponse: AiChatResponse = await res.json();

      // Adding the AI's conversational message to the chat history
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiResponse.message || "..." },
      ]);

      // Update resume context
      if (aiResponse.section && aiResponse.data) {
        updateResumeData(
          aiResponse.section as keyof typeof resumeData,
          aiResponse.data
        );
      }

      // Update current section
      if (aiResponse.nextSection) {
        setCurrentSection(aiResponse.nextSection);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Sorry, something went wrong please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enter = newline, Ctrl/Cmd + Enter = send
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend(userInput);
    }
  };

  // Helper: derive a friendly "current step" label
  const sectionLabels: Record<string, string> = {
    personalInfo: "Personal Information",
    summary: "Professional Summary",
    workExperience: "Work Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    internships: "Internships",
    custom: "Custom Section",
    settings: "Formatting & Style",
  };
  const currentSectionLabel =
    sectionLabels[currentSection] || "Resume Builder";

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden">
      {/* ───────────── Top App Bar ───────────── */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <button
            onClick={() => router.push("/resume-builder")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 group"
            aria-label="Back to Resume Builder"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span className="text-sm font-medium hidden sm:inline">Back to Builder</span>
          </button>
      
          {/* Divider */}
          <div className="w-px h-6 bg-slate-200 hidden sm:block" />
      
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 leading-tight">
                AI Resume Assistant
              </h1>
              <p className="text-xs text-slate-500 leading-tight">
                Building: <span className="text-indigo-600 font-medium">{currentSectionLabel}</span>
              </p>
            </div>
          </div>
        </div>
      
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">Live Preview</span>
          </div>
          <button
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ───────────── Main Two-Column Workspace ───────────── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* ═══════════ LEFT: Chat Column ═══════════ */}
        <section className="flex flex-col w-full lg:w-[45%] xl:w-[42%] bg-white border-r border-slate-200 min-h-0">
          {/* Chat header strip */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Resume Assistant</p>
                <p className="text-[11px] text-slate-400">Typically replies instantly</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Online</span>
            </div>
          </div>

          {/* Messages scroll area */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 min-h-0 bg-slate-50/40">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex items-end gap-3 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Assistant avatar */}
                  {!isUser && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm transition-all duration-200 ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-br-md shadow-indigo-500/20"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* User avatar */}
                  {isUser && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex items-end gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-slate-200 bg-white px-4 py-3 flex-shrink-0">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all duration-200 px-3 py-2">
              <textarea
                ref={textareaRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response… (Ctrl + Enter to send, Enter for new line)"
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none py-1.5 max-h-[200px] overflow-y-auto"
              />
              <button
                onClick={() => handleSend(userInput)}
                disabled={!userInput.trim() || isLoading}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-indigo-500/20"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 px-1">
              Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[10px]">Enter</kbd> to send
            </p>
          </div>
        </section>

        {/* ═══════════ RIGHT: Live Preview Column ═══════════ */}
        <section className="flex flex-col flex-1 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 min-h-0">
          {/* Preview header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white/70 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Live Resume Preview</p>
                <p className="text-[11px] text-slate-400">Updates as you chat</p>
              </div>
            </div>
            <button
              onClick={downloadResume}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-medium shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>

          {/* Preview canvas — A4 paper centered on a soft surface */}
          <div className="flex-1 overflow-y-auto px-6 py-8 min-h-0">
            <div className="max-w-[850px] mx-auto">
              <div className="rounded-2xl bg-white shadow-xl ring-1 ring-slate-200/60 overflow-hidden transition-all duration-300">
                {/* Paper toolbar (fake browser chrome for A4 feel) */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium tracking-wide">
                    resume.pdf — A4
                  </span>
                  <span className="text-[11px] text-slate-400">100%</span>
                </div>

                {/* The actual resume content */}
                <div className="aspect-[1/1.414] w-full overflow-y-auto bg-white">
                  <Preview resumeData={resumeData} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AIChat;