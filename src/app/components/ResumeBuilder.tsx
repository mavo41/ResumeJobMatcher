// components/ResumeBuilder.tsx
'use client';

import React from 'react';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import { useResumeContext } from '../context/ResumeContext';


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
    const { resumeData, updateResumeData, downloadResume, previewRef } = useResumeContext();
  
   const updateData = (section: keyof ResumeData, data: any) => {
     updateResumeData(section, data);
   };

  
  return (
    <div className="flex h-screen overflow-hidden">
      <LeftPanel resumeData={resumeData} updateData={updateData} />
      <RightPanel resumeData={resumeData} downloadResume={downloadResume} />
      {/* Hidden printable preview via RightPanel */}
      <div ref={previewRef} id="preview" className="hidden">
        <RightPanel resumeData={resumeData} downloadResume={downloadResume} />
      </div>
    </div>
  );
};

export default ResumeBuilder;