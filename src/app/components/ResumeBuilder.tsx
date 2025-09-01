// components/ResumeBuilder.tsx
'use client';

import React, { useState, useRef } from 'react';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import html2pdf from 'html2pdf.js';

export interface ResumeData {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    website: string;
  };
  summary: string;
  workExperience: Array<{
    company: string;
    jobTitle: string;
    startDate: string;
    endDate: string;
    city: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    startDate: string;
    endDate: string;
    city: string;
  }>;
  skills: {
    list: string;
    featured: Array<{ name: string; proficiency: number }>;
  };
  projects: Array<{
    name: string;
    date: string;
    description: string;
  }>;
  internships: Array<{
    jobTitle: string;
    employer: string;
    startDate: string;
    endDate: string;
    city: string;
    description: string;
  }>;
  custom: {
    title: string;
    content: string;
  };
  settings: {
    fontFamily: string;
    fontSize: string;
    lineSpacing: string;
  };
}

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
  workExperience: [],
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
    fontFamily: 'Arial, sans-serif',
    fontSize: '12pt',
    lineSpacing: '1.15',
  },
};

const ResumeBuilder: React.FC = () => {
  const [resumeData, setResumeData] = useState<ResumeData>(initialData);
  const previewRef = useRef<HTMLDivElement>(null); // Ref to access the preview element

  const updateData = (section: keyof ResumeData, data: any) => {
    setResumeData((prev) => ({ ...prev, [section]: data }));
  };

  const downloadResume = () => {
    const element = previewRef.current;
    if (element) {
      html2pdf()
        .from(element)
        .set({
          margin: 10,
          filename: 'resume.pdf',
          html2canvas: { scale: 2, useCORS: true }, // Added useCORS for external resources
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .save()
        .catch((error) => console.error('PDF generation failed:', error));
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <LeftPanel resumeData={resumeData} updateData={updateData} />
      <RightPanel resumeData={resumeData} downloadResume={downloadResume} />
      {/* Pass ref to Preview via RightPanel */}
      <div ref={previewRef} id="preview" className="hidden">
        <RightPanel resumeData={resumeData} downloadResume={downloadResume} />
      </div>
    </div>
  );
};

export default ResumeBuilder;