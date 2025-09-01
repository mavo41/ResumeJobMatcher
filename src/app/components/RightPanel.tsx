// components/RightPanel.tsx
import React from 'react';
import { ResumeData } from './ResumeBuilder';
import Preview from './Preview';
import { Eye } from 'lucide-react';
import { Download } from 'lucide-react';

interface RightPanelProps {
  resumeData: ResumeData;
  downloadResume: () => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ resumeData, downloadResume }) => {
  return (
    <div className="w-1/2 p-6 overflow-y-auto bg-white">
        <header className="bg-gray-300 text-white-500 py-4 shadow-md">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold"> Preview</h1>
                    <Eye className="mr-2 text-black" />

        </div>
      </header>
      
    
        
        <button
        onClick={downloadResume}
        className="mt-6 px-6 py-2 flex-10 bg-blue-400 text-white rounded hover:bg-green-600"
      ><Download />
        Download Resume
      </button>
    
      
            <Preview resumeData={resumeData} />

    </div>
  );
};

export default RightPanel;