// components/forms/SkillsForm.tsx
import React, { useState } from 'react';
import { Wrench, Eye, ChevronDown } from 'lucide-react';

interface SkillsData {
  list: string;
  featured: Array<{ name: string; proficiency: number }>;
}

interface SkillsFormProps {
  data: SkillsData;
  onChange: (data: SkillsData) => void;
}

const SkillsForm: React.FC<SkillsFormProps> = ({ data, onChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const addFeatured = () => {
    onChange({ ...data, featured: [...data.featured, { name: '', proficiency: 1 }] });
  };

  const removeFeatured = (index: number) => {
    onChange({ ...data, featured: data.featured.filter((_, i) => i !== index) });
  };

  const updateList = (value: string) => {
    onChange({ ...data, list: value });
  };

  const updateFeatured = (index: number, field: 'name' | 'proficiency', value: string | number) => {
    const newFeatured = data.featured.map((skill, i) =>
      i === index ? { ...skill, [field]: value } : skill
    );
    onChange({ ...data, featured: newFeatured });
  };

  return (
    <div className="mb-8">
      <h2
        className="text-xl font-bold mb-4 flex items-center cursor-pointer"
        onClick={toggleCollapse}
      >
        <Wrench /> Skills
        <span className="ml-auto">
          {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </span>
      </h2>
      {!isCollapsed && (
        <>
          <input
            value={data.list}
            onChange={(e) => updateList(e.target.value)}
            placeholder="Skills List (comma-separated)"
            className="w-full p-2 border rounded mb-4"
          />
          <h3 className="text-lg font-semibold mb-2">Featured Skills (Optional)</h3>
          <h5 className="text-sm font-semi mb-1">Featured skills is optional to highlight top skills, with more circles mean higher proficiency.</h5>
          {data.featured.map((skill, index) => (
            <div key={index} className="flex items-center mb-2">
              <input
                value={skill.name}
                onChange={(e) => updateFeatured(index, 'name', e.target.value)}
                placeholder="Skill Name"
                className="p-2 border rounded mr-2 flex-1"
              />
              <select
                value={skill.proficiency}
                onChange={(e) => updateFeatured(index, 'proficiency', parseInt(e.target.value))}
                className="p-2 border rounded mr-2"
              >
                {[1, 2, 3, 4, 5].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeFeatured(index)}
                className="px-2 py-1 bg-red-500 text-white rounded"
              >
                Remove
              </button>
            </div>
          ))}
          <button onClick={addFeatured} className="px-4 py-2 bg-blue-500 text-white rounded mt-2">
            Add Featured Skill
          </button>
        </>
      )}
    </div>
  );
};

export default SkillsForm;