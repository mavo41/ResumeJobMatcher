// app/ai-assistant/page.tsx
"use client";

import AIChat from "../components/AIChat";
import { ResumeProvider } from "../context/ResumeContext";

export default function AIAssistantPage() {
  return (
    <ResumeProvider>
      <AIChat />
    </ResumeProvider>
  );
}