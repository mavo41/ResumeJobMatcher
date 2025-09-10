// components/forms/PersonalInfoForm.tsx
import React, { useState } from 'react';
import { User, Eye, ChevronDown } from 'lucide-react';

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  website: string;
}

interface PersonalInfoFormProps {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
}

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({ data, onChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, [e.target.name]: e.target.value });
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="mb-8">
      <h2
        className="text-xl font-bold mb-4 flex items-center cursor-pointer"
        onClick={toggleCollapse}
      >
        <User /> Personal Info
        <span className="ml-auto">
          {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </span>
      </h2>
      {!isCollapsed && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <input
              name="firstName"
              value={data.firstName}
              onChange={handleChange}
              placeholder="First Name"
              className="p-2 border rounded"
            />
            <input
              name="lastName"
              value={data.lastName}
              onChange={handleChange}
              placeholder="Last Name"
              className="p-2 border rounded"
            />
          </div>
          <input
            name="email"
            value={data.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full p-2 border rounded mt-4"
          />
          <input
            name="phone"
            value={data.phone}
            onChange={handleChange}
            placeholder="Phone"
            className="w-full p-2 border rounded mt-4"
          />
          <input
            name="location"
            value={data.location}
            onChange={handleChange}
            placeholder="Location"
            className="w-full p-2 border rounded mt-4"
          />
          <input
            name="website"
            value={data.website}
            onChange={handleChange}
            placeholder="Website:linkedin/github/portfolio"
            className="w-full p-2 border rounded mt-4"
          />
        </>
      )}
    </div>
  );
};

export default PersonalInfoForm;