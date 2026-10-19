//src\app\resume-builder
"use client";


import React, { useState } from 'react';
import ResumeBuilder from '../components/ResumeBuilder';
import AIChat from '../components/AIChat';
import { ResumeProvider } from '../context/ResumeContext';
import { useRouter } from "next/navigation";

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false); // Toggle between builder and chat
const router = useRouter();

return (
    <ResumeProvider> {/* Wrapping with ResumeProvider to share context */}
      <div className="min-h-screen bg-gray-100 relative">
        {/* Pitch and Toggle */}
        <div className="p-6 bg-white shadow-md mb-4">
          <h1 className="text-2xl font-bold mb-2">Resume Builder</h1>
          <p className="mb-2">
            Create your resume the traditional way with our form-based builder—or try our{" "}
            <span className="text-blue-600 font-semibold">
              AI-powered chat assistant 🤖<button>

              </button>
            </span>
            ! Answer questions naturally, see live updates, and download your resume as a PDF.
          </p>
        </div>
        {/* Default Resume Builder */}
                <ResumeBuilder />
        
                {/* Floating Chat Bubble */}
                <button
  onClick={() => router.push("/ai-assistant")}
  className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all duration-200 z-50"
  title="Open AI Chat Assistant"
  aria-label="Open AI Chat Assistant"
>
  <span className="text-2xl">🤖</span>
</button>
        
                {/* AI Chat Overlay (Visible when isChatOpen is true) */}
                {isChatOpen && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded-lg w-3/4 h-3/4 flex flex-col">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setIsChatOpen(false)}
                          className="text-red-500 hover:text-red-700 w-7 h-7 text-3xl"
                          aria-label="Close Chat"
                        >
                          ✕
                        </button>

                       {/* AI Chat Content */}
                        <div className="flex-1 overflow-hidden">
                            <AIChat />
                        </div>
                      </div>
                    
                    </div>
                  </div>
                )}
              </div>
            </ResumeProvider>
          );
        }