// components/forms/SettingsForm.tsx
import React, { useState } from 'react';
import { Settings, Eye, ChevronDown } from 'lucide-react';

interface SettingsData {
  fontFamily: string;
  fontSize: string;
  lineSpacing: string;
}

interface SettingsFormProps {
  data: SettingsData;
  onChange: (data: SettingsData) => void;
}

const SettingsForm: React.FC<SettingsFormProps> = ({ data, onChange }) => {
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
        <Settings /> Resume Settings
        <span className="ml-auto">
          {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </span>
      </h2>
      {!isCollapsed && (
        <>
        <label htmlFor="fontFamily">fontFamily</label>
          <select
            value={data.fontFamily}
            onChange={(e) => onChange({ ...data, fontFamily: e.target.value })}
            className="w-full p-2 border rounded mb-4"
          >
            <option value="Arial, sans-serif">Arial</option>
            <option value="Times New Roman, serif">Times New Roman</option>
            <option value="Helvetica, sans-serif">Helvetica</option>
            <option value="Courier, monospace">Courier</option>
          </select>
          <label htmlFor="fontsize">fontsize</label>
          <select
            value={data.fontSize}
            onChange={(e) => onChange({ ...data, fontSize: e.target.value })}
            className="w-full p-2 border rounded mb-4"
          >
            <option value="10pt">10</option>
            <option value="11pt">11</option>
            <option value="12pt">12</option>
            <option value="14pt">14</option>
          </select>
          <label htmlFor="lineSpacing">lineSpacing</label>
          <select
            value={data.lineSpacing}
            onChange={(e) => onChange({ ...data, lineSpacing: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="1">Single (1)</option>
            <option value="1.15">1.15</option>
            <option value="1.5">1.5</option>
            <option value="2">Double (2)</option>
          </select>
        </>
      )}
    </div>
  );
};

export default SettingsForm;