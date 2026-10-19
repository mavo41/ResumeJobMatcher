// context/ResumeContext.tsx
"use client";

import { createContext, useState, ReactNode, useContext, useEffect, useRef } from 'react';
import { ResumeData } from '../components/ResumeBuilder'; // Import your type
//import html2pdf from 'html2pdf.js';

const STORAGE_KEY = 'resume-builder-draft-v1';
const TEMPLATE_KEY = 'resume-builder-template-v1';

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
   selectedTemplate: "classic" | "modern";
   setSelectedTemplate: React.Dispatch<React.SetStateAction<"classic" | "modern">>;
   isHydrated: boolean;
  resetResume: () => void;
}

export const ResumeContext = createContext<ResumeContextType | undefined>(
  undefined
);


export const ResumeProvider = ({ children }: { children: ReactNode }) => {
  const [resumeData, setResumeData] = useState<ResumeData>(initialData);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSection, setCurrentSection] = useState<string>("personalInfo");
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<"classic" | "modern">("classic");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ResumeData;
          // Shallow-merge with initialData so new keys added later
          // don't crash on old drafts.
          setResumeData({ ...initialData, ...parsed });
        }
        const savedTemplate = window.localStorage.getItem(TEMPLATE_KEY);
        if (savedTemplate === "classic" || savedTemplate === "modern") {
          setSelectedTemplate(savedTemplate);
        }
      } catch (err) {
        console.warn("[ResumeContext] Failed to hydrate from localStorage:", err);
      } finally {
        setIsHydrated(true);
      }
    }, []);
  
    // --------------------------------------------------------------
    // PERSIST: debounce writes so we don't hit localStorage on every
    // keystroke. 400ms is snappy enough that a crash loses at most a
    // couple of characters.
    // --------------------------------------------------------------
    useEffect(() => {
      if (!isHydrated) return;
      const handle = window.setTimeout(() => {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
        } catch (err) {
          console.warn("[ResumeContext] Failed to persist to localStorage:", err);
        }
      }, 400);
      return () => window.clearTimeout(handle);
    }, [resumeData, isHydrated]);
  
    // Persist template choice immediately (it's just a tiny string).
    useEffect(() => {
      if (!isHydrated) return;
      try {
        window.localStorage.setItem(TEMPLATE_KEY, selectedTemplate);
      } catch (err) {
        console.warn("[ResumeContext] Failed to persist template:", err);
      }
    }, [selectedTemplate, isHydrated]);
  
    const resetResume = () => {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(TEMPLATE_KEY);
      } catch (err) {
        console.warn("[ResumeContext] Failed to clear localStorage:", err);
      }
      setResumeData(initialData);
      setMessages([]);
      setCurrentSection("personalInfo");
      setSelectedTemplate("classic");
    };

  const updateResumeData = (section: keyof ResumeData, data: any) => {
    setResumeData((prev: ResumeData) => {
      const previousSection = prev[section];

      // Array-shaped sections (workExperience, education, projects,
      // internships): the AI returns either a single new entry to
      // append, or a full replacement array. Treat plain arrays as
      // full replacement (the AI was asked to "append to array" itself
      // per the prompt), but never let a non-array value clobber an
      // array section.
      if (Array.isArray(previousSection)) {
        if (Array.isArray(data)) {
          return { ...prev, [section]: data };
        }
        if (data && typeof data === "object") {
          return { ...prev, [section]: [...previousSection, data] };
        }
        return prev; // ignore malformed data rather than corrupt state
      }

      // Object-shaped sections (personalInfo, skills, custom,
      // settings): shallow-merge so a turn that only mentions one field
      // (e.g. { firstName: "John" }) does not erase sibling fields
      // (email, phone, etc.) already collected in earlier turns. This
     // is the fix for the controlled/uncontrolled input warning —
      // fields must never regress from a defined string to undefined.
      if (
        previousSection &&
        typeof previousSection === "object" &&
        data &&
        typeof data === "object"
      ) {
        return { ...prev, [section]: { ...previousSection, ...data } };
      }
      // Primitive sections (summary: string): straightforward replace,
      // but guard against the AI returning undefined/null for a field
      // that should stay a controlled string input.
      if (typeof previousSection === "string" && (data === undefined || data === null)) {
        return prev;
      }

      return { ...prev, [section]: data };
    });
   };

    const downloadResume = () => {
      const element = previewRef.current;
      if (!element) return;

      // html2pdf.js references browser-only globals (self/window) and
      // must never be imported at module top-level, since that import
      // would also execute during Next.js's server-side rendering pass
      // of this client component. Dynamically importing it here, inside
      // a function that only ever runs from a user click in the
      // browser, keeps it fully out of the SSR path.
      import('html2pdf.js')
        .then((mod) => {
          const html2pdf = mod.default;
          return html2pdf()
            .from(element)
           .set({
              margin: 10,
             filename: 'resume.pdf',
              html2canvas: { scale: 2, useCORS: true,foreignObjectRendering: true,},
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            })
            .save();
        })
.catch(async (error: Error) => {
          console.warn('PDF generation with foreignObjectRendering failed, retrying without it:', error);
          
          try {
            const mod = await import('html2pdf.js');
            const html2pdf = mod.default;
            await html2pdf()
              .from(element)
              .set({
                margin: 10,
                filename: 'resume.pdf',
                html2canvas: { scale: 2, useCORS: true, foreignObjectRendering: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
              })
              .save();
         } catch (fallbackError) {
            console.error('PDF generation failed on both attempts:', fallbackError);
          }
        });
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
        selectedTemplate,
        setSelectedTemplate,
        isHydrated,
        resetResume,
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
