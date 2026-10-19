// components/RightPanel.tsx
import React from 'react';
import { ResumeData } from './ResumeBuilder';
import Preview from './Preview';
import { Eye } from 'lucide-react';
import { Download,RotateCcw } from 'lucide-react';
import ModernTemplate from './templates/ModernTemplate';
import { useResumeContext } from '../context/ResumeContext';

interface RightPanelProps {
  resumeData: ResumeData;
  downloadResume: () => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ resumeData, downloadResume }) => {
  const { selectedTemplate, setSelectedTemplate, resetResume } = useResumeContext();
  const handleReset = () => {
    const confirmed = window.confirm(
      "Start a new resume? This will permanently clear your saved draft on this device."
    );
    if (confirmed) resetResume();
  };

  return (
    <div className="w-1/2 p-6 overflow-y-auto bg-white">
        <header className="bg-gray-300 text-white-500 py-4 shadow-md">
        <div className="w-1/2 container mx-auto px-4">
          <h1 className="text-2xl font-bold"> Preview    </h1><button
        onClick={downloadResume}
        className="mt-1 px-1 py-1 flex-1 bg-blue-400 text-white rounded hover:bg-green-600"
      ><Download />
        Download Resume
      </button>  
      <button
          onClick={handleReset}
          className="px-1 py-1  items-center gap-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          title="Clear saved draft and start over"
        >
          <RotateCcw className="w-4 h-4" />
          New Resume
        </button>
        {(["classic", "modern"] as const).map((t) => (
          <button
            key={t}
           onClick={() => setSelectedTemplate(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
              selectedTemplate === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
        
    

        </div>
                <div className=" container overflow-y-auto mx-auto px-4">

         
        </div>
      </header>
      
        {/* <div className="mt-6 flex gap-3"> */}
       
        {/* </div> */}
      {selectedTemplate === "modern" ? <ModernTemplate resumeData={resumeData} /> : <Preview resumeData={resumeData} />}
   </div>
  );
};

export default RightPanel;