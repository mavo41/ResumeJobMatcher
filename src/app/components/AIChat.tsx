// components/AIChat.tsx
"use client";

import React, { useState, useEffect } from "react";
import { ChatContainer, MessageList, Message, MessageInput,} from "@chatscope/chat-ui-kit-react";
import { useResumeContext } from "../context/ResumeContext";
import Preview from "./Preview"; 

// Define the shape of the expected AI response
interface AiChatResponse {
  message: string;
  section: string;
  data: any; // Or a more specific type
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

  const handleSend = async (userInput: string) => {
   
    // user message added to the chat history
    const newMessages = 
    [...messages,
       { role: "user"as const, content: userInput },];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/chat/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          currentSection, // pass current section
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
        updateResumeData(aiResponse.section as keyof typeof resumeData, aiResponse.data);
      }

      //update current section
      if (aiResponse.nextSection) {
        setCurrentSection(aiResponse.nextSection);
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Sorry, something went wrong please try again later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full">
      {/* Chat box */}  {/*"w-full md:w-1/2 p-4 border-b md:border-b-0 md:border-r*w-full bg-card/90 backdrop-blur-sm border border-border rounded-xl p-4 mb-8 h-64 overflow-y-auto transition-all duration-300 scroll-smooth"*/}
      <div
  className="w-20% bg-card/90 backdrop-blur-sm border border-border rounded-xl p-4 mb-8 h-64 overflow-y-auto transition-all duration-300 scroll-smooth"
>
  <ChatContainer>
    <MessageList>
      {messages.map((msg, idx) => (
        <Message
          className="font-semibold text-s text-muted-foreground mb-1"
          key={idx}
          model={{
            message: msg.content,
            direction: msg.role === "user" ? "outgoing" : "incoming",
            position: 'single',
          }}
        />
      ))}
      {isLoading && (
        <Message
          model={{ message: "Thinking...", direction: "incoming", position: 'single' }}
        />
      )}
    </MessageList>
    <MessageInput
      onSend={handleSend}
      placeholder="Type your message here"
      style={{ backgroundColor: '#c2edf3ff', color: '#000000ff', border: '1px solid #ccc', borderRadius: '4px' }}
    />
  </ChatContainer>
</div>

      {/* Live preview */}
      <div className="w-full  p-4 overflow-y-auto">
        <Preview resumeData={resumeData} />
        {/* Temporary placeholder until downloadResume is lifted to context */}
        <button
          onClick={downloadResume}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded"
          disabled
        >
          Download PDF
        </button>
      </div>
    </div>
  );
};
export default AIChat;
