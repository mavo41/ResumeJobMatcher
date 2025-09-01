// components/forms/SummaryForm.tsx
import React, { useState } from 'react';
import { Eye, ChevronDown } from 'lucide-react';
import { SquarePen } from 'lucide-react';

interface SummaryFormProps {
  data: string;
  onChange: (data: string) => void;
}

const SummaryForm: React.FC<SummaryFormProps> = ({ data, onChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="mb-8">
      <h2
        className="text-xl font-bold mb-4 flex items-center cursor-pointer"
        onClick={toggleCollapse}
      ><SquarePen className="mr-2" />
        Professional Summary
        <span className="ml-auto">
          {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </span>
      </h2>
      {!isCollapsed && (
        <>
          <h5>"Recruiter tip: write 400-600 characters to increase interview chances"</h5>
          <textarea
            value={data}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Curious Software Engineer with 6 years of experience and ..."
            className="w-full p-2 border rounded h-32 mt-2"
          />
        </>
      )}
    </div>
  );
};

export default SummaryForm;