// components/LeftPanel.tsx
import React from 'react';
import { ResumeData } from './ResumeBuilder';
import PersonalInfoForm from './forms/PersonalInfoForm';
import SummaryForm from './forms/SummaryForm';
import WorkExperienceForm from './forms/WorkExperienceForm';
import EducationForm from './forms/EducationForm';
import SkillsForm from './forms/SkillsForm';
import ProjectsForm from './forms/ProjectsForm';
import InternshipsForm from './forms/InternshipsForm';
import CustomSectionForm from './forms/CustomSectionForm';
import SettingsForm from './forms/SettingsForm';

interface LeftPanelProps {
  resumeData: ResumeData;
  updateData: (section: keyof ResumeData, data: any) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ resumeData, updateData }) => {
  return (
    <div className="w-1/2 p-6 overflow-y-auto bg-gray-50 border-r border-gray-200">
      <header className="bg-gray-300 text-white py-4 shadow-md">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold">Resume Builder</h1>
        </div>
      </header>
      <PersonalInfoForm
        data={resumeData.personalInfo}
        onChange={(data) => updateData('personalInfo', data)}
      />
      <SummaryForm
        data={resumeData.summary}
        onChange={(data) => updateData('summary', data)}
      />
      <WorkExperienceForm
        data={resumeData.workExperience}
        onChange={(data) => updateData('workExperience', data)}
      />
      <EducationForm
        data={resumeData.education}
        onChange={(data) => updateData('education', data)}
      />
      <SkillsForm
        data={resumeData.skills}
        onChange={(data) => updateData('skills', data)}
      />
      <ProjectsForm
        data={resumeData.projects}
        onChange={(data) => updateData('projects', data)}
      />
      <InternshipsForm
        data={resumeData.internships}
        onChange={(data) => updateData('internships', data)}
      />
      <CustomSectionForm
        data={resumeData.custom}
        onChange={(data) => updateData('custom', data)}
      />
      <SettingsForm
        data={resumeData.settings}
        onChange={(data) => updateData('settings', data)}
      />
    </div>
  );
};

export default LeftPanel;