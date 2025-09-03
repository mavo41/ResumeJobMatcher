//src\app\resume-builder
"use client";


import React, { useState } from 'react';
import ResumeBuilder from '../components/ResumeBuilder';
import AIChat from '../components/AIChat';
import { ResumeProvider } from '../context/ResumeContext';

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false); // Toggle between builder and chat

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
                  onClick={() => setIsChatOpen(true)}
                  className="fixed bottom-4 right-4 w-12 h-12 bg-blue-500 width-90% height-90% text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition z-50"
                  title="Open AI Chat"
                >
                  🤖
                </button>
        
                {/* AI Chat Overlay (Visible when isChatOpen is true) */}
                {isChatOpen && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded-lg w-3/4 h-3/4 flex flex-col">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setIsChatOpen(false)}
                          className="text-red-500 hover:text-red-700"
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