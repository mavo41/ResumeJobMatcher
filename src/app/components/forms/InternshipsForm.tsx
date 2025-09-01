// components/forms/InternshipsForm.tsx
import React, { useState } from 'react';
import { SquareActivity, Eye, ChevronDown } from 'lucide-react';

interface InternEntry {
  jobTitle: string;
  employer: string;
  startDate: string;
  endDate: string;
  city: string;
  description: string;
}

interface InternshipsFormProps {
  data: InternEntry[];
  onChange: (data: InternEntry[]) => void;
}

const InternshipsForm: React.FC<InternshipsFormProps> = ({ data, onChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const addEntry = () => {
    onChange([...data, { jobTitle: '', employer: '', startDate: '', endDate: '', city: '', description: '' }]);
  };

  const removeEntry = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof InternEntry, value: string) => {
    onChange(data.map((entry, i) => i === index ? { ...entry, [field]: value } : entry));
  };

  return (
    <div className="mb-8">
      <h2
        className="text-xl font-bold mb-4 flex items-center cursor-pointer"
        onClick={toggleCollapse}
      >
        <SquareActivity className="mr-2" /> Internships
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
                  value={entry.jobTitle}
                  onChange={(e) => updateEntry(index, 'jobTitle', e.target.value)}
                  placeholder="Job Title"
                  className="w-1/2 p-2 border rounded"
                />
                <input
                  value={entry.employer}
                  onChange={(e) => updateEntry(index, 'employer', e.target.value)}
                  placeholder="Employer"
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
              <textarea
                value={entry.description}
                onChange={(e) => updateEntry(index, 'description', e.target.value)}
                placeholder="Description"
                className="w-full p-2 border rounded h-24 mb-2"
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
            Add Internship
          </button>
        </>
      )}
    </div>
  );
};

export default InternshipsForm;