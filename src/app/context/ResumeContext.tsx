// context/ResumeContext.tsx
"use client";


import { createContext, useState, ReactNode, useContext, useRef } from 'react';
import { ResumeData } from '../components/ResumeBuilder'; // Import your type
import html2pdf from 'html2pdf.js';

const initialData: ResumeData = { 
  personalInfo: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    website: '',
  },
  summary: '',
  workExperience:[],
  education: [],
  skills: {
    list: '',
    featured: [],
  },
  projects: [],
  internships: [],
  custom: {
    title: '',
    content: '',
  },
  settings: {
    fontFamily: 'Arial,  Times New Roman, Helvetica, Courier',
    fontSize: '12pt 11pt, 13pt, 14pt',
    lineSpacing: '1, 1.15, 1.5, 2',
  },
};

// Chat message type
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ResumeContextType {
  resumeData: ResumeData;
  setResumeData: React.Dispatch<React.SetStateAction<ResumeData>>;
  updateResumeData: (section: keyof ResumeData, data: any) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentSection: string;
  setCurrentSection: React.Dispatch<React.SetStateAction<string>>;
  downloadResume: () => void;
   previewRef: React.RefObject<HTMLDivElement | null>; //  allow null
}

export const ResumeContext = createContext<ResumeContextType | undefined>(
  undefined
);


export const ResumeProvider = ({ children }: { children: ReactNode }) => {
  const [resumeData, setResumeData] = useState<ResumeData>(initialData);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSection, setCurrentSection] = useState<string>("personalInfo");
  const previewRef = useRef<HTMLDivElement | null>(null);


  const updateResumeData = (section: keyof ResumeData, data: any) => {
    setResumeData((prev: ResumeData) => ({ ...prev, [section]: data }));
  };

    const downloadResume = () => {
      const element = previewRef.current;
      if (element) {
        html2pdf()
          .from(element)
          .set({
            margin: 10,
            filename: 'resume.pdf',
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          })
          .save()
          .catch((error: Error) => console.error('PDF generation failed:', error));
      }
    };
  

  return (
      <ResumeContext.Provider
        value={{
          resumeData,
          setResumeData,
          updateResumeData,
          messages,
          setMessages,
          currentSection,
          setCurrentSection,
          downloadResume,
        previewRef,
        }}
      >
        {children}
      </ResumeContext.Provider>
    );
};


export const useResumeContext = () => {
  const ctx = useContext(ResumeContext);
  if (!ctx) {
    throw new Error("useResumeContext must be used inside ResumeProvider");
  }
  return ctx;
};
