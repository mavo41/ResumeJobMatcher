// components/forms/CustomSectionForm.tsx
import React, { useState } from 'react';
import { Columns3Cog, Eye, ChevronDown } from 'lucide-react';

interface CustomData {
  title: string;
  content: string;
}

interface CustomSectionFormProps {
  data: CustomData;
  onChange: (data: CustomData) => void;
}

const CustomSectionForm: React.FC<CustomSectionFormProps> = ({ data, onChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="mb-8">
      <h2
        className="text-xl font-bold mb-4 flex items-center cursor-pointer"
        onClick={toggleCollapse}
      >
        <Columns3Cog className="mr-2" />
        Custom Section
        <span className="ml-auto">
          {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </span>
      </h2>
      {!isCollapsed && (
        <>
          <input
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder="Section Title"
            className="w-full p-2 border rounded mb-4"
          />
          <textarea
            value={data.content}
            onChange={(e) => onChange({ ...data, content: e.target.value })}
            placeholder="Content"
            className="w-full p-2 border rounded h-32"
          />
        </>
      )}
    </div>
  );
};

export default CustomSectionForm;