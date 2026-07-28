import React from 'react';
import { ResumeData } from '../ResumeBuilder';
import { Mail, Phone, MapPin } from 'lucide-react';

interface Props { resumeData: ResumeData; }

const ModernTemplate: React.FC<Props> = ({ resumeData }) => {
  const { personalInfo, summary, workExperience, education, skills, projects } = resumeData;

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg" style={{ fontFamily: resumeData.settings.fontFamily }}>
      <div className="bg-slate-900 text-white p-8">
        <h1 className="text-3xl font-bold">{personalInfo.firstName} {personalInfo.lastName}</h1>
        <div className="flex gap-4 mt-2 text-sm text-slate-300">
          {personalInfo.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{personalInfo.email}</span>}
          {personalInfo.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{personalInfo.phone}</span>}
          {personalInfo.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{personalInfo.location}</span>}
        </div>
      </div>
      <div className="p-8 space-y-6">
        {summary && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">Summary</h2>
            <p className="text-sm text-slate-700">{summary}</p>
          </div>
        )}
        {workExperience.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-200 pb-1">Experience</h2>
            {workExperience.map((exp, i) => (
              <div key={i} className="mb-4">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900">{exp.jobTitle}</span>
                  <span className="text-xs text-slate-400">{exp.startDate} – {exp.endDate}</span>
                </div>
                <p className="text-sm text-slate-500">{exp.company}</p>
                <p className="text-sm text-slate-700 mt-1">{exp.description}</p>
              </div>
            ))}
          </div>
        )}
        {education.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-200 pb-1">Education</h2>
            {education.map((edu, i) => (
              <div key={i} className="mb-2 flex justify-between text-sm">
                <span className="font-medium">{edu.degree} — {edu.school}</span>
                <span className="text-slate-400">{edu.startDate} – {edu.endDate}</span>
              </div>
            ))}
          </div>
        )}
        {skills.list && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2 border-b border-slate-200 pb-1">Skills</h2>
            <p className="text-sm text-slate-700">{skills.list}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernTemplate;