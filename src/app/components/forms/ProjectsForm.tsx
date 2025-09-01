// components/forms/ProjectsForm.tsx
import React, { useState } from 'react';
import { Lightbulb, Eye, ChevronDown } from 'lucide-react';

interface ProjectEntry {
  name: string;
  date: string;
  description: string;
}

interface ProjectsFormProps {
  data: ProjectEntry[];
  onChange: (data: ProjectEntry[]) => void;
}

const ProjectsForm: React.FC<ProjectsFormProps> = ({ data, onChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const addEntry = () => {
    onChange([...data, { name: '', date: '', description: '' }]);
  };

  const removeEntry = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof ProjectEntry, value: string) => {
    onChange(data.map((entry, i) => i === index ? { ...entry, [field]: value } : entry));
  };

  return (
    <div className="mb-8">
      <h2
        className="text-xl font-bold mb-4 flex items-center cursor-pointer"
        onClick={toggleCollapse}
      >
        <Lightbulb /> Projects
        <span className="ml-auto">
          {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </span>
      </h2>
      {!isCollapsed && (
        <>
          {data.map((entry, index) => (
            <div key={index} className="mb-6 p-4 border rounded">
              <input
                value={entry.name}
                onChange={(e) => updateEntry(index, 'name', e.target.value)}
                placeholder="Project Name"
                className="w-full p-2 border rounded mb-2"
              />
              <input
                value={entry.date}
                onChange={(e) => updateEntry(index, 'date', e.target.value)}
                placeholder="Date"
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
            Add Project
          </button>
        </>
      )}
    </div>
  );
};

export default ProjectsForm;