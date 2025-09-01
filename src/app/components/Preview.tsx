// components/Preview.tsx
import React from 'react';
import { ResumeData } from './ResumeBuilder';
import { Mail } from 'lucide-react';
import { Phone } from 'lucide-react';
import { MapPin } from 'lucide-react';
import { Link } from 'lucide-react';
import { Github } from 'lucide-react';
import { Linkedin } from 'lucide-react';

interface PreviewProps {
  resumeData: ResumeData;
}

const Preview: React.FC<PreviewProps> = ({ resumeData }) => {
  const { personalInfo, summary, workExperience, education, skills, projects, internships, custom, settings } = resumeData;

  // Function to determine the appropriate icon based on the website URL
  const getWebsiteIcon = (url: string) => {
    if (!url) return null;
    const lowercaseUrl = url.toLowerCase();
    if (lowercaseUrl.includes('github.com')) return <Github className="w-4 h-4 mr-1" />;
    if (lowercaseUrl.includes('linkedin.com')) return <Linkedin className="w-4 h-4 mr-1" />;
    return <Link className="w-4 h-4 mr-1" />; // Default to Link icon for other URLs
  };

  return (
    <div
      id="preview"
      className="max-w-4xl mx-auto p-8 bg-white shadow-lg"
      style={{
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        lineHeight: settings.lineSpacing,
      }}
    >
      <h1 className="text-center text-2xl font-bold mb-2">
        {personalInfo.firstName} {personalInfo.lastName}
      </h1>
      <div className="text-center text-sm mb-6 flex items-center justify-center space-x-4">
        {personalInfo.email && (
          <span className="flex items-center">
            <Mail className="w-4 h-4 mr-1" /> {personalInfo.email}
          </span>
        )}
        {personalInfo.phone && (
          <span className="flex items-center">
            <Phone className="w-4 h-4 mr-1" /> {personalInfo.phone}
          </span>
        )}
        {personalInfo.location && (
          <span className="flex items-center">
            <MapPin className="w-4 h-4 mr-1" /> {personalInfo.location}
          </span>
        )}
        {personalInfo.website && (
          <span className="flex items-center">
            {getWebsiteIcon(personalInfo.website)}
            {personalInfo.website}
          </span>
        )}
      </div>

      {summary && (
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b mb-2 uppercase">Professional Summary</h2>
          <p className="text-sm">{summary}</p>
        </div>
      )}

      {workExperience.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b mb-2 uppercase">Work Experience</h2>
          {workExperience.map((exp, index) => (
            <div key={index} className="mb-4">
              <div className="flex justify-between items-baseline">
                <h3 className="text-base font-semibold">{exp.jobTitle}</h3>
                <span className="text-sm text-gray-600 ml-4">{exp.company}</span>
              </div>
              <p className="text-sm text-gray-600">{exp.startDate} - {exp.endDate}</p>
              <p className="text-sm">{exp.description}</p>
            </div>
          ))}
        </div>
      )}

      {education.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b mb-2 uppercase">Education</h2>
          {education.map((edu, index) => (
            <div key={index} className="mb-4">
              <div className="flex justify-between items-baseline">
                <h3 className="text-base font-semibold">{edu.degree}</h3>
                <span className="text-sm text-gray-600 ml-4">{edu.school}</span>
              </div>
              <p className="text-sm text-gray-600">{edu.startDate} - {edu.endDate}</p>
            </div>
          ))}
        </div>
      )}

      {(skills.list || skills.featured.length > 0) && (
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b mb-2 uppercase">Skills</h2>
          {skills.list && <p className="text-sm">{skills.list}</p>}
          {skills.featured.length > 0 && (
            <div className="flex flex-wrap mt-2">
              {skills.featured.map((skill, index) => (
                <div key={index} className="mr-4 mb-2 flex items-center">
                  <span className="text-sm mr-2">{skill.name}</span>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ml-1 ${i < skill.proficiency ? 'bg-black' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {projects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b mb-2 uppercase">Projects</h2>
          {projects.map((proj, index) => (
            <div key={index} className="mb-4">
              <h3 className="text-base font-semibold">{proj.name} ({proj.date})</h3>
              <p className="text-sm">{proj.description}</p>
            </div>
          ))}
        </div>
      )}

      {internships.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b mb-2 uppercase">Internships</h2>
          {internships.map((intern, index) => (
            <div key={index} className="mb-4">
              <div className="flex justify-between items-baseline">
                <h3 className="text-base font-semibold">{intern.jobTitle}</h3>
                <span className="text-sm text-gray-600 ml-4">{intern.employer}</span>
              </div>
              <p className="text-sm text-gray-600">{intern.startDate} - {intern.endDate}</p>
              <p className="text-sm">{intern.description}</p>
            </div>
          ))}
        </div>
      )}

      {custom.title && custom.content && (
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b mb-2 uppercase">{custom.title}</h2>
          <p className="text-sm">{custom.content}</p>
        </div>
      )}
    </div>
  );
};

export default Preview;