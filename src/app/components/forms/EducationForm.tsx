// components/forms/EducationForm.tsx
import React, { useState } from 'react';
import { GraduationCap, Eye, ChevronDown } from 'lucide-react';

interface EduEntry {
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
  city: string;
}

interface EducationFormProps {
  data: EduEntry[];
  onChange: (data: EduEntry[]) => void;
}

const EducationForm: React.FC<EducationFormProps> = ({ data, onChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const addEntry = () => {
    onChange([...data, { school: '', degree: '', startDate: '', endDate: '', city: '' }]);
  };

  const removeEntry = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof EduEntry, value: string) => {
    onChange(data.map((entry, i) => i === index ? { ...entry, [field]: value } : entry));
  };

  return (
    <div className="mb-8">
      <h2
        className="text-xl font-bold mb-4 flex items-center cursor-pointer"
        onClick={toggleCollapse}
      >
        <GraduationCap className="mr-2" /> Education
        <span className="ml-auto">
          {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </span>
      </h2>
      {!isCollapsed && (
        <>
          {data.map((entry, index) => (
            <div key={index} className="mb-6 p-4 border rounded">
              <div className="flex justify-between items-center mb-2">
                <input
                  value={entry.degree}
                  onChange={(e) => updateEntry(index, 'degree', e.target.value)}
                  placeholder="Degree & Major"
                  className="w-1/2 p-2 border rounded"
                />
                <input
                  value={entry.school}
                  onChange={(e) => updateEntry(index, 'school', e.target.value)}
                  placeholder="School"
                  className="w-1/2 p-2 border rounded ml-4"
                />
              </div>
              <div className="flex justify-between items-center mb-2">
                <input
                  value={entry.startDate}
                  onChange={(e) => updateEntry(index, 'startDate', e.target.value)}
                  placeholder="Start Date -MM/YYYY"
                  className="w-1/2 p-2 border rounded"
                />
                <input
                  value={entry.endDate}
                  onChange={(e) => updateEntry(index, 'endDate', e.target.value)}
                  placeholder="End Date -MM/YYYY"
                  className="w-1/2 p-2 border rounded ml-4"
                />
              </div>
              <input
                value={entry.city}
                onChange={(e) => updateEntry(index, 'city', e.target.value)}
                placeholder="City"
                className="w-full p-2 border rounded mb-2"
              />
              <button
                onClick={() => removeEntry(index)}
                className="px-4 py-1 bg-red-500 text-white rounded"
              >
                Remove
              </button>
            </div>
          ))}
          <button onClick={addEntry} className="px-4 py-2 bg-blue-500 text-white rounded">
            Add Education
          </button>
        </>
      )}
    </div>
  );
};

export default EducationForm;