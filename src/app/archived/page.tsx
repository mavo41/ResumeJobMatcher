"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function ArchivedPage() {
  const resumes = useQuery(api.resumes.getArchivedResumes) ?? [];
  const deleteResume = useMutation(api.resumes.deleteResume);

  return (
    <main className="p-6">
      <h1 className="text-2xl mb-4">Archived Resumes</h1>
      <ul className="space-y-2">
        {resumes.map((resume) => (
          <li key={resume._id} className="flex justify-between bg-gray-100 p-3 rounded">
            <span>{resume.companyName} - {resume.jobTitle}</span>
            <button
              onClick={() => deleteResume({ id: resume._id })}
              className="text-red-600 hover:text-red-800"
            >
              Delete Forever
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
